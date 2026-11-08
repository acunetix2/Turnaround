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
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        ScalarResult(location),
        ScalarResult(vehicle),
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
    assert response.data_source == "gps_dwell_history"


@pytest.mark.asyncio
async def test_dwell_prediction_uses_location_baseline_without_gps_history():
    planned_arrival = datetime(2026, 11, 9, 10, tzinfo=timezone.utc)
    location = SimpleNamespace(id="location-1", expected_dwell_minutes=120)
    vehicle = SimpleNamespace(id="vehicle-1", hourly_operating_cost=3000)
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        ScalarResult(location),
        ScalarResult(vehicle),
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
