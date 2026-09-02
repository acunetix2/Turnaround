from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.gate_pass import GatePassStatus


class GatePassBase(BaseModel):
    vehicle_id: str = Field(..., description="Vehicle FK")
    trip_id: Optional[str] = Field(None, description="Linked trip FK")
    # NOTE: issued_by is intentionally excluded from client input.
    # It is populated server-side from the authenticated JWT user.

    vehicle_reg: str = Field(..., description="Vehicle registration (denormalised)")
    vehicle_type: Optional[str] = None

    driver_name: str
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None

    container_number: Optional[str] = None
    customs_seal_number: Optional[str] = None
    cargo_type: Optional[str] = None
    cargo_weight_tonnes: Optional[float] = None

    terminal_name: str
    terminal_gate: Optional[str] = None

    time_window_start: datetime
    time_window_end: datetime

    status: GatePassStatus = GatePassStatus.PRE_APPROVED
    carrier_name: Optional[str] = None
    digital_signature: Optional[str] = None


class GatePassCreate(GatePassBase):
    pass


class GatePassUpdate(BaseModel):
    status: Optional[GatePassStatus] = None
    terminal_gate: Optional[str] = None
    time_window_start: Optional[datetime] = None
    time_window_end: Optional[datetime] = None
    customs_seal_number: Optional[str] = None
    digital_signature: Optional[str] = None


class GatePassResponse(GatePassBase):
    id: str
    pass_number: str
    issued_by: Optional[str] = None           # user UUID
    issued_by_name: Optional[str] = None      # resolved display name
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
