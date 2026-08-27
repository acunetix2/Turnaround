import uuid
import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.company import Company
    from app.db.models.location import Location


class InsightSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InsightType(str, enum.Enum):
    EXCESSIVE_DWELL = "EXCESSIVE_DWELL"
    RECURRING_BOTTLENECK = "RECURRING_BOTTLENECK"
    DELAY_RISK = "DELAY_RISK"
    SLA_BREACH = "SLA_BREACH"
    WEIGHBRIDGE_CONGESTION = "WEIGHBRIDGE_CONGESTION"
    GATE_HOLD = "GATE_HOLD"


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    type: Mapped[str] = mapped_column(String(100), default=InsightType.EXCESSIVE_DWELL.value, nullable=False)
    severity: Mapped[InsightSeverity] = mapped_column(SQLEnum(InsightSeverity), default=InsightSeverity.MEDIUM, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    financial_impact: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # in KES
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="insights")
    location: Mapped[Optional["Location"]] = relationship("Location", back_populates="insights")
