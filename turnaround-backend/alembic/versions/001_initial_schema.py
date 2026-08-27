"""Initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-27 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Companies
    op.create_table(
        'companies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'fleet_manager', 'dispatcher', 'analyst', name='userrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_company_id'), 'users', ['company_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 3. Vehicles
    op.create_table(
        'vehicles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('registration_number', sa.String(length=50), nullable=False),
        sa.Column('vehicle_type', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Float(), nullable=True),
        sa.Column('hourly_operating_cost', sa.Float(), nullable=False),
        sa.Column('status', sa.Enum('active', 'idle', 'maintenance', 'in_transit', 'delayed', name='vehiclestatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicles_company_id'), 'vehicles', ['company_id'], unique=False)
    op.create_index(op.f('ix_vehicles_registration_number'), 'vehicles', ['registration_number'], unique=False)

    # 4. Locations
    op.create_table(
        'locations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('location_type', sa.Enum('warehouse', 'customer_facility', 'depot', 'port', 'border_crossing', 'loading_point', 'unloading_point', name='locationtype'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('geofence_radius', sa.Float(), nullable=False),
        sa.Column('expected_dwell_minutes', sa.Float(), nullable=False),
        sa.Column('customer_sla_minutes', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_locations_company_id'), 'locations', ['company_id'], unique=False)
    op.create_index(op.f('ix_locations_name'), 'locations', ['name'], unique=False)

    # 5. Trips
    op.create_table(
        'trips',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('vehicle_id', sa.String(length=36), nullable=False),
        sa.Column('origin_id', sa.String(length=36), nullable=False),
        sa.Column('destination_id', sa.String(length=36), nullable=False),
        sa.Column('planned_departure', sa.DateTime(timezone=True), nullable=True),
        sa.Column('planned_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_departure', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('planned', 'in_progress', 'completed', 'cancelled', name='tripstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['destination_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['origin_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trips_vehicle_id'), 'trips', ['vehicle_id'], unique=False)

    # 6. GPS Events
    op.create_table(
        'gps_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('vehicle_id', sa.String(length=36), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('speed', sa.Float(), nullable=False),
        sa.Column('heading', sa.Float(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vehicle_id', 'recorded_at', name='uq_vehicle_recorded_at')
    )
    op.create_index(op.f('ix_gps_events_recorded_at'), 'gps_events', ['recorded_at'], unique=False)
    op.create_index(op.f('ix_gps_events_vehicle_id'), 'gps_events', ['vehicle_id'], unique=False)

    # 7. Dwell Events
    op.create_table(
        'dwell_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('vehicle_id', sa.String(length=36), nullable=False),
        sa.Column('location_id', sa.String(length=36), nullable=False),
        sa.Column('trip_id', sa.String(length=36), nullable=True),
        sa.Column('arrival_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('departure_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dwell_minutes', sa.Float(), nullable=False),
        sa.Column('expected_minutes', sa.Float(), nullable=False),
        sa.Column('excess_minutes', sa.Float(), nullable=False),
        sa.Column('estimated_cost', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dwell_events_arrival_time'), 'dwell_events', ['arrival_time'], unique=False)
    op.create_index(op.f('ix_dwell_events_location_id'), 'dwell_events', ['location_id'], unique=False)
    op.create_index(op.f('ix_dwell_events_vehicle_id'), 'dwell_events', ['vehicle_id'], unique=False)

    # 8. Insights
    op.create_table(
        'insights',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('location_id', sa.String(length=36), nullable=True),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', name='insightseverity'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('financial_impact', sa.Float(), nullable=False),
        sa.Column('recommendation', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_insights_company_id'), 'insights', ['company_id'], unique=False)
    op.create_index(op.f('ix_insights_location_id'), 'insights', ['location_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_insights_location_id'), table_name='insights')
    op.drop_index(op.f('ix_insights_company_id'), table_name='insights')
    op.drop_table('insights')
    
    op.drop_index(op.f('ix_dwell_events_vehicle_id'), table_name='dwell_events')
    op.drop_index(op.f('ix_dwell_events_location_id'), table_name='dwell_events')
    op.drop_index(op.f('ix_dwell_events_arrival_time'), table_name='dwell_events')
    op.drop_table('dwell_events')
    
    op.drop_index(op.f('ix_gps_events_vehicle_id'), table_name='gps_events')
    op.drop_index(op.f('ix_gps_events_recorded_at'), table_name='gps_events')
    op.drop_table('gps_events')
    
    op.drop_index(op.f('ix_trips_vehicle_id'), table_name='trips')
    op.drop_table('trips')
    
    op.drop_index(op.f('ix_locations_name'), table_name='locations')
    op.drop_index(op.f('ix_locations_company_id'), table_name='locations')
    op.drop_table('locations')
    
    op.drop_index(op.f('ix_vehicles_registration_number'), table_name='vehicles')
    op.drop_index(op.f('ix_vehicles_company_id'), table_name='vehicles')
    op.drop_table('vehicles')
    
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_company_id'), table_name='users')
    op.drop_table('users')
    
    op.drop_table('companies')

    # Drop custom ENUM types in PostgreSQL
    op.execute("DROP TYPE IF EXISTS userrole CASCADE")
    op.execute("DROP TYPE IF EXISTS vehiclestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS locationtype CASCADE")
    op.execute("DROP TYPE IF EXISTS tripstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS insightseverity CASCADE")
