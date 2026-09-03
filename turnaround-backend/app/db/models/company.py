import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Float, Integer, Boolean, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.vehicle import Vehicle
    from app.db.models.location import Location
    from app.db.models.insight import Insight


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # ── Company identity ──────────────────────────────────────────────────
    registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    welcome_media_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    welcome_media_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    welcome_motto: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    privacy_policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_of_service: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # ── Contact ───────────────────────────────────────────────────────────
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, server_default='Kenya')

    # ── Regional settings ─────────────────────────────────────────────────
    currency: Mapped[str] = mapped_column(String(10), nullable=False, server_default='KES')
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, server_default='Africa/Nairobi')

    # ── Operational config ────────────────────────────────────────────────
    default_corridor: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    sla_warning_threshold_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default='30')
    sla_breach_threshold_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default='60')
    hourly_operating_rate: Mapped[float] = mapped_column(Float, nullable=False, server_default='7500')
    demurrage_rate_multiplier: Mapped[float] = mapped_column(Float, nullable=False, server_default='1.5')
    gps_polling_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, server_default='30')
    geofence_buffer_meters: Mapped[int] = mapped_column(Integer, nullable=False, server_default='100')

    # ── Automations ───────────────────────────────────────────────────────
    auto_revoke_expired_passes: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')
    notify_on_delay: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')
    notify_on_gate_pass: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')

    # ── Telematics integrations (stored as JSON) ──────────────────────────
    integrations: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="company", cascade="all, delete-orphan")
    vehicles: Mapped[List["Vehicle"]] = relationship("Vehicle", back_populates="company", cascade="all, delete-orphan")
    locations: Mapped[List["Location"]] = relationship("Location", back_populates="company", cascade="all, delete-orphan")
    insights: Mapped[List["Insight"]] = relationship("Insight", back_populates="company", cascade="all, delete-orphan")
