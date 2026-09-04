import asyncio
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, OperationalError, TimeoutError as SQLAlchemyTimeoutError

from app.config import settings
from app.db.session import engine
from app.db.base import Base
# Import all models so SQLAlchemy registers them against Base metadata
from app.db.models import (  # noqa: F401
    Company, User, Vehicle, Location, Trip, GPSEvent, DwellEvent, Insight,
    DemurrageClaim, GatePass, Notification, NotificationDevice, FleetStaff
)
from app.middleware.database import DatabaseMiddleware, QueryTimeoutMiddleware
from app.routers import (
    health, vehicles, locations, trips,
    gps_events, dwell_events, analytics, insights, predictions, ai,
    demurrage, gate_passes, users, account, notifications, company, fleet_staff
)
from app.tasks.expiry_sweep import start_expiry_sweep_loop
from app.routers import auth

# ── Structured Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("turnaround")

# Silence noisy third-party libraries unless they produce errors
for lib in ("asyncpg", "sqlalchemy.engine", "httpcore", "httpx", "urllib3", "watchfiles"):
    logging.getLogger(lib).setLevel(logging.WARNING)

# Endpoints that are polled frequently or trivial — silenced from routine INFO logging
QUIET_ROUTES = {
    "/health",
    "/api/v1/health",
    "/api/v1/gps/live",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}


# ── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Turnaround API — connecting to Supabase PostgreSQL")
    if settings.ENVIRONMENT == "development":
        try:
            # Do not run metadata.create_all() against Supabase at startup.
            # It introspects every table and enum through asyncpg and can hang
            # on pooled connections. Apply schema changes with Alembic instead.
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection verified successfully")
        except Exception as e:
            logger.error(f"DB startup error: {str(e)}")
    else:
        logger.info("Skipping startup schema creation in production; use Alembic migrations")

    # Start background gate pass expiry sweep
    sweep_task = asyncio.create_task(start_expiry_sweep_loop())

    yield

    sweep_task.cancel()
    try:
        await sweep_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutting down Turnaround API")
    await engine.dispose()


# ── App Factory ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Turnaround Operational Intelligence API — "
        "Real-time fleet dwell monitoring, geofence cost tracking, and turnaround analytics "
        "for commercial trucking corridors across East Africa."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


@app.get("/", include_in_schema=False)
async def root_status():
    return {"service": "turnaround-backend", "status": "ok"}

# ── Request / Access Logging Middleware ────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    if not settings.LOG_REQUESTS:
        return await call_next(request)

    start_time = time.time()
    path = request.url.path
    method = request.method
    is_quiet = settings.QUIET_POLLING_LOGS and path in QUIET_ROUTES

    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        status_code = response.status_code

        # For quiet polling routes, only log on errors (>= 400) or slow responses (> 2000ms)
        if is_quiet and status_code < 400 and process_time < 2000:
            return response

        # Format single clean line
        if status_code < 400:
            logger.info(f"{method} {path} -> {status_code} ({process_time:.1f}ms)")
        elif status_code < 500:
            logger.warning(f"{method} {path} -> {status_code} ({process_time:.1f}ms)")
        else:
            logger.error(f"{method} {path} -> {status_code} ({process_time:.1f}ms)")

        return response
    except asyncio.CancelledError:
        raise
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"{method} {path} -> ERROR: {str(e)} ({process_time:.1f}ms)")
        raise e


# ── CORS ─────────────────────────────────────────────────────────────────────
allowed_cors_origins = list({
    *settings.CORS_ORIGINS,
    "https://turnaroundlogistics.vercel.app",
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins,
    allow_origin_regex=r"^https://([a-z0-9-]+\.)?vercel\.app$|^https://([a-z0-9-]+\.)?render\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database Connection Middleware ──────────────────────────────────────────
# NOTE: Pure-ASGI middleware classes are registered directly on the ASGI stack,
# not via add_middleware (which wraps them in BaseHTTPMiddleware and breaks them).
# Connection health is handled by pool_pre_ping=True in session.py.
# These are intentionally left out of add_middleware to avoid 503 crashes.


# ── Global Exception Handler ────────────────────────────────────────────────
@app.exception_handler(SQLAlchemyTimeoutError)
async def database_timeout_handler(request: Request, exc: SQLAlchemyTimeoutError):
    logger.error("Database timeout on path=%s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=504,
        content={"error": {"code": "DATABASE_TIMEOUT", "message": "The database took too long to respond. Please retry shortly."}},
    )


@app.exception_handler(DBAPIError)
async def database_connection_handler(request: Request, exc: DBAPIError):
    if isinstance(exc, OperationalError) or exc.connection_invalidated:
        logger.warning("Database connection unavailable on path=%s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=503,
            headers={"Retry-After": "5"},
            content={"error": {"code": "DATABASE_UNAVAILABLE", "message": "The database is temporarily unavailable. Please retry shortly."}},
        )
    raise exc


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)} on path={request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"}},
    )


# ── Router Registration ──────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router)
app.include_router(vehicles.router, prefix=API_PREFIX)
app.include_router(locations.router, prefix=API_PREFIX)
app.include_router(trips.router, prefix=API_PREFIX)
app.include_router(gps_events.router, prefix=API_PREFIX)
app.include_router(dwell_events.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(insights.router, prefix=API_PREFIX)
app.include_router(predictions.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(demurrage.router, prefix=API_PREFIX)
app.include_router(gate_passes.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(fleet_staff.router, prefix=API_PREFIX)
app.include_router(account.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(company.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)


@app.get("/", tags=["Root"], summary="API root redirect")
async def root():
    return {
        "service": "Turnaround Operational Intelligence API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
