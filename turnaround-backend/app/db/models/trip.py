import uuid
import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.vehicle import Vehicle
    from app.db.models.location import Location
    from app.db.models.dwell_event import DwellEvent
    from app.db.models.gate_pass import GatePass
    from app.db.models.container import Container


class TripStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"   # legacy alias kept for backward compat
    IN_TRANSIT = "in_transit"     # canonical active-movement state
    DELAYED = "delayed"            # active trip exceeding SLA threshold
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    container_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("containers.id", ondelete="SET NULL"), nullable=True, index=True)
    origin_id: Mapped[str] = mapped_column(String(36), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    destination_id: Mapped[str] = mapped_column(String(36), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    
    planned_departure: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    planned_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_departure: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[TripStatus] = mapped_column(
        SQLEnum(TripStatus, values_callable=lambda obj: [e.value for e in obj], name="tripstatus"),
        default=TripStatus.PLANNED,
        nullable=False
    )
    # Corridor / cargo metadata
    corridor_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    customs_seal_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    container_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    cargo_description: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cargo_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    cargo_weight_tonnes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
    container: Mapped[Optional["Container"]] = relationship("Container", back_populates="trips")
    origin: Mapped["Location"] = relationship("Location", foreign_keys=[origin_id], back_populates="origin_trips")
    destination: Mapped["Location"] = relationship("Location", foreign_keys=[destination_id], back_populates="destination_trips")
    dwell_events: Mapped[List["DwellEvent"]] = relationship("DwellEvent", back_populates="trip")
    gate_passes: Mapped[List["GatePass"]] = relationship("GatePass", back_populates="trip")
