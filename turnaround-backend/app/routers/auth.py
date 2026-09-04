import base64
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models.auth_session import AuthSession, hash_session_id
from app.db.models.company import Company
from app.db.models.user import User, UserRole
from app.db.session import get_db
from app.deps import get_current_user
from app.db.supabase_client import get_supabase_client
from supabase_auth.errors import AuthApiError

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("turnaround.auth")


def _cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256((settings.SUPABASE_JWT_SECRET or "").encode()).digest())
    return Fernet(key)


def _encrypt(value: str) -> str:
    return _cipher().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise HTTPException(status_code=401, detail="Session is invalid") from exc


def _set_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        session_id,
        max_age=settings.AUTH_SESSION_DAYS * 86400,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="none" if settings.AUTH_COOKIE_SECURE else "lax",
        path="/",
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=255)
    company: str = Field(min_length=2, max_length=255)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    user: dict
    requires_email_confirmation: bool = False


class SessionResponse(BaseModel):
    id: str
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    current: bool


async def _local_user(db: AsyncSession, supabase_user, fallback_company: Optional[str] = None, fallback_name: Optional[str] = None, fallback_role: Optional[str] = None, explicit_company_id: Optional[str] = None) -> User:
    metadata = supabase_user.user_metadata or {}
    app_metadata = supabase_user.app_metadata or {}
    user_id = supabase_user.id
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    company_id = explicit_company_id or app_metadata.get("company_id") or metadata.get("company_id") or (str(uuid.uuid4()) if fallback_company else "demo-company-1")
    if not user:
        company_result = await db.execute(select(Company).where(Company.id == company_id))
        company = company_result.scalar_one_or_none()
        if not company:
            company = Company(id=company_id, name=metadata.get("company") or fallback_company or "Turnaround Workspace")
            db.add(company)
            await db.flush()
        try:
            role = UserRole(app_metadata.get("role") or metadata.get("role") or fallback_role or "fleet_manager")
        except ValueError:
            role = UserRole.FLEET_MANAGER
        user = User(
            id=user_id,
            company_id=company.id,
            name=fallback_name or metadata.get("name") or supabase_user.email.split("@")[0],
            email=supabase_user.email,
            role=role,
        )
        db.add(user)
        await db.flush()
    return user


async def _create_session(db: AsyncSession, user: User, session) -> str:
    raw_id = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=session.expires_in or 3600)
    db.add(AuthSession(
        id=hash_session_id(raw_id),
        user_id=user.id,
        access_token=_encrypt(session.access_token),
        refresh_token=_encrypt(session.refresh_token),
        expires_at=expires_at,
    ))
    await db.commit()
    return raw_id


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        result = get_supabase_client().auth.sign_in_with_password({"email": str(payload.email), "password": payload.password})
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid email or password") from exc
    if not result.session or not result.user:
        raise HTTPException(status_code=401, detail="Email confirmation is required before signing in")
    user = await _local_user(db, result.user)
    session_id = await _create_session(db, user, result.session)
    _set_cookie(response, session_id)
    return AuthResponse(user={"id": user.id, "company_id": user.company_id, "name": user.name, "email": user.email, "role": user.role.value})


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    # Signup must never inherit the browser's previous tenant session. This is
    # especially important when Supabase requires email confirmation and no
    # replacement session is returned below.
    response.delete_cookie(
        settings.AUTH_COOKIE_NAME,
        path="/",
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="none" if settings.AUTH_COOKIE_SECURE else "lax",
    )
    try:
        result = get_supabase_client().auth.sign_up({"email": str(payload.email), "password": payload.password, "options": {"data": {"name": payload.name, "company": payload.company}}})
    except AuthApiError as exc:
        logger.warning("Supabase signup rejected request: code=%s status=%s", exc.code, exc.status)
        provider_messages = {
            "user_already_exists": "An account with this email already exists. Please sign in instead.",
            "email_exists": "An account with this email already exists. Please sign in instead.",
            "signup_disabled": "New account registration is currently disabled.",
            "weak_password": "Choose a stronger password with at least 8 characters.",
        }
        provider_message = str(exc).lower()
        if exc.status == 429 or "rate limit" in provider_message or "too many" in provider_message:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Signup email delivery is temporarily rate-limited by the authentication provider. Please wait a few minutes and try again.",
                headers={"Retry-After": "300"},
            ) from exc
        message = provider_messages.get(str(exc.code), "Unable to create account. Check your details and try again.")
        raise HTTPException(status_code=400, detail=message) from exc
    except Exception as exc:
        logger.exception("Unexpected Supabase signup failure")
        raise HTTPException(status_code=400, detail="Unable to create account") from exc
    if not result.user:
        raise HTTPException(status_code=400, detail="Unable to create account")
    existing_user = (await db.execute(select(User).where(User.id == result.user.id))).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=409, detail="An account already exists. Please sign in instead.")
    # A public signup is always a new tenant. Never trust user metadata or a
    # requested role to attach an account to an existing company.
    new_company_id = str(uuid.uuid4())
    user = await _local_user(db, result.user, fallback_company=payload.company, fallback_name=payload.name, fallback_role=UserRole.ADMIN.value, explicit_company_id=new_company_id)
    user.role = UserRole.ADMIN
    if not result.session:
        await db.commit()
        return AuthResponse(user={"id": user.id, "company_id": user.company_id, "name": user.name, "email": user.email, "role": user.role.value}, requires_email_confirmation=True)
    session_id = await _create_session(db, user, result.session)
    _set_cookie(response, session_id)
    return AuthResponse(user={"id": user.id, "company_id": user.company_id, "name": user.name, "email": user.email, "role": user.role.value})


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(payload: PasswordResetRequest):
    # Always return the same status so email addresses cannot be enumerated.
    try:
        get_supabase_client().auth.reset_password_for_email(str(payload.email))
    except Exception:
        pass


@router.get("/me")
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    return {"id": current_user.id, "company_id": current_user.company_id, "name": current_user.name, "email": current_user.email, "role": current_user.role.value, "status": current_user.status, "created_at": current_user.created_at}


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    raw_id = request.cookies.get(settings.AUTH_COOKIE_NAME)
    current_id = hash_session_id(raw_id) if raw_id else None
    result = await db.execute(
        select(AuthSession).where(
            AuthSession.user_id == current_user.id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(timezone.utc),
        ).order_by(AuthSession.last_used_at.desc())
    )
    return [SessionResponse(id=session.id, created_at=session.created_at, last_used_at=session.last_used_at, expires_at=session.expires_at, current=session.id == current_id) for session in result.scalars().all()]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: str,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    raw_id = request.cookies.get(settings.AUTH_COOKIE_NAME)
    current_id = hash_session_id(raw_id) if raw_id else None
    if session_id == current_id:
        raise HTTPException(status_code=400, detail="The current session cannot be revoked here")
    result = await db.execute(select(AuthSession).where(AuthSession.id == session_id, AuthSession.user_id == current_user.id, AuthSession.revoked_at.is_(None)))
    session = result.scalar_one_or_none()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        await db.commit()


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    raw_id = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not raw_id:
        raise HTTPException(status_code=401, detail="No session")
    result = await db.execute(select(AuthSession).where(AuthSession.id == hash_session_id(raw_id), AuthSession.revoked_at.is_(None)))
    auth_session = result.scalar_one_or_none()
    if not auth_session:
        raise HTTPException(status_code=401, detail="Session not found")
    try:
        refreshed = get_supabase_client().auth.refresh_session(_decrypt(auth_session.refresh_token))
    except Exception as exc:
        auth_session.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(status_code=401, detail="Session expired") from exc
    if not refreshed.session:
        raise HTTPException(status_code=401, detail="Session expired")
    auth_session.access_token = _encrypt(refreshed.session.access_token)
    auth_session.refresh_token = _encrypt(refreshed.session.refresh_token)
    auth_session.expires_at = datetime.now(timezone.utc) + timedelta(seconds=refreshed.session.expires_in or 3600)
    auth_session.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    _set_cookie(response, raw_id)
    return {"ok": True}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    raw_id = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if raw_id:
        result = await db.execute(select(AuthSession).where(AuthSession.id == hash_session_id(raw_id)))
        auth_session = result.scalar_one_or_none()
        if auth_session:
            auth_session.revoked_at = datetime.now(timezone.utc)
            await db.commit()
    response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/")
