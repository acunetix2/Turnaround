from datetime import datetime, timedelta, timezone

from app.engines.travel_time_prediction import (
    TravelTimeObservation,
    train_travel_time_forecast,
)


def _observations():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = []
    for trip_index in range(8):
        departure = start + timedelta(days=trip_index)
        arrival = departure + timedelta(hours=3)
        for point_index in range(6):
            longitude = 0.15 + point_index * 0.12
            recorded_at = departure + timedelta(minutes=point_index * 20)
            rows.append(TravelTimeObservation(
                trip_id=f"trip-{trip_index}",
                recorded_at=recorded_at,
                actual_arrival=arrival,
                latitude=0,
                longitude=longitude,
                speed_kmh=45 + point_index,
                destination_latitude=0,
                destination_longitude=1,
            ))
    return rows


def test_travel_time_model_returns_route_forecast_and_chronological_holdout_metrics():
    now = datetime(2026, 2, 1, 10, tzinfo=timezone.utc)

    forecast = train_travel_time_forecast(
        _observations(),
        now,
        0,
        0.5,
        50,
        0,
        1,
    )

    assert forecast is not None
    assert forecast.training_samples == 48
    assert forecast.training_trips == 8
    assert forecast.estimated_minutes > 0
    assert forecast.estimate_p10_minutes <= forecast.estimated_minutes
    assert forecast.estimate_p90_minutes >= forecast.estimated_minutes
    assert forecast.validation_mae_minutes >= 0
    assert forecast.model_version == "route-travel-time-v1"


def test_travel_time_model_requires_multiple_completed_route_trips():
    rows = _observations()[:24]

    forecast = train_travel_time_forecast(rows, datetime.now(timezone.utc), 0, 0.5, 50, 0, 1)

    assert forecast is None
