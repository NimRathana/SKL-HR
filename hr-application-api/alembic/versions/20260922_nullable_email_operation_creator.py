"""Allow public registration email operations without a user creator.

Revision ID: 20260922_nullable_email_creator
Revises: 20260911_add_user_contact_fields
"""

from alembic import op


revision = "20260922_nullable_email_creator"
down_revision = "20260911_add_user_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("email_bulk_operations", "created_by", nullable=True)


def downgrade() -> None:
    op.alter_column("email_bulk_operations", "created_by", nullable=False)