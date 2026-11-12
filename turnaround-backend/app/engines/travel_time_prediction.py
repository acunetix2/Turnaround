from dataclasses import dataclass
from datetime import datetime, timezone
from math import cos, isfinite, pi, sin
from typing import Optional, Sequence

import numpy as np

from app.engines.geofencing import haversine_distance


MODEL_VERSION = "route-travel-time-v1"
MIN_TRAINING_SAMPLES = 30
MIN_TRAINING_TRIPS = 5


@dataclass(frozen=True)
class TravelTimeObservation:
    trip_id: str
    recorded_at: datetime
    actual_arrival: datetime
    latitude: float
    longitude: float
    speed_kmh: float
    destination_latitude: float
    destination_longitude: float


@dataclass(frozen=True)
class TravelTimeForecast:
    estimated_minutes: float
    estimate_p10_minutes: float
    estimate_p90_minutes: float
    training_samples: int
    training_trips: int
    validation_mae_minutes: float
    model_version: str = MODEL_VERSION


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _features(
    recorded_at: datetime,
    remaining_distance_km: float,
    speed_kmh: float,
) -> np.ndarray:
    hour = recorded_at.hour + recorded_at.minute / 60.0
    hour_angle = 2 * pi * hour / 24
    weekday_angle = 2 * pi * recorded_at.weekday() / 7
    return np.array([
        1.0,
        remaining_distance_km / 100.0,
        speed_kmh / 60.0,
        sin(hour_angle),
        cos(hour_angle),
        sin(weekday_angle),
        cos(weekday_angle),
    ])


def train_travel_time_forecast(
    observations: Sequence[TravelTimeObservation],
    recorded_at: datetime,
    latitude: float,
    longitude: float,
    speed_kmh: float,
    destination_latitude: float,
    destination_longitude: float,
) -> Optional[TravelTimeForecast]:
    """Train and validate on completed trips for the same origin/destination pair."""
    usable = []
    for row in observations:
        recorded = _utc(row.recorded_at)
        arrival = _utc(row.actual_arrival)
        remaining_minutes = (arrival - recorded).total_seconds() / 60
        distance_km = haversine_distance(
            row.latitude,
            row.longitude,
            row.destination_latitude,
            row.destination_longitude,
        ) / 1000
        if (
            0 < remaining_minutes <= 72 * 60
            and 1 <= distance_km <= 2000
            and 5 <= row.speed_kmh <= 120
            and all(isfinite(value) for value in (
                remaining_minutes,
                distance_km,
                row.speed_kmh,
                row.latitude,
                row.longitude,
            ))
        ):
            usable.append((row, recorded, distance_km, remaining_minutes))

    trip_arrivals = {}
    for row, *_ in usable:
        trip_arrivals[row.trip_id] = max(
            _utc(row.actual_arrival),
            trip_arrivals.get(row.trip_id, _utc(row.actual_arrival)),
        )
    trips = sorted(trip_arrivals.items(), key=lambda item: item[1])
    if len(usable) < MIN_TRAINING_SAMPLES or len(trips) < MIN_TRAINING_TRIPS:
        return None

    split_at = max(1, int(len(trips) * 0.8))
    if split_at >= len(trips):
        split_at = len(trips) - 1
    training_trip_ids = {trip_id for trip_id, _ in trips[:split_at]}
    training_rows = [item for item in usable if item[0].trip_id in training_trip_ids]
    validation_rows = [item for item in usable if item[0].trip_id not in training_trip_ids]

    if not training_rows or not validation_rows:
        return None

    training_matrix = np.vstack([
        _features(row.recorded_at, distance, row.speed_kmh)
        for row, _, distance, _ in training_rows
    ])
    training_targets = np.array([target for _, _, _, target in training_rows])
    validation_matrix = np.vstack([
        _features(row.recorded_at, distance, row.speed_kmh)
        for row, _, distance, _ in validation_rows
    ])
    validation_targets = np.array([target for _, _, _, target in validation_rows])
    validation_coefficients, *_ = np.linalg.lstsq(training_matrix, training_targets, rcond=None)
    validation_predictions = np.maximum(0.0, validation_matrix @ validation_coefficients)
    validation_mae = float(np.mean(np.abs(validation_targets - validation_predictions)))

    full_matrix = np.vstack([
        _features(row.recorded_at, distance, row.speed_kmh)
        for row, _, distance, _ in usable
    ])
    full_targets = np.array([target for _, _, _, target in usable])
    coefficients, *_ = np.linalg.lstsq(full_matrix, full_targets, rcond=None)
    residuals = full_targets - full_matrix @ coefficients
    low_residual, high_residual = np.quantile(residuals, [0.1, 0.9])

    remaining_distance = haversine_distance(
        latitude,
        longitude,
        destination_latitude,
        destination_longitude,
    ) / 1000
    if (
        not isfinite(remaining_distance)
        or not isfinite(speed_kmh)
        or not 1 <= remaining_distance <= 2000
        or not 5 <= speed_kmh <= 120
    ):
        return None

    prediction = max(0.0, float(
        _features(_utc(recorded_at), remaining_distance, speed_kmh) @ coefficients
    ))
    return TravelTimeForecast(
        estimated_minutes=prediction,
        estimate_p10_minutes=max(0.0, prediction + float(low_residual)),
        estimate_p90_minutes=max(prediction, prediction + float(high_residual)),
        training_samples=len(usable),
        training_trips=len(trips),
        validation_mae_minutes=validation_mae,
    )
