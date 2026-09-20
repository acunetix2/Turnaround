"""Add company welcome media and legal content.

Revision ID: 010_company_welcome_legal
Revises: 009_notification_devices
"""
from alembic import op
import sqlalchemy as sa

revision = "010_company_welcome_legal"
down_revision = "009_notification_devices"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("welcome_media_url", sa.Text(), nullable=True))
    op.add_column("companies", sa.Column("welcome_media_type", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("welcome_motto", sa.String(255), nullable=True))
    op.add_column("companies", sa.Column("privacy_policy", sa.Text(), nullable=True))
    op.add_column("companies", sa.Column("terms_of_service", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "terms_of_service")
    op.drop_column("companies", "privacy_policy")
    op.drop_column("companies", "welcome_motto")
    op.drop_column("companies", "welcome_media_type")
    op.drop_column("companies", "welcome_media_url")
