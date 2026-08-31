import uuid
import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.vehicle import Vehicle
    from app.db.models.location import Location
    from app.db.models.dwell_event import DwellEvent


class ResponsibleParty(str, enum.Enum):
    TERMINAL_OPERATOR = "terminal_operator"
    CUSTOMS_AUTHORITY = "customs_authority"
    SHIPPER = "shipper"
    WEIGHBRIDGE_AUTHORITY = "weighbridge_authority"
    RAIL_FREIGHT = "rail_freight"


class ClaimStatus(str, enum.Enum):
    FLAGGED = "flagged"
    INVOICED = "invoiced"
    DISPUTED = "disputed"
    SETTLED = "settled"
    WRITTEN_OFF = "written_off"


class DemurrageClaim(Base):
    __tablename__ = "demurrage_claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=False, index=True)
    location_id: Mapped[str] = mapped_column(String(36), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    dwell_event_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("dwell_events.id", ondelete="SET NULL"), nullable=True)

    # Denormalised read-only fields for quick display (populated at creation)
    vehicle_reg: Mapped[str] = mapped_column(String(32), nullable=False)
    location_name: Mapped[str] = mapped_column(String(256), nullable=False)

    container_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    driver_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    carrier_name: Mapped[str] = mapped_column(String(256), nullable=False)

    responsible_party: Mapped[ResponsibleParty] = mapped_column(
        SQLEnum(ResponsibleParty, values_callable=lambda obj: [e.value for e in obj], name="responsibleparty"),
        nullable=False,
    )

    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    sla_threshold_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_dwell_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    excess_delay_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    hourly_operating_rate: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    claimed_amount_kes: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    settled_amount_kes: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)

    status: Mapped[ClaimStatus] = mapped_column(
        SQLEnum(ClaimStatus, values_callable=lambda obj: [e.value for e in obj], name="claimstatus"),
        default=ClaimStatus.FLAGGED,
        nullable=False,
        index=True,
    )

    invoice_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settlement_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dispute_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="demurrage_claims")
    location: Mapped["Location"] = relationship("Location", back_populates="demurrage_claims")
