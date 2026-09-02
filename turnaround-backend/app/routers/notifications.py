"""
Notifications Router — list, mark read, delete notifications
"""
from typing import Annotated, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update

from app.db.session import get_db
from app.db.models.notification import Notification, NotificationSeverity, NotificationCategory
from app.db.models.user import User
from app.deps import get_current_company, get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    company_id: str
    user_id: Optional[str]
    title: str
    description: str
    severity: str
    category: str
    read: bool
    link: Optional[str]
    meta: Optional[dict]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread: int


@router.get("", response_model=NotificationListResponse, summary="List notifications")
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    unread_only: bool = Query(False),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Returns notifications visible to the current user:
    - Company-wide (user_id IS NULL)
    - User-specific (user_id = current user)
    """
    base_q = (
        select(Notification)
        .where(
            Notification.company_id == company_id,
            or_(
                Notification.user_id.is_(None),
                Notification.user_id == current_user.id,
            )
        )
    )

    if unread_only:
        base_q = base_q.where(Notification.read == False)  # noqa: E712
    if category:
        try:
            base_q = base_q.where(Notification.category == NotificationCategory(category))
        except ValueError:
            pass
    if severity:
        try:
            base_q = base_q.where(Notification.severity == NotificationSeverity(severity))
        except ValueError:
            pass

    # Count totals
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    unread_q = select(func.count()).select_from(
        base_q.where(Notification.read == False).subquery()  # noqa: E712
    )
    unread = (await db.execute(unread_q)).scalar_one()

    items_q = base_q.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_q)
    items = result.scalars().all()

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        unread=unread,
    )


@router.post("/{notif_id}/read", response_model=NotificationResponse, summary="Mark notification as read")
async def mark_read(
    notif_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.company_id == company_id,
            or_(Notification.user_id.is_(None), Notification.user_id == current_user.id)
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    await db.commit()
    await db.refresh(n)
    return NotificationResponse.model_validate(n)


@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    await db.execute(
        update(Notification)
        .where(
            Notification.company_id == company_id,
            or_(Notification.user_id.is_(None), Notification.user_id == current_user.id),
            Notification.read == False,  # noqa: E712
        )
        .values(read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete notification")
async def delete_notification(
    notif_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.company_id == company_id,
            or_(Notification.user_id.is_(None), Notification.user_id == current_user.id)
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(n)
    await db.commit()
