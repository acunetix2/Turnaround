from app.routers.gps_events import _collect_vehicle_match_candidates, _lookup_nested_value


def test_collect_vehicle_match_candidates_reads_nested_flespi_fields():
    payload = {
        "device": {
            "ident": "359871109988123",
            "serial": "ABC-001"
        },
        "position": {
            "lat": -1.286,
            "lng": 36.817,
            "timestamp": "2026-09-20T12:00:00Z"
        },
        "vehicle": {
            "id": "veh-001",
            "registration_number": "KDA 123A"
        },
    }

    vehicle_ids, imeis = _collect_vehicle_match_candidates(payload)

    assert "veh-001" in vehicle_ids
    assert "KDA 123A" in vehicle_ids
    assert "359871109988123" in imeis


def test_lookup_nested_value_handles_dotted_flespi_keys():
    payload = {
        'battery.level': 67,
        'device.id': 9035469,
        'device.name': 'TRUCKER ONE',
        'ident': '359871109988123',
        'position.altitude': 0,
        'position.direction': 0,
        'position.latitude': -4.05451,
        'position.longitude': 39.689702,
        'position.speed': 63,
        'timestamp': 1789917598.659,
    }

    assert _lookup_nested_value(payload, 'latitude', 'lat', 'gps_latitude') == -4.05451
    assert _lookup_nested_value(payload, 'longitude', 'lng', 'gps_longitude') == 39.689702
    assert _lookup_nested_value(payload, 'speed', 'speed_kmh', 'velocity') == 63
