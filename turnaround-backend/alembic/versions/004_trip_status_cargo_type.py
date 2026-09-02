"""Add in_transit/delayed to tripstatus enum, add cargo_type/cargo_weight_tonnes to trips

Revision ID: 004_trip_status_cargo_type
Revises: 003_demurrage_gatepass
Create Date: 2026-09-01 00:00:00.000000

Changes:
  - Adds 'in_transit' and 'delayed' values to the tripstatus enum
  - Adds cargo_type VARCHAR(150) column to trips
  - Adds cargo_weight_tonnes NUMERIC(8,2) column to trips
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '004_trip_status_cargo_type'
down_revision: Union[str, None] = '003_demurrage_gatepass'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # ── 1. Extend tripstatus enum ─────────────────────────────────────────────
    # PostgreSQL requires ALTER TYPE … ADD VALUE outside a transaction for older
    # versions, but Supabase (PG 15+) supports it inside a transaction.
    # We use execute() with COMMIT-safe approach via try/except.
    existing_enums = [r[0] for r in bind.execute(
        sa.text("SELECT unnest(enum_range(NULL::tripstatus))::text")
    ).fetchall()] if _enum_exists(bind, 'tripstatus') else []

    if 'in_transit' not in existing_enums:
        op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'in_transit'")
    if 'delayed' not in existing_enums:
        op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'delayed'")

    # ── 2. Add cargo columns to trips ─────────────────────────────────────────
    trip_columns = [col['name'] for col in insp.get_columns('trips')]

    if 'cargo_type' not in trip_columns:
        op.add_column('trips', sa.Column('cargo_type', sa.String(150), nullable=True))

    if 'cargo_weight_tonnes' not in trip_columns:
        op.add_column('trips', sa.Column('cargo_weight_tonnes', sa.Numeric(8, 2), nullable=True))


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values directly.
    # Downgrade only removes the new columns.
    op.drop_column('trips', 'cargo_weight_tonnes')
    op.drop_column('trips', 'cargo_type')
    # To fully revert the enum you would need to recreate it — omitted intentionally.


def _enum_exists(bind, enum_name: str) -> bool:
    result = bind.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": enum_name}
    ).fetchone()
    return result is not None
