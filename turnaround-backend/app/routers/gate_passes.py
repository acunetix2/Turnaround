from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timezone

from app.db.session import get_db
from app.db.models.gate_pass import GatePass, GatePassStatus
from app.db.models.vehicle import Vehicle
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.schemas.gate_pass import GatePassCreate, GatePassUpdate, GatePassResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role

router = APIRouter(prefix="/gate-passes", tags=["Gate Passes"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)


def _generate_pass_number(vehicle_reg: str) -> str:
    reg_clean = vehicle_reg.replace(" ", "").upper()
    ts = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = str(uuid.uuid4().int)[:4].zfill(4)
    return f"GP-{reg_clean}-{ts}-{suffix}"


@router.get("", response_model=PaginatedResponse[GatePassResponse], summary="List gate passes")
async def list_gate_passes(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    vehicle_id: Optional[str] = Query(None),
    pass_status: Optional[str] = Query(None, alias="status"),
    trip_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    base_q = (
        select(GatePass)
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
    )
    if vehicle_id:
        base_q = base_q.where(GatePass.vehicle_id == vehicle_id)
    if trip_id:
        base_q = base_q.where(GatePass.trip_id == trip_id)
    if pass_status:
        try:
            base_q = base_q.where(GatePass.status == GatePassStatus(pass_status))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {pass_status}")

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(GatePass.created_at.desc())
    result = await db.execute(items_q)
    passes = result.scalars().all()

    return PaginatedResponse(items=list(passes), total=total, limit=limit, offset=offset)


@router.get("/{pass_id}", response_model=GatePassResponse, summary="Get gate pass by ID")
async def get_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    q = (
        select(GatePass)
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    return gate_pass


@router.post("", response_model=GatePassResponse, status_code=status.HTTP_201_CREATED, summary="Issue a gate pass")
async def create_gate_pass(
    payload: GatePassCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    # Validate vehicle belongs to company
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id))
    if not v_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    pass_number = _generate_pass_number(payload.vehicle_reg)
    now = datetime.now(timezone.utc)
    gate_pass = GatePass(
        id=str(uuid.uuid4()),
        pass_number=pass_number,
        updated_at=now,
        **payload.model_dump(),
    )
    db.add(gate_pass)
    await db.commit()
    await db.refresh(gate_pass)
    return gate_pass


@router.patch("/{pass_id}", response_model=GatePassResponse, summary="Update gate pass status")
async def update_gate_pass(
    pass_id: str,
    payload: GatePassUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    q = (
        select(GatePass)
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(gate_pass, key, value)
    gate_pass.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(gate_pass)
    return gate_pass
