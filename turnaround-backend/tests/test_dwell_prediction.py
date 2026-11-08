from datetime import datetime, timedelta, timezone

from app.engines.dwell_prediction import DwellObservation, train_dwell_forecast


def test_linear_model_learns_dwell_from_arrival_time_and_expected_duration():
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    observations = []
    for index in range(28):
        arrival = start + timedelta(days=index, hours=index % 12)
        expected = 60 + (index % 4) * 30
        hour_effect = 18 if 8 <= arrival.hour <= 13 else -8
        dwell = expected * 1.2 + hour_effect + (index % 3)
        observations.append(DwellObservation(arrival, expected, dwell))

    planned_arrival = datetime(2026, 2, 8, 10, tzinfo=timezone.utc)
    forecast = train_dwell_forecast(observations, planned_arrival, 90)

    assert forecast is not None
    assert forecast.training_samples == 28
    assert forecast.model_version == "fleet-dwell-linear-v1"
    assert forecast.validation_mae_minutes < 20
    assert forecast.confidence_interval_low <= forecast.predicted_minutes
    assert forecast.confidence_interval_high >= forecast.predicted_minutes
    assert forecast.predicted_minutes > 90


def test_linear_model_waits_for_minimum_training_history():
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    observations = [
        DwellObservation(start + timedelta(days=index), 90, 110)
        for index in range(7)
    ]

    assert train_dwell_forecast(observations, start, 90) is None
