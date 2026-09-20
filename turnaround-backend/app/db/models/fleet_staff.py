import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.company import Company
    from app.db.models.vehicle import Vehicle


class FleetStaff(Base):
    __tablename__ = "fleet_staff"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    license_expiry_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    availability_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="available")
    staff_type: Mapped[str] = mapped_column(String(40), nullable=False, server_default="driver")
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="fleet_staff")
    assigned_vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", foreign_keys="Vehicle.driver_id", back_populates="driver"
    )
    co_driven_vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", foreign_keys="Vehicle.co_driver_id", back_populates="co_driver"
    )