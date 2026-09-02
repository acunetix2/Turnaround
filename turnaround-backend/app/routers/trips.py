from typing import Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models.trip import Trip
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
from app.services import notifications as notif_svc
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
        .options(
            selectinload(Trip.origin),
            selectinload(Trip.destination),
            selectinload(Trip.vehicle),
        )
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
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
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
    # ── Notification ──
    try:
        vehicle_res = await db.execute(select(Vehicle).where(Vehicle.id == trip.vehicle_id))
        vh = vehicle_res.scalar_one_or_none()
        reg = vh.registration_number if vh else trip.vehicle_id[:8]
        await notif_svc.trip_dispatched(
            db, company_id=company_id, trip_id=trip.id,
            vehicle_reg=reg, origin=str(trip.origin_id), dest=str(trip.destination_id)
        )
        await db.commit()
    except Exception:
        pass  # never fail the main action
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
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
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



# ── Enhanced Trip Controls ───────────────────────────────────────────────────


class TripReassignRequest(BaseModel):
    vehicle_id: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None


@router.post("/{trip_id}/cancel", response_model=TripResponse, summary="Cancel a trip")
async def cancel_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    """
    Cancel a planned or in-transit trip.
    Sets status to 'cancelled'. Admin/Fleet Manager only.
    """
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    
    if trip.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": "Cannot cancel a completed trip"}}
        )
    
    if trip.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "ALREADY_CANCELLED", "message": "Trip is already cancelled"}}
        )
    
    trip.status = "cancelled"

    await db.commit()
    await db.refresh(trip)
    try:
        reg = trip.vehicle.registration_number if trip.vehicle else trip.vehicle_id[:8]
        await notif_svc.trip_status_changed(db, company_id=company_id, trip_id=trip.id, vehicle_reg=reg, new_status="cancelled")
        await db.commit()
    except Exception:
        pass
    return trip


@router.post("/{trip_id}/reassign", response_model=TripResponse, summary="Reassign trip to different vehicle")
async def reassign_trip(
    trip_id: str,
    payload: TripReassignRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)),
):
    """
    Reassign a trip to a different vehicle and optionally update driver details.
    Can only reassign trips that are 'planned' or 'in_transit'.
    """
    # Get the trip
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    
    if trip.status not in ["planned", "in_transit"]:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Cannot reassign trip with status: {trip.status}"}}
        )
    
    # Validate new vehicle belongs to company
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id)
    )
    new_vehicle = v_result.scalar_one_or_none()
    if not new_vehicle:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Target vehicle not found"}}
        )
    
    # Update trip
    trip.vehicle_id = payload.vehicle_id
    trip.vehicle_reg = new_vehicle.registration_number
    trip.vehicle_type = new_vehicle.vehicle_type
    
    if payload.driver_name is not None:
        trip.driver_name = payload.driver_name
    else:
        trip.driver_name = new_vehicle.driver_name
    
    if payload.driver_phone is not None:
        trip.driver_phone = payload.driver_phone
    else:
        trip.driver_phone = new_vehicle.driver_phone
    
    await db.commit()
    await db.refresh(trip)
    return trip


@router.post("/{trip_id}/start", response_model=TripResponse, summary="Start a planned trip")
async def start_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    """
    Mark a planned trip as 'in_transit'.
    Sets actual_departure to current time.
    """
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    
    if trip.status != "planned":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Can only start trips with status 'planned'. Current status: {trip.status}"}}
        )
    
    trip.status = "in_transit"
    trip.actual_departure = datetime.utcnow()

    await db.commit()
    await db.refresh(trip)
    try:
        reg = trip.vehicle.registration_number if trip.vehicle else trip.vehicle_id[:8]
        await notif_svc.trip_status_changed(db, company_id=company_id, trip_id=trip.id, vehicle_reg=reg, new_status="in_transit")
        await db.commit()
    except Exception:
        pass
    return trip


@router.post("/{trip_id}/complete", response_model=TripResponse, summary="Complete a trip")
async def complete_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    """
    Mark a trip as 'completed'.
    Sets actual_arrival to current time.
    """
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    
    if trip.status == "completed":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "ALREADY_COMPLETED", "message": "Trip is already completed"}}
        )
    
    if trip.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": "Cannot complete a cancelled trip"}}
        )
    
    trip.status = "completed"
    trip.actual_arrival = datetime.utcnow()

    await db.commit()
    await db.refresh(trip)
    try:
        reg = trip.vehicle.registration_number if trip.vehicle else trip.vehicle_id[:8]
        await notif_svc.trip_status_changed(db, company_id=company_id, trip_id=trip.id, vehicle_reg=reg, new_status="completed")
        await db.commit()
    except Exception:
        pass
    return trip


@router.post("/{trip_id}/archive", response_model=TripResponse, summary="Archive a completed trip")
async def archive_trip(
    trip_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    """
    Archive a completed or cancelled trip.
    Archived trips are kept for record-keeping but filtered from active lists.
    """
    q = (
        select(Trip)
        .join(Vehicle, Trip.vehicle_id == Vehicle.id)
        .where(Trip.id == trip_id, Vehicle.company_id == company_id)
        .options(selectinload(Trip.origin), selectinload(Trip.destination), selectinload(Trip.vehicle))
    )
    result = await db.execute(q)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Trip not found"}})
    
    if trip.status not in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": "Only completed or cancelled trips can be archived"}}
        )
    
    # Add archived status (you might want to add an 'archived' boolean field to the Trip model)
    # For now, we'll use a status
    trip.status = "archived"
    
    await db.commit()
    await db.refresh(trip)
    return trip
