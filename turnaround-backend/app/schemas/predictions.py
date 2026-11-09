from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DwellPredictionRequest(BaseModel):
    location_id: str = Field(..., description="Destination location UUID")
    planned_arrival: datetime = Field(..., description="Estimated arrival time")
    vehicle_id: Optional[str] = Field(None, description="Optional vehicle UUID for vehicle-specific cost estimation")
    vehicle_type: Optional[str] = Field("Semi-Trailer Truck", description="Vehicle classification")


class DwellHistoryPoint(BaseModel):
    arrival_time: datetime
    actual_dwell_minutes: float
    expected_dwell_minutes: float
    estimated_cost: float


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
    model_type: str
    model_features: List[str] = Field(default_factory=list)
    training_samples: int
    validation_mae_minutes: Optional[float] = None
    history: List[DwellHistoryPoint] = Field(default_factory=list)
    model_version: str = "statistical-v1"


class FleetAssetForecast(BaseModel):
    vehicle_id: str
    registration_number: str
    vehicle_type: str
    asset_status: str
    tracking_state: str
    trip_id: Optional[str] = None
    trip_status: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    gps_recorded_at: Optional[datetime] = None
    speed_kmh: Optional[float] = None
    current_dwell_minutes: Optional[float] = None
    current_idle_cost: float
    predicted_dwell_minutes: Optional[float] = None
    expected_dwell_minutes: Optional[float] = None
    predicted_excess_minutes: Optional[float] = None
    hourly_operating_cost: float
    estimated_cost: Optional[float] = None
    cost_interval_low: Optional[float] = None
    cost_interval_high: Optional[float] = None
    model_version: Optional[str] = None


class FleetForecastResponse(BaseModel):
    assets: List[FleetAssetForecast]
    model_type: str
    model_features: List[str] = Field(default_factory=list)
    training_samples: int
    validation_mae_minutes: Optional[float] = None
    generated_at: datetime


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
