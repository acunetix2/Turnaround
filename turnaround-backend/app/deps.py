from typing import Annotated, Optional
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.db.models.company import Company
from app.auth.jwt import decode_supabase_jwt, JWTValidationError
from app.db.models.auth_session import AuthSession, hash_session_id
from app.config import settings


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Validates Supabase JWT from the Authorization header and resolves the DB user record.
    Rejects unauthenticated requests with HTTP 401.
    """
    session_id = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if session_id:
        result = await db.execute(select(AuthSession).where(
            AuthSession.id == hash_session_id(session_id),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(timezone.utc),
        ))
        auth_session = result.scalar_one_or_none()
        if auth_session:
            user_result = await db.execute(select(User).where(User.id == auth_session.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                return user
        raise HTTPException(status_code=401, detail={"error": {"code": "SESSION_EXPIRED", "message": "Session expired"}})

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing or malformed Bearer token"}},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_supabase_jwt(token)
    except JWTValidationError as e:
        if str(e) == "Authentication service is temporarily unreachable":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"error": {"code": "AUTH_SERVICE_UNAVAILABLE", "message": str(e)}},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": str(e)}},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CLAIMS", "message": "JWT missing sub claim"}},
        )

    # Resolve user from database
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # If user doesn't exist yet in local dev, auto-provision user + company for seamless onboarding
    if not user:
        company_id = payload.get("company_id") or "demo-company-1"
        # Check company
        c_stmt = select(Company).where(Company.id == company_id)
        c_res = await db.execute(c_stmt)
        company = c_res.scalar_one_or_none()
        if not company:
            company = Company(id=company_id, name="Demo Logistics Ltd")
            db.add(company)
            await db.flush()

        role_str = payload.get("role", "fleet_manager")
        try:
            role_enum = UserRole(role_str)
        except ValueError:
            role_enum = UserRole.FLEET_MANAGER

        user = User(
            id=user_id,
            company_id=company.id,
            name=payload.get("name", "Dispatcher Admin"),
            email=payload.get("email", f"{user_id}@turnaround.com"),
            role=role_enum,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_current_company(
    user: Annotated[User, Depends(get_current_user)]
) -> str:
    """Returns the company_id for strict multi-tenant data isolation."""
    return user.company_id
