from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.db.models.vehicle import VehicleStatus
from app.db.models.trip import TripStatus
from app.routers.predictions import predict_dwell, predict_fleet
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
async def test_dwell_prediction_trains_location_model_and_returns_validation_metrics():
    planned_arrival = datetime(2026, 11, 9, 10, tzinfo=timezone.utc)
    location = SimpleNamespace(id="location-1", expected_dwell_minutes=120)
    vehicle = SimpleNamespace(id="vehicle-1", hourly_operating_cost=3000)
    training_rows = [
        SimpleNamespace(
            arrival_time=planned_arrival.replace(day=index + 1),
            location_id=location.id,
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


@pytest.mark.asyncio
async def test_fleet_prediction_tracks_gps_geofence_and_uses_configured_baseline():
    now = datetime.now(timezone.utc)
    vehicle = SimpleNamespace(
        id="vehicle-1",
        registration_number="TRUCK-1",
        vehicle_type="Truck",
        status=VehicleStatus.IDLE,
        hourly_operating_cost=2400,
    )
    location = SimpleNamespace(
        id="location-1",
        name="North Depot",
        latitude=1.0,
        longitude=1.0,
        geofence_radius=1000,
        expected_dwell_minutes=120,
    )
    gps = SimpleNamespace(
        vehicle_id=vehicle.id,
        latitude=1.0,
        longitude=1.0,
        speed=None,
        recorded_at=now,
        row_number=1,
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        RowsResult([vehicle]),
        RowsResult([]),
        RowsResult([gps]),
        RowsResult([]),
        RowsResult([location]),
        RowsResult([]),
        RowsResult([]),
    ]))

    response = await predict_fleet(db, "company-1")

    assert len(response.assets) == 1
    asset = response.assets[0]
    assert asset.vehicle_id == vehicle.id
    assert asset.tracking_state == "at_geofence"
    assert asset.location_name == location.name
    assert asset.speed_kmh is None
    assert asset.predicted_dwell_minutes == 120
    assert asset.estimated_cost == 0
    assert response.model_type == "Historical average / configured baseline"


@pytest.mark.asyncio
async def test_fleet_prediction_tracks_open_dwell_and_accumulated_idle_cost():
    now = datetime.now(timezone.utc)
    vehicle = SimpleNamespace(
        id="vehicle-1",
        registration_number="TRUCK-1",
        vehicle_type="Truck",
        status=VehicleStatus.IDLE,
        hourly_operating_cost=2400,
    )
    location = SimpleNamespace(
        id="location-1",
        name="North Depot",
        expected_dwell_minutes=60,
    )
    dwell = SimpleNamespace(
        vehicle_id=vehicle.id,
        location_id=location.id,
        arrival_time=now - timedelta(minutes=90),
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        RowsResult([vehicle]),
        RowsResult([]),
        RowsResult([]),
        RowsResult([dwell]),
        RowsResult([location]),
        RowsResult([]),
        RowsResult([]),
    ]))

    response = await predict_fleet(db, "company-1")

    asset = response.assets[0]
    assert asset.tracking_state == "idling_at_stop"
    assert asset.current_dwell_minutes == pytest.approx(90, abs=1)
    assert asset.current_idle_cost == pytest.approx(3600, abs=40)


@pytest.mark.asyncio
async def test_fleet_prediction_handles_naive_trip_arrival_timestamps():
    now = datetime.now(timezone.utc)
    vehicle = SimpleNamespace(
        id="vehicle-1",
        registration_number="TRUCK-1",
        vehicle_type="Truck",
        status=VehicleStatus.IN_TRANSIT,
        hourly_operating_cost=2400,
    )
    location = SimpleNamespace(
        id="location-1",
        name="North Depot",
        expected_dwell_minutes=60,
    )
    trip = SimpleNamespace(
        id="trip-1",
        vehicle_id=vehicle.id,
        status=TripStatus.IN_PROGRESS,
        planned_arrival=(now + timedelta(hours=1)).replace(tzinfo=None),
        destination=location,
    )
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        RowsResult([vehicle]),
        RowsResult([trip]),
        RowsResult([]),
        RowsResult([]),
        RowsResult([location]),
        RowsResult([]),
        RowsResult([]),
    ]))

    response = await predict_fleet(db, "company-1")

    asset = response.assets[0]
    assert asset.tracking_state == "on_trip"
    assert asset.location_id == location.id
    assert asset.predicted_dwell_minutes == 60
