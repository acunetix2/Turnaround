"""
Database health check utilities for monitoring Supabase connection status.
"""
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError, TimeoutError

from app.db.session import engine, get_db

logger = logging.getLogger(__name__)


class DatabaseHealthChecker:
    """Monitors database connection health and provides recovery mechanisms."""
    
    def __init__(self):
        self.last_check: Optional[datetime] = None
        self.consecutive_failures = 0
        self.max_retries = 3
        
    async def check_connection_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check.
        
        Returns:
            Dict containing health status, timing, and connection info
        """
        start_time = datetime.now(timezone.utc)
        health_status = {
            "healthy": False,
            "timestamp": start_time.isoformat(),
            "response_time_ms": 0,
            "pool_status": {},
            "connection_test": False,
            "errors": []
        }
        
        try:
            # Test basic connection
            async with engine.begin() as conn:
                # Simple query to test connection
                result = await conn.execute(text("SELECT 1 as test"))
                row = result.fetchone()
                health_status["connection_test"] = row[0] == 1
                
                # Test database-specific query
                db_result = await conn.execute(text("SELECT current_database(), current_user"))
                db_info = db_result.fetchone()
                health_status["database"] = db_info[0]
                health_status["user"] = db_info[1]
                
            # Get pool status
            pool = engine.pool
            health_status["pool_status"] = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
            
            end_time = datetime.now(timezone.utc)
            health_status["response_time_ms"] = int((end_time - start_time).total_seconds() * 1000)
            health_status["healthy"] = True
            
            self.consecutive_failures = 0
            self.last_check = end_time
            
        except (SQLAlchemyError, DisconnectionError, TimeoutError) as e:
            self.consecutive_failures += 1
            health_status["errors"].append({
                "type": type(e).__name__,
                "message": str(e)
            })
            logger.error(f"Database health check failed: {e}")
            
        except Exception as e:
            self.consecutive_failures += 1
            health_status["errors"].append({
                "type": "UnexpectedError",
                "message": str(e)
            })
            logger.error(f"Unexpected error in health check: {e}")
            
        health_status["consecutive_failures"] = self.consecutive_failures
        return health_status
    
    async def test_query_performance(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Test various query patterns to identify performance issues.
        """
        performance_results = {
            "simple_select": None,
            "join_query": None,
            "count_query": None,
            "errors": []
        }
        
        try:
            # Simple select
            start = datetime.now(timezone.utc)
            await db.execute(text("SELECT 1"))
            end = datetime.now(timezone.utc)
            performance_results["simple_select"] = int((end - start).total_seconds() * 1000)
            
            # Join query (using actual tables if they exist)
            start = datetime.now(timezone.utc)
            result = await db.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            end = datetime.now(timezone.utc)
            performance_results["count_query"] = int((end - start).total_seconds() * 1000)
            
        except Exception as e:
            performance_results["errors"].append({
                "type": type(e).__name__,
                "message": str(e)
            })
            
        return performance_results
    
    async def recover_connection(self) -> bool:
        """
        Attempt to recover database connection after failures.
        """
        try:
            # Dispose of current connections
            await engine.dispose()
            
            # Wait a moment for cleanup
            await asyncio.sleep(1)
            
            # Test new connection
            health = await self.check_connection_health()
            return health["healthy"]
            
        except Exception as e:
            logger.error(f"Connection recovery failed: {e}")
            return False


# Global health checker instance
health_checker = DatabaseHealthChecker()


async def get_database_health() -> Dict[str, Any]:
    """Get current database health status."""
    return await health_checker.check_connection_health()


async def ensure_connection_health() -> bool:
    """
    Ensure database connection is healthy, attempt recovery if needed.
    Returns True if healthy, False if recovery failed.
    """
    health = await health_checker.check_connection_health()
    
    if not health["healthy"] and health_checker.consecutive_failures >= 2:
        logger.warning("Multiple connection failures detected, attempting recovery")
        return await health_checker.recover_connection()
        
    return health["healthy"]