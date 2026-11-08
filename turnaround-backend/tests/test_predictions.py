from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.routers.predictions import predict_dwell
from app.schemas.predictions import DwellPredictionRequest


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


@pytest.mark.asyncio
async def test_dwell_prediction_estimates_cost_from_excess_and_vehicle_rate():
    planned_arrival = datetime(2026, 11, 9, 10, tzinfo=timezone.utc)
    location = SimpleNamespace(id="location-1", expected_dwell_minutes=120)
    vehicle = SimpleNamespace(id="vehicle-1", hourly_operating_cost=3000)
    historical_visit = SimpleNamespace(
        arrival_time=planned_arrival,
        dwell_minutes=180,
        expected_minutes=120,
        estimated_cost=3000,
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        ScalarResult(location),
        ScalarResult(vehicle),
        RowsResult([]),
        RowsResult([historical_visit]),
    ]))

    response = await predict_dwell(
        DwellPredictionRequest(
            location_id=location.id,
            planned_arrival=planned_arrival,
            vehicle_id=vehicle.id,
        ),
        db,
        "company-1",
    )

    assert response.predicted_dwell_minutes == 180
    assert response.expected_dwell_minutes == 120
    assert response.predicted_excess_minutes == 60
    assert response.hourly_operating_cost == 3000
    assert response.estimated_cost == 3000
    assert response.cost_interval_low == 3000
    assert response.cost_interval_high == 3000
    assert response.sample_size == 1
    assert response.data_source == "historical_average"
    assert response.model_type == "Historical average baseline"
    assert response.training_samples == 0
    assert len(response.history) == 1


@pytest.mark.asyncio
async def test_dwell_prediction_uses_location_baseline_without_gps_history():
    planned_arrival = datetime(2026, 11, 9, 10, tzinfo=timezone.utc)
    location = SimpleNamespace(id="location-1", expected_dwell_minutes=120)
    vehicle = SimpleNamespace(id="vehicle-1", hourly_operating_cost=3000)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        ScalarResult(location),
        ScalarResult(vehicle),
        RowsResult([]),
        RowsResult([]),
    ]))

    response = await predict_dwell(
        DwellPredictionRequest(
            location_id=location.id,
            planned_arrival=planned_arrival,
            vehicle_id=vehicle.id,
        ),
        db,
        "company-1",
    )

    assert response.predicted_dwell_minutes == 120
    assert response.predicted_excess_minutes == 0
    assert response.estimated_cost == 0
    assert response.cost_interval_high == 3000
    assert response.sample_size == 0
    assert response.data_source == "location_baseline"


@pytest.mark.asyncio
async def test_dwell_prediction_trains_company_model_and_returns_validation_metrics():
    planned_arrival = datetime(2026, 11, 9, 10, tzinfo=timezone.utc)
    location = SimpleNamespace(id="location-1", expected_dwell_minutes=120)
    vehicle = SimpleNamespace(id="vehicle-1", hourly_operating_cost=3000)
    training_rows = [
        SimpleNamespace(
            arrival_time=planned_arrival.replace(day=index + 1),
            expected_minutes=120,
            dwell_minutes=145 + (index % 4) * 5,
        )
        for index in range(14)
    ]
    historical_visit = SimpleNamespace(
        arrival_time=planned_arrival,
        dwell_minutes=150,
        expected_minutes=120,
        estimated_cost=1500,
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        ScalarResult(location),
        ScalarResult(vehicle),
        RowsResult(training_rows),
        RowsResult([historical_visit]),
    ]))

    response = await predict_dwell(
        DwellPredictionRequest(
            location_id=location.id,
            planned_arrival=planned_arrival,
            vehicle_id=vehicle.id,
        ),
        db,
        "company-1",
    )

    assert response.model_version == "fleet-dwell-linear-v1"
    assert response.model_type == "Multiple linear regression"
    assert response.training_samples == 14
    assert response.validation_mae_minutes is not None
    assert response.predicted_dwell_minutes > 0
