"""
User Management Router - Admin control for company users
"""
from typing import Annotated, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.deps import get_current_company, get_current_user
from app.auth.rbac import require_role

router = APIRouter(prefix="/users", tags=["User Management"])

ADMIN_ONLY    = require_role(UserRole.ADMIN)
MANAGE_ROLES  = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)


class UserCreateRequest(BaseModel):
    email: str
    name: str
    role: str = Field(..., pattern="^(admin|fleet_manager|dispatcher|driver|viewer)$")
    phone: Optional[str] = None
    status: str = Field(default="active", pattern="^(active|inactive|suspended)$")


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(admin|fleet_manager|dispatcher|driver|viewer)$")
    phone: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|suspended)$")


class UserResponse(BaseModel):
    id: str
    company_id: str
    email: str
    name: str
    role: str
    phone: Optional[str]
    status: str
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=UserListResponse, summary="List company users")
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    _check: Annotated[None, Depends(MANAGE_ROLES)],
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
):
    """List all users in the company with optional filters."""
    query = select(User).where(User.company_id == company_id)
    
    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    # Role filter
    if role:
        query = query.where(User.role == role)
    
    # Status filter
    if status:
        query = query.where(User.status == status)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{user_id}", response_model=UserResponse, summary="Get user details")
async def get_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _check: Annotated[None, Depends(MANAGE_ROLES)],
):
    """Get detailed information about a specific user."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create new user")
async def create_user(
    payload: UserCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _check: Annotated[None, Depends(ADMIN_ONLY)],
):
    """
    Create a new user account. Admin only.
    Note: This creates a user record. Actual authentication is handled by Supabase.
    """
    # Check if email already exists in company
    existing = await db.execute(
        select(User).where(User.email == payload.email, User.company_id == company_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists in your company"
        )
    
    # Create user
    new_user = User(
        company_id=company_id,
        email=payload.email,
        name=payload.name,
        role=payload.role,
        phone=payload.phone,
        status=payload.status,
        created_at=datetime.utcnow(),
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserResponse.model_validate(new_user)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update user")
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    _check: Annotated[None, Depends(ADMIN_ONLY)],
):
    """Update user details. Admin only."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion (admin removing their own admin role)
    if user.id == current_user.id and payload.role and payload.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own admin role"
        )
    
    # Update fields
    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.status is not None:
        user.status = payload.status
    
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete user")
async def delete_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    _check: Annotated[None, Depends(ADMIN_ONLY)],
):
    """Delete a user. Admin only. Cannot delete yourself."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )
    
    await db.delete(user)
    await db.commit()
    
    return None


@router.post("/{user_id}/suspend", response_model=UserResponse, summary="Suspend user account")
async def suspend_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    current_user: Annotated[User, Depends(get_current_user)],
    _check: Annotated[None, Depends(ADMIN_ONLY)],
):
    """Suspend a user account. Admin only."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot suspend your own account")
    
    user.status = "suspended"
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.post("/{user_id}/activate", response_model=UserResponse, summary="Activate user account")
async def activate_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _check: Annotated[None, Depends(ADMIN_ONLY)],
):
    """Activate a suspended/inactive user account. Admin only."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "active"
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)
