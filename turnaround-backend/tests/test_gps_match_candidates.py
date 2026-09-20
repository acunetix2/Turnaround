from app.routers.gps_events import _collect_vehicle_match_candidates


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
