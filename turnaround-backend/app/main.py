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
    Company, User, Vehicle, Location, Trip, GPSEvent, DwellEvent, Insight
)
from app.routers import (
    health, vehicles, locations, trips,
    gps_events, dwell_events, analytics, insights, predictions, ai
)

# ── Structured Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("turnaround")


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
    start_time = time.time()
    path = request.url.path
    method = request.method
    query = request.url.query
    
    # Log incoming request
    logger.info(f"--> {method} {path}{'?' + query if query else ''}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        status_code = response.status_code
        
        # Color/severity indicator based on status
        level = logger.info if status_code < 400 else (logger.warning if status_code < 500 else logger.error)
        level(f"<-- {method} {path} | Status: {status_code} | Duration: {process_time:.2f}ms")
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"<-- {method} {path} | ERROR: {str(e)} | Duration: {process_time:.2f}ms")
        raise e


# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/", tags=["Root"], summary="API root redirect")
async def root():
    return {
        "service": "Turnaround Operational Intelligence API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
