"""Persist per-user notification preferences.

Revision ID: 011_notification_preferences
Revises: 010_company_welcome_legal
"""
from alembic import op
import sqlalchemy as sa


revision = "011_notification_preferences"
down_revision = "010_company_welcome_legal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("sms_notifications", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("push_notifications", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("notify_on_delay", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("notify_on_arrival", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("notify_on_gate_pass", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("notify_on_demurrage", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    for column in (
        "notify_on_demurrage", "notify_on_gate_pass", "notify_on_arrival",
        "notify_on_delay", "push_notifications", "sms_notifications",
        "email_notifications",
    ):
        op.drop_column("users", column)