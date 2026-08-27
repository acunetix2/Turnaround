from typing import List, Dict, Any, Optional
from datetime import datetime, date
from dataclasses import dataclass


@dataclass
class DwellRecord:
    id: str
    vehicle_id: str
    location_id: str
    arrival_time: datetime
    departure_time: Optional[datetime]
    dwell_minutes: float
    expected_minutes: float
    excess_minutes: float
    estimated_cost: float


def compute_dashboard_metrics(
    total_active_vehicles: int,
    in_progress_delayed_count: int,
    today_records: List[DwellRecord],
    location_names: Dict[str, str]
) -> Dict[str, Any]:
    """Computes high-level KPI dashboard metrics."""
    excess_today = sum(r.excess_minutes for r in today_records)
    cost_today = sum(r.estimated_cost for r in today_records)

    delayed_records = [r for r in today_records if r.excess_minutes > 0]
    avg_excess = (
        sum(r.excess_minutes for r in delayed_records) / len(delayed_records)
        if delayed_records
        else 0.0
    )

    # Calculate top bottleneck location
    location_excess: Dict[str, float] = {}
    for r in today_records:
        if r.excess_minutes > 0:
            location_excess[r.location_id] = location_excess.get(r.location_id, 0.0) + r.excess_minutes

    top_bottleneck_name = None
    if location_excess:
        top_loc_id = max(location_excess, key=location_excess.get)
        top_bottleneck_name = location_names.get(top_loc_id, top_loc_id)

    return {
        "active_trucks": total_active_vehicles,
        "trucks_delayed": in_progress_delayed_count,
        "excess_dwell_today_minutes": round(excess_today, 1),
        "estimated_financial_impact": round(cost_today, 2),
        "top_bottleneck": top_bottleneck_name,
        "average_excess_delay_minutes": round(avg_excess, 1),
    }


def compute_location_analytics(
    location_id: str,
    location_name: str,
    location_type: str,
    expected_dwell: float,
    records: List[DwellRecord]
) -> Dict[str, Any]:
    """Computes aggregated performance profile for a specific location."""
    total_visits = len(records)
    if total_visits == 0:
        return {
            "id": location_id,
            "name": location_name,
            "location_type": location_type,
            "total_visits": 0,
            "avg_dwell_minutes": 0.0,
            "expected_dwell_minutes": round(expected_dwell, 1),
            "avg_excess_delay_minutes": 0.0,
            "total_excess_cost": 0.0,
            "risk_level": "low",
            "peak_bottleneck_period": None,
        }

    avg_dwell = sum(r.dwell_minutes for r in records) / total_visits
    delayed_visits = [r for r in records if r.excess_minutes > 0]
    avg_excess = sum(r.excess_minutes for r in delayed_visits) / len(delayed_visits) if delayed_visits else 0.0
    total_cost = sum(r.estimated_cost for r in records)

    # Risk level classification
    ratio = avg_dwell / expected_dwell if expected_dwell > 0 else 1.0
    if ratio > 1.5:
        risk = "high"
    elif ratio > 1.2:
        risk = "medium"
    else:
        risk = "low"

    # Analyze peak hour
    hour_counts: Dict[int, int] = {}
    for r in delayed_visits:
        h = r.arrival_time.hour
        hour_counts[h] = hour_counts.get(h, 0) + 1
    
    peak_period = None
    if hour_counts:
        peak_hour = max(hour_counts, key=hour_counts.get)
        peak_period = f"{peak_hour:02d}:00 - {(peak_hour+2)%24:02d}:00"

    return {
        "id": location_id,
        "name": location_name,
        "location_type": location_type,
        "total_visits": total_visits,
        "avg_dwell_minutes": round(avg_dwell, 1),
        "expected_dwell_minutes": round(expected_dwell, 1),
        "avg_excess_delay_minutes": round(avg_excess, 1),
        "total_excess_cost": round(total_cost, 2),
        "risk_level": risk,
        "peak_bottleneck_period": peak_period,
    }
