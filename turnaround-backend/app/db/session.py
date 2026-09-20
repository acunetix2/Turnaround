from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.config import settings

# Connection configuration for Supabase
connect_args = {}
if "postgresql" in settings.DATABASE_URL:
    connect_args.update({
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        # Bound both connection setup and database command execution. Without
        # `timeout`, asyncpg can hang while PostgreSQL introspects a prepared
        # statement before SQLAlchemy receives the configured command timeout.
        "timeout": settings.DB_CONNECT_TIMEOUT,
        "command_timeout": settings.DB_COMMAND_TIMEOUT,
        "server_settings": {
            "jit": "off",  # Disable JIT compilation for better performance
            "application_name": "turnaround_backend",
            "statement_timeout": str(settings.DB_COMMAND_TIMEOUT * 1000),
        },
    })
    # Note: Supabase automatically handles SSL/TLS connections
    # No need to explicitly configure SSL for cloud-hosted Supabase instances

using_supabase_pooler = "pooler.supabase.com" in settings.DATABASE_URL
pool_options = {
    "poolclass": NullPool,
} if using_supabase_pooler else {
    "pool_pre_ping": True,
    "pool_size": settings.DB_POOL_SIZE,
    "max_overflow": settings.DB_MAX_OVERFLOW,
    "pool_timeout": settings.DB_POOL_TIMEOUT,
    "pool_recycle": settings.DB_POOL_RECYCLE,
}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
    **pool_options,
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

