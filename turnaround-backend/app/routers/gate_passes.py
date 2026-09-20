"""
Gate Passes Router
==================
Handles all gate pass lifecycle:
  - Create (issued_by populated from JWT, duplicate prevention per trip)
  - List / Get (with lazy expiry on read)
  - Update (status transition)
  - Revoke (cancel an active pass)
  - QR code generation
  - PDF download (stub → implemented in Task 11)
"""
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
from app.db.models.user import User, UserRole
from app.deps import get_current_company, get_current_user
from app.schemas.gate_pass import GatePassCreate, GatePassUpdate, GatePassResponse
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role
from app.services import notifications as notif_svc

router = APIRouter(prefix="/gate-passes", tags=["Gate Passes"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_pass_number(vehicle_reg: str) -> str:
    reg_clean = vehicle_reg.replace(" ", "").upper()
    ts = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = str(uuid.uuid4().int)[:4].zfill(4)
    return f"GP-{reg_clean}-{ts}-{suffix}"


def _apply_expiry(gp: GatePass) -> GatePass:
    """Lazily expire a pre-approved pass whose time window has passed."""
    if gp.status == GatePassStatus.PRE_APPROVED and gp.time_window_end < datetime.now(timezone.utc):
        gp.status = GatePassStatus.EXPIRED
    return gp


def _to_response(gp: GatePass, issuer: Optional[User] = None) -> GatePassResponse:
    """Build a GatePassResponse, attaching the resolved issuer display name."""
    data = GatePassResponse.model_validate(gp)
    if issuer:
        data.issued_by_name = issuer.name
    elif gp.issued_by is None:
        data.issued_by_name = "System"
    return data


# ── Query helpers ─────────────────────────────────────────────────────────────

def _base_query(company_id: str):
    return (
        select(GatePass)
        .options(selectinload(GatePass.vehicle), selectinload(GatePass.trip))
        .join(Vehicle, GatePass.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
    )


async def _fetch_one(db: AsyncSession, company_id: str, pass_id: str) -> GatePass:
    result = await db.execute(_base_query(company_id).where(GatePass.id == pass_id))
    gp = result.scalar_one_or_none()
    if not gp:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Gate pass not found"}},
        )
    return gp


async def _resolve_issuer(db: AsyncSession, issued_by_id: Optional[str]) -> Optional[User]:
    if not issued_by_id:
        return None
    result = await db.execute(select(User).where(User.id == issued_by_id))
    return result.scalar_one_or_none()


# ── Routes ────────────────────────────────────────────────────────────────────

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
    base_q = _base_query(company_id)
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

    # Lazy expiry — update status in-place and flush changed ones
    changed = []
    responses = []
    for gp in passes:
        before = gp.status
        _apply_expiry(gp)
        if gp.status != before:
            changed.append(gp)
        issuer = await _resolve_issuer(db, gp.issued_by)
        responses.append(_to_response(gp, issuer))

    if changed:
        await db.commit()

    return PaginatedResponse(items=responses, total=total, limit=limit, offset=offset)


@router.get("/{pass_id}", response_model=GatePassResponse, summary="Get gate pass by ID")
async def get_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    gp = await _fetch_one(db, company_id, pass_id)
    before = gp.status
    _apply_expiry(gp)
    if gp.status != before:
        await db.commit()
    issuer = await _resolve_issuer(db, gp.issued_by)
    return _to_response(gp, issuer)


@router.post(
    "",
    response_model=GatePassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue a gate pass",
)
async def create_gate_pass(
    payload: GatePassCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    # Validate vehicle belongs to company
    v_result = await db.execute(
        select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id)
    )
    if not v_result.scalar_one_or_none():
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}},
        )

    # ── Duplicate prevention: one active pass per trip ────────────────────────
    if payload.trip_id:
        dup_result = await db.execute(
            select(GatePass).where(
                GatePass.trip_id == payload.trip_id,
                GatePass.status.notin_([GatePassStatus.EXPIRED, GatePassStatus.CANCELLED]),
            )
        )
        existing = dup_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "code": "DUPLICATE_PASS",
                        "message": "An active gate pass already exists for this trip.",
                        "existing_pass_id": existing.id,
                        "existing_pass_number": existing.pass_number,
                    }
                },
            )

    pass_number = _generate_pass_number(payload.vehicle_reg)
    now = datetime.now(timezone.utc)
    gate_pass = GatePass(
        id=str(uuid.uuid4()),
        pass_number=pass_number,
        issued_by=current_user.id,   # ← audit trail
        updated_at=now,
        **payload.model_dump(),
    )
    db.add(gate_pass)
    await db.commit()
    await db.refresh(gate_pass)
    await notif_svc.gate_pass_issued(
        db, company_id=company_id, pass_id=gate_pass.id,
        pass_number=gate_pass.pass_number,
        vehicle_reg=gate_pass.vehicle_reg,
        terminal=gate_pass.terminal_name,
    )
    await db.commit()
    return _to_response(gate_pass, current_user)


@router.patch("/{pass_id}", response_model=GatePassResponse, summary="Update gate pass")
async def update_gate_pass(
    pass_id: str,
    payload: GatePassUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    gp = await _fetch_one(db, company_id, pass_id)
    previous_status = gp.status
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(gp, key, value)
    gp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(gp)
    if "status" in update_data and gp.status != previous_status:
        await notif_svc.gate_pass_status_changed(
            db, company_id=company_id, pass_id=gp.id,
            pass_number=gp.pass_number,
            status=gp.status.value,
        )
        await db.commit()
    issuer = await _resolve_issuer(db, gp.issued_by)
    return _to_response(gp, issuer)


@router.post("/{pass_id}/revoke", response_model=GatePassResponse, summary="Revoke (cancel) a gate pass")
async def revoke_gate_pass(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    """
    Cancels a pre-approved gate pass. Only PRE_APPROVED passes can be revoked —
    passes that are already cleared, inspected, expired, or cancelled are rejected.
    """
    gp = await _fetch_one(db, company_id, pass_id)

    if gp.status != GatePassStatus.PRE_APPROVED:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "INVALID_TRANSITION",
                    "message": f"Only pre_approved passes can be revoked. Current status: {gp.status.value}",
                }
            },
        )

    gp.status = GatePassStatus.CANCELLED
    gp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(gp)
    await notif_svc.gate_pass_revoked(
        db, company_id=company_id, pass_id=gp.id,
        pass_number=gp.pass_number, vehicle_reg=gp.vehicle_reg,
    )
    await db.commit()
    issuer = await _resolve_issuer(db, gp.issued_by)
    return _to_response(gp, issuer)


@router.get("/{pass_id}/qr-code", summary="Get gate pass QR code image")
async def get_gate_pass_qr_code(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Generate QR code PNG for gate pass verification."""
    import qrcode
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    gp = await _fetch_one(db, company_id, pass_id)

    qr_data = (
        f"PASS:{gp.pass_number}|VEH:{gp.vehicle_reg}"
        f"|TERM:{gp.terminal_name}|UNTIL:{gp.time_window_end.isoformat()}"
        f"|STATUS:{gp.status.value.upper()}"
        f"|VERIFY:https://turnaround.com/verify/{gp.pass_number}"
    )

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/{pass_id}/download", summary="Download gate pass as PDF")
async def download_gate_pass_pdf(
    pass_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Generate and stream a gate pass as a PDF document."""
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    from app.engines.pdf import render_gate_pass_pdf

    gp = await _fetch_one(db, company_id, pass_id)
    _apply_expiry(gp)

    # Attach issuer name so the PDF template can display it
    issuer = await _resolve_issuer(db, gp.issued_by)
    gp.issued_by_name = issuer.name if issuer else "System"  # transient attr

    try:
        pdf_bytes = render_gate_pass_pdf(gp)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    filename = f"gate-pass-{gp.pass_number}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
