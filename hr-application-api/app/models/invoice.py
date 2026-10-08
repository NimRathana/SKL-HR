from uuid import uuid4

from uuid6 import uuid7
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.database.session import Base


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("amount_due >= 0 AND amount_paid >= 0", name="ck_invoices_nonnegative_amounts"),
        CheckConstraint("status IN ('pending', 'paid', 'failed', 'void')", name="ck_invoices_status"),
        Index("ix_invoices_tenant_created", "tenant_id", "created_at"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    invoice_number = Column(String(40), nullable=False, unique=True, default=lambda: f"INV-{uuid4().hex[:24].upper()}")
    subscription_id = Column(PG_UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    plan_name = Column(String(120), nullable=False)
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    currency = Column(String(3), nullable=False)
    status = Column(String(16), nullable=False, default="pending", server_default="pending")
    billing_period_start = Column(DateTime(timezone=True), nullable=False)
    billing_period_end = Column(DateTime(timezone=True), nullable=False)
    external_reference = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)