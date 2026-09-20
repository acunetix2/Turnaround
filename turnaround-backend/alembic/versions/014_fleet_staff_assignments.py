"""Add operational fleet staff and vehicle assignments.

Revision ID: 014_fleet_staff_assignments
Revises: 013_operating_zone
"""
from alembic import op
import sqlalchemy as sa

revision = '014_fleet_staff_assignments'
down_revision = '013_operating_zone'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fleet_staff',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('license_number', sa.String(length=64), nullable=True),
        sa.Column('staff_type', sa.String(length=20), nullable=False, server_default='driver'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fleet_staff_company_id', 'fleet_staff', ['company_id'])
    op.add_column('vehicles', sa.Column('driver_id', sa.String(length=36), nullable=True))
    op.add_column('vehicles', sa.Column('co_driver_id', sa.String(length=36), nullable=True))
    op.create_index('ix_vehicles_driver_id', 'vehicles', ['driver_id'])
    op.create_index('ix_vehicles_co_driver_id', 'vehicles', ['co_driver_id'])
    op.create_foreign_key('fk_vehicles_driver_id', 'vehicles', 'fleet_staff', ['driver_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_vehicles_co_driver_id', 'vehicles', 'fleet_staff', ['co_driver_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_vehicles_co_driver_id', 'vehicles', type_='foreignkey')
    op.drop_constraint('fk_vehicles_driver_id', 'vehicles', type_='foreignkey')
    op.drop_index('ix_vehicles_co_driver_id', table_name='vehicles')
    op.drop_index('ix_vehicles_driver_id', table_name='vehicles')
    op.drop_column('vehicles', 'co_driver_id')
    op.drop_column('vehicles', 'driver_id')
    op.drop_index('ix_fleet_staff_company_id', table_name='fleet_staff')
    op.drop_table('fleet_staff')