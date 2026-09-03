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
    delayed_visit_count: int = 0


class TrendAnalytics(BaseModel):
    timeframe: str
    points: List[TrendPoint]


class FleetProductivity(BaseModel):
    """Fleet efficiency score and visit breakdown for the given timeframe (D-004)."""
    score: float = Field(..., description="Productivity score 0–100. 100 = all visits on time.")
    total_visits: int = Field(..., description="Total completed dwell events in the period")
    on_time_visits: int = Field(..., description="Visits where actual dwell <= expected dwell")
    delayed_visits: int = Field(..., description="Visits where actual dwell exceeded expected dwell")
    total_expected_dwell_minutes: float = Field(..., description="Sum of expected dwell across all visits")
    total_actual_dwell_minutes: float = Field(..., description="Sum of actual dwell across all visits")
    total_excess_minutes: float = Field(..., description="Total excess delay minutes in period")
    total_financial_waste_kes: float = Field(..., description="Total KES lost to excess dwell")
    timeframe_days: int = Field(..., description="Number of days covered by the analysis")
