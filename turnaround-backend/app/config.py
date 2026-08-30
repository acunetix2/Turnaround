from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App
    PROJECT_NAME: str = "Turnaround API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*"
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
    # JWT secret — used only as dev fallback when SUPABASE_URL is not set
    SUPABASE_JWT_SECRET: Optional[str] = "dev-secret-key-for-local-testing-turnaround"

    # AI / LLM Engine (Groq)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Engine Configuration
    DEFAULT_EXPECTED_DWELL_MINUTES: float = 120.0
    HISTORICAL_VISITS_THRESHOLD: int = 10
    GPS_DEBOUNCE_POINTS: int = 2
    SEVERITY_HIGH_MULTIPLIER: float = 1.5
    SEVERITY_MEDIUM_MULTIPLIER: float = 1.2


settings = Settings()
