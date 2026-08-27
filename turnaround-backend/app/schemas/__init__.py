"""Schemas package."""
from app.schemas.common import PaginatedResponse
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.schemas.gps_event import GPSEventCreate, GPSBatchIngest, GPSEventResponse, IngestionResult
from app.schemas.dwell_event import DwellEventResponse
from app.schemas.insight import InsightResponse
from app.schemas.analytics import DashboardMetrics, LocationPerformance, VehiclePerformance, TrendAnalytics, TrendPoint
from app.schemas.predictions import DwellPredictionRequest, DwellPredictionResponse, DelayRiskRequest, DelayRiskResponse

__all__ = [
    "PaginatedResponse",
    "VehicleCreate", "VehicleUpdate", "VehicleResponse",
    "LocationCreate", "LocationUpdate", "LocationResponse",
    "TripCreate", "TripUpdate", "TripResponse",
    "GPSEventCreate", "GPSBatchIngest", "GPSEventResponse", "IngestionResult",
    "DwellEventResponse",
    "InsightResponse",
    "DashboardMetrics", "LocationPerformance", "VehiclePerformance", "TrendAnalytics", "TrendPoint",
    "DwellPredictionRequest", "DwellPredictionResponse", "DelayRiskRequest", "DelayRiskResponse",
]
