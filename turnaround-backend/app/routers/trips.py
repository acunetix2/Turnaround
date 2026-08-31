from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.trip import Trip
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
import uuid

router = APIRouter(prefix="/trips", tags=["Trips"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)


@router.get("", response_model=PaginatedResponse[TripResponse], summary="List trips")
async def list_trips(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    vehicle_id: Optional[str] = Query(None),
    trip_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    base_q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination))
    )
    if vehicle_id:
        base_q = base_q.where(Trip.vehicle_id == vehicle_id)
    if trip_status:
        base_q = base_q.where(Trip.status == trip_status)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(Trip.created_at.desc())
    result = await db.execute(items_q)
    trips = result.scalars().all()

    return PaginatedResponse(items=list(trips), total=total, limit=limit, offset=offset)


@router.get("/{trip_id}", response_model=TripResponse, summary="Get trip by ID")
async def get_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    return trip


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED, summary="Create a trip")
async def create_trip(
    payload: TripCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    # Validate vehicle belongs to company
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id))
    if not v_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    trip = Trip(id=str(uuid.uuid4()), **payload.model_dump())
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


@router.patch("/{trip_id}", response_model=TripResponse, summary="Update a trip")
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)

    await db.commit()
    await db.refresh(trip)
    return trip


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

