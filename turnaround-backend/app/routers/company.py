"""Company Configuration Router — read and update company settings"""
from typing import Annotated, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.company import Company
from app.db.models.user import UserRole
from app.deps import get_current_company
from app.auth.rbac import require_role

router = APIRouter(prefix="/company", tags=["Company Configuration"])

ADMIN_ONLY = require_role(UserRole.ADMIN)


class CompanyConfigResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    registration_number: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[str] = None
    welcome_motto: Optional[str] = None
    privacy_policy: Optional[str] = None
    terms_of_service: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: str = 'KES'
    timezone: str = 'Africa/Nairobi'
    default_corridor: Optional[str] = None
    sla_warning_threshold_minutes: int = 30
    sla_breach_threshold_minutes: int = 60
    hourly_operating_rate: float = 7500
    demurrage_rate_multiplier: float = 1.5
    gps_polling_interval_seconds: int = 30
    geofence_buffer_meters: int = 100
    auto_revoke_expired_passes: bool = True
    notify_on_delay: bool = True
    notify_on_gate_pass: bool = True
    integrations: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyConfigUpdate(BaseModel):
    name: Optional[str] = None
    registration_number: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[str] = None
    welcome_motto: Optional[str] = None
    privacy_policy: Optional[str] = None
    terms_of_service: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    default_corridor: Optional[str] = None
    sla_warning_threshold_minutes: Optional[int] = None
    sla_breach_threshold_minutes: Optional[int] = None
    hourly_operating_rate: Optional[float] = None
    demurrage_rate_multiplier: Optional[float] = None
    gps_polling_interval_seconds: Optional[int] = None
    geofence_buffer_meters: Optional[int] = None
    auto_revoke_expired_passes: Optional[bool] = None
    notify_on_delay: Optional[bool] = None
    notify_on_gate_pass: Optional[bool] = None
    integrations: Optional[dict] = None

    model_config = ConfigDict(extra='ignore')


class PublicLegalResponse(BaseModel):
    company_id: str
    company_name: str
    privacy_policy: Optional[str] = None
    terms_of_service: Optional[str] = None


@router.get("/public-legal", response_model=PublicLegalResponse, summary="Get published public legal content")
async def get_public_legal(
    company_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return only content intentionally published as public legal information."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return PublicLegalResponse(
        company_id=company.id,
        company_name=company.name,
        privacy_policy=company.privacy_policy,
        terms_of_service=company.terms_of_service,
    )


@router.get("", response_model=CompanyConfigResponse, summary="Get company configuration")
async def get_company_config(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Returns full company configuration. Accessible by all authenticated users."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyConfigResponse.model_validate(company)


@router.patch("", response_model=CompanyConfigResponse, summary="Update company configuration")
async def update_company_config(
    payload: CompanyConfigUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _admin: bool = Depends(ADMIN_ONLY),
):
    """Update company configuration. Admin only."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return CompanyConfigResponse.model_validate(company)
