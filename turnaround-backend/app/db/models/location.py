import uuid
import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.company import Company
    from app.db.models.trip import Trip
    from app.db.models.dwell_event import DwellEvent
    from app.db.models.insight import Insight


class LocationType(str, enum.Enum):
    WAREHOUSE = "warehouse"
    CUSTOMER_FACILITY = "customer_facility"
    DEPOT = "depot"
    PORT = "port"
    BORDER_CROSSING = "border_crossing"
    LOADING_POINT = "loading_point"
    UNLOADING_POINT = "unloading_point"


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    location_type: Mapped[LocationType] = mapped_column(
        SQLEnum(LocationType, values_callable=lambda obj: [e.value for e in obj], name="locationtype"),
        default=LocationType.WAREHOUSE,
        nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geofence_radius: Mapped[float] = mapped_column(Float, default=250.0, nullable=False)  # in meters
    expected_dwell_minutes: Mapped[float] = mapped_column(Float, default=90.0, nullable=False)  # in minutes
    customer_sla_minutes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # SLA tier hook
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="locations")
    origin_trips: Mapped[List["Trip"]] = relationship("Trip", foreign_keys="Trip.origin_id", back_populates="origin")
    destination_trips: Mapped[List["Trip"]] = relationship("Trip", foreign_keys="Trip.destination_id", back_populates="destination")
    dwell_events: Mapped[List["DwellEvent"]] = relationship("DwellEvent", back_populates="location")
    insights: Mapped[List["Insight"]] = relationship("Insight", back_populates="location")
