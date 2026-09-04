from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


class FleetStaffCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=32)
    license_number: Optional[str] = Field(None, max_length=64)
    staff_type: Literal['driver', 'co_driver', 'maintenance_technician', 'engineer', 'supervisor'] = 'driver'
    status: Literal['active', 'inactive'] = 'active'
    license_expiry_date: Optional[str] = None
    availability_status: Literal['available', 'on_leave', 'driving', 'assigned', 'unavailable'] = 'available'
    notes: Optional[str] = None


class FleetStaffUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=32)
    license_number: Optional[str] = Field(None, max_length=64)
    staff_type: Optional[Literal['driver', 'co_driver', 'maintenance_technician', 'engineer', 'supervisor']] = None
    status: Optional[Literal['active', 'inactive']] = None
    license_expiry_date: Optional[str] = None
    availability_status: Optional[Literal['available', 'on_leave', 'driving', 'assigned', 'unavailable']] = None
    notes: Optional[str] = None


class FleetStaffResponse(FleetStaffCreate):
    id: str
    company_id: str
    created_at: datetime
    assigned_vehicle_count: int = 0

    model_config = ConfigDict(from_attributes=True)