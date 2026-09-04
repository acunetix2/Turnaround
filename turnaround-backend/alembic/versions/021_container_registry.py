"""add separate container registry and trip container assignment"""

from alembic import op

revision = "021_container_registry"
down_revision = "020_unique_staff_vehicle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TABLE IF NOT EXISTS containers (id VARCHAR(36) PRIMARY KEY, company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE, container_number VARCHAR(32) NOT NULL, container_type VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'available', notes VARCHAR(512), created_at TIMESTAMP WITH TIME ZONE NOT NULL)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_containers_company_id ON containers(company_id)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_containers_company_number ON containers(company_id, container_number)")
    op.execute("ALTER TABLE trips ADD COLUMN IF NOT EXISTS container_id VARCHAR(36) REFERENCES containers(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trips_container_id ON trips(container_id)")
    op.execute("INSERT INTO containers (id, company_id, container_number, container_type, status, created_at) SELECT md5(v.company_id || ':' || v.container_number), v.company_id, v.container_number, v.container_type, 'available', CURRENT_TIMESTAMP FROM vehicles v WHERE v.container_number IS NOT NULL AND NOT EXISTS (SELECT 1 FROM containers c WHERE c.company_id = v.company_id AND c.container_number = v.container_number)")
    op.execute("UPDATE trips t SET container_id = c.id FROM containers c WHERE t.container_number = c.container_number AND c.company_id = (SELECT company_id FROM vehicles v WHERE v.id = t.vehicle_id) AND t.container_id IS NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_trips_container_id")
    op.execute("ALTER TABLE trips DROP COLUMN IF EXISTS container_id")
    op.execute("DROP TABLE IF EXISTS containers")