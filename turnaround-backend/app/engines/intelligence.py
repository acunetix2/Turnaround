from typing import Protocol, List, Dict, Any, Optional
from dataclasses import dataclass
from app.db.models.insight import InsightSeverity, InsightType


class InsightScorer(Protocol):
    """Abstract protocol interface for future ML-based anomaly models."""
    def score(self, location_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        ...


@dataclass
class RuleBasedInsight:
    type: str
    severity: InsightSeverity
    title: str
    description: str
    financial_impact: float
    recommendation: str
    location_id: Optional[str]


class RuleBasedIntelligenceEngine:
    """
    Phase 6 rule-based operational intelligence engine.
    Pipeline: Raw Events -> Calculate Baseline -> Compare -> Detect Anomaly -> Generate Actionable Insight.
    """

    def __init__(self, high_mult: float = 1.5, med_mult: float = 1.2):
        self.high_mult = high_mult
        self.med_mult = med_mult

    def analyze_location_performance(
        self,
        location_id: str,
        location_name: str,
        location_type: str,
        avg_dwell: float,
        expected_dwell: float,
        total_excess_cost: float,
        delayed_visits_count: int,
        peak_period: Optional[str]
    ) -> Optional[RuleBasedInsight]:
        """Evaluates a location's performance profile against SLA thresholds."""
        if expected_dwell <= 0 or delayed_visits_count == 0:
            return None

        ratio = avg_dwell / expected_dwell

        if ratio >= self.high_mult:
            severity = InsightSeverity.HIGH
            title = f"Severe Dwell Bottleneck at {location_name}"
            desc = (
                f"Average turnaround duration ({avg_dwell:.1f}m) exceeds baseline ({expected_dwell:.1f}m) by "
                f"{((ratio - 1.0) * 100):.0f}%, contributing to KES {total_excess_cost:,.2f} in excess fleet costs across {delayed_visits_count} trips."
            )
            rec = (
                f"Reschedule heavy haulier departures to avoid the peak congestion window ({peak_period or '10:00 - 14:00'}) "
                f"and request priority container offloading at {location_name}."
            )
            return RuleBasedInsight(
                type=InsightType.RECURRING_BOTTLENECK.value,
                severity=severity,
                title=title,
                description=desc,
                financial_impact=round(total_excess_cost, 2),
                recommendation=rec,
                location_id=location_id,
            )

        elif ratio >= self.med_mult:
            severity = InsightSeverity.MEDIUM
            title = f"Dwell Variance Detected at {location_name}"
            desc = (
                f"Turnaround time ({avg_dwell:.1f}m) is trending {((ratio - 1.0) * 100):.0f}% above expected allowance ({expected_dwell:.1f}m)."
            )
            rec = f"Audit driver check-in timestamps and notify terminal dispatcher at {location_name}."
            return RuleBasedInsight(
                type=InsightType.EXCESSIVE_DWELL.value,
                severity=severity,
                title=title,
                description=desc,
                financial_impact=round(total_excess_cost, 2),
                recommendation=rec,
                location_id=location_id,
            )

        return None
