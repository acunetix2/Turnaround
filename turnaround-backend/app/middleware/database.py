"""
Database middleware for connection recovery and retry logic.
"""
import asyncio
import logging
from typing import Callable, Any
from fastapi import Request, Response, HTTPException
from sqlalchemy.exc import DisconnectionError, TimeoutError, SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.health import ensure_connection_health

logger = logging.getLogger(__name__)


class DatabaseMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle database connection issues and automatic recovery.
    """
    
    def __init__(self, app, max_retries: int = 2):
        super().__init__(app)
        self.max_retries = max_retries
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with database connection error handling.
        """
        retry_count = 0
        
        while retry_count <= self.max_retries:
            try:
                # Process the request
                response = await call_next(request)
                return response
                
            except (DisconnectionError, TimeoutError) as e:
                retry_count += 1
                logger.warning(
                    f"Database connection error (attempt {retry_count}/{self.max_retries + 1}): {e}"
                )
                
                if retry_count <= self.max_retries:
                    # Attempt connection recovery
                    logger.info("Attempting database connection recovery...")
                    
                    recovery_success = await ensure_connection_health()
                    
                    if recovery_success:
                        logger.info("Database connection recovered, retrying request")
                        # Add small delay before retry
                        await asyncio.sleep(0.1 * retry_count)
                        continue
                    else:
                        logger.error("Database connection recovery failed")
                        break
                else:
                    logger.error(f"Max retries ({self.max_retries}) exceeded for database operation")
                    break
                    
            except SQLAlchemyError as e:
                # Log SQL errors but don't retry (likely not connection-related)
                logger.error(f"SQLAlchemy error: {e}")
                raise HTTPException(
                    status_code=503,
                    detail={"error": {"code": "DATABASE_ERROR", "message": "Database operation failed"}}
                )
                
            except Exception as e:
                # Other errors should not trigger retry
                logger.error(f"Unexpected error in database middleware: {e}")
                raise
        
        # If we get here, all retries were exhausted
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database connection could not be established after retries"
                }
            }
        )


class QueryTimeoutMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add query timeout monitoring for long-running requests.
    """
    
    def __init__(self, app, timeout_seconds: int = 30):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with timeout monitoring.
        """
        try:
            # Set a timeout for the entire request
            response = await asyncio.wait_for(
                call_next(request),
                timeout=self.timeout_seconds
            )
            return response
            
        except asyncio.TimeoutError:
            logger.warning(f"Request timeout after {self.timeout_seconds}s: {request.url}")
            raise HTTPException(
                status_code=504,
                detail={
                    "error": {
                        "code": "REQUEST_TIMEOUT",
                        "message": f"Request timed out after {self.timeout_seconds} seconds"
                    }
                }
            )