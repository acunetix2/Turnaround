import math
from typing import List, Tuple, Optional
from dataclasses import dataclass


EARTH_RADIUS_METERS = 6371000.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth surface
    in meters using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_METERS * c


def is_inside_geofence(
    point_lat: float,
    point_lon: float,
    center_lat: float,
    center_lon: float,
    radius_meters: float
) -> bool:
    """Returns True if the point is within the circular geofence boundary."""
    dist = haversine_distance(point_lat, point_lon, center_lat, center_lon)
    return dist <= radius_meters


@dataclass
class GeofenceMatch:
    location_id: str
    location_name: str
    distance_meters: float
    is_inside: bool


def find_matching_geofences(
    point_lat: float,
    point_lon: float,
    locations: List[Tuple[str, str, float, float, float]]  # (id, name, lat, lon, radius)
) -> List[GeofenceMatch]:
    """Find all geofenced locations containing the GPS point."""
    matches: List[GeofenceMatch] = []
    for loc_id, name, lat, lon, radius in locations:
        dist = haversine_distance(point_lat, point_lon, lat, lon)
        if dist <= radius:
            matches.append(
                GeofenceMatch(
                    location_id=loc_id,
                    location_name=name,
                    distance_meters=dist,
                    is_inside=True,
                )
            )
    return matches


def evaluate_debounce_departure(
    recent_readings_inside: List[bool],
    required_outside_points: int = 2
) -> bool:
    """
    Prevent GPS noise oscillation: only confirm departure if the last N consecutive
    readings were outside the geofence.
    """
    if len(recent_readings_inside) < required_outside_points:
        return False
    # Check if the last N points are all False (outside)
    last_n = recent_readings_inside[-required_outside_points:]
    return all(not is_in for is_in in last_n)
