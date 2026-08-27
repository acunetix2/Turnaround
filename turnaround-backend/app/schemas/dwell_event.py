from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.location import LocationResponse
from app.schemas.vehicle import VehicleResponse


class DwellEventResponse(BaseModel):
    id: str
    vehicle_id: str
    location_id: str
    trip_id: Optional[str] = None
    arrival_time: datetime
    departure_time: Optional[datetime] = None  # None indicates in-progress live dwell
    dwell_minutes: float = Field(..., description="Actual elapsed minutes inside geofence")
    expected_minutes: float = Field(..., description="Baseline expected allowance in minutes")
    excess_minutes: float = Field(..., description="Excess delay beyond expected dwell")
    estimated_cost: float = Field(..., description="Calculated financial loss in KES")
    created_at: datetime
    location: Optional[LocationResponse] = None
    vehicle: Optional[VehicleResponse] = None

    model_config = ConfigDict(from_attributes=True)
