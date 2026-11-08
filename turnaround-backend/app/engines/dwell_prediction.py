from dataclasses import dataclass
from datetime import datetime
from math import cos, isfinite, pi, sin
from typing import Optional, Sequence

import numpy as np


MODEL_VERSION = "fleet-dwell-linear-v1"
MIN_TRAINING_SAMPLES = 12


@dataclass(frozen=True)
class DwellObservation:
    arrival_time: datetime
    expected_minutes: float
    actual_minutes: float
    location_id: Optional[str] = None


@dataclass(frozen=True)
class DwellForecast:
    predicted_minutes: float
    confidence_interval_low: float
    confidence_interval_high: float
    training_samples: int
    validation_mae_minutes: float
    model_version: str = MODEL_VERSION


def _features(arrival_time: datetime, expected_minutes: float) -> np.ndarray:
    hour = arrival_time.hour + arrival_time.minute / 60.0
    hour_angle = 2 * pi * hour / 24
    weekday_angle = 2 * pi * arrival_time.weekday() / 7
    return np.array([
        1.0,
        expected_minutes / 60.0,
        sin(hour_angle),
        cos(hour_angle),
        sin(weekday_angle),
        cos(weekday_angle),
    ])


def train_dwell_forecast(
    observations: Sequence[DwellObservation],
    planned_arrival: datetime,
    expected_minutes: float,
    location_id: Optional[str] = None,
) -> Optional[DwellForecast]:
    """Fit a location-scoped linear regression and score a chronological holdout."""
    usable = sorted(
        (
            row for row in observations
            if (location_id is None or row.location_id == location_id)
            if row.expected_minutes > 0
            and row.actual_minutes >= 0
            and isfinite(row.expected_minutes)
            and isfinite(row.actual_minutes)
        ),
        key=lambda row: row.arrival_time,
    )
    if len(usable) < MIN_TRAINING_SAMPLES:
        return None

    split_at = max(6, int(len(usable) * 0.8))
    if split_at >= len(usable):
        split_at = len(usable) - 2
    training_rows = usable[:split_at]
    validation_rows = usable[split_at:]

    train_matrix = np.vstack([
        _features(row.arrival_time, row.expected_minutes)
        for row in training_rows
    ])
    train_targets = np.array([row.actual_minutes for row in training_rows])
    validation_matrix = np.vstack([
        _features(row.arrival_time, row.expected_minutes)
        for row in validation_rows
    ])
    validation_targets = np.array([row.actual_minutes for row in validation_rows])

    validation_coefficients, *_ = np.linalg.lstsq(train_matrix, train_targets, rcond=None)
    validation_predictions = validation_matrix @ validation_coefficients
    validation_mae = float(np.mean(np.abs(validation_targets - validation_predictions)))

    full_matrix = np.vstack([
        _features(row.arrival_time, row.expected_minutes)
        for row in usable
    ])
    full_targets = np.array([row.actual_minutes for row in usable])
    coefficients, *_ = np.linalg.lstsq(full_matrix, full_targets, rcond=None)
    fitted = full_matrix @ coefficients
    residuals = full_targets - fitted
    low_residual, high_residual = np.quantile(residuals, [0.1, 0.9])

    prediction = max(0.0, float(_features(planned_arrival, expected_minutes) @ coefficients))
    interval_low = min(prediction, max(0.0, prediction + float(low_residual)))
    interval_high = max(prediction, prediction + float(high_residual))
    return DwellForecast(
        predicted_minutes=prediction,
        confidence_interval_low=interval_low,
        confidence_interval_high=interval_high,
        training_samples=len(usable),
        validation_mae_minutes=validation_mae,
    )
