from dataclasses import dataclass


def calculate_excess_minutes(actual_dwell_minutes: float, expected_dwell_minutes: float) -> float:
    """
    Core formula: excess_minutes = max(0, actual_dwell_minutes - expected_dwell_minutes)
    """
    return max(0.0, float(actual_dwell_minutes) - float(expected_dwell_minutes))


def calculate_delay_cost(excess_minutes: float, hourly_operating_cost: float) -> float:
    """
    Core financial formula: delay_cost = (excess_minutes / 60.0) * vehicle.hourly_operating_cost
    Returns financial cost in the fleet operating currency (KES).
    """
    if excess_minutes <= 0.0 or hourly_operating_cost <= 0.0:
        return 0.0
    return round((float(excess_minutes) / 60.0) * float(hourly_operating_cost), 2)


@dataclass
class FinancialAssessment:
    dwell_minutes: float
    expected_minutes: float
    excess_minutes: float
    hourly_operating_cost: float
    estimated_cost: float


def assess_dwell_cost(
    actual_dwell_minutes: float,
    expected_dwell_minutes: float,
    hourly_operating_cost: float
) -> FinancialAssessment:
    """Computes complete dwell delay and financial loss assessment."""
    excess = calculate_excess_minutes(actual_dwell_minutes, expected_dwell_minutes)
    cost = calculate_delay_cost(excess, hourly_operating_cost)
    return FinancialAssessment(
        dwell_minutes=round(actual_dwell_minutes, 2),
        expected_minutes=round(expected_dwell_minutes, 2),
        excess_minutes=round(excess, 2),
        hourly_operating_cost=round(hourly_operating_cost, 2),
        estimated_cost=cost,
    )
