"""Create notifications table with severity and category enums

Revision ID: 007_notifications_table
Revises: 006_tripstatus_expand
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '007_notifications_table'
down_revision = '006_tripstatus_expand'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Create enums safely in their own committed transaction
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE notificationseverity AS ENUM ('high','medium','low','info');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE notificationcategory AS ENUM ('delay','demurrage','gate_pass','trip','user','system');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    conn.execute(sa.text("COMMIT"))
    conn.execute(sa.text("BEGIN"))

    # Create table using raw SQL to avoid SQLAlchemy re-creating the enums
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notifications (
            id           VARCHAR(36)    PRIMARY KEY,
            company_id   VARCHAR(36)    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            user_id      VARCHAR(36)    REFERENCES users(id) ON DELETE CASCADE,
            title        VARCHAR(256)   NOT NULL,
            description  TEXT           NOT NULL DEFAULT '',
            severity     notificationseverity NOT NULL DEFAULT 'info',
            category     notificationcategory NOT NULL DEFAULT 'system',
            read         BOOLEAN        NOT NULL DEFAULT FALSE,
            link         VARCHAR(512),
            meta         JSONB,
            created_at   TIMESTAMPTZ    NOT NULL
        );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_notifications_company_id ON notifications(company_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_notifications_read ON notifications(read);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at);"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notifications")
    op.execute("DROP TYPE IF EXISTS notificationseverity")
    op.execute("DROP TYPE IF EXISTS notificationcategory")
