from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Resolve the backend env file from this module, not the shell's cwd.
        # This keeps `python turnaround-backend/run.py` and IDE launches
        # from silently falling back to the placeholder production defaults.
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App
    PROJECT_NAME: str = "Turnaround API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"  # "development" | "staging" | "production"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    LOG_LEVEL: str = "INFO"
    LOG_REQUESTS: bool = True
    QUIET_POLLING_LOGS: bool = True

    # Database Connection Settings
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_CONNECT_TIMEOUT: int = 30
    DB_COMMAND_TIMEOUT: int = 30

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    # Database — Supabase PostgreSQL (asyncpg)
    # Format: postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres"

    # Supabase — Auth & client SDK
    # Get from: Supabase Dashboard → Settings → API
    SUPABASE_URL: Optional[str] = None
    # service_role key (bypasses RLS — server-side only, never expose to frontend)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    # anon key (safe for frontend, used by supabase-js)
    SUPABASE_ANON_KEY: Optional[str] = None
    AUTH_COOKIE_NAME: str = "turnaround_session"
    AUTH_SESSION_DAYS: int = 30
    AUTH_COOKIE_SECURE: bool = True
    # JWT secret — used only as dev fallback when SUPABASE_URL is not set
    SUPABASE_JWT_SECRET: Optional[str] = "dev-secret-key-for-local-testing-turnaround"

    # Firebase Admin — server-side push delivery. Store the service account JSON as an env value.
    FIREBASE_SERVICE_ACCOUNT_JSON: Optional[str] = None

    # AI / LLM Engine (Groq)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # Engine Configuration
    DEFAULT_EXPECTED_DWELL_MINUTES: float = 120.0
    HISTORICAL_VISITS_THRESHOLD: int = 10
    GPS_DEBOUNCE_POINTS: int = 2
    SEVERITY_HIGH_MULTIPLIER: float = 1.5
    SEVERITY_MEDIUM_MULTIPLIER: float = 1.2
    # Auto-create a FLAGGED DemurrageClaim when a dwell closes with excess >= this many minutes.
    # Set to 0.0 to flag any excess at all; set higher (e.g. 30.0) for a grace threshold.
    AUTO_DEMURRAGE_THRESHOLD_MINUTES: float = 0.0


settings = Settings()
