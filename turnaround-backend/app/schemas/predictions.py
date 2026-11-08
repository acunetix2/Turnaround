from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DwellPredictionRequest(BaseModel):
    location_id: str = Field(..., description="Destination location UUID")
    planned_arrival: datetime = Field(..., description="Estimated arrival time")
    vehicle_id: Optional[str] = Field(None, description="Optional vehicle UUID for vehicle-specific cost estimation")
    vehicle_type: Optional[str] = Field("Semi-Trailer Truck", description="Vehicle classification")


class DwellPredictionResponse(BaseModel):
    location_id: str
    predicted_dwell_minutes: float
    confidence_interval_low: float
    confidence_interval_high: float
    sample_size: int
    expected_dwell_minutes: float
    predicted_excess_minutes: float
    hourly_operating_cost: float
    estimated_cost: float
    cost_interval_low: float
    cost_interval_high: float
    data_source: str
    model_version: str = "statistical-v1"


class DelayRiskRequest(BaseModel):
    location_id: str = Field(..., description="Destination location UUID")
    planned_arrival: datetime = Field(..., description="Planned arrival timestamp")
    vehicle_id: Optional[str] = Field(None, description="Optional specific vehicle")


class DelayRiskResponse(BaseModel):
    location_id: str
    predicted_dwell_minutes: float
    expected_dwell_minutes: float
    risk_percentage: float
    risk_severity: str  # low | medium | high
    reason: str
    recommendation: str
    model_version: str = "statistical-v1"
