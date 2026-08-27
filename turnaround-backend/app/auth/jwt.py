"""
JWT authentication using the Supabase Python client.

Architecture:
  - Primary path: supabase.auth.get_user(token) — calls the Supabase Auth API
    to validate the JWT and return the user's profile. This is the recommended
    approach as it handles key rotation, expiry, and revoked tokens automatically.
  - Fallback path: PyJWT local decode using SUPABASE_JWT_SECRET — used when
    ENVIRONMENT=development and SUPABASE_JWT_SECRET is set, avoiding a network
    call per request during local development.
  - Dev bypass: demo-token-* prefix for integration tests without a live Supabase project.
"""

import logging
from typing import Any, Dict, Optional

import jwt
from gotrue.errors import AuthApiError

from app.config import settings

logger = logging.getLogger("turnaround.auth")


class JWTValidationError(Exception):
    pass


def _demo_token_claims(token: str) -> Optional[Dict[str, Any]]:
    """Parse a demo bypass token. Only active in development mode."""
    if settings.ENVIRONMENT != "development":
        return None
    if not token.startswith("demo-token-"):
        return None
    # Format: demo-token-{user_id}-{company_id}-{role}
    parts = token.split("-")
    return {
        "sub": parts[2] if len(parts) > 2 else "demo-user-1",
        "email": f"{parts[4] if len(parts) > 4 else 'admin'}@turnaround.io",
        "company_id": parts[3] if len(parts) > 3 else "demo-company-1",
        "role": parts[4] if len(parts) > 4 else "admin",
    }


def _local_decode(token: str) -> Dict[str, Any]:
    """
    PyJWT local decode — faster during development, avoids a network round-trip.
    Requires SUPABASE_JWT_SECRET to be set.
    """
    if not settings.SUPABASE_JWT_SECRET:
        raise JWTValidationError("SUPABASE_JWT_SECRET not configured for local decode")
    try:
        decoded = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise JWTValidationError("Token has expired")
    except jwt.InvalidTokenError as exc:
        raise JWTValidationError(f"Invalid token: {exc}")


def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Validate a Supabase-issued Bearer JWT and return its claims.

    Validation strategy (in order):
      1. Demo bypass (dev only)
      2. Supabase Auth SDK — supabase.auth.get_user(token)
      3. Local PyJWT decode using SUPABASE_JWT_SECRET (dev fallback)
    """
    # 1. Dev demo bypass
    demo = _demo_token_claims(token)
    if demo:
        return demo

    # 2. Supabase client SDK verification (production path)
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from app.db.supabase_client import get_supabase_client
            client = get_supabase_client()
            # get_user() validates the token against Supabase Auth and returns
            # the full user object — handles expiry, revocation, and key rotation.
            response = client.auth.get_user(token)
            user = response.user
            if not user:
                raise JWTValidationError("Token is invalid or user not found")

            # Build a claims dict compatible with the rest of the app
            meta = user.user_metadata or {}
            app_meta = user.app_metadata or {}
            return {
                "sub": user.id,
                "email": user.email,
                "role": app_meta.get("role") or meta.get("role", "dispatcher"),
                "company_id": app_meta.get("company_id") or meta.get("company_id"),
                "user_metadata": meta,
                "app_metadata": app_meta,
            }
        except AuthApiError as exc:
            logger.warning(f"Supabase auth.get_user rejected token: {exc}")
            raise JWTValidationError(f"Supabase auth rejected token: {exc}")

    # 3. Local PyJWT fallback (dev with JWT secret only)
    logger.debug("Falling back to local PyJWT decode (SUPABASE_URL not configured)")
    return _local_decode(token)
