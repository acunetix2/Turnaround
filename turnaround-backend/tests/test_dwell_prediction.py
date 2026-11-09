from datetime import datetime, timedelta, timezone

from app.engines.dwell_prediction import DwellObservation, train_dwell_forecast


def test_linear_model_learns_dwell_from_location_history_and_vehicle_trip_context():
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    observations = []
    for index in range(40):
        arrival = start + timedelta(days=index, hours=index % 12)
        expected = 60 + (index % 4) * 30
        capacity = 18 + (index % 5) * 4
        cargo_weight = 2 + (index * 7 % 24)
        hour_effect = 18 if 8 <= arrival.hour <= 13 else -8
        dwell = expected * 1.2 + hour_effect + (index % 3) + cargo_weight * 1.5 - capacity * 0.2
        observations.append(DwellObservation(
            arrival,
            expected,
            dwell,
            "location-1",
            capacity,
            cargo_weight,
        ))

    planned_arrival = datetime(2026, 2, 8, 10, tzinfo=timezone.utc)
    forecast = train_dwell_forecast(
        observations, planned_arrival, 90, "location-1", 30, 18
    )

    assert forecast is not None
    assert forecast.training_samples == 40
    assert forecast.model_version == "fleet-dwell-multisignal-v2"
    assert forecast.validation_mae_minutes < 20
    assert forecast.confidence_interval_low <= forecast.predicted_minutes
    assert forecast.confidence_interval_high >= forecast.predicted_minutes
    assert forecast.predicted_minutes > 90
    heavier_load_forecast = train_dwell_forecast(
        observations, planned_arrival, 90, "location-1", 30, 28
    )
    assert heavier_load_forecast is not None
    assert heavier_load_forecast.predicted_minutes > forecast.predicted_minutes


def test_linear_model_waits_for_minimum_training_history():
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    observations = [
        DwellObservation(start + timedelta(days=index), 90, 110)
        for index in range(29)
    ]

    assert train_dwell_forecast(observations, start, 90) is None


def test_linear_model_uses_only_observations_from_the_requested_location():
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    observations = [
        DwellObservation(start + timedelta(days=index), 90, 110, "location-1")
        for index in range(30)
    ] + [
        DwellObservation(start + timedelta(days=index), 90, 200, "location-2")
        for index in range(40)
    ]

    forecast = train_dwell_forecast(observations, start, 90, "location-1")

    assert forecast is not None
    assert forecast.training_samples == 30
