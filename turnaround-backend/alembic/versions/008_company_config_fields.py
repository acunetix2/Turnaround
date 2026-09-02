"""Add configuration fields to companies table

Revision ID: 008_company_config_fields
Revises: 007_notifications_table
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '008_company_config_fields'
down_revision = '007_notifications_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Identity
    op.add_column('companies', sa.Column('registration_number', sa.String(100), nullable=True))
    op.add_column('companies', sa.Column('industry',            sa.String(200), nullable=True))
    op.add_column('companies', sa.Column('logo_url',            sa.Text,        nullable=True))
    op.add_column('companies', sa.Column('website',             sa.String(512), nullable=True))
    # Contact
    op.add_column('companies', sa.Column('phone',   sa.String(50),  nullable=True))
    op.add_column('companies', sa.Column('email',   sa.String(255), nullable=True))
    op.add_column('companies', sa.Column('address', sa.String(512), nullable=True))
    op.add_column('companies', sa.Column('city',    sa.String(100), nullable=True))
    op.add_column('companies', sa.Column('country', sa.String(100), nullable=True, server_default='Kenya'))
    # Regional
    op.add_column('companies', sa.Column('currency', sa.String(10), nullable=False, server_default='KES'))
    op.add_column('companies', sa.Column('timezone', sa.String(60), nullable=False, server_default='Africa/Nairobi'))
    # Operational config
    op.add_column('companies', sa.Column('default_corridor',               sa.String(256), nullable=True))
    op.add_column('companies', sa.Column('sla_warning_threshold_minutes',  sa.Integer, nullable=False, server_default='30'))
    op.add_column('companies', sa.Column('sla_breach_threshold_minutes',   sa.Integer, nullable=False, server_default='60'))
    op.add_column('companies', sa.Column('hourly_operating_rate',          sa.Float,   nullable=False, server_default='7500'))
    op.add_column('companies', sa.Column('demurrage_rate_multiplier',      sa.Float,   nullable=False, server_default='1.5'))
    op.add_column('companies', sa.Column('gps_polling_interval_seconds',   sa.Integer, nullable=False, server_default='30'))
    op.add_column('companies', sa.Column('geofence_buffer_meters',         sa.Integer, nullable=False, server_default='100'))
    # Automations
    op.add_column('companies', sa.Column('auto_revoke_expired_passes', sa.Boolean, nullable=False, server_default='true'))
    op.add_column('companies', sa.Column('notify_on_delay',            sa.Boolean, nullable=False, server_default='true'))
    op.add_column('companies', sa.Column('notify_on_gate_pass',        sa.Boolean, nullable=False, server_default='true'))
    # Telematics
    op.add_column('companies', sa.Column('integrations', sa.JSON, nullable=True))


def downgrade() -> None:
    for col in [
        'registration_number', 'industry', 'logo_url', 'website',
        'phone', 'email', 'address', 'city', 'country',
        'currency', 'timezone', 'default_corridor',
        'sla_warning_threshold_minutes', 'sla_breach_threshold_minutes',
        'hourly_operating_rate', 'demurrage_rate_multiplier',
        'gps_polling_interval_seconds', 'geofence_buffer_meters',
        'auto_revoke_expired_passes', 'notify_on_delay', 'notify_on_gate_pass',
        'integrations',
    ]:
        op.drop_column('companies', col)
