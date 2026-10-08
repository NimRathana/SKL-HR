"""Allow pending plan changes alongside the current active subscription."""

from alembic import op
import sqlalchemy as sa


revision = "20261005_stage_plan_changes"
down_revision = "20261001_subscription_stripe_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_subscriptions_open_tenant", table_name="subscriptions")
    op.create_index(
        "uq_subscriptions_open_tenant",
        "subscriptions",
        ["tenant_id"],
        unique=True,
        postgresql_where=sa.text("pricing_plan_id IS NOT NULL AND status = 'active'"),
    )


def downgrade() -> None:
    op.execute(sa.text(
        """
        WITH ranked AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY tenant_id
                       ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                                created_at DESC,
                                id DESC
                   ) AS position
            FROM subscriptions
            WHERE pricing_plan_id IS NOT NULL
                            AND tenant_id IS NOT NULL
              AND status IN ('active', 'pending')
        )
        UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP)
        WHERE id IN (SELECT id FROM ranked WHERE position > 1)
        """
    ))
    op.drop_index("uq_subscriptions_open_tenant", table_name="subscriptions")
    op.create_index(
        "uq_subscriptions_open_tenant",
        "subscriptions",
        ["tenant_id"],
        unique=True,
        postgresql_where=sa.text("pricing_plan_id IS NOT NULL AND status IN ('active', 'pending')"),
    )