from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="System health & connectivity check")
async def check_health(db: AsyncSession = Depends(get_db)):
    """
    Verifies API status, PostgreSQL (Supabase) connectivity,
    and Supabase Auth client reachability.
    """
    db_status = "healthy"
    supabase_status = "healthy"

    # Check Supabase PostgreSQL via asyncpg
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check Supabase Auth client (if configured)
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from app.db.supabase_client import get_supabase_client
            client = get_supabase_client()
            # Light check — just verify the client initialised without error
            _ = client.auth
        except Exception as e:
            supabase_status = f"unhealthy: {str(e)}"
    else:
        supabase_status = "not_configured"

    overall = "ok" if "unhealthy" not in db_status else "degraded"
    return {
        "status": overall,
        "database": db_status,
        "supabase_auth": supabase_status,
        "service": "turnaround-backend",
        "version": settings.VERSION,
    }
