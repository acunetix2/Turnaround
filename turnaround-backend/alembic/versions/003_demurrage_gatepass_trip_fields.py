"""Add demurrage_claims, gate_passes tables and trip corridor/cargo fields

Revision ID: 003_demurrage_gatepass_trip_fields
Revises: 002_vehicle_asset_fields
Create Date: 2026-08-31 18:50:00.000000

Creates:
  - demurrage_claims table (financial penalty claims against facility SLA breaches)
  - gate_passes table (digital terminal clearance passes)
  - Adds corridor_name, customs_seal_number, container_number, cargo_description to trips
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_demurrage_gatepass_trip_fields'
down_revision: Union[str, None] = '002_vehicle_asset_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Enums ─────────────────────────────────────────────────────────────
    responsible_party_enum = sa.Enum(
        'terminal_operator', 'customs_authority', 'shipper',
        'weighbridge_authority', 'rail_freight',
        name='responsibleparty'
    )
    claim_status_enum = sa.Enum(
        'flagged', 'invoiced', 'disputed', 'settled', 'written_off',
        name='claimstatus'
    )
    gate_pass_status_enum = sa.Enum(
        'pre_approved', 'cleared', 'inspected', 'expired',
        name='gatepassstatus'
    )

    responsible_party_enum.create(op.get_bind(), checkfirst=True)
    claim_status_enum.create(op.get_bind(), checkfirst=True)
    gate_pass_status_enum.create(op.get_bind(), checkfirst=True)

    # ── 2. demurrage_claims ───────────────────────────────────────────────────
    op.create_table(
        'demurrage_claims',
        sa.Column('id', sa.String(36), primary_key=True, nullable=False),
        sa.Column('claim_number', sa.String(64), nullable=False, unique=True),

        sa.Column('vehicle_id', sa.String(36), sa.ForeignKey('vehicles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('location_id', sa.String(36), sa.ForeignKey('locations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('dwell_event_id', sa.String(36), sa.ForeignKey('dwell_events.id', ondelete='SET NULL'), nullable=True),

        # Denormalised display fields
        sa.Column('vehicle_reg', sa.String(32), nullable=False),
        sa.Column('location_name', sa.String(256), nullable=False),

        sa.Column('container_number', sa.String(32), nullable=True),
        sa.Column('driver_name', sa.String(128), nullable=True),
        sa.Column('carrier_name', sa.String(256), nullable=False),

        sa.Column('responsible_party', responsible_party_enum, nullable=False),

        sa.Column('arrival_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('departure_time', sa.DateTime(timezone=True), nullable=True),

        sa.Column('sla_threshold_minutes', sa.Integer, nullable=False),
        sa.Column('total_dwell_minutes', sa.Integer, nullable=False),
        sa.Column('excess_delay_minutes', sa.Integer, nullable=False),

        sa.Column('hourly_operating_rate', sa.Numeric(12, 2), nullable=False),
        sa.Column('claimed_amount_kes', sa.Numeric(14, 2), nullable=False),
        sa.Column('settled_amount_kes', sa.Numeric(14, 2), nullable=True),

        sa.Column('status', claim_status_enum, nullable=False, server_default='flagged'),

        sa.Column('invoice_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settlement_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dispute_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_demurrage_claims_vehicle_id', 'demurrage_claims', ['vehicle_id'])
    op.create_index('ix_demurrage_claims_location_id', 'demurrage_claims', ['location_id'])
    op.create_index('ix_demurrage_claims_status', 'demurrage_claims', ['status'])
    op.create_index('ix_demurrage_claims_claim_number', 'demurrage_claims', ['claim_number'], unique=True)

    # ── 3. gate_passes ────────────────────────────────────────────────────────
    op.create_table(
        'gate_passes',
        sa.Column('id', sa.String(36), primary_key=True, nullable=False),
        sa.Column('pass_number', sa.String(64), nullable=False, unique=True),

        sa.Column('vehicle_id', sa.String(36), sa.ForeignKey('vehicles.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('trip_id', sa.String(36), sa.ForeignKey('trips.id', ondelete='SET NULL'), nullable=True),
        sa.Column('issued_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),

        # Denormalised display fields
        sa.Column('vehicle_reg', sa.String(32), nullable=False),
        sa.Column('vehicle_type', sa.String(64), nullable=True),

        sa.Column('driver_name', sa.String(128), nullable=False),
        sa.Column('driver_phone', sa.String(32), nullable=True),
        sa.Column('driver_license', sa.String(64), nullable=True),

        sa.Column('container_number', sa.String(32), nullable=True),
        sa.Column('customs_seal_number', sa.String(64), nullable=True),
        sa.Column('cargo_type', sa.String(128), nullable=True),
        sa.Column('cargo_weight_tonnes', sa.Numeric(8, 2), nullable=True),

        sa.Column('terminal_name', sa.String(256), nullable=False),
        sa.Column('terminal_gate', sa.String(128), nullable=True),

        sa.Column('time_window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('time_window_end', sa.DateTime(timezone=True), nullable=False),

        sa.Column('status', gate_pass_status_enum, nullable=False, server_default='pre_approved'),
        sa.Column('carrier_name', sa.String(256), nullable=True),
        sa.Column('digital_signature', sa.Text, nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_gate_passes_vehicle_id', 'gate_passes', ['vehicle_id'])
    op.create_index('ix_gate_passes_trip_id', 'gate_passes', ['trip_id'])
    op.create_index('ix_gate_passes_status', 'gate_passes', ['status'])
    op.create_index('ix_gate_passes_pass_number', 'gate_passes', ['pass_number'], unique=True)

    # ── 4. Add corridor / cargo columns to trips ──────────────────────────────
    op.add_column('trips', sa.Column('corridor_name', sa.String(256), nullable=True))
    op.add_column('trips', sa.Column('customs_seal_number', sa.String(64), nullable=True))
    op.add_column('trips', sa.Column('container_number', sa.String(32), nullable=True))
    op.add_column('trips', sa.Column('cargo_description', sa.String(512), nullable=True))


def downgrade() -> None:
    # Remove trip columns
    op.drop_column('trips', 'cargo_description')
    op.drop_column('trips', 'container_number')
    op.drop_column('trips', 'customs_seal_number')
    op.drop_column('trips', 'corridor_name')

    # Drop gate_passes
    op.drop_index('ix_gate_passes_pass_number', table_name='gate_passes')
    op.drop_index('ix_gate_passes_status', table_name='gate_passes')
    op.drop_index('ix_gate_passes_trip_id', table_name='gate_passes')
    op.drop_index('ix_gate_passes_vehicle_id', table_name='gate_passes')
    op.drop_table('gate_passes')

    # Drop demurrage_claims
    op.drop_index('ix_demurrage_claims_claim_number', table_name='demurrage_claims')
    op.drop_index('ix_demurrage_claims_status', table_name='demurrage_claims')
    op.drop_index('ix_demurrage_claims_location_id', table_name='demurrage_claims')
    op.drop_index('ix_demurrage_claims_vehicle_id', table_name='demurrage_claims')
    op.drop_table('demurrage_claims')

    # Drop enums
    sa.Enum(name='gatepassstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='claimstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='responsibleparty').drop(op.get_bind(), checkfirst=True)
