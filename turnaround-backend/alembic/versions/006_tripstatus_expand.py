"""Expand tripstatus enum: add in_transit, delayed, archived; migrate in_progress rows

Revision ID: 006_tripstatus_expand
Revises: 005_user_fields_expand
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '006_tripstatus_expand'
down_revision = '005_user_fields_expand'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add new enum values.
    # PostgreSQL requires each ALTER TYPE ADD VALUE to be committed before the
    # new value can be used in DML within the same session.
    # We use get_bind() to run raw DDL outside the transaction block.
    conn = op.get_bind()

    # These must be executed and committed before the UPDATE below.
    conn.execute(text("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'in_transit'"))
    conn.execute(text("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'delayed'"))
    conn.execute(text("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'archived'"))

    # Commit the enum additions so they are visible to subsequent DML.
    conn.execute(text("COMMIT"))

    # Step 2: Migrate existing 'in_progress' rows to 'in_transit'.
    conn.execute(text("UPDATE trips SET status = 'in_transit' WHERE status = 'in_progress'"))

    # Step 3: Begin a new transaction for Alembic to track the version update.
    conn.execute(text("BEGIN"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("UPDATE trips SET status = 'in_progress' WHERE status = 'in_transit'"))
    # PostgreSQL cannot remove enum values without recreating the type
