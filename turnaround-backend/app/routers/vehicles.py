from typing import Annotated, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models.vehicle import Vehicle
from app.db.models.gps_event import GPSEvent
from app.db.models.dwell_event import DwellEvent
from app.db.models.user import UserRole, User
from app.deps import get_current_user, get_current_company
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.gps_event import GPSEventResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
import uuid

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)


# ── Live GPS Aggregate — must be declared BEFORE /{vehicle_id} ───────────────
from pydantic import BaseModel as _BaseModel  # noqa: E402


class LiveVehiclePosition(_BaseModel):
    vehicle_id: str
    registration_number: str
    vehicle_type: str
    driver_name: Optional[str]
    status: str
    hourly_operating_cost: float
    latitude: Optional[float]
    longitude: Optional[float]
    speed: Optional[float]
    heading: Optional[float]
    recorded_at: Optional[str]
    active_dwell_location_id: Optional[str]
    active_dwell_arrival: Optional[str]
    active_dwell_excess_minutes: Optional[float]


@router.get("/live", response_model=Dict[str, LiveVehiclePosition],
            summary="Aggregate: latest GPS position per vehicle (live map feed)")
async def get_live_vehicle_positions(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    vehicles_result = await db.execute(
        select(Vehicle).where(Vehicle.company_id == company_id)
    )
    vehicles = vehicles_result.scalars().all()
    if not vehicles:
        return {}

    vehicle_ids = [v.id for v in vehicles]

    from sqlalchemy import desc as sa_desc
    from sqlalchemy.sql import func as sqlfunc

    subq = (
        select(
            GPSEvent.vehicle_id,
            GPSEvent.latitude,
            GPSEvent.longitude,
            GPSEvent.speed,
            GPSEvent.heading,
            GPSEvent.recorded_at,
            sqlfunc.row_number()
            .over(
                partition_by=GPSEvent.vehicle_id,
                order_by=sa_desc(GPSEvent.recorded_at),
            )
            .label("rn"),
        )
        .where(GPSEvent.vehicle_id.in_(vehicle_ids))
        .subquery()
    )

    latest_gps_result = await db.execute(select(subq).where(subq.c.rn == 1))
    latest_gps: Dict[str, dict] = {}
    for row in latest_gps_result.all():
        latest_gps[row.vehicle_id] = {
            "latitude": row.latitude,
            "longitude": row.longitude,
            "speed": row.speed,
            "heading": row.heading,
            "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
        }

    active_dwells_result = await db.execute(
        select(DwellEvent).where(
            DwellEvent.vehicle_id.in_(vehicle_ids),
            DwellEvent.departure_time.is_(None),
        )
    )
    active_dwells: Dict[str, DwellEvent] = {}
    for dwell in active_dwells_result.scalars().all():
        if dwell.vehicle_id not in active_dwells:
            active_dwells[dwell.vehicle_id] = dwell

    from datetime import timezone as _tz, datetime as _dt

    response: Dict[str, LiveVehiclePosition] = {}
    for v in vehicles:
        gps = latest_gps.get(v.id)
        dwell = active_dwells.get(v.id)
        excess_minutes: Optional[float] = None
        if dwell:
            now = _dt.now(_tz.utc)
            arrival = dwell.arrival_time
            if arrival.tzinfo is None:
                arrival = arrival.replace(tzinfo=_tz.utc)
            elapsed = (now - arrival).total_seconds() / 60
            excess_minutes = max(0.0, round(elapsed - dwell.expected_minutes, 1))

        response[v.id] = LiveVehiclePosition(
            vehicle_id=v.id,
            registration_number=v.registration_number,
            vehicle_type=v.vehicle_type,
            driver_name=v.driver_name,
            status=v.status.value,
            hourly_operating_cost=v.hourly_operating_cost,
            latitude=gps["latitude"] if gps else None,
            longitude=gps["longitude"] if gps else None,
            speed=gps["speed"] if gps else None,
            heading=gps["heading"] if gps else None,
            recorded_at=gps["recorded_at"] if gps else None,
            active_dwell_location_id=dwell.location_id if dwell else None,
            active_dwell_arrival=dwell.arrival_time.isoformat() if dwell else None,
            active_dwell_excess_minutes=excess_minutes,
        )
    return response


@router.get("", response_model=PaginatedResponse[VehicleResponse], summary="List fleet vehicles")
async def list_vehicles(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    base_q = (
        select(Vehicle)
        .where(Vehicle.company_id == company_id)
    )
    if status_filter:
        base_q = base_q.where(Vehicle.status == status_filter)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(Vehicle.created_at.desc())
    result = await db.execute(items_q)
    vehicles = result.scalars().all()

    return PaginatedResponse(items=list(vehicles), total=total, limit=limit, offset=offset)


@router.get("/{vehicle_id}", response_model=VehicleResponse, summary="Get a vehicle by ID")
async def get_vehicle(
    vehicle_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})
    return vehicle


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED, summary="Register a vehicle")
async def create_vehicle(
    payload: VehicleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    vehicle = Vehicle(id=str(uuid.uuid4()), company_id=company_id, **payload.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleResponse, summary="Update vehicle details")
async def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)

    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove vehicle from fleet")
async def delete_vehicle(
    vehicle_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})
    await db.delete(vehicle)
    await db.commit()


