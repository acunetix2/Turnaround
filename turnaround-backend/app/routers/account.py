"""
Account Settings Router - User profile and preferences management
"""
from typing import Annotated, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.user import User
from app.deps import get_current_user

router = APIRouter(prefix="/account", tags=["Account Settings"])


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class NotificationPreferencesRequest(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = False
    push_notifications: bool = True
    notify_on_delay: bool = True
    notify_on_arrival: bool = True
    notify_on_gate_pass: bool = True
    notify_on_demurrage: bool = True


class ProfileResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str]
    email: str
    name: str
    role: str
    phone: Optional[str]
    status: str
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationPreferencesResponse(BaseModel):
    email_notifications: bool
    sms_notifications: bool
    push_notifications: bool
    notify_on_delay: bool
    notify_on_arrival: bool
    notify_on_gate_pass: bool
    notify_on_demurrage: bool


@router.get("/profile", response_model=ProfileResponse, summary="Get current user profile")
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get the current authenticated user's profile."""
    return ProfileResponse(
        id=current_user.id,
        company_id=current_user.company_id,
        company_name=getattr(current_user, 'company_name', None),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        phone=current_user.phone,
        status=current_user.status,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
    )


@router.patch("/profile", response_model=ProfileResponse, summary="Update user profile")
async def update_profile(
    payload: ProfileUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update the current user's profile information."""
    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone
    
    current_user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(current_user)
    
    return ProfileResponse(
        id=current_user.id,
        company_id=current_user.company_id,
        company_name=getattr(current_user, 'company_name', None),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        phone=current_user.phone,
        status=current_user.status,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
    )


@router.get("/notifications", response_model=NotificationPreferencesResponse, summary="Get notification preferences")
async def get_notification_preferences(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return NotificationPreferencesResponse(
        email_notifications=current_user.email_notifications,
        sms_notifications=current_user.sms_notifications,
        push_notifications=current_user.push_notifications,
        notify_on_delay=current_user.notify_on_delay,
        notify_on_arrival=current_user.notify_on_arrival,
        notify_on_gate_pass=current_user.notify_on_gate_pass,
        notify_on_demurrage=current_user.notify_on_demurrage,
    )


@router.patch("/notifications", response_model=NotificationPreferencesResponse, summary="Update notification preferences")
async def update_notification_preferences(
    payload: NotificationPreferencesRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    for field, value in payload.model_dump().items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)
    return await get_notification_preferences(current_user)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password", summary="Change password")
async def change_password(
    payload: PasswordChangeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Change user password.
    Note: This is a placeholder. Actual password changes should go through Supabase Auth API.
    """
    # In production, delegate to Supabase Auth API
    return {
        "message": "Password change request received. In production, this would be handled by Supabase Auth.",
        "status": "success"
    }


@router.get("/activity", summary="Get account activity log")
async def get_activity_log(
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
):
    """
    Get recent account activity.
    Returns login history, profile changes, etc.
    For now, returns a placeholder. In production, would query an audit_log table.
    """
    return {
        "activities": [
            {
                "id": "act-1",
                "action": "login",
                "description": "Logged in from 192.168.1.1",
                "timestamp": datetime.utcnow().isoformat(),
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0...",
            }
        ],
        "total": 1,
        "limit": limit,
    }
