"""Store request metadata for queued emails.

Revision ID: 20260924_email_request_meta
Revises: 20260924_unique_company_code
"""

from alembic import op
import sqlalchemy as sa


revision = "20260924_email_request_meta"
down_revision = "20260924_unique_company_code"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("email_logs", sa.Column("ip_address", sa.String(length=45), nullable=True))
    op.add_column("email_logs", sa.Column("device_type", sa.String(length=50), nullable=True))
    op.add_column("email_logs", sa.Column("location", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("email_logs", "location")
    op.drop_column("email_logs", "device_type")
    op.drop_column("email_logs", "ip_address")