"""allow longer operational fleet staff role names"""

from alembic import op

revision = "018_expand_fleet_staff_type"
down_revision = "017_merge_schema_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE fleet_staff ALTER COLUMN staff_type TYPE VARCHAR(40)")


def downgrade() -> None:
    op.execute("ALTER TABLE fleet_staff ALTER COLUMN staff_type TYPE VARCHAR(20)")
