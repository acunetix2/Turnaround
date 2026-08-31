from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any
from app.db.session import get_db
from app.db.health import get_database_health, health_checker
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


@router.get("/db", summary="Database health check")
async def database_health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Comprehensive database health check including:
    - Connection status
    - Pool statistics  
    - Query performance
    - SSL/TLS status
    """
    try:
        # Get comprehensive health status
        health_status = await get_database_health()
        
        # Add performance test
        performance = await health_checker.test_query_performance(db)
        health_status["performance"] = performance
        
        # Test SSL connection info if available
        try:
            ssl_result = await db.execute(text("SHOW ssl"))
            ssl_info = ssl_result.fetchone()
            health_status["ssl_enabled"] = ssl_info[0] == 'on' if ssl_info else False
        except Exception:
            health_status["ssl_enabled"] = "unknown"
            
        return health_status
        
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail={"error": {"code": "DB_HEALTH_CHECK_FAILED", "message": str(e)}}
        )


@router.get("/detailed", summary="Detailed system health")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Extended health check with system information"""
    try:
        # Basic health
        basic_health = await check_health(db)
        
        # Database health
        db_health = await database_health_check(db)
        
        # System info
        system_info = {
            "consecutive_failures": health_checker.consecutive_failures,
            "last_check": health_checker.last_check.isoformat() if health_checker.last_check else None,
            "max_retries": health_checker.max_retries
        }
        
        return {
            "service": basic_health,
            "database": db_health,
            "system": system_info,
            "overall_healthy": db_health.get("healthy", False)
        }
        
    except Exception as e:
        return {
            "service": {"status": "degraded", "error": str(e)},
            "database": {"healthy": False, "error": str(e)},
            "system": {"error": "Health check failed"},
            "overall_healthy": False
        }
