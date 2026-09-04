"""Add company operating zone for map boundaries.

Revision ID: 013_operating_zone
Revises: 012_auth_sessions
"""
from alembic import op
import sqlalchemy as sa

revision = '013_operating_zone'
down_revision = '012_auth_sessions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'companies',
        sa.Column('operating_zone', sa.String(length=32), nullable=False, server_default='east_africa'),
    )


def downgrade() -> None:
    op.drop_column('companies', 'operating_zone')