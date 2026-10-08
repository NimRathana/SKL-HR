from uuid6 import uuid7

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'active', 'cancelled', 'expired')", name="ck_subscriptions_status"),
        Index(
            "uq_subscriptions_open_tenant",
            "tenant_id",
            unique=True,
            postgresql_where=(
                Column("pricing_plan_id").isnot(None)
                & (Column("status") == "active")
            ),
            sqlite_where=(
                Column("pricing_plan_id").isnot(None)
                & (Column("status") == "active")
            ),
        ),
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_subscriptions_tenant_idempotency"),
        UniqueConstraint("stripe_subscription_id", name="uq_subscriptions_stripe_subscription_id"),
        Index("ix_subscriptions_user_created", "user_id", "created_at"),
        Index("ix_subscriptions_tenant_created", "tenant_id", "created_at"),
        Index("ix_subscriptions_pricing_plan", "pricing_plan_id"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    tenant_id = Column(PG_UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    pricing_plan_id = Column(PG_UUID(as_uuid=True), ForeignKey("pricing_plans.id", ondelete="RESTRICT"), nullable=True)
    idempotency_key = Column(String(128), nullable=True)
    plan_id = Column(String(32), nullable=False)
    billing_cycle = Column(String(16), nullable=False)
    tenant_name = Column(String(150), nullable=False)
    tenant_email = Column(String(150), nullable=False)
    tenant_phone = Column(String(50), nullable=True)
    billing_address = Column(String(5000), nullable=True)
    password_hash = Column(String(255), nullable=True)
    status = Column(String(16), nullable=False, default="pending", server_default="pending")
    stripe_session_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    payment_status = Column(String(32), nullable=False, default="unpaid", server_default="unpaid")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    pricing_plan = relationship("PricingPlan", back_populates="subscriptions")
