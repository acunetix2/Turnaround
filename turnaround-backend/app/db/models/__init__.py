"""
SQLAlchemy model package.
Importing all models here ensures they are registered against Base.metadata
before Alembic generates migrations or before create_all() runs at startup.
"""
from app.db.models.company import Company
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.location import Location
from app.db.models.trip import Trip
from app.db.models.gps_event import GPSEvent
from app.db.models.dwell_event import DwellEvent
from app.db.models.insight import Insight
from app.db.models.demurrage_claim import DemurrageClaim
from app.db.models.gate_pass import GatePass
from app.db.models.notification import Notification, NotificationDevice
from app.db.models.auth_session import AuthSession
from app.db.models.fleet_staff import FleetStaff

__all__ = [
    "Company", "User", "Vehicle", "Location",
    "Trip", "GPSEvent", "DwellEvent", "Insight",
    "DemurrageClaim", "GatePass", "Notification", "AuthSession", "FleetStaff",
]
