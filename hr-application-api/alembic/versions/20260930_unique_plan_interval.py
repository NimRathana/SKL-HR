"""Prevent duplicate pricing intervals per plan type.

Revision ID: 20260930_unique_plan_interval
Revises: 20260930_admin_plan_types
"""

from alembic import op
import sqlalchemy as sa


revision = "20260930_unique_plan_interval"
down_revision = "20260930_admin_plan_types"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "uq_pricing_plans_type_interval"


def upgrade() -> None:
    duplicates = op.get_bind().execute(
        sa.text(
            "SELECT plan_type, billing_interval, count(*) AS duplicate_count "
            "FROM pricing_plans GROUP BY plan_type, billing_interval HAVING count(*) > 1"
        )
    ).all()
    if duplicates:
        raise RuntimeError(
            "Cannot add unique pricing interval constraint while duplicate plan type/billing interval pairs exist: "
            + ", ".join(f"{plan_type}/{interval} ({count})" for plan_type, interval, count in duplicates)
        )
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "pricing_plans",
        ["plan_type", "billing_interval"],
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, "pricing_plans", type_="unique")
