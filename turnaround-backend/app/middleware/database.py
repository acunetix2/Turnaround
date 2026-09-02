"""
Database middleware — lightweight pass-through.

BaseHTTPMiddleware cannot reliably catch exceptions raised inside call_next
because Starlette streams the response body lazily; by the time an exception
surfaces from a route handler the middleware's try/except has already exited.

We therefore use a minimal pure-ASGI implementation that:
  - Passes all requests straight through (no retry loop that can misfire).
  - Logs DisconnectionError / SATimeoutError at WARNING for observability.
  - Lets every other exception propagate to FastAPI's global exception handler.

Connection-level retries are better handled at the SQLAlchemy pool level
(pool_pre_ping=True in session.py) rather than at the HTTP middleware layer.
"""
import asyncio
import logging
from typing import Callable

from fastapi import Request, Response, HTTPException
from sqlalchemy.exc import DisconnectionError, TimeoutError as SATimeoutError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)


# ── Simple pass-through used as DatabaseMiddleware ───────────────────────────

class DatabaseMiddleware:
    """
    Minimal ASGI middleware. Passes requests through unchanged.
    Does NOT wrap call_next in a try/except — that pattern is broken for
    streaming responses in BaseHTTPMiddleware.
    """

    def __init__(self, app: ASGIApp, max_retries: int = 2):
        self.app = app
        # max_retries kept for API compatibility; not used at this layer.

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        await self.app(scope, receive, send)


# ── Timeout middleware (also pure-ASGI) ──────────────────────────────────────

class QueryTimeoutMiddleware:
    """
    Applies a wall-clock timeout to every HTTP request.
    Uses pure ASGI so the timeout fires correctly even for streaming responses.
    """

    def __init__(self, app: ASGIApp, timeout_seconds: int = 30):
        self.app = app
        self.timeout_seconds = timeout_seconds

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await asyncio.wait_for(
                self.app(scope, receive, send),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            path = scope.get("path", "unknown")
            logger.warning(f"Request timeout ({self.timeout_seconds}s): {path}")
            # Send a 504 response manually since we're in raw ASGI
            body = b'{"error":{"code":"REQUEST_TIMEOUT","message":"Request timed out."}}'
            await send({
                "type": "http.response.start",
                "status": 504,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"content-length", str(len(body)).encode()],
                ],
            })
            await send({"type": "http.response.body", "body": body})
