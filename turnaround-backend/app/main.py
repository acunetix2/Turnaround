import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.session import engine
from app.db.base import Base
# Import all models so SQLAlchemy registers them against Base metadata
from app.db.models import (  # noqa: F401
    Company, User, Vehicle, Location, Trip, GPSEvent, DwellEvent, Insight,
    DemurrageClaim, GatePass
)
from app.middleware.database import DatabaseMiddleware, QueryTimeoutMiddleware
from app.routers import (
    health, vehicles, locations, trips,
    gps_events, dwell_events, analytics, insights, predictions, ai,
    demurrage, gate_passes
)

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
    try:
        # Create all tables if they don't exist (Supabase already has them after migrations)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified & connected successfully")
    except Exception as e:
        logger.error(f"DB startup error: {str(e)}")
    yield
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
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"{method} {path} -> ERROR: {str(e)} ({process_time:.1f}ms)")
        raise e


# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database Connection Middleware ──────────────────────────────────────────
# Add database middleware for connection recovery and timeout handling
app.add_middleware(DatabaseMiddleware, max_retries=2)
app.add_middleware(QueryTimeoutMiddleware, timeout_seconds=30)


# ── Global Exception Handler ────────────────────────────────────────────────
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


@app.get("/", tags=["Root"], summary="API root redirect")
async def root():
    return {
        "service": "Turnaround Operational Intelligence API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
