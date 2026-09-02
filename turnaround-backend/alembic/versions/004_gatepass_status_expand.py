"""Expand GatePassStatus enum with approved, used, revoked

Revision ID: 004_gatepass_status_expand
Revises: 003_demurrage_gatepass_trip_fields
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '004_gatepass_status_expand'
down_revision = '003_demurrage_gatepass'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL requires ALTER TYPE to add new enum values
    # Each value is added individually and only if not already present
    new_values = ['approved', 'used', 'revoked']
    for value in new_values:
        op.execute(
            f"ALTER TYPE gatepassstatus ADD VALUE IF NOT EXISTS '{value}'"
        )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values without recreating the type.
    # To downgrade fully you would need to:
    #   1. Update all rows to remove references to the new values
    #   2. DROP and recreate the enum
    # We leave downgrade as a no-op for safety.
    pass
