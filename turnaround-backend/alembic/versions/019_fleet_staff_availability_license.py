"""add fleet staff license expiry and availability"""

from alembic import op

revision = "019_staff_availability"
down_revision = "018_expand_fleet_staff_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE fleet_staff ADD COLUMN IF NOT EXISTS license_expiry_date VARCHAR(10)")
    op.execute("ALTER TABLE fleet_staff ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'available'")


def downgrade() -> None:
    op.execute("ALTER TABLE fleet_staff DROP COLUMN IF EXISTS availability_status")
    op.execute("ALTER TABLE fleet_staff DROP COLUMN IF EXISTS license_expiry_date")