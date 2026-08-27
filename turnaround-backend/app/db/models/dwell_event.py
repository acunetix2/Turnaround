import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.vehicle import Vehicle
    from app.db.models.location import Location
    from app.db.models.trip import Trip


class DwellEvent(Base):
    __tablename__ = "dwell_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id: Mapped[str] = mapped_column(String(36), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    trip_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # Null indicates active/in-progress dwell
    
    dwell_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    expected_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    excess_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # in KES
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="dwell_events")
    location: Mapped["Location"] = relationship("Location", back_populates="dwell_events")
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="dwell_events")
