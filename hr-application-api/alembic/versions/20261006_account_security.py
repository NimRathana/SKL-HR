"""Add login history and account deletion state."""

from alembic import op
import sqlalchemy as sa


revision = "20261006_account_security"
down_revision = "20261005_stage_plan_changes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "deleted_at" not in user_columns:
        op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    if not inspector.has_table("login_history"):
        op.create_table(
            "login_history",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("device_type", sa.String(length=50), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    index_names = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("login_history")}
    if "ix_login_history_user_id" not in index_names:
        op.create_index("ix_login_history_user_id", "login_history", ["user_id"])
    if "ix_login_history_user_created" not in index_names:
        op.create_index("ix_login_history_user_created", "login_history", ["user_id", "created_at"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("login_history"):
        index_names = {index["name"] for index in inspector.get_indexes("login_history")}
        if "ix_login_history_user_created" in index_names:
            op.drop_index("ix_login_history_user_created", table_name="login_history")
        if "ix_login_history_user_id" in index_names:
            op.drop_index("ix_login_history_user_id", table_name="login_history")
        op.drop_table("login_history")

    user_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "deleted_at" in user_columns:
        op.drop_column("users", "deleted_at")
