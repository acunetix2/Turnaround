"""Add asset tracking fields to vehicles

Revision ID: 002_vehicle_asset_fields
Revises: 001_initial_schema
Create Date: 2026-08-31 15:00:00.000000

Adds driver assignment, container/cargo tracking, telematics, maintenance,
image URL, fuel level, and odometer columns to the vehicles table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_vehicle_asset_fields'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Asset image ───────────────────────────────────────────────────────────
    op.add_column('vehicles', sa.Column('image_url', sa.Text(), nullable=True))

    # ── Driver assignment ─────────────────────────────────────────────────────
    op.add_column('vehicles', sa.Column('driver_name', sa.String(length=150), nullable=True))
    op.add_column('vehicles', sa.Column('driver_phone', sa.String(length=30), nullable=True))
    op.add_column('vehicles', sa.Column('driver_license', sa.String(length=60), nullable=True))
    op.add_column('vehicles', sa.Column('driver_avatar', sa.Text(), nullable=True))
    op.add_column('vehicles', sa.Column(
        'driver_status',
        sa.Enum('on_duty', 'driving', 'resting', name='driverstatus'),
        nullable=True
    ))

    # ── Container / cargo ─────────────────────────────────────────────────────
    op.add_column('vehicles', sa.Column('trailer_number', sa.String(length=60), nullable=True))
    op.add_column('vehicles', sa.Column('container_number', sa.String(length=30), nullable=True))
    op.add_column('vehicles', sa.Column('container_type', sa.String(length=50), nullable=True))
    op.add_column('vehicles', sa.Column('cargo_type', sa.String(length=150), nullable=True))
    op.create_index(op.f('ix_vehicles_container_number'), 'vehicles', ['container_number'], unique=False)

    # ── Telematics ────────────────────────────────────────────────────────────
    op.add_column('vehicles', sa.Column('telematics_provider', sa.String(length=50), nullable=True))
    op.add_column('vehicles', sa.Column('tracker_imei', sa.String(length=30), nullable=True))

    # ── Operational state ─────────────────────────────────────────────────────
    op.add_column('vehicles', sa.Column('fuel_level', sa.Integer(), nullable=True))
    op.add_column('vehicles', sa.Column('odometer_km', sa.Integer(), nullable=True))
    op.add_column('vehicles', sa.Column(
        'maintenance_status',
        sa.Enum('good', 'due_soon', 'in_service', name='maintenancestatus'),
        nullable=True,
        server_default='good'
    ))
    op.add_column('vehicles', sa.Column('next_inspection_date', sa.String(length=10), nullable=True))


def downgrade() -> None:
    # Operational state
    op.drop_column('vehicles', 'next_inspection_date')
    op.drop_column('vehicles', 'maintenance_status')
    op.drop_column('vehicles', 'odometer_km')
    op.drop_column('vehicles', 'fuel_level')

    # Telematics
    op.drop_column('vehicles', 'tracker_imei')
    op.drop_column('vehicles', 'telematics_provider')

    # Container / cargo
    op.drop_index(op.f('ix_vehicles_container_number'), table_name='vehicles')
    op.drop_column('vehicles', 'cargo_type')
    op.drop_column('vehicles', 'container_type')
    op.drop_column('vehicles', 'container_number')
    op.drop_column('vehicles', 'trailer_number')

    # Driver assignment
    op.drop_column('vehicles', 'driver_status')
    op.drop_column('vehicles', 'driver_avatar')
    op.drop_column('vehicles', 'driver_license')
    op.drop_column('vehicles', 'driver_phone')
    op.drop_column('vehicles', 'driver_name')

    # Asset image
    op.drop_column('vehicles', 'image_url')

    # Drop enums (PostgreSQL only — safe to ignore on SQLite)
    try:
        op.execute('DROP TYPE IF EXISTS driverstatus')
        op.execute('DROP TYPE IF EXISTS maintenancestatus')
    except Exception:
        pass
