import math
import statistics
from typing import Annotated, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.dwell_event import DwellEvent
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.deps import get_current_company
from app.schemas.predictions import (
    DwellPredictionRequest, DwellPredictionResponse,
    DelayRiskRequest, DelayRiskResponse,
)
from app.config import settings

router = APIRouter(prefix="/predictions", tags=["Predictions"])


async def _get_location_dwell_stats(
    db: AsyncSession,
    company_id: str,
    location_id: str,
    arrival_hour: int,
    arrival_weekday: int,
) -> Optional[Dict]:
    """Statistical-v1: compute mean/std dwell by time-of-day bucket (±2h) and day-of-week."""
    result = await db.execute(
        select(DwellEvent)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(
            Vehicle.company_id == company_id,
            DwellEvent.location_id == location_id,
            DwellEvent.departure_time.isnot(None),
        )
    )
    rows = result.scalars().all()
    if not rows:
        return None

    # Filter to same day-of-week + ±2 hour bucket for contextual prediction
    contextual = [
        r.dwell_minutes for r in rows
        if (
            r.arrival_time.weekday() == arrival_weekday
            and abs(r.arrival_time.hour - arrival_hour) <= 2
        )
    ]
    # Fall back to all records if contextual sample too small
    sample = contextual if len(contextual) >= 5 else [r.dwell_minutes for r in rows]

    mean = statistics.mean(sample)
    std = statistics.stdev(sample) if len(sample) > 1 else mean * 0.15
    p10 = sorted(sample)[max(0, int(len(sample) * 0.10) - 1)]
    p90 = sorted(sample)[min(len(sample) - 1, int(len(sample) * 0.90))]

    return {
        "mean": mean,
        "std": std,
        "p10": p10,
        "p90": p90,
        "sample_size": len(sample),
    }


@router.post("/dwell", response_model=DwellPredictionResponse,
             summary="Predict dwell duration for a planned destination visit")
async def predict_dwell(
    payload: DwellPredictionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    loc = (await db.execute(select(Location).where(
        Location.id == payload.location_id, Location.company_id == company_id
    ))).scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Location not found"}})

    stats = await _get_location_dwell_stats(
        db, company_id, payload.location_id,
        payload.planned_arrival.hour,
        payload.planned_arrival.weekday(),
    )

    if stats:
        predicted = stats["mean"]
        low = stats["p10"]
        high = stats["p90"]
        n = stats["sample_size"]
    else:
        # No historical data — fall back to configured expected dwell
        predicted = loc.expected_dwell_minutes
        low = predicted * 0.7
        high = predicted * 1.5
        n = 0

    return DwellPredictionResponse(
        location_id=payload.location_id,
        predicted_dwell_minutes=round(predicted, 1),
        confidence_interval_low=round(low, 1),
        confidence_interval_high=round(high, 1),
        sample_size=n,
        model_version="statistical-v1",
    )


@router.post("/delay-risk", response_model=DelayRiskResponse,
             summary="Assess delay risk for a planned trip destination")
async def predict_delay_risk(
    payload: DelayRiskRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    loc = (await db.execute(select(Location).where(
        Location.id == payload.location_id, Location.company_id == company_id
    ))).scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Location not found"}})

    stats = await _get_location_dwell_stats(
        db, company_id, payload.location_id,
        payload.planned_arrival.hour,
        payload.planned_arrival.weekday(),
    )

    expected = loc.expected_dwell_minutes
    if stats:
        predicted = stats["mean"]
    else:
        predicted = expected

    ratio = predicted / expected if expected > 0 else 1.0
    risk_pct = max(0.0, min(100.0, (ratio - 1.0) * 100.0))

    if ratio >= settings.SEVERITY_HIGH_MULTIPLIER:
        severity = "high"
        reason = f"Historical average dwell ({predicted:.0f}m) is {((ratio-1)*100):.0f}% above SLA ({expected:.0f}m) — chronic congestion pattern detected."
        recommendation = f"Schedule arrival before 09:00 or after 15:00 to avoid peak gate congestion at {loc.name}."
    elif ratio >= settings.SEVERITY_MEDIUM_MULTIPLIER:
        severity = "medium"
        reason = f"Dwell trends ({predicted:.0f}m) slightly exceed baseline ({expected:.0f}m) during this time window."
        recommendation = f"Ensure driver arrives with documentation pre-submitted to reduce processing time at {loc.name}."
    else:
        severity = "low"
        reason = f"Dwell history ({predicted:.0f}m) aligns within acceptable range of SLA ({expected:.0f}m)."
        recommendation = "No intervention required — standard terminal procedure applies."

    return DelayRiskResponse(
        location_id=payload.location_id,
        predicted_dwell_minutes=round(predicted, 1),
        expected_dwell_minutes=round(expected, 1),
        risk_percentage=round(risk_pct, 1),
        risk_severity=severity,
        reason=reason,
        recommendation=recommendation,
        model_version="statistical-v1",
    )
