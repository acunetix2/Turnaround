from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timezone

from app.db.session import get_db
from app.db.models.demurrage_claim import DemurrageClaim, ClaimStatus, ResponsibleParty
from app.db.models.vehicle import Vehicle
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.schemas.demurrage import (
    DemurrageClaimCreate, DemurrageClaimUpdate,
    DemurrageClaimResponse, DemurrageSummary
)
from app.schemas.common import PaginatedResponse
from app.auth.rbac import require_role

router = APIRouter(prefix="/demurrage", tags=["Demurrage"])

WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)


def _generate_claim_number(location_name: str) -> str:
    prefix = (location_name[:3]).upper().replace(" ", "")
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4().int)[:4].zfill(4)
    return f"CLM-{prefix}-{year}-{suffix}"


@router.get("/claims", response_model=PaginatedResponse[DemurrageClaimResponse], summary="List demurrage claims")
async def list_claims(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    claim_status: Optional[str] = Query(None, alias="status"),
    responsible_party: Optional[str] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    base_q = (
        select(DemurrageClaim)
        .join(Vehicle, DemurrageClaim.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
    )
    if claim_status:
        try:
            base_q = base_q.where(DemurrageClaim.status == ClaimStatus(claim_status))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {claim_status}")
    if responsible_party:
        try:
            base_q = base_q.where(DemurrageClaim.responsible_party == ResponsibleParty(responsible_party))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid responsible_party: {responsible_party}")
    if vehicle_id:
        base_q = base_q.where(DemurrageClaim.vehicle_id == vehicle_id)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items_q = base_q.offset(offset).limit(limit).order_by(DemurrageClaim.created_at.desc())
    result = await db.execute(items_q)
    claims = result.scalars().all()

    return PaginatedResponse(items=list(claims), total=total, limit=limit, offset=offset)


@router.get("/summary", response_model=DemurrageSummary, summary="Demurrage KPI summary")
async def get_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    base_q = (
        select(DemurrageClaim)
        .join(Vehicle, DemurrageClaim.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id)
    )
    result = await db.execute(base_q)
    claims = result.scalars().all()

    total_claimed = sum(float(c.claimed_amount_kes) for c in claims)
    total_settled = sum(float(c.settled_amount_kes or 0) for c in claims)
    recovery_rate = (total_settled / total_claimed * 100) if total_claimed > 0 else 0.0

    status_counts = {s: 0 for s in ClaimStatus}
    for c in claims:
        status_counts[c.status] += 1

    return DemurrageSummary(
        total_claims=len(claims),
        total_claimed_kes=total_claimed,
        total_settled_kes=total_settled,
        recovery_rate_pct=round(recovery_rate, 1),
        flagged_count=status_counts[ClaimStatus.FLAGGED],
        invoiced_count=status_counts[ClaimStatus.INVOICED],
        disputed_count=status_counts[ClaimStatus.DISPUTED],
        settled_count=status_counts[ClaimStatus.SETTLED],
        written_off_count=status_counts[ClaimStatus.WRITTEN_OFF],
    )


@router.get("/claims/{claim_id}", response_model=DemurrageClaimResponse, summary="Get demurrage claim by ID")
async def get_claim(
    claim_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    q = (
        select(DemurrageClaim)
        .join(Vehicle, DemurrageClaim.vehicle_id == Vehicle.id)
        .where(DemurrageClaim.id == claim_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Claim not found"}})
    return claim


@router.post("/claims", response_model=DemurrageClaimResponse, status_code=status.HTTP_201_CREATED, summary="Create demurrage claim")
async def create_claim(
    payload: DemurrageClaimCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    # Validate vehicle belongs to company
    v_result = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id))
    if not v_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    claim_number = _generate_claim_number(payload.location_name)
    now = datetime.now(timezone.utc)
    claim = DemurrageClaim(
        id=str(uuid.uuid4()),
        claim_number=claim_number,
        updated_at=now,
        **payload.model_dump(),
    )
    db.add(claim)
    await db.commit()
    await db.refresh(claim)
    return claim


@router.patch("/claims/{claim_id}", response_model=DemurrageClaimResponse, summary="Update demurrage claim status")
async def update_claim(
    claim_id: str,
    payload: DemurrageClaimUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    q = (
        select(DemurrageClaim)
        .join(Vehicle, DemurrageClaim.vehicle_id == Vehicle.id)
        .where(DemurrageClaim.id == claim_id, Vehicle.company_id == company_id)
    )
    result = await db.execute(q)
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Claim not found"}})

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(claim, key, value)
    claim.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(claim)
    return claim
