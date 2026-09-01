from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.trip import TripStatus
from app.schemas.location import LocationResponse


class TripCheckpoint(BaseModel):
    """Computed waypoint status derived from real DwellEvent records for this trip."""
    location_id: str
    location_name: str
    location_type: str
    status: str  # "completed" | "current" | "pending"
    arrival_time: Optional[datetime] = None
    departure_time: Optional[datetime] = None
    actual_dwell_minutes: Optional[float] = None
    expected_dwell_minutes: float
    excess_dwell_minutes: Optional[float] = None
    estimated_cost: Optional[float] = None


class TripBase(BaseModel):
    vehicle_id: str = Field(..., description="Assigned vehicle ID")
    origin_id: str = Field(..., description="Origin facility ID")
    destination_id: str = Field(..., description="Destination facility ID")
    planned_departure: Optional[datetime] = None
    planned_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    status: TripStatus = Field(TripStatus.PLANNED, description="Current trip status")
    corridor_name: Optional[str] = Field(None, description="Trade corridor name e.g. Northern Corridor")
    customs_seal_number: Optional[str] = Field(None, description="KRA/customs seal number")
    container_number: Optional[str] = Field(None, description="ISO container number")
    cargo_description: Optional[str] = Field(None, description="Free-text cargo description")
    cargo_type: Optional[str] = Field(None, description="Cargo category e.g. General Merchandise")
    cargo_weight_tonnes: Optional[float] = Field(None, description="Cargo weight in metric tonnes")


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
    corridor_name: Optional[str] = None
    customs_seal_number: Optional[str] = None
    container_number: Optional[str] = None
    cargo_description: Optional[str] = None
    cargo_type: Optional[str] = None
    cargo_weight_tonnes: Optional[float] = None


class TripResponse(TripBase):
    id: str
    created_at: datetime
    origin: Optional[LocationResponse] = None
    destination: Optional[LocationResponse] = None
    # Computed from real DwellEvent records — empty list when no dwell data exists yet
    checkpoints: List[TripCheckpoint] = []

    model_config = ConfigDict(from_attributes=True)
