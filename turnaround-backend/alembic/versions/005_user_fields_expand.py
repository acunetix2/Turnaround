"""Add phone, status, last_login, updated_at to users; expand userrole enum

Revision ID: 005_user_fields_expand
Revises: 004_gatepass_status_expand
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '005_user_fields_expand'
down_revision = '004_gatepass_status_expand'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new roles to userrole enum
    for value in ['driver', 'viewer']:
        op.execute(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{value}'")

    # Add new columns to users table
    op.add_column('users', sa.Column('phone',      sa.String(32),  nullable=True))
    op.add_column('users', sa.Column('status',     sa.String(32),  nullable=False, server_default='active'))
    op.add_column('users', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'status')
    op.drop_column('users', 'phone')
    # Cannot remove enum values in PostgreSQL without recreating the type
