"""
Supabase client singleton.

Architecture decision:
  - supabase-py  → JWT verification, auth admin (create/delete users), RLS helpers
  - SQLAlchemy   → all ORM queries, relationships, joins, aggregations, migrations

Why both?
  The Supabase PostgREST interface inside supabase-py is limited to simple
  table-level CRUD and cannot express complex SQLAlchemy relationships, Window
  functions, multi-table joins or Alembic-managed schema migrations.
  SQLAlchemy over asyncpg gives us a full production-grade ORM with Supabase
  acting as the managed Postgres host.
"""

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Returns a cached Supabase client initialised with the project URL and
    service-role key.  The service-role key bypasses Row Level Security so
    server-side admin operations work correctly.  Never expose this key to
    the frontend.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env. "
            "Get them from: Supabase Dashboard → Settings → API"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
