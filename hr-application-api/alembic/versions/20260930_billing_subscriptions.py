"""Add pricing plans, subscription billing fields, and invoices.

Revision ID: 20260930_billing_subscriptions
Revises: 20260929_user_preferences
"""

from alembic import op
import sqlalchemy as sa


revision = "20260930_billing_subscriptions"
down_revision = "20260929_user_preferences"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_column(table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in _inspector().get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    return any(index["name"] == index_name for index in _inspector().get_indexes(table_name))


def _has_constraint(table_name: str, constraint_name: str, kind: str) -> bool:
    inspector = _inspector()
    if kind == "check":
        constraints = inspector.get_check_constraints(table_name)
    elif kind == "unique":
        constraints = inspector.get_unique_constraints(table_name)
    else:
        constraints = inspector.get_foreign_keys(table_name)
    return any(constraint["name"] == constraint_name for constraint in constraints)


def _has_foreign_key(table_name: str, columns: list[str], referred_table: str) -> bool:
    return any(
        foreign_key["constrained_columns"] == columns
        and foreign_key["referred_table"] == referred_table
        for foreign_key in _inspector().get_foreign_keys(table_name)
    )


def upgrade() -> None:
    op.execute("UPDATE tenants SET plan = 'medium' WHERE plan::text = 'professional'")
    op.execute("UPDATE registrations SET plan = 'medium' WHERE plan::text = 'professional'")
    op.alter_column("tenants", "plan", server_default=None)
    op.execute("CREATE TYPE plan_type_new AS ENUM ('free', 'basic', 'medium')")
    op.execute("ALTER TABLE tenants ALTER COLUMN plan TYPE plan_type_new USING plan::text::plan_type_new")
    op.execute("ALTER TABLE registrations ALTER COLUMN plan TYPE plan_type_new USING plan::text::plan_type_new")
    op.execute("DROP TYPE plan_type")
    op.execute("ALTER TYPE plan_type_new RENAME TO plan_type")
    op.alter_column("tenants", "plan", server_default=sa.text("'free'::plan_type"))

    if not _inspector().has_table("pricing_plans"):
        op.create_table(
            "pricing_plans",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("plan_type", sa.String(length=16), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column("currency", sa.String(length=3), server_default="USD", nullable=False),
            sa.Column("billing_interval", sa.String(length=16), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint("plan_type IN ('free', 'basic', 'medium')", name="ck_pricing_plans_plan_type"),
            sa.CheckConstraint("price >= 0", name="ck_pricing_plans_nonnegative_price"),
            sa.CheckConstraint("length(currency) = 3 AND currency = upper(currency)", name="ck_pricing_plans_currency_code"),
            sa.CheckConstraint("billing_interval IN ('monthly', 'yearly')", name="ck_pricing_plans_billing_interval"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
    if not _has_index("pricing_plans", "ix_pricing_plans_active_type"):
        op.create_index("ix_pricing_plans_active_type", "pricing_plans", ["is_active", "plan_type"])

    subscription_columns = {
        "pricing_plan_id": sa.Column("pricing_plan_id", sa.UUID(), nullable=True),
        "idempotency_key": sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        "current_period_start": sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        "current_period_end": sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        "cancelled_at": sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        "cancel_at_period_end": sa.Column("cancel_at_period_end", sa.Boolean(), server_default=sa.false(), nullable=False),
    }
    for column_name, column in subscription_columns.items():
        if not _has_column("subscriptions", column_name):
            op.add_column("subscriptions", column)
    if not _has_foreign_key("subscriptions", ["pricing_plan_id"], "pricing_plans"):
        op.create_foreign_key(
            "fk_subscriptions_pricing_plan_id_pricing_plans",
            "subscriptions",
            "pricing_plans",
            ["pricing_plan_id"],
            ["id"],
            ondelete="RESTRICT",
        )
    if not _has_constraint("subscriptions", "uq_subscriptions_tenant_idempotency", "unique"):
        op.create_unique_constraint("uq_subscriptions_tenant_idempotency", "subscriptions", ["tenant_id", "idempotency_key"])
    for index_name, columns in (
        ("ix_subscriptions_user_created", ["user_id", "created_at"]),
        ("ix_subscriptions_tenant_created", ["tenant_id", "created_at"]),
        ("ix_subscriptions_pricing_plan", ["pricing_plan_id"]),
    ):
        if not _has_index("subscriptions", index_name):
            op.create_index(index_name, "subscriptions", columns)
    if not _has_index("subscriptions", "uq_subscriptions_open_tenant"):
        op.create_index(
            "uq_subscriptions_open_tenant",
            "subscriptions",
            ["tenant_id"],
            unique=True,
            postgresql_where=sa.text("pricing_plan_id IS NOT NULL AND status IN ('active', 'pending')"),
        )
    if not _has_constraint("subscriptions", "ck_subscriptions_status", "check"):
        op.create_check_constraint(
            "ck_subscriptions_status",
            "subscriptions",
            "status IN ('pending', 'active', 'cancelled', 'expired')",
        )

    if not _inspector().has_table("invoices"):
        op.create_table(
            "invoices",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("invoice_number", sa.String(length=40), nullable=False),
            sa.Column("subscription_id", sa.UUID(), nullable=False),
            sa.Column("tenant_id", sa.UUID(), nullable=True),
            sa.Column("user_id", sa.UUID(), nullable=True),
            sa.Column("plan_name", sa.String(length=120), nullable=False),
            sa.Column("amount_due", sa.Numeric(10, 2), nullable=False),
            sa.Column("amount_paid", sa.Numeric(10, 2), server_default="0", nullable=False),
            sa.Column("currency", sa.String(length=3), nullable=False),
            sa.Column("status", sa.String(length=16), server_default="pending", nullable=False),
            sa.Column("billing_period_start", sa.DateTime(timezone=True), nullable=False),
            sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=False),
            sa.Column("external_reference", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint("amount_due >= 0 AND amount_paid >= 0", name="ck_invoices_nonnegative_amounts"),
            sa.CheckConstraint("status IN ('pending', 'paid', 'failed', 'void')", name="ck_invoices_status"),
            sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("invoice_number"),
            sa.UniqueConstraint("external_reference"),
        )
    elif not _has_column("invoices", "updated_at"):
        op.add_column(
            "invoices",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if not _has_index("invoices", "ix_invoices_tenant_created"):
        op.create_index("ix_invoices_tenant_created", "invoices", ["tenant_id", "created_at"])


def downgrade() -> None:
    pass