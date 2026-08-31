import uuid
import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.company import Company
    from app.db.models.trip import Trip
    from app.db.models.gps_event import GPSEvent
    from app.db.models.dwell_event import DwellEvent
    from app.db.models.demurrage_claim import DemurrageClaim
    from app.db.models.gate_pass import GatePass


class VehicleStatus(str, enum.Enum):
    ACTIVE = "active"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    IN_TRANSIT = "in_transit"
    DELAYED = "delayed"


class DriverStatus(str, enum.Enum):
    ON_DUTY = "on_duty"
    DRIVING = "driving"
    RESTING = "resting"


class MaintenanceStatus(str, enum.Enum):
    GOOD = "good"
    DUE_SOON = "due_soon"
    IN_SERVICE = "in_service"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_type: Mapped[str] = mapped_column(String(100), default="Semi-Trailer Truck", nullable=False)
    capacity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hourly_operating_cost: Mapped[float] = mapped_column(Float, default=3500.0, nullable=False)
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus, values_callable=lambda obj: [e.value for e in obj], name="vehiclestatus"),
        default=VehicleStatus.ACTIVE,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # ── Asset Image ─────────────────────────────────────────────────────────
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Driver Assignment ────────────────────────────────────────────────────
    driver_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    driver_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    driver_license: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    driver_avatar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    driver_status: Mapped[Optional[DriverStatus]] = mapped_column(
        SQLEnum(DriverStatus, values_callable=lambda obj: [e.value for e in obj], name="driverstatus"),
        nullable=True
    )

    # ── Container / Cargo ────────────────────────────────────────────────────
    trailer_number: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    container_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    container_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cargo_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # ── Telematics / GPS ─────────────────────────────────────────────────────
    telematics_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tracker_imei: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # ── Operational State ────────────────────────────────────────────────────
    fuel_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 0-100 %
    odometer_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    maintenance_status: Mapped[Optional[MaintenanceStatus]] = mapped_column(
        SQLEnum(MaintenanceStatus, values_callable=lambda obj: [e.value for e in obj], name="maintenancestatus"),
        nullable=True,
        default=MaintenanceStatus.GOOD
    )
    next_inspection_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD

    # ── Relationships ────────────────────────────────────────────────────────
    company: Mapped["Company"] = relationship("Company", back_populates="vehicles")
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="vehicle", cascade="all, delete-orphan")
    gps_events: Mapped[List["GPSEvent"]] = relationship("GPSEvent", back_populates="vehicle", cascade="all, delete-orphan")
    dwell_events: Mapped[List["DwellEvent"]] = relationship("DwellEvent", back_populates="vehicle", cascade="all, delete-orphan")
    demurrage_claims: Mapped[List["DemurrageClaim"]] = relationship("DemurrageClaim", back_populates="vehicle")
    gate_passes: Mapped[List["GatePass"]] = relationship("GatePass", back_populates="vehicle")
