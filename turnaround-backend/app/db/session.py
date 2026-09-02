from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# Connection configuration for Supabase
connect_args = {}
if "postgresql" in settings.DATABASE_URL:
    connect_args.update({
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        # Connection timeout settings
        "command_timeout": settings.DB_COMMAND_TIMEOUT,
        "server_settings": {
            "jit": "off",  # Disable JIT compilation for better performance
            "application_name": "turnaround_backend",
        },
    })
    # Note: Supabase automatically handles SSL/TLS connections
    # No need to explicitly configure SSL for cloud-hosted Supabase instances

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,   # Detect stale Supabase connections
    pool_size=settings.DB_POOL_SIZE,          # Configurable pool size
    max_overflow=settings.DB_MAX_OVERFLOW,    # Configurable overflow
    pool_timeout=settings.DB_POOL_TIMEOUT,    # Connection pool timeout
    pool_recycle=settings.DB_POOL_RECYCLE,    # Recycle connections periodically
    future=True,
    connect_args=connect_args
)

async_session_factory = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency yielding an async database session per request."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

