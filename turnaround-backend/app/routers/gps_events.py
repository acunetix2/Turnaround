import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.gps_event import GPSEvent
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.dwell_event import DwellEvent
from app.db.models.trip import Trip, TripStatus
from app.db.models.demurrage_claim import DemurrageClaim, ClaimStatus, ResponsibleParty
from app.db.models.company import Company
from app.deps import get_current_company
from app.schemas.gps_event import GPSEventCreate, GPSBatchIngest, GPSEventResponse, IngestionResult
from app.schemas.common import PaginatedResponse
from app.engines.geofencing import find_matching_geofences, evaluate_debounce_departure
from app.engines.dwell import resolve_expected_dwell_minutes, calculate_dwell_duration_minutes
from app.engines.financial import calculate_delay_cost, calculate_excess_minutes
from app.config import settings
from app.services import notifications as notif_svc

router = APIRouter(prefix="/gps", tags=["GPS Ingestion"])
logger = logging.getLogger("turnaround.gps")


def _first_present(*values) -> Optional[object]:
    for value in values:
        if value is not None and value != '':
            return value
    return None


def _lookup_nested_value(item: dict, *keys: str) -> Optional[object]:
    target_keys = {str(key).lower() for key in keys}

    def walk(node: object) -> Optional[object]:
        if isinstance(node, dict):
            for raw_key, value in node.items():
                key_name = str(raw_key).lower()
                if value not in (None, ''):
                    if key_name in target_keys:
                        return value
                    for target in target_keys:
                        if key_name.endswith(f'.{target}'):
                            return value

                nested_value = walk(value)
                if nested_value is not None:
                    return nested_value

        elif isinstance(node, list):
            for entry in node:
                nested_value = walk(entry)
                if nested_value is not None:
                    return nested_value

        return None

    return walk(item)


def _collect_vehicle_match_candidates(item: dict) -> tuple[List[str], List[str]]:
    """Collect vehicle ID and IMEI candidates from nested Flespi/Telemify payloads."""
    vehicle_ids: List[str] = []
    imeis: List[str] = []

    id_keys = {
        'id', 'vehicle_id', 'vehicleid', 'asset_id', 'assetid',
        'registration_number', 'registrationnumber', 'plate', 'plate_number', 'platenumber'
    }
    imei_keys = {
        'imei', 'tracker_imei', 'trackerimei', 'device_imei', 'deviceimei',
        'ident', 'serial', 'serial_number', 'serialnumber', 'device_id', 'deviceid'
    }

    def walk(value: object) -> None:
        if isinstance(value, dict):
            for key, nested_value in value.items():
                normalized = str(key).lower()
                if nested_value is not None and nested_value != '':
                    if normalized in id_keys:
                        vehicle_ids.append(str(nested_value))
                    elif normalized in imei_keys:
                        imeis.append(str(nested_value))
                walk(nested_value)
        elif isinstance(value, list):
            for entry in value:
                walk(entry)

    walk(item)
    return vehicle_ids, imeis


def _coerce_float(value: object) -> Optional[float]:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_datetime(value: object) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return datetime.now(timezone.utc)
    return datetime.now(timezone.utc)


async def _resolve_vehicle_for_telemify(db: AsyncSession, company_id: str, item: dict) -> Optional[Vehicle]:
    vehicle_candidates, imei_candidates = _collect_vehicle_match_candidates(item)
    candidate_id = _first_present(*vehicle_candidates)
    candidate_imei = _first_present(*imei_candidates)

    if candidate_id is not None:
        candidate_value = str(candidate_id)
        result = await db.execute(
            select(Vehicle).where(
                Vehicle.company_id == company_id,
                (Vehicle.id == candidate_value) | (Vehicle.registration_number == candidate_value)
            )
        )
        vehicles = result.scalars().all()
        if len(vehicles) == 1:
            return vehicles[0]
        if len(vehicles) > 1:
            logger.warning(
                "Ambiguous vehicle match for company=%s via candidate_id=%s; found %d vehicles",
                company_id,
                candidate_value,
                len(vehicles),
            )
            return None

    if candidate_imei is not None:
        candidate_imei_value = str(candidate_imei)
        result = await db.execute(
            select(Vehicle).where(
                Vehicle.company_id == company_id,
                Vehicle.tracker_imei == candidate_imei_value
            )
        )
        vehicles = result.scalars().all()
        if len(vehicles) == 1:
            return vehicles[0]
        if len(vehicles) > 1:
            logger.warning(
                "Ambiguous IMEI match for company=%s imei=%s; found %d vehicles",
                company_id,
                candidate_imei_value,
                len(vehicles),
            )
            return None

    return None


async def _get_active_trip_id(db: AsyncSession, vehicle_id: str) -> Optional[str]:
    """
    Returns the ID of the vehicle's currently active trip, if any.
    Active = status is in_transit, in_progress (legacy), or delayed.
    Returns the most-recently-planned trip to handle edge cases.
    """
    result = await db.execute(
        select(Trip.id)
        .where(
            Trip.vehicle_id == vehicle_id,
            Trip.status.in_([
                TripStatus.IN_TRANSIT,
                TripStatus.IN_PROGRESS,   # legacy alias
                TripStatus.DELAYED,
            ])
        )
        .order_by(Trip.planned_departure.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row


def _make_claim_number(location_name: str) -> str:
    """Generate a unique demurrage claim number from the location name prefix."""
    from datetime import timezone as _tz
    prefix = (location_name[:3]).upper().replace(" ", "")
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4().int)[:4].zfill(4)
    return f"CLM-{prefix}-{year}-{suffix}"


async def _auto_create_demurrage_claim(
    db: AsyncSession,
    vehicle: Vehicle,
    location: Location,
    dwell_event: DwellEvent,
    excess_minutes: float,
    cost: float,
) -> Optional[DemurrageClaim]:
    """
    Auto-creates a FLAGGED DemurrageClaim when a dwell closes with excess above threshold.
    Idempotent: skips creation if a claim already exists for this dwell_event_id.
    """
    if excess_minutes < settings.AUTO_DEMURRAGE_THRESHOLD_MINUTES:
        return None

    # Idempotency check — don't double-create for the same dwell event
    existing = (await db.execute(
        select(DemurrageClaim).where(DemurrageClaim.dwell_event_id == dwell_event.id)
    )).scalar_one_or_none()
    if existing:
        return None

    # Resolve carrier name from company
    company_result = await db.execute(
        select(Company).where(Company.id == vehicle.company_id)
    )
    company = company_result.scalar_one_or_none()
    carrier_name = company.name if company else "Unknown Carrier"

    claim_number = _make_claim_number(location.name)
    now = datetime.now(timezone.utc)

    claim = DemurrageClaim(
        id=str(uuid.uuid4()),
        claim_number=claim_number,
        vehicle_id=vehicle.id,
        location_id=location.id,
        dwell_event_id=dwell_event.id,
        # Denormalised display fields
        vehicle_reg=vehicle.registration_number,
        location_name=location.name,
        container_number=vehicle.container_number,
        driver_name=vehicle.driver_name,
        carrier_name=carrier_name,
        # Default responsible party — can be changed by user after review
        responsible_party=ResponsibleParty.TERMINAL_OPERATOR,
        arrival_time=dwell_event.arrival_time,
        departure_time=dwell_event.departure_time,
        sla_threshold_minutes=int(dwell_event.expected_minutes),
        total_dwell_minutes=int(dwell_event.dwell_minutes),
        excess_delay_minutes=int(excess_minutes),
        hourly_operating_rate=vehicle.hourly_operating_cost,
        claimed_amount_kes=cost,
        status=ClaimStatus.FLAGGED,
        created_at=now,
        updated_at=now,
    )
    db.add(claim)
    await db.flush()
    await notif_svc.demurrage_flagged(
        db, company_id=vehicle.company_id, claim_id=claim.id,
        vehicle_reg=claim.vehicle_reg, location=claim.location_name,
        amount_kes=float(claim.claimed_amount_kes or 0),
    )
    logger.info(
        f"Demurrage FLAGGED: claim={claim_number} vehicle={vehicle.registration_number} "
        f"location={location.name} excess={excess_minutes:.1f}m cost=KES{cost:.2f}"
    )
    return claim


async def _process_single_event(db: AsyncSession, event: GPSEventCreate, company_id: str) -> dict:
    """Validates, stores a GPS event, and triggers geofence dwell logic."""
    # Validate vehicle belongs to company
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.id == event.vehicle_id, Vehicle.company_id == company_id)
    )
    vehicle = v_result.scalar_one_or_none()
    if not vehicle:
        return {"status": "skipped", "reason": "vehicle_not_found"}

    # Attempt to insert with duplicate guard
    gps = GPSEvent(
        id=str(uuid.uuid4()),
        vehicle_id=event.vehicle_id,
        latitude=event.latitude,
        longitude=event.longitude,
        speed=event.speed,
        heading=event.heading,
        recorded_at=event.recorded_at,
    )
    try:
        db.add(gps)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.debug(f"Duplicate GPS event ignored: {event.vehicle_id} @ {event.recorded_at}")
        return {"status": "duplicate"}

    # Load all company locations for geofence evaluation
    loc_result = await db.execute(
        select(Location).where(Location.company_id == company_id)
    )
    locations = loc_result.scalars().all()
    loc_tuples = [(l.id, l.name, l.latitude, l.longitude, l.geofence_radius) for l in locations]

    matches = find_matching_geofences(event.latitude, event.longitude, loc_tuples)
    matched_ids = {m.location_id for m in matches}

    dwell_updates = 0

    for location in locations:
        # Check if there is an in-progress dwell at this location
        active_dwell_result = await db.execute(
            select(DwellEvent).where(
                DwellEvent.vehicle_id == event.vehicle_id,
                DwellEvent.location_id == location.id,
                DwellEvent.departure_time.is_(None),
            )
        )
        active_dwell = active_dwell_result.scalar_one_or_none()

        if location.id in matched_ids:
            # Vehicle is inside geofence
            if not active_dwell:
                # New arrival — open a dwell event, linking to active trip if one exists
                active_trip_id = await _get_active_trip_id(db, event.vehicle_id)
                new_dwell = DwellEvent(
                    id=str(uuid.uuid4()),
                    vehicle_id=event.vehicle_id,
                    location_id=location.id,
                    trip_id=active_trip_id,          # ← now populated
                    arrival_time=event.recorded_at,
                    dwell_minutes=0.0,
                    expected_minutes=location.expected_dwell_minutes,
                    excess_minutes=0.0,
                    estimated_cost=0.0,
                )
                db.add(new_dwell)
                logger.info(
                    f"Dwell OPENED: vehicle={event.vehicle_id} location={location.name}"
                    f"{' trip=' + active_trip_id if active_trip_id else ''}"
                )
                dwell_updates += 1
        else:
            # Vehicle is outside this geofence
            if active_dwell:
                # Check debounce: pull last N GPS readings for this vehicle at this area
                recent_result = await db.execute(
                    select(GPSEvent.latitude, GPSEvent.longitude)
                    .where(GPSEvent.vehicle_id == event.vehicle_id)
                    .order_by(GPSEvent.recorded_at.desc())
                    .limit(settings.GPS_DEBOUNCE_POINTS)
                )
                recent = recent_result.all()
                recent_inside = [
                    location.id in {m.location_id for m in find_matching_geofences(r.latitude, r.longitude, loc_tuples)}
                    for r in recent
                ]

                confirmed_departure = evaluate_debounce_departure(
                    recent_inside, settings.GPS_DEBOUNCE_POINTS
                )

                if confirmed_departure:
                    # Resolve expected dwell via resolution chain
                    # Count historical visits for this vehicle/location
                    hist_count_result = await db.execute(
                        select(func.count()).select_from(DwellEvent).where(
                            DwellEvent.vehicle_id == event.vehicle_id,
                            DwellEvent.location_id == location.id,
                            DwellEvent.departure_time.isnot(None),
                        )
                    )
                    hist_count = hist_count_result.scalar_one() or 0

                    hist_avg_result = await db.execute(
                        select(func.avg(DwellEvent.dwell_minutes)).where(
                            DwellEvent.vehicle_id == event.vehicle_id,
                            DwellEvent.location_id == location.id,
                            DwellEvent.departure_time.isnot(None),
                        )
                    )
                    hist_avg = hist_avg_result.scalar_one()

                    expected = resolve_expected_dwell_minutes(
                        historical_visits_avg=hist_avg,
                        historical_visits_count=hist_count,
                        historical_threshold_min=settings.HISTORICAL_VISITS_THRESHOLD,
                        location_configured_expected=location.expected_dwell_minutes,
                        customer_sla_minutes=location.customer_sla_minutes,
                        global_fallback_minutes=settings.DEFAULT_EXPECTED_DWELL_MINUTES,
                    )

                    dwell_mins = calculate_dwell_duration_minutes(active_dwell.arrival_time, event.recorded_at)
                    excess = calculate_excess_minutes(dwell_mins, expected)
                    cost = calculate_delay_cost(excess, vehicle.hourly_operating_cost)

                    # Back-fill trip_id if it wasn't set when dwell was opened
                    if active_dwell.trip_id is None:
                        active_dwell.trip_id = await _get_active_trip_id(db, event.vehicle_id)

                    active_dwell.departure_time = event.recorded_at
                    active_dwell.dwell_minutes = round(dwell_mins, 2)
                    active_dwell.expected_minutes = expected
                    active_dwell.excess_minutes = round(excess, 2)
                    active_dwell.estimated_cost = cost

                    logger.info(
                        f"Dwell CLOSED: vehicle={event.vehicle_id} location={location.name} "
                        f"dwell={dwell_mins:.1f}m expected={expected:.1f}m excess={excess:.1f}m cost=KES{cost:.2f}"
                    )

                    # ── Auto-create demurrage claim if excess exceeds threshold ──
                    await _auto_create_demurrage_claim(
                        db=db,
                        vehicle=vehicle,
                        location=location,
                        dwell_event=active_dwell,
                        excess_minutes=excess,
                        cost=cost,
                    )

                    dwell_updates += 1

    return {"status": "ok", "dwell_updates": dwell_updates}


@router.post("/events", response_model=IngestionResult, status_code=status.HTTP_202_ACCEPTED,
             summary="Ingest GPS telemetry events (batch or single)")
async def ingest_gps_events(
    payload: GPSBatchIngest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """
    Idempotent GPS event ingestion. Duplicate events (vehicle_id + recorded_at) are silently discarded.
    Each event triggers geofence evaluation, opening/closing DwellEvent records automatically.
    """
    processed = 0
    duplicates = 0
    dwell_updates = 0

    for event in payload.events:
        result = await _process_single_event(db, event, company_id)
        if result["status"] == "ok":
            processed += 1
            dwell_updates += result.get("dwell_updates", 0)
        elif result["status"] == "duplicate":
            duplicates += 1

    await db.commit()
    return IngestionResult(processed=processed, duplicates_ignored=duplicates, dwell_events_updated=dwell_updates)


@router.get("/events/{vehicle_id}", response_model=PaginatedResponse[GPSEventResponse],
            summary="Get GPS telemetry history for a vehicle")
async def get_vehicle_gps_events(
    vehicle_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    # Verify vehicle belongs to company
    v = (await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    total = (await db.execute(select(func.count()).where(GPSEvent.vehicle_id == vehicle_id))).scalar_one()
    result = await db.execute(
        select(GPSEvent)
        .where(GPSEvent.vehicle_id == vehicle_id)
        .order_by(GPSEvent.recorded_at.desc())
        .offset(offset).limit(limit)
    )
    events = result.scalars().all()
    return PaginatedResponse(items=list(events), total=total, limit=limit, offset=offset)


@router.post("/flespi/webhook", status_code=status.HTTP_202_ACCEPTED,
             summary="Accept normalized GPS payloads from a Flespi gateway")
async def ingest_flespi_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[Optional[str], Query()] = None,
    secret: Annotated[Optional[str], Query()] = None,
):
    """Accept a Flespi webhook payload, map it to a vehicle by IMEI/registration, and ingest GPS points.

    This is the recommended architecture: Telemify or other trackers send raw device data to Flespi,
    Flespi normalizes it, and Flespi streams the resulting JSON to this Render backend.
    """
    raw_payload = await request.json()
    payload_dict = raw_payload if isinstance(raw_payload, dict) else {'items': raw_payload}

    company_id_value = company_id or payload_dict.get('company_id') or payload_dict.get('tenant_id')
    if not company_id_value:
        raise HTTPException(status_code=400, detail='company_id is required for Flespi webhook ingestion')

    company_res = await db.execute(select(Company).where(Company.id == company_id_value))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')

    integrations = company.integrations or {}
    flespi_conf = integrations.get('flespi', {}) if isinstance(integrations, dict) else {}
    if not isinstance(flespi_conf, dict):
        flespi_conf = {}

    expected_secret = flespi_conf.get('webhook_secret')
    provided_secret = secret or request.headers.get('x-flespi-secret') or payload_dict.get('secret')
    if expected_secret and provided_secret != expected_secret:
        raise HTTPException(status_code=401, detail='Invalid Flespi webhook secret')

    items: List[dict] = []
    if isinstance(raw_payload, list):
        items = [item for item in raw_payload if isinstance(item, dict)]
    elif isinstance(raw_payload, dict):
        for key in ('events', 'data', 'items', 'positions', 'devices', 'records', 'messages'):
            value = raw_payload.get(key)
            if isinstance(value, list):
                items = [item for item in value if isinstance(item, dict)]
                break
        if not items:
            items = [raw_payload]

    logger.info(
        "Flespi webhook received company_id=%s item_count=%s payload_keys=%s",
        company_id_value,
        len(items),
        list(payload_dict.keys())[:20] if isinstance(payload_dict, dict) else type(payload_dict).__name__,
    )

    if not items:
        logger.warning("Flespi webhook produced no ingestible items for company_id=%s", company_id_value)
        return IngestionResult(processed=0, duplicates_ignored=0, dwell_events_updated=0)

    processed = 0
    duplicates = 0
    dwell_updates = 0

    for idx, item in enumerate(items):
        logger.info(
            "Processing Flespi item %s for company=%s keys=%s",
            idx,
            company_id_value,
            list(item.keys())[:20] if isinstance(item, dict) else type(item).__name__,
        )

        vehicle = await _resolve_vehicle_for_telemify(db, company_id_value, item)
        if vehicle is None:
            logger.warning(
                "Flespi item skipped: no matching vehicle for company=%s item=%s",
                company_id_value,
                item,
            )
            continue

        logger.info(
            "Resolved Flespi item to vehicle=%s company=%s",
            vehicle.id,
            company_id_value,
        )

        latitude = _coerce_float(_lookup_nested_value(item, 'latitude', 'lat', 'gps_latitude', 'gpsLatitude', 'latit', 'y'))
        longitude = _coerce_float(_lookup_nested_value(item, 'longitude', 'lng', 'lon', 'gps_longitude', 'gpsLongitude', 'long', 'x'))

        if latitude is None or longitude is None:
            logger.warning(
                "Flespi item skipped: no valid lat/lng company=%s vehicle=%s payload=%s",
                company_id_value,
                vehicle.id,
                item,
            )
            continue

        speed = _coerce_float(_lookup_nested_value(item, 'speed', 'speed_kmh', 'speed_km_h', 'velocity')) or 0.0
        heading = _coerce_float(_lookup_nested_value(item, 'heading', 'bearing', 'course')) or 0.0
        timestamp = _coerce_datetime(_first_present(
            item.get('recorded_at'), item.get('timestamp'), item.get('time'), item.get('created_at'),
            item.get('position', {}).get('timestamp') if isinstance(item.get('position'), dict) else None,
        ))

        event = GPSEventCreate(
            vehicle_id=vehicle.id,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            heading=heading,
            recorded_at=timestamp,
        )
        result = await _process_single_event(db, event, company_id_value)
        if result['status'] == 'ok':
            processed += 1
            dwell_updates += result.get('dwell_updates', 0)
        elif result['status'] == 'duplicate':
            duplicates += 1

    await db.commit()
    return IngestionResult(processed=processed, duplicates_ignored=duplicates, dwell_events_updated=dwell_updates)


@router.post("/telemify/webhook", status_code=status.HTTP_202_ACCEPTED,
             summary="Backward-compatible alias for Telemify payloads")
async def ingest_telemify_webhook_alias(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[Optional[str], Query()] = None,
    secret: Annotated[Optional[str], Query()] = None,
):
    return await ingest_flespi_webhook(request, db, company_id, secret)
