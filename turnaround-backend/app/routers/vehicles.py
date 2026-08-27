from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models.vehicle import Vehicle
from app.db.models.user import UserRole, User
from app.deps import get_current_user, get_current_company
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
import uuid

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)


@router.get("", response_model=PaginatedResponse[VehicleResponse], summary="List fleet vehicles")
async def list_vehicles(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    base_q = select(Vehicle).where(Vehicle.company_id == company_id)
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
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id))
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
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id))
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
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})
    await db.delete(vehicle)
    await db.commit()
