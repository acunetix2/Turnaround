from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models.location import Location
from app.db.models.user import UserRole, User
from app.deps import get_current_user, get_current_company
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
import uuid

router = APIRouter(prefix="/locations", tags=["Locations"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)


@router.get("", response_model=PaginatedResponse[LocationResponse], summary="List operational locations")
async def list_locations(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    location_type: Optional[str] = Query(None),
):
    base_q = select(Location).where(Location.company_id == company_id)
    if location_type:
        base_q = base_q.where(Location.location_type == location_type)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(Location.name)
    result = await db.execute(items_q)
    locations = result.scalars().all()

    return PaginatedResponse(items=list(locations), total=total, limit=limit, offset=offset)


@router.get("/{location_id}", response_model=LocationResponse, summary="Get a location by ID")
async def get_location(
    location_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    result = await db.execute(select(Location).where(Location.id == location_id, Location.company_id == company_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Location not found"}})
    return location


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED, summary="Register a terminal or location")
async def create_location(
    payload: LocationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    location = Location(id=str(uuid.uuid4()), company_id=company_id, **payload.model_dump())
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


@router.patch("/{location_id}", response_model=LocationResponse, summary="Update location configuration")
async def update_location(
    location_id: str,
    payload: LocationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    result = await db.execute(select(Location).where(Location.id == location_id, Location.company_id == company_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Location not found"}})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Decommission or remove location geofence")
async def delete_location(
    location_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    result = await db.execute(select(Location).where(Location.id == location_id, Location.company_id == company_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Location not found"}})

    await db.delete(location)
    await db.commit()
    return None

