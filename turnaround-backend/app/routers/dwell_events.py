from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.dwell_event import DwellEvent
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.deps import get_current_company
from app.schemas.dwell_event import DwellEventResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/dwell-events", tags=["Dwell Events"])


def _build_company_scoped_query(company_id: str, vehicle_id: Optional[str] = None):
    q = (
        select(DwellEvent)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
        .options(selectinload(DwellEvent.vehicle), selectinload(DwellEvent.location))
    )
    if vehicle_id:
        q = q.where(DwellEvent.vehicle_id == vehicle_id)
    return q


@router.get("", response_model=PaginatedResponse[DwellEventResponse], summary="List dwell events for fleet")
async def list_dwell_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    in_progress: Optional[bool] = Query(None, description="Filter to live active dwells only"),
    location_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    base_q = _build_company_scoped_query(company_id)
    if in_progress is True:
        base_q = base_q.where(DwellEvent.departure_time.is_(None))
    elif in_progress is False:
        base_q = base_q.where(DwellEvent.departure_time.isnot(None))
    if location_id:
        base_q = base_q.where(DwellEvent.location_id == location_id)

    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    items = (await db.execute(base_q.order_by(DwellEvent.arrival_time.desc()).offset(offset).limit(limit))).scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/{vehicle_id}", response_model=PaginatedResponse[DwellEventResponse],
            summary="Get dwell events for a specific vehicle (incl. live active dwell)")
async def get_vehicle_dwell_events(
    vehicle_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    in_progress: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # Verify vehicle belongs to company
    v = (await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.company_id == company_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    base_q = _build_company_scoped_query(company_id, vehicle_id=vehicle_id)
    if in_progress is True:
        base_q = base_q.where(DwellEvent.departure_time.is_(None))
    elif in_progress is False:
        base_q = base_q.where(DwellEvent.departure_time.isnot(None))

    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    items = (await db.execute(base_q.order_by(DwellEvent.arrival_time.desc()).offset(offset).limit(limit))).scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)
