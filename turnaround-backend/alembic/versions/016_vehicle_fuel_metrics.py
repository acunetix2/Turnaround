"""add vehicle fuel capacity and consumption metrics

Revision ID: 016_vehicle_fuel_metrics
Revises: 015_expand_user_roles
"""
from alembic import op

revision = "016_vehicle_fuel_metrics"
down_revision = "015_expand_user_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_tank_capacity_liters DOUBLE PRECISION")
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_consumption_liters_per_100km DOUBLE PRECISION")


def downgrade() -> None:
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS fuel_consumption_liters_per_100km")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS fuel_tank_capacity_liters")
