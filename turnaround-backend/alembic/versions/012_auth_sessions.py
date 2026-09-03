"""Add backend-owned authentication sessions.

Revision ID: 012_auth_sessions
Revises: 011_notification_preferences
"""
from alembic import op
import sqlalchemy as sa

revision = "012_auth_sessions"
down_revision = "011_notification_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            access_token VARCHAR(4096) NOT NULL,
            refresh_token VARCHAR(4096) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions (user_id)")


def downgrade() -> None:
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")