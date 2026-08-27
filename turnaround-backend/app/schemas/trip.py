from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.trip import TripStatus
from app.schemas.location import LocationResponse
from app.schemas.vehicle import VehicleResponse


class TripBase(BaseModel):
    vehicle_id: str = Field(..., description="Assigned vehicle ID")
    origin_id: str = Field(..., description="Origin facility ID")
    destination_id: str = Field(..., description="Destination facility ID")
    planned_departure: Optional[datetime] = None
    planned_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    status: TripStatus = Field(TripStatus.PLANNED, description="Current trip status")


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    vehicle_id: Optional[str] = None
    origin_id: Optional[str] = None
    destination_id: Optional[str] = None
    planned_departure: Optional[datetime] = None
    planned_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    status: Optional[TripStatus] = None


class TripResponse(TripBase):
    id: str
    created_at: datetime
    origin: Optional[LocationResponse] = None
    destination: Optional[LocationResponse] = None

    model_config = ConfigDict(from_attributes=True)
