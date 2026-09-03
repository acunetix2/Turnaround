import uuid
import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.vehicle import Vehicle
    from app.db.models.trip import Trip
    from app.db.models.user import User


class GatePassStatus(str, enum.Enum):
    PRE_APPROVED = "pre_approved"
    APPROVED = "approved"
    CLEARED = "cleared"
    INSPECTED = "inspected"
    USED = "used"
    EXPIRED = "expired"
    REVOKED = "revoked"
    CANCELLED = "cancelled"


class GatePass(Base):
    __tablename__ = "gate_passes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pass_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=False, index=True)
    trip_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    issued_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Denormalised for quick display
    vehicle_reg: Mapped[str] = mapped_column(String(32), nullable=False)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    driver_name: Mapped[str] = mapped_column(String(128), nullable=False)
    driver_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    driver_license: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    container_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    customs_seal_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    cargo_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    cargo_weight_tonnes: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)

    terminal_name: Mapped[str] = mapped_column(String(256), nullable=False)
    terminal_gate: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    time_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[GatePassStatus] = mapped_column(
        SQLEnum(GatePassStatus, values_callable=lambda obj: [e.value for e in obj], name="gatepassstatus"),
        default=GatePassStatus.PRE_APPROVED,
        nullable=False,
        index=True,
    )

    carrier_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    digital_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="gate_passes")
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="gate_passes")
