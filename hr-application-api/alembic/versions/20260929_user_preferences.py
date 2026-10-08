"""Add JSON preferences to users.

Revision ID: 20260929_user_preferences
Revises: 20260924_email_request_meta
"""

from alembic import op
import sqlalchemy as sa


revision = "20260929_user_preferences"
down_revision = "20260924_email_request_meta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "user_preferences",
            sa.JSON(),
            nullable=True,
            server_default=sa.text("'{}'::json"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "user_preferences")