"""Add 'cancelled' value to gatepassstatus enum

Revision ID: 005_gatepass_cancelled_status
Revises: 004_trip_status_cargo_type
Create Date: 2026-09-01 01:00:00.000000

Changes:
  - Adds 'cancelled' to the gatepassstatus PostgreSQL enum
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '005_gatepass_cancelled_status'
down_revision: Union[str, None] = '004_trip_status_cargo_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum_exists(bind, enum_name: str) -> bool:
    result = bind.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": enum_name}
    ).fetchone()
    return result is not None


def upgrade() -> None:
    bind = op.get_bind()

    if not _enum_exists(bind, 'gatepassstatus'):
        return  # Enum doesn't exist yet; will be created fresh with this value

    existing = [
        r[0] for r in bind.execute(
            sa.text("SELECT unnest(enum_range(NULL::gatepassstatus))::text")
        ).fetchall()
    ]

    if 'cancelled' not in existing:
        op.execute("ALTER TYPE gatepassstatus ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # To fully revert, recreate the enum without 'cancelled' — omitted intentionally.
    pass
