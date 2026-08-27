import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.gps_event import GPSEvent
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.dwell_event import DwellEvent
from app.deps import get_current_company
from app.schemas.gps_event import GPSEventCreate, GPSBatchIngest, GPSEventResponse, IngestionResult
from app.schemas.common import PaginatedResponse
from app.engines.geofencing import find_matching_geofences, evaluate_debounce_departure
from app.engines.dwell import resolve_expected_dwell_minutes, calculate_dwell_duration_minutes
from app.engines.financial import calculate_delay_cost, calculate_excess_minutes
from app.config import settings

router = APIRouter(prefix="/gps", tags=["GPS Ingestion"])
logger = logging.getLogger("turnaround.gps")


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
                # New arrival — open a dwell event
                new_dwell = DwellEvent(
                    id=str(uuid.uuid4()),
                    vehicle_id=event.vehicle_id,
                    location_id=location.id,
                    arrival_time=event.recorded_at,
                    dwell_minutes=0.0,
                    expected_minutes=location.expected_dwell_minutes,
                    excess_minutes=0.0,
                    estimated_cost=0.0,
                )
                db.add(new_dwell)
                logger.info(f"Dwell OPENED: vehicle={event.vehicle_id} location={location.name}")
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

                    active_dwell.departure_time = event.recorded_at
                    active_dwell.dwell_minutes = round(dwell_mins, 2)
                    active_dwell.expected_minutes = expected
                    active_dwell.excess_minutes = round(excess, 2)
                    active_dwell.estimated_cost = cost

                    logger.info(
                        f"Dwell CLOSED: vehicle={event.vehicle_id} location={location.name} "
                        f"dwell={dwell_mins:.1f}m expected={expected:.1f}m excess={excess:.1f}m cost=KES{cost:.2f}"
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
