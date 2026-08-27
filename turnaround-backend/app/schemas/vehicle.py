from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.vehicle import VehicleStatus


class VehicleBase(BaseModel):
    registration_number: str = Field(..., description="Vehicle registration plate e.g. KBZ 482T")
    vehicle_type: str = Field("Semi-Trailer Truck", description="Vehicle classification")
    capacity: Optional[float] = Field(None, description="Payload capacity in tonnes")
    hourly_operating_cost: float = Field(3500.0, description="Operating cost per hour in KES")
    status: VehicleStatus = Field(VehicleStatus.ACTIVE, description="Current vehicle operational state")


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    hourly_operating_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None


class VehicleResponse(VehicleBase):
    id: str
    company_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
