from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
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
from app.services import notifications as notif_svc

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
        .options(
            selectinload(GatePass.vehicle),
            selectinload(GatePass.trip)
        )
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
        .options(
            selectinload(GatePass.vehicle),
            selectinload(GatePass.trip)
        )
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

    now = datetime.now(timezone.utc)

    # ── One active pass per trip enforcement ──────────────────────────────────
    # If a trip_id is provided, find any existing active passes for that trip
    # and auto-revoke them before issuing the new one.
    if payload.trip_id:
        existing_q = await db.execute(
            select(GatePass).where(
                GatePass.trip_id == payload.trip_id,
                GatePass.status.in_([
                    GatePassStatus.PRE_APPROVED,
                    GatePassStatus.APPROVED,
                ])
            )
        )
        existing_active = existing_q.scalars().all()
        for old_pass in existing_active:
            old_pass.status = GatePassStatus.REVOKED
            old_pass.updated_at = now

    pass_number = _generate_pass_number(payload.vehicle_reg)
    gate_pass = GatePass(
        id=str(uuid.uuid4()),
        pass_number=pass_number,
        updated_at=now,
        **payload.model_dump(),
    )
    db.add(gate_pass)
    await db.commit()
    await db.refresh(gate_pass)
    # ── Notification ──
    try:
        v_result2 = await db.execute(select(Vehicle).where(Vehicle.id == gate_pass.vehicle_id))
        vh2 = v_result2.scalar_one_or_none()
        company_id_for_notif = vh2.company_id if vh2 else company_id
        await notif_svc.gate_pass_issued(
            db, company_id=company_id_for_notif,
            pass_id=gate_pass.id, pass_number=gate_pass.pass_number,
            vehicle_reg=gate_pass.vehicle_reg, terminal=gate_pass.terminal_name
        )
        await db.commit()
    except Exception:
        pass
    return gate_pass


@router.get("/{pass_id}/qr-code", summary="Get gate pass QR code image")
async def get_gate_pass_qr_code(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Generate QR code image for gate pass verification"""
    import qrcode
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    q = (
        select(GatePass)
        .options(selectinload(GatePass.vehicle))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    # Generate verification URL or data
    qr_data = {
        "pass_number": gate_pass.pass_number,
        "vehicle_reg": gate_pass.vehicle_reg,
        "terminal": gate_pass.terminal_name,
        "valid_until": gate_pass.time_window_end.isoformat(),
        "verify_url": f"https://turnaround.africa/verify/{gate_pass.pass_number}"
    }
    
    # Create QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(str(qr_data))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return StreamingResponse(buf, media_type="image/png")


@router.get("/{pass_id}/download", summary="Download gate pass as PDF")
async def download_gate_pass_pdf(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Generate and download gate pass as PDF document"""
    # TODO: Implement PDF generation using reportlab or similar
    # For now, return JSON
    q = (
        select(GatePass)
        .options(
            selectinload(GatePass.vehicle),
            selectinload(GatePass.trip)
        )
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    # Return the gate pass data (PDF generation to be implemented)
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
        .options(
            selectinload(GatePass.vehicle),
            selectinload(GatePass.trip)
        )
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


# ── Enhanced Gate Pass Controls ──────────────────────────────────────────────

@router.post("/{pass_id}/approve", response_model=GatePassResponse, summary="Approve gate pass")
async def approve_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    """Approve a pre-approved or pending gate pass. Admin/Fleet Manager only."""
    q = (
        select(GatePass)
        .options(selectinload(GatePass.vehicle))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    if gate_pass.status in [GatePassStatus.REVOKED, GatePassStatus.EXPIRED]:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Cannot approve gate pass with status: {gate_pass.status.value}"}}
        )
    
    gate_pass.status = GatePassStatus.APPROVED
    gate_pass.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(gate_pass)
    return gate_pass


@router.post("/{pass_id}/revoke", response_model=GatePassResponse, summary="Revoke gate pass")
async def revoke_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    """
    Revoke an active gate pass. This immediately invalidates the pass.
    Admin/Fleet Manager only.
    """
    q = (
        select(GatePass)
        .options(selectinload(GatePass.vehicle))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    if gate_pass.status == GatePassStatus.USED:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "ALREADY_USED", "message": "Cannot revoke a gate pass that has already been used"}}
        )
    
    gate_pass.status = GatePassStatus.REVOKED
    gate_pass.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(gate_pass)
    # ── Notification ──
    try:
        v_res = await db.execute(select(Vehicle).where(Vehicle.id == gate_pass.vehicle_id))
        vh = v_res.scalar_one_or_none()
        cid = vh.company_id if vh else company_id
        await notif_svc.gate_pass_revoked(
            db, company_id=cid, pass_id=gate_pass.id,
            pass_number=gate_pass.pass_number, vehicle_reg=gate_pass.vehicle_reg
        )
        await db.commit()
    except Exception:
        pass
    return gate_pass


@router.post("/{pass_id}/reissue", response_model=GatePassResponse, status_code=status.HTTP_201_CREATED, summary="Reissue gate pass")
async def reissue_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)),
):
    """
    Create a new gate pass based on an expired or revoked pass.
    The original pass remains in the system for audit purposes.
    """
    q = (
        select(GatePass)
        .options(selectinload(GatePass.vehicle))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    original_pass = result.scalar_one_or_none()
    
    if not original_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    # Generate new pass based on original
    pass_number = _generate_pass_number(original_pass.vehicle_reg)
    now = datetime.now(timezone.utc)
    
    # Calculate new time window (extend by same duration as original)
    from datetime import timedelta
    original_duration = original_pass.time_window_end - original_pass.time_window_start
    new_start = now
    new_end = now + original_duration
    
    new_pass = GatePass(
        id=str(uuid.uuid4()),
        pass_number=pass_number,
        vehicle_id=original_pass.vehicle_id,
        trip_id=original_pass.trip_id,
        vehicle_reg=original_pass.vehicle_reg,
        vehicle_type=original_pass.vehicle_type,
        driver_name=original_pass.driver_name,
        driver_phone=original_pass.driver_phone,
        container_number=original_pass.container_number,
        customs_seal_number=original_pass.customs_seal_number,
        cargo_type=original_pass.cargo_type,
        cargo_weight_tonnes=original_pass.cargo_weight_tonnes,
        terminal_name=original_pass.terminal_name,
        time_window_start=new_start,
        time_window_end=new_end,
        status=GatePassStatus.PRE_APPROVED,
        carrier_name=original_pass.carrier_name,
        created_at=now,
        updated_at=now,
    )
    
    db.add(new_pass)
    await db.commit()
    await db.refresh(new_pass)
    
    return new_pass


@router.post("/{pass_id}/mark-used", response_model=GatePassResponse, summary="Mark gate pass as used")
async def mark_gate_pass_used(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    """Mark a gate pass as used when vehicle enters the terminal."""
    q = (
        select(GatePass)
        .options(selectinload(GatePass.vehicle))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    if gate_pass.status not in [GatePassStatus.PRE_APPROVED, GatePassStatus.APPROVED]:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Cannot mark gate pass as used from status: {gate_pass.status.value}"}}
        )
    
    gate_pass.status = GatePassStatus.USED
    gate_pass.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(gate_pass)
    return gate_pass


@router.delete("/{pass_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete gate pass")
async def delete_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN)),
):
    """
    Permanently delete a gate pass. Admin only.
    Consider using revoke instead for audit trail purposes.
    """
    q = (
        select(GatePass)
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(GatePass.id == pass_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    gate_pass = result.scalar_one_or_none()
    
    if not gate_pass:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}})
    
    await db.delete(gate_pass)
    await db.commit()
    return None
