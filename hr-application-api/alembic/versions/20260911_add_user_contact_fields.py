"""Add contact fields to users.

Revision ID: 20260911_add_user_contact_fields
Revises:
"""

from alembic import op
import sqlalchemy as sa


revision = "20260911_add_user_contact_fields"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("address", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "address")
    op.drop_column("users", "date_of_birth")
    op.drop_column("users", "phone")
