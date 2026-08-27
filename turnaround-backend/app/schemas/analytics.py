from typing import List, Optional
from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    active_trucks: int = Field(..., description="Currently active vehicles in fleet")
    trucks_delayed: int = Field(..., description="Trucks currently exceeding expected dwell SLA")
    excess_dwell_today_minutes: float = Field(..., description="Total cumulative excess dwell today in minutes")
    estimated_financial_impact: float = Field(..., description="Estimated excess dwell loss today in KES")
    top_bottleneck: Optional[str] = Field(None, description="Location with highest cumulative excess delay")
    average_excess_delay_minutes: float = Field(..., description="Mean excess dwell across delayed visits")


class LocationPerformance(BaseModel):
    id: str
    name: str
    location_type: str
    total_visits: int
    avg_dwell_minutes: float
    expected_dwell_minutes: float
    avg_excess_delay_minutes: float
    total_excess_cost: float
    risk_level: str  # low | medium | high
    peak_bottleneck_period: Optional[str] = None


class VehiclePerformance(BaseModel):
    id: str
    registration_number: str
    vehicle_type: str
    total_trips: int
    total_dwell_minutes: float
    excess_dwell_minutes: float
    total_excess_cost: float
    status: str


class TrendPoint(BaseModel):
    date: str
    total_dwell_minutes: float
    excess_dwell_minutes: float
    financial_impact_kes: float
    visit_count: int


class TrendAnalytics(BaseModel):
    timeframe: str
    points: List[TrendPoint]
