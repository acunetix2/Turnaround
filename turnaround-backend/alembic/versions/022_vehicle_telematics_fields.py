"""add battery, ignition, and mileage telemetry fields to vehicles"""

from alembic import op

revision = "022_vehicle_telematics_fields"
down_revision = "021_container_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS battery_level INTEGER")
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS battery_voltage DOUBLE PRECISION")
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ignition_status VARCHAR(20)")
    op.execute("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage_km DOUBLE PRECISION")


def downgrade() -> None:
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS mileage_km")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS ignition_status")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS battery_voltage")
    op.execute("ALTER TABLE vehicles DROP COLUMN IF EXISTS battery_level")
