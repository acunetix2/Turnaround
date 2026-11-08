import math
import statistics
from typing import Annotated, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

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
from app.engines.financial import calculate_delay_cost, calculate_excess_minutes
from app.engines.dwell_prediction import DwellObservation, train_dwell_forecast

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
        "history": [
            {
                "arrival_time": row.arrival_time,
                "actual_dwell_minutes": round(float(row.dwell_minutes), 1),
                "expected_dwell_minutes": round(float(row.expected_minutes), 1),
                "estimated_cost": round(float(row.estimated_cost), 2),
            }
            for row in sorted(rows, key=lambda row: row.arrival_time)[-14:]
        ],
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

    vehicle = None
    if payload.vehicle_id:
        vehicle = (await db.execute(select(Vehicle).where(
            Vehicle.id == payload.vehicle_id, Vehicle.company_id == company_id
        ))).scalar_one_or_none()
        if not vehicle:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Vehicle not found"}})

    training_result = await db.execute(
        select(DwellEvent.arrival_time, DwellEvent.expected_minutes, DwellEvent.dwell_minutes)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(
            Vehicle.company_id == company_id,
            DwellEvent.departure_time.isnot(None),
            DwellEvent.expected_minutes > 0,
        )
        .order_by(DwellEvent.arrival_time.desc())
        .limit(5000)
    )
    training_rows = [
        DwellObservation(
            arrival_time=row.arrival_time,
            expected_minutes=float(row.expected_minutes),
            actual_minutes=float(row.dwell_minutes),
        )
        for row in training_result.all()
    ]

    stats = await _get_location_dwell_stats(
        db, company_id, payload.location_id,
        payload.planned_arrival.hour,
        payload.planned_arrival.weekday(),
    )

    forecast = train_dwell_forecast(
        training_rows,
        payload.planned_arrival,
        float(loc.expected_dwell_minutes),
    )
    if forecast:
        predicted = forecast.predicted_minutes
        low = forecast.confidence_interval_low
        high = forecast.confidence_interval_high
        model_type = "Multiple linear regression"
        model_version = forecast.model_version
        validation_mae = forecast.validation_mae_minutes
    elif stats:
        predicted = stats["mean"]
        low = stats["p10"]
        high = stats["p90"]
        model_type = "Historical average baseline"
        model_version = "statistical-v1"
        validation_mae = None
    else:
        predicted = loc.expected_dwell_minutes
        low = predicted * 0.7
        high = predicted * 1.5
        model_type = "Configured dwell baseline"
        model_version = "baseline-v1"
        validation_mae = None

    expected = float(loc.expected_dwell_minutes)
    if vehicle:
        hourly_cost = float(vehicle.hourly_operating_cost)
    else:
        hourly_cost = float((await db.execute(
            select(func.coalesce(func.avg(Vehicle.hourly_operating_cost), 0.0))
            .where(Vehicle.company_id == company_id)
        )).scalar_one())

    return DwellPredictionResponse(
        location_id=payload.location_id,
        predicted_dwell_minutes=round(predicted, 1),
        confidence_interval_low=round(low, 1),
        confidence_interval_high=round(high, 1),
        sample_size=stats["sample_size"] if stats else 0,
        expected_dwell_minutes=round(expected, 1),
        predicted_excess_minutes=round(calculate_excess_minutes(predicted, expected), 1),
        hourly_operating_cost=round(hourly_cost, 2),
        estimated_cost=calculate_delay_cost(calculate_excess_minutes(predicted, expected), hourly_cost),
        cost_interval_low=calculate_delay_cost(calculate_excess_minutes(low, expected), hourly_cost),
        cost_interval_high=calculate_delay_cost(calculate_excess_minutes(high, expected), hourly_cost),
        data_source=(
            "gps_dwell_history" if forecast
            else "historical_average" if stats
            else "location_baseline"
        ),
        model_type=model_type,
        training_samples=forecast.training_samples if forecast else len(training_rows),
        validation_mae_minutes=round(validation_mae, 1) if validation_mae is not None else None,
        history=stats["history"] if stats else [],
        model_version=model_version,
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
