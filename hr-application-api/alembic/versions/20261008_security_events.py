"""Create security event records for suspicious activity monitoring."""

from alembic import op
import sqlalchemy as sa


revision = "20261008_security_events"
down_revision = "20261007_login_devices"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("security_events"):
        op.create_table(
            "security_events",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("method", sa.String(length=10), nullable=False),
            sa.Column("endpoint", sa.String(length=255), nullable=False),
            sa.Column("status_code", sa.Integer(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("security_events")}
    if "ix_security_events_created_at" not in indexes:
        op.create_index("ix_security_events_created_at", "security_events", ["created_at"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("security_events"):
        indexes = {index["name"] for index in inspector.get_indexes("security_events")}
        if "ix_security_events_created_at" in indexes:
            op.drop_index("ix_security_events_created_at", table_name="security_events")
        op.drop_table("security_events")
