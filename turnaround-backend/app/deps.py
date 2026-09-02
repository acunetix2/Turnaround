from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.db.models.company import Company
from app.auth.jwt import decode_supabase_jwt, JWTValidationError


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Validates Supabase JWT from the Authorization header and resolves the DB user record.
    Rejects unauthenticated requests with HTTP 401.
    """
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
            email=payload.get("email", f"{user_id}@turnaround.io"),
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
