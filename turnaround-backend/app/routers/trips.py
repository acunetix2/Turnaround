from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.trip import Trip, TripStatus
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.dwell_event import DwellEvent
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, TripCheckpoint
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
import uuid

router = APIRouter(prefix="/trips", tags=["Trips"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)


# ── Checkpoint builder ────────────────────────────────────────────────────────

def _build_checkpoints(trip: Trip, dwell_events: list[DwellEvent]) -> List[TripCheckpoint]:
    """
    Derives ordered checkpoint status from real DwellEvent records linked to the trip.

    Logic:
      - Events with departure_time set            → "completed"
      - Events with departure_time = None (active) → "current"
      - Origin / Destination with no dwell at all  → "pending"

    The list is always [origin, ...intermediate stops..., destination] ordered.
    """
    # Index dwell events by location_id for O(1) lookup
    dwell_by_loc: dict[str, DwellEvent] = {}
    for de in dwell_events:
        # If multiple dwells at same location, prefer the most recent departure
        existing = dwell_by_loc.get(de.location_id)
        if existing is None:
            dwell_by_loc[de.location_id] = de
        else:
            # Prefer open dwell (current) over a completed one; among completed prefer later
            if de.departure_time is None:
                dwell_by_loc[de.location_id] = de
            elif existing.departure_time is not None:
                if de.arrival_time > existing.arrival_time:
                    dwell_by_loc[de.location_id] = de

    checkpoints: List[TripCheckpoint] = []

    # Build stop list: origin → destination (add more intermediate stops here if needed)
    stops = []
    if trip.origin:
        stops.append(trip.origin)
    if trip.destination and (not trip.origin or trip.destination.id != trip.origin.id):
        stops.append(trip.destination)

    for loc in stops:
        de = dwell_by_loc.get(loc.id)

        if de is None:
            # No dwell at all — pending
            chk_status = "pending"
            chk = TripCheckpoint(
                location_id=loc.id,
                location_name=loc.name,
                location_type=loc.location_type.value,
                status=chk_status,
                expected_dwell_minutes=loc.expected_dwell_minutes,
            )
        elif de.departure_time is None:
            # Active open dwell — vehicle is currently here
            chk = TripCheckpoint(
                location_id=loc.id,
                location_name=loc.name,
                location_type=loc.location_type.value,
                status="current",
                arrival_time=de.arrival_time,
                departure_time=None,
                actual_dwell_minutes=de.dwell_minutes if de.dwell_minutes else None,
                expected_dwell_minutes=de.expected_minutes or loc.expected_dwell_minutes,
                excess_dwell_minutes=de.excess_minutes if de.excess_minutes else None,
                estimated_cost=de.estimated_cost,
            )
        else:
            # Completed dwell
            chk = TripCheckpoint(
                location_id=loc.id,
                location_name=loc.name,
                location_type=loc.location_type.value,
                status="completed",
                arrival_time=de.arrival_time,
                departure_time=de.departure_time,
                actual_dwell_minutes=round(de.dwell_minutes, 1),
                expected_dwell_minutes=de.expected_minutes or loc.expected_dwell_minutes,
                excess_dwell_minutes=round(de.excess_minutes, 1) if de.excess_minutes else 0.0,
                estimated_cost=de.estimated_cost,
            )
        checkpoints.append(chk)

    return checkpoints


def _attach_checkpoints(trip: Trip) -> TripResponse:
    """Serialise a Trip ORM object to TripResponse, adding computed checkpoints."""
    dwell_events = list(trip.dwell_events) if trip.dwell_events else []
    response = TripResponse.model_validate(trip)
    response.checkpoints = _build_checkpoints(trip, dwell_events)
    return response


# ── Query helper ──────────────────────────────────────────────────────────────

def _trip_query(company_id: str):
    """Base company-scoped trip query with all required eager loads."""
    return (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
        .options(
            selectinload(Trip.origin),
            selectinload(Trip.destination),
            selectinload(Trip.dwell_events).selectinload(DwellEvent.location),
        )
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[TripResponse], summary="List trips")
async def list_trips(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    vehicle_id: Optional[str] = Query(None),
    trip_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    base_q = _trip_query(company_id)
    if vehicle_id:
        base_q = base_q.where(Trip.vehicle_id == vehicle_id)
    if trip_status:
        base_q = base_q.where(Trip.status == trip_status)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(Trip.created_at.desc())
    result = await db.execute(items_q)
    trips = result.scalars().all()

    return PaginatedResponse(
        items=[_attach_checkpoints(t) for t in trips],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{trip_id}", response_model=TripResponse, summary="Get trip by ID")
async def get_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    q = _trip_query(company_id).where(Trip.id == trip_id)
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    return _attach_checkpoints(trip)


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED, summary="Create a trip")
async def create_trip(
    payload: TripCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    # Validate vehicle belongs to company
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id)
    )
    if not v_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    trip = Trip(id=str(uuid.uuid4()), **payload.model_dump())
    db.add(trip)
    await db.commit()

    # Re-fetch with full eager loads so checkpoints can be built
    result = await db.execute(_trip_query(company_id).where(Trip.id == trip.id))
    trip = result.scalar_one()
    return _attach_checkpoints(trip)


@router.patch("/{trip_id}", response_model=TripResponse, summary="Update a trip")
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    result = await db.execute(_trip_query(company_id).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)

    await db.commit()

    # Re-fetch to get fresh eager-loaded relations
    result = await db.execute(_trip_query(company_id).where(Trip.id == trip_id))
    trip = result.scalar_one()
    return _attach_checkpoints(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a trip")
async def delete_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})

    await db.delete(trip)
    await db.commit()
