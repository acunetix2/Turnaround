"""prevent drivers and co-drivers being assigned to multiple vehicles"""

from alembic import op

revision = "020_unique_staff_vehicle"
down_revision = "019_staff_availability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the newest assignment when legacy data has the same staff member
    # linked to multiple vehicles; the API blocks new duplicates afterwards.
    op.execute(
        "UPDATE vehicles SET driver_id = NULL WHERE id IN ("
        "SELECT id FROM (SELECT id, ROW_NUMBER() OVER "
        "(PARTITION BY company_id, driver_id ORDER BY created_at DESC, id DESC) AS rn "
        "FROM vehicles WHERE driver_id IS NOT NULL) duplicates WHERE rn > 1)"
    )
    op.execute(
        "UPDATE vehicles SET co_driver_id = NULL WHERE id IN ("
        "SELECT id FROM (SELECT id, ROW_NUMBER() OVER "
        "(PARTITION BY company_id, co_driver_id ORDER BY created_at DESC, id DESC) AS rn "
        "FROM vehicles WHERE co_driver_id IS NOT NULL) duplicates WHERE rn > 1)"
    )
    op.execute(
        "UPDATE vehicles SET co_driver_id = NULL "
        "WHERE co_driver_id IS NOT NULL AND co_driver_id = driver_id"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_company_driver "
        "ON vehicles (company_id, driver_id) WHERE driver_id IS NOT NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_company_codriver "
        "ON vehicles (company_id, co_driver_id) WHERE co_driver_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_vehicle_company_codriver")
    op.execute("DROP INDEX IF EXISTS uq_vehicle_company_driver")
