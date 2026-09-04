"""expand user roles for logistics operations

Revision ID: 015_expand_user_roles
Revises: 014_fleet_staff_assignments
"""
from alembic import op

revision = "015_expand_user_roles"
down_revision = "014_fleet_staff_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'operations_manager'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'maintenance_technician'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'supervisor'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely in-place.
    pass
