from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.db.models.trip import TripStatus
from app.routers import trips as trip_router
from app.schemas.trip import TripUpdate


class TripQuery:
    def where(self, *_conditions):
        return self


class TripResult:
    def __init__(self, trip):
        self.trip = trip

    def scalar_one_or_none(self):
        return self.trip

    def scalar_one(self):
        return self.trip


@pytest.mark.asyncio
async def test_starting_a_trip_records_departure_for_future_route_training(monkeypatch):
    trip = SimpleNamespace(
        id="trip-1",
        status=TripStatus.PLANNED,
        actual_departure=None,
        actual_arrival=None,
        vehicle_id="vehicle-1",
        vehicle=SimpleNamespace(registration_number="TRUCK-1"),
        planned_departure=None,
        planned_arrival=None,
        container_id=None,
    )
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[TripResult(trip), TripResult(trip)]),
        commit=AsyncMock(),
    )
    monkeypatch.setattr(trip_router, "_trip_query", lambda _company_id: TripQuery())
    monkeypatch.setattr(trip_router, "_attach_checkpoints", lambda item: item)
    monkeypatch.setattr(trip_router.notif_svc, "trip_status_changed", AsyncMock())

    await trip_router.update_trip(
        "trip-1",
        TripUpdate(status=TripStatus.IN_TRANSIT),
        db,
        "company-1",
        _rbac=True,
    )

    assert trip.status == TripStatus.IN_TRANSIT
    assert trip.actual_departure is not None
    assert trip.actual_departure.tzinfo is not None
    assert trip.actual_arrival is None


@pytest.mark.asyncio
async def test_completing_a_trip_records_arrival_for_future_route_training(monkeypatch):
    trip = SimpleNamespace(
        id="trip-1",
        status=TripStatus.IN_TRANSIT,
        actual_departure=None,
        actual_arrival=None,
        vehicle_id="vehicle-1",
        vehicle=SimpleNamespace(registration_number="TRUCK-1"),
        planned_departure=None,
        planned_arrival=None,
        container_id=None,
    )
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[TripResult(trip), TripResult(trip)]),
        commit=AsyncMock(),
    )
    monkeypatch.setattr(trip_router, "_trip_query", lambda _company_id: TripQuery())
    monkeypatch.setattr(trip_router, "_attach_checkpoints", lambda item: item)
    monkeypatch.setattr(trip_router.notif_svc, "trip_status_changed", AsyncMock())

    await trip_router.update_trip(
        "trip-1",
        TripUpdate(status=TripStatus.COMPLETED),
        db,
        "company-1",
        _rbac=True,
    )

    assert trip.status == TripStatus.COMPLETED
    assert trip.actual_departure is None
    assert trip.actual_arrival is not None
    assert trip.actual_arrival.tzinfo is not None
