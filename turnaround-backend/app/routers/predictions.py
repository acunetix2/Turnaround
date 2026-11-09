import math
import statistics
from datetime import datetime, timezone
from typing import Annotated, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.dwell_event import DwellEvent
from app.db.models.gps_event import GPSEvent
from app.db.models.trip import Trip, TripStatus
from app.db.models.vehicle import Vehicle, VehicleStatus
from app.db.models.location import Location
from app.deps import get_current_company
from app.schemas.predictions import (
    DwellPredictionRequest, DwellPredictionResponse,
    DelayRiskRequest, DelayRiskResponse,
    FleetAssetForecast, FleetForecastResponse,
)
from app.config import settings
from app.engines.financial import calculate_delay_cost, calculate_excess_minutes
from app.engines.dwell_prediction import MODEL_FEATURES, DwellObservation, train_dwell_forecast
from app.engines.geofencing import haversine_distance

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
        select(
            DwellEvent.arrival_time,
            DwellEvent.location_id,
            DwellEvent.expected_minutes,
            DwellEvent.dwell_minutes,
            Vehicle.capacity.label("vehicle_capacity_tonnes"),
            Trip.cargo_weight_tonnes.label("cargo_weight_tonnes"),
        )
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .outerjoin(Trip, DwellEvent.trip_id == Trip.id)
        .where(
            Vehicle.company_id == company_id,
            DwellEvent.location_id == payload.location_id,
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
            location_id=row.location_id,
            vehicle_capacity_tonnes=getattr(row, "vehicle_capacity_tonnes", None),
            cargo_weight_tonnes=getattr(row, "cargo_weight_tonnes", None),
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
        payload.location_id,
        getattr(vehicle, "capacity", None) if vehicle else None,
    )
    if forecast:
        predicted = forecast.predicted_minutes
        low = forecast.confidence_interval_low
        high = forecast.confidence_interval_high
        model_type = "Multiple linear regression with trip/asset features"
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
        model_features=MODEL_FEATURES if forecast else [],
        training_samples=forecast.training_samples if forecast else len(training_rows),
        validation_mae_minutes=round(validation_mae, 1) if validation_mae is not None else None,
        history=stats["history"] if stats else [],
        model_version=model_version,
    )


@router.get(
    "/fleet",
    response_model=FleetForecastResponse,
    summary="Automatically track and forecast all company fleet assets",
)
async def predict_fleet(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """Build per-asset forecasts from active trips, live GPS, and open geofence dwell."""
    now = datetime.now(timezone.utc)
    vehicles = (await db.execute(
        select(Vehicle)
        .where(Vehicle.company_id == company_id)
        .order_by(Vehicle.registration_number)
    )).scalars().all()
    if not vehicles:
        return FleetForecastResponse(
            assets=[],
            model_type="Historical average / configured baseline",
            training_samples=0,
            generated_at=now,
        )

    vehicle_ids = [vehicle.id for vehicle in vehicles]
    active_trips = (await db.execute(
        select(Trip)
        .where(
            Trip.vehicle_id.in_(vehicle_ids),
            Trip.status.in_([
                TripStatus.PLANNED,
                TripStatus.IN_PROGRESS,
                TripStatus.IN_TRANSIT,
                TripStatus.DELAYED,
            ]),
        )
        .options(selectinload(Trip.destination))
        .order_by(Trip.planned_arrival.asc())
    )).scalars().all()
    trips_by_vehicle: Dict[str, Trip] = {}
    for trip in active_trips:
        trips_by_vehicle.setdefault(trip.vehicle_id, trip)

    latest_gps_query = (
        select(
            GPSEvent.vehicle_id,
            GPSEvent.latitude,
            GPSEvent.longitude,
            GPSEvent.speed,
            GPSEvent.recorded_at,
            func.row_number()
            .over(partition_by=GPSEvent.vehicle_id, order_by=desc(GPSEvent.recorded_at))
            .label("row_number"),
        )
        .where(GPSEvent.vehicle_id.in_(vehicle_ids))
        .subquery()
    )
    gps_by_vehicle = {
        row.vehicle_id: row
        for row in (await db.execute(
            select(latest_gps_query).where(latest_gps_query.c.row_number == 1)
        )).all()
    }

    open_dwells = (await db.execute(
        select(DwellEvent)
        .where(DwellEvent.vehicle_id.in_(vehicle_ids), DwellEvent.departure_time.is_(None))
        .order_by(DwellEvent.arrival_time.desc())
    )).scalars().all()
    dwell_by_vehicle: Dict[str, DwellEvent] = {}
    for dwell in open_dwells:
        dwell_by_vehicle.setdefault(dwell.vehicle_id, dwell)

    locations = (await db.execute(
        select(Location).where(Location.company_id == company_id)
    )).scalars().all()
    locations_by_id = {location.id: location for location in locations}
    training_rows_query = (
        select(
            DwellEvent.arrival_time,
            DwellEvent.location_id,
            DwellEvent.expected_minutes,
            DwellEvent.dwell_minutes,
            Vehicle.capacity.label("vehicle_capacity_tonnes"),
            Trip.cargo_weight_tonnes.label("cargo_weight_tonnes"),
            func.row_number()
            .over(
                partition_by=DwellEvent.location_id,
                order_by=desc(DwellEvent.arrival_time),
            )
            .label("row_number"),
        )
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .outerjoin(Trip, DwellEvent.trip_id == Trip.id)
        .where(
            Vehicle.company_id == company_id,
            DwellEvent.departure_time.isnot(None),
            DwellEvent.expected_minutes > 0,
        )
        .subquery()
    )
    training_result = await db.execute(
        select(training_rows_query).where(training_rows_query.c.row_number <= 5000)
    )
    observations = [
        DwellObservation(
            row.arrival_time,
            float(row.expected_minutes),
            float(row.dwell_minutes),
            row.location_id,
            getattr(row, "vehicle_capacity_tonnes", None),
            getattr(row, "cargo_weight_tonnes", None),
        )
        for row in training_result.all()
    ]

    assets: List[FleetAssetForecast] = []
    model_validation_errors: Dict[str, float] = {}
    location_stats_cache: Dict[tuple, Optional[Dict]] = {}
    for vehicle in vehicles:
        trip = trips_by_vehicle.get(vehicle.id)
        dwell = dwell_by_vehicle.get(vehicle.id)
        gps = gps_by_vehicle.get(vehicle.id)
        location = locations_by_id.get(dwell.location_id) if dwell else None
        tracking_state = "idle"
        if dwell:
            tracking_state = "idling_at_stop"
        elif trip and trip.status in (TripStatus.IN_TRANSIT, TripStatus.IN_PROGRESS, TripStatus.DELAYED):
            tracking_state = "on_trip"
            location = trip.destination
        elif trip:
            tracking_state = "trip_planned"
            location = trip.destination
        elif gps:
            nearest_location = min(
                locations,
                key=lambda item: haversine_distance(
                    gps.latitude, gps.longitude, item.latitude, item.longitude
                ),
                default=None,
            )
            if nearest_location and haversine_distance(
                gps.latitude, gps.longitude, nearest_location.latitude, nearest_location.longitude
            ) <= nearest_location.geofence_radius:
                location = nearest_location
                tracking_state = "at_geofence"

        current_dwell = None
        current_idle_cost = 0.0
        if dwell:
            arrival = dwell.arrival_time
            if arrival.tzinfo is None:
                arrival = arrival.replace(tzinfo=timezone.utc)
            current_dwell = max(0.0, (now - arrival).total_seconds() / 60)
            current_idle_cost = calculate_delay_cost(current_dwell, vehicle.hourly_operating_cost)

        prediction = None
        if location:
            planned_arrival = trip.planned_arrival if trip else None
            if planned_arrival and planned_arrival.tzinfo is None:
                planned_arrival = planned_arrival.replace(tzinfo=timezone.utc)
            arrival_at = planned_arrival if planned_arrival and planned_arrival > now else now
            expected = float(location.expected_dwell_minutes)
            cargo_weight = getattr(trip, "cargo_weight_tonnes", None) if trip else None
            prediction = train_dwell_forecast(
                observations,
                arrival_at,
                expected,
                location.id,
                getattr(vehicle, "capacity", None),
                cargo_weight,
            )
            if prediction:
                model_validation_errors[location.id] = prediction.validation_mae_minutes
                predicted = prediction.predicted_minutes
                low = prediction.confidence_interval_low
                high = prediction.confidence_interval_high
                model_version = prediction.model_version
            else:
                stats_key = (location.id, arrival_at.hour, arrival_at.weekday())
                if stats_key not in location_stats_cache:
                    location_stats_cache[stats_key] = await _get_location_dwell_stats(
                        db, company_id, location.id, arrival_at.hour, arrival_at.weekday()
                    )
                location_stats = location_stats_cache[stats_key]
                if location_stats:
                    predicted = location_stats["mean"]
                    low = location_stats["p10"]
                    high = location_stats["p90"]
                    model_version = "statistical-v1"
                else:
                    predicted = expected
                    low = predicted * 0.7
                    high = predicted * 1.5
                    model_version = "baseline-v1"
            excess = calculate_excess_minutes(predicted, expected)
            assets.append(FleetAssetForecast(
                vehicle_id=vehicle.id,
                registration_number=vehicle.registration_number,
                vehicle_type=vehicle.vehicle_type,
                asset_status=vehicle.status.value,
                tracking_state=tracking_state,
                trip_id=trip.id if trip else None,
                trip_status=trip.status.value if trip else None,
                location_id=location.id,
                location_name=location.name,
                gps_recorded_at=gps.recorded_at if gps else None,
                speed_kmh=gps.speed if gps else None,
                current_dwell_minutes=round(current_dwell, 1) if current_dwell is not None else None,
                current_idle_cost=round(current_idle_cost, 2),
                predicted_dwell_minutes=round(predicted, 1),
                expected_dwell_minutes=round(expected, 1),
                predicted_excess_minutes=round(excess, 1),
                hourly_operating_cost=round(float(vehicle.hourly_operating_cost), 2),
                estimated_cost=calculate_delay_cost(excess, vehicle.hourly_operating_cost),
                cost_interval_low=calculate_delay_cost(
                    calculate_excess_minutes(low, expected), vehicle.hourly_operating_cost
                ),
                cost_interval_high=calculate_delay_cost(
                    calculate_excess_minutes(high, expected), vehicle.hourly_operating_cost
                ),
                model_version=model_version,
            ))
        else:
            assets.append(FleetAssetForecast(
                vehicle_id=vehicle.id,
                registration_number=vehicle.registration_number,
                vehicle_type=vehicle.vehicle_type,
                asset_status=vehicle.status.value,
                tracking_state=tracking_state,
                trip_id=trip.id if trip else None,
                trip_status=trip.status.value if trip else None,
                gps_recorded_at=gps.recorded_at if gps else None,
                speed_kmh=gps.speed if gps else None,
                current_dwell_minutes=round(current_dwell, 1) if current_dwell is not None else None,
                current_idle_cost=round(current_idle_cost, 2),
                hourly_operating_cost=round(float(vehicle.hourly_operating_cost), 2),
            ))

    return FleetForecastResponse(
        assets=assets,
        model_type=(
            "Location-specific multi-signal regression"
            if model_validation_errors
            else "Historical average / configured baseline"
        ),
        training_samples=len(observations),
        validation_mae_minutes=(
            round(sum(model_validation_errors.values()) / len(model_validation_errors), 1)
            if model_validation_errors else None
        ),
        model_features=MODEL_FEATURES if model_validation_errors else [],
        generated_at=now,
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
