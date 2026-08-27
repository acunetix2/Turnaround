from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.location import LocationType


class LocationBase(BaseModel):
    name: str = Field(..., description="Location/Facility name e.g. Kilindini Port Gate 14")
    location_type: LocationType = Field(LocationType.WAREHOUSE, description="Type of terminal or corridor facility")
    latitude: float = Field(..., description="Geographical latitude coordinate")
    longitude: float = Field(..., description="Geographical longitude coordinate")
    geofence_radius: float = Field(250.0, description="Geofence boundary radius in meters")
    expected_dwell_minutes: float = Field(90.0, description="Baseline expected turnaround duration in minutes")
    customer_sla_minutes: Optional[float] = Field(None, description="Customer contractual SLA in minutes")


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    location_type: Optional[LocationType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius: Optional[float] = None
    expected_dwell_minutes: Optional[float] = None
    customer_sla_minutes: Optional[float] = None


class LocationResponse(LocationBase):
    id: str
    company_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
