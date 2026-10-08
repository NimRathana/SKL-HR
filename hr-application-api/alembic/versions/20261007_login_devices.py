"""Store separate browser and device information for sign-ins."""

from alembic import op
import sqlalchemy as sa


revision = "20261007_login_devices"
down_revision = "20261006_account_security"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("login_history")}
    if "browser" not in columns:
        op.add_column("login_history", sa.Column("browser", sa.String(length=50), nullable=True))
    if "device" not in columns:
        op.add_column("login_history", sa.Column("device", sa.String(length=50), nullable=True))


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("login_history")}
    if "device" in columns:
        op.drop_column("login_history", "device")
    if "browser" in columns:
        op.drop_column("login_history", "browser")