import uuid
import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, utc_now

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.company import Company


class NotificationSeverity(str, enum.Enum):
    HIGH   = "high"
    MEDIUM = "medium"
    LOW    = "low"
    INFO   = "info"


class NotificationCategory(str, enum.Enum):
    DELAY      = "delay"
    DEMURRAGE  = "demurrage"
    GATE_PASS  = "gate_pass"
    TRIP       = "trip"
    USER       = "user"
    SYSTEM     = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Scope — company-wide if user_id is NULL, user-specific if user_id is set
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    severity: Mapped[NotificationSeverity] = mapped_column(
        SQLEnum(NotificationSeverity, values_callable=lambda obj: [e.value for e in obj], name="notificationseverity"),
        default=NotificationSeverity.INFO, nullable=False, index=True
    )
    category: Mapped[NotificationCategory] = mapped_column(
        SQLEnum(NotificationCategory, values_callable=lambda obj: [e.value for e in obj], name="notificationcategory"),
        default=NotificationCategory.SYSTEM, nullable=False, index=True
    )

    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    link: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    company: Mapped["Company"] = relationship("Company")
    user: Mapped[Optional["User"]] = relationship("User")
