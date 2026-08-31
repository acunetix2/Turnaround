from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.demurrage_claim import ResponsibleParty, ClaimStatus


class DemurrageClaimBase(BaseModel):
    vehicle_id: str = Field(..., description="Vehicle FK")
    location_id: str = Field(..., description="Location FK")
    dwell_event_id: Optional[str] = Field(None, description="Linked dwell event FK")

    vehicle_reg: str = Field(..., description="Vehicle registration number (denormalised)")
    location_name: str = Field(..., description="Location name (denormalised)")

    container_number: Optional[str] = None
    driver_name: Optional[str] = None
    carrier_name: str

    responsible_party: ResponsibleParty
    arrival_time: datetime
    departure_time: Optional[datetime] = None

    sla_threshold_minutes: int
    total_dwell_minutes: int
    excess_delay_minutes: int
    hourly_operating_rate: float
    claimed_amount_kes: float
    settled_amount_kes: Optional[float] = None

    status: ClaimStatus = ClaimStatus.FLAGGED

    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    settlement_date: Optional[datetime] = None
    dispute_reason: Optional[str] = None
    notes: Optional[str] = None


class DemurrageClaimCreate(DemurrageClaimBase):
    pass


class DemurrageClaimUpdate(BaseModel):
    responsible_party: Optional[ResponsibleParty] = None
    status: Optional[ClaimStatus] = None
    settled_amount_kes: Optional[float] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    settlement_date: Optional[datetime] = None
    dispute_reason: Optional[str] = None
    notes: Optional[str] = None
    departure_time: Optional[datetime] = None


class DemurrageClaimResponse(DemurrageClaimBase):
    id: str
    claim_number: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DemurrageSummary(BaseModel):
    """Aggregated KPI response for /demurrage/summary."""
    total_claims: int
    total_claimed_kes: float
    total_settled_kes: float
    recovery_rate_pct: float
    flagged_count: int
    invoiced_count: int
    disputed_count: int
    settled_count: int
    written_off_count: int
