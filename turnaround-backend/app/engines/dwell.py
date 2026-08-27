from datetime import datetime, timezone
from typing import Optional, List
from dataclasses import dataclass
from app.engines.financial import assess_dwell_cost, FinancialAssessment


def calculate_dwell_duration_minutes(arrival_time: datetime, departure_time: datetime) -> float:
    """Computes elapsed minutes between arrival and departure timestamps."""
    if arrival_time.tzinfo is None:
        arrival_time = arrival_time.replace(tzinfo=timezone.utc)
    if departure_time.tzinfo is None:
        departure_time = departure_time.replace(tzinfo=timezone.utc)
    
    diff_seconds = (departure_time - arrival_time).total_seconds()
    return max(0.0, diff_seconds / 60.0)


def resolve_expected_dwell_minutes(
    historical_visits_avg: Optional[float] = None,
    historical_visits_count: int = 0,
    historical_threshold_min: int = 10,
    location_configured_expected: Optional[float] = None,
    customer_sla_minutes: Optional[float] = None,
    global_fallback_minutes: float = 120.0,
) -> float:
    """
    Expected dwell time resolution chain (first match wins):
    1. Location-specific historical average (if >= N historical visits)
    2. Company-defined threshold on the location record
    3. Customer SLA
    4. Global default fallback
    """
    # Tier 1: Historical average if sample size is sufficient
    if (
        historical_visits_avg is not None
        and historical_visits_count >= historical_threshold_min
        and historical_visits_avg > 0
    ):
        return round(float(historical_visits_avg), 1)

    # Tier 2: Location configured threshold
    if location_configured_expected is not None and location_configured_expected > 0:
        return round(float(location_configured_expected), 1)

    # Tier 3: Customer SLA
    if customer_sla_minutes is not None and customer_sla_minutes > 0:
        return round(float(customer_sla_minutes), 1)

    # Tier 4: Global default fallback
    return round(float(global_fallback_minutes), 1)


@dataclass
class DwellStateEvaluation:
    is_in_progress: bool
    current_dwell_minutes: float
    expected_minutes: float
    excess_minutes: float
    estimated_cost: float
    is_delayed: bool


def evaluate_in_progress_dwell(
    arrival_time: datetime,
    current_time: datetime,
    expected_minutes: float,
    hourly_operating_cost: float
) -> DwellStateEvaluation:
    """Evaluates the live status of an ongoing dwell before departure has occurred."""
    dwell_mins = calculate_dwell_duration_minutes(arrival_time, current_time)
    assessment = assess_dwell_cost(dwell_mins, expected_minutes, hourly_operating_cost)
    return DwellStateEvaluation(
        is_in_progress=True,
        current_dwell_minutes=assessment.dwell_minutes,
        expected_minutes=assessment.expected_minutes,
        excess_minutes=assessment.excess_minutes,
        estimated_cost=assessment.estimated_cost,
        is_delayed=assessment.excess_minutes > 0.0,
    )
