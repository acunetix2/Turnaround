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
    from app.db.models.gps_event import GPSEvent
    from app.db.models.dwell_event import DwellEvent


class VehicleStatus(str, enum.Enum):
    ACTIVE = "active"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    IN_TRANSIT = "in_transit"
    DELAYED = "delayed"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_type: Mapped[str] = mapped_column(String(100), default="Semi-Trailer Truck", nullable=False)
    capacity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # in tonnes / cbm
    hourly_operating_cost: Mapped[float] = mapped_column(Float, default=3500.0, nullable=False)  # in KES
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus, values_callable=lambda obj: [e.value for e in obj], name="vehiclestatus"),
        default=VehicleStatus.ACTIVE,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="vehicles")
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="vehicle", cascade="all, delete-orphan")
    gps_events: Mapped[List["GPSEvent"]] = relationship("GPSEvent", back_populates="vehicle", cascade="all, delete-orphan")
    dwell_events: Mapped[List["DwellEvent"]] = relationship("DwellEvent", back_populates="vehicle", cascade="all, delete-orphan")
