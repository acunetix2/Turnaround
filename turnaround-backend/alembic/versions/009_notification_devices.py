"""Create notification device token storage.

Revision ID: 009_notification_devices
Revises: 008_company_config_fields
"""
from alembic import op
import sqlalchemy as sa

revision = "009_notification_devices"
down_revision = "008_company_config_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notification_devices (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(512) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            CONSTRAINT uq_notification_device_user_token UNIQUE (user_id, token)
        )
    """))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_notification_devices_user_id ON notification_devices (user_id)"
    ))


def downgrade() -> None:
    op.drop_index("ix_notification_devices_user_id", table_name="notification_devices")
    op.drop_table("notification_devices")