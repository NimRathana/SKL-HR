"""Track Stripe subscription IDs for renewal webhooks.

Revision ID: 20261001_subscription_stripe_id
Revises: 20260930_sync_interval_limits
"""

from alembic import op
import sqlalchemy as sa


revision = "20261001_subscription_stripe_id"
down_revision = "20260930_sync_interval_limits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "subscriptions",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint(
        "uq_subscriptions_stripe_subscription_id",
        "subscriptions",
        ["stripe_subscription_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_subscriptions_stripe_subscription_id",
        "subscriptions",
        type_="unique",
    )
    op.drop_column("subscriptions", "stripe_subscription_id")