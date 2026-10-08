"""Synchronize monthly and yearly plan limits.

Revision ID: 20260930_sync_interval_limits
Revises: 20260930_unique_plan_interval
"""

from alembic import op
import sqlalchemy as sa


revision = "20260930_sync_interval_limits"
down_revision = "20260930_unique_plan_interval"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE pricing_plans AS yearly "
            "SET max_employees = monthly.max_employees, "
            "    max_companies = monthly.max_companies, "
            "    max_hr_users = monthly.max_hr_users, "
            "    updated_at = now() "
            "FROM pricing_plans AS monthly "
            "WHERE yearly.plan_type = monthly.plan_type "
            "  AND yearly.billing_interval = 'yearly' "
            "  AND monthly.billing_interval = 'monthly' "
            "  AND (yearly.max_employees, yearly.max_companies, yearly.max_hr_users) "
            "      IS DISTINCT FROM (monthly.max_employees, monthly.max_companies, monthly.max_hr_users)"
        )
    )


def downgrade() -> None:
    pass
