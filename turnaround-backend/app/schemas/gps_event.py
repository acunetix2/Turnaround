from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GPSEventCreate(BaseModel):
    vehicle_id: str = Field(..., description="Vehicle identifier plate or UUID")
    latitude: float = Field(..., description="GPS latitude coordinate")
    longitude: float = Field(..., description="GPS longitude coordinate")
    speed: float = Field(0.0, description="Speed in km/h")
    heading: float = Field(0.0, description="Compass heading degrees")
    recorded_at: datetime = Field(..., description="Timestamp of telemetry reading (UTC)")


class GPSBatchIngest(BaseModel):
    events: List[GPSEventCreate]


class GPSEventResponse(BaseModel):
    id: str
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float
    heading: float
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IngestionResult(BaseModel):
    processed: int
    duplicates_ignored: int
    dwell_events_updated: int
