"""Merge the legacy gatepass and logistics schema migration heads."""

revision = "017_merge_schema_heads"
down_revision = ("005_gatepass_cancelled_status", "016_vehicle_fuel_metrics")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
