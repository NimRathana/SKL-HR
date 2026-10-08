"""Require unique company name and code pairs per tenant.

Revision ID: 20260924_unique_company_code
Revises: 20260922_nullable_email_creator
"""

from alembic import op


revision = "20260924_unique_company_code"
down_revision = "20260922_nullable_email_creator"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_company_tenant_name_code",
        "companies",
        ["tenant_id", "name", "code"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_company_tenant_name_code", "companies", type_="unique")