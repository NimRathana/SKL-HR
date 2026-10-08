"""Add admin-managed plan types.

Revision ID: 20260930_admin_plan_types
Revises: 20260930_plan_features_defaults
"""

from alembic import op
import sqlalchemy as sa


revision = "20260930_admin_plan_types"
down_revision = "20260930_plan_features_defaults"
branch_labels = None
depends_on = None


DEFAULT_TYPES = (
    ("free", "Free", "Entry-level plan", 0),
    ("basic", "Basic", "Core plan for small teams", 10),
    ("medium", "Medium", "Advanced plan for growing teams", 20),
)


def _inspector():
    return sa.inspect(op.get_bind())


def _has_constraint(table_name: str, constraint_name: str, kind: str) -> bool:
    inspector = _inspector()
    if kind == "check":
        constraints = inspector.get_check_constraints(table_name)
    elif kind == "foreign_key":
        constraints = inspector.get_foreign_keys(table_name)
    else:
        constraints = inspector.get_unique_constraints(table_name)
    return any(constraint.get("name") == constraint_name for constraint in constraints)


def upgrade() -> None:
    if not _inspector().has_table("plan_types"):
        op.create_table(
            "plan_types",
            sa.Column("code", sa.String(length=32), nullable=False),
            sa.Column("name", sa.String(length=80), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("code"),
            sa.UniqueConstraint("name"),
        )

    for code, name, description, sort_order in DEFAULT_TYPES:
        op.execute(
            sa.text(
                "INSERT INTO plan_types (code, name, description, sort_order, is_active, created_at, updated_at) "
                "VALUES (:code, :name, :description, :sort_order, true, now(), now()) "
                "ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=code, name=name, description=description, sort_order=sort_order)
        )

    if _has_constraint("pricing_plans", "ck_pricing_plans_plan_type", "check"):
        op.drop_constraint("ck_pricing_plans_plan_type", "pricing_plans", type_="check")
    op.alter_column(
        "pricing_plans",
        "plan_type",
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
    if not _has_constraint("pricing_plans", "fk_pricing_plans_plan_type_plan_types", "foreign_key"):
        op.create_foreign_key(
            "fk_pricing_plans_plan_type_plan_types",
            "pricing_plans",
            "plan_types",
            ["plan_type"],
            ["code"],
            ondelete="RESTRICT",
        )

    op.alter_column("tenants", "plan", server_default=None)
    op.alter_column(
        "tenants",
        "plan",
        existing_type=sa.Enum(name="plan_type"),
        type_=sa.String(length=32),
        existing_nullable=False,
        postgresql_using="plan::text",
    )
    op.alter_column("tenants", "plan", server_default="free")
    if not _has_constraint("tenants", "fk_tenants_plan_plan_types", "foreign_key"):
        op.create_foreign_key(
            "fk_tenants_plan_plan_types",
            "tenants",
            "plan_types",
            ["plan"],
            ["code"],
            ondelete="RESTRICT",
        )


def downgrade() -> None:
    extra_types = op.get_bind().execute(
        sa.text("SELECT count(*) FROM plan_types WHERE code NOT IN ('free', 'basic', 'medium')")
    ).scalar_one()
    if extra_types:
        raise RuntimeError("Cannot downgrade while administrator-created plan types exist")

    if _has_constraint("tenants", "fk_tenants_plan_plan_types", "foreign_key"):
        op.drop_constraint("fk_tenants_plan_plan_types", "tenants", type_="foreignkey")
    op.alter_column("tenants", "plan", server_default=None)
    op.alter_column(
        "tenants",
        "plan",
        existing_type=sa.String(length=32),
        type_=sa.Enum("free", "basic", "medium", name="plan_type"),
        existing_nullable=False,
        postgresql_using="plan::plan_type",
    )
    op.alter_column("tenants", "plan", server_default=sa.text("'free'::plan_type"))

    if _has_constraint("pricing_plans", "fk_pricing_plans_plan_type_plan_types", "foreign_key"):
        op.drop_constraint("fk_pricing_plans_plan_type_plan_types", "pricing_plans", type_="foreignkey")
    op.alter_column(
        "pricing_plans",
        "plan_type",
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "ck_pricing_plans_plan_type",
        "pricing_plans",
        "plan_type IN ('free', 'basic', 'medium')",
    )
    op.drop_table("plan_types")
