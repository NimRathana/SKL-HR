from uuid6 import uuid7

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


class PricingPlan(Base):
    __tablename__ = "pricing_plans"
    __table_args__ = (
        UniqueConstraint("plan_type", "billing_interval", name="uq_pricing_plans_type_interval"),
        CheckConstraint("price >= 0", name="ck_pricing_plans_nonnegative_price"),
        CheckConstraint("length(currency) = 3 AND currency = upper(currency)", name="ck_pricing_plans_currency_code"),
        CheckConstraint("billing_interval IN ('monthly', 'yearly')", name="ck_pricing_plans_billing_interval"),
        CheckConstraint("max_employees IS NULL OR max_employees >= 0", name="ck_pricing_plans_max_employees"),
        CheckConstraint("max_companies IS NULL OR max_companies >= 0", name="ck_pricing_plans_max_companies"),
        CheckConstraint("max_hr_users IS NULL OR max_hr_users >= 0", name="ck_pricing_plans_max_hr_users"),
        Index("ix_pricing_plans_active_type", "is_active", "plan_type"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    plan_type = Column(String(32), ForeignKey("plan_types.code", ondelete="RESTRICT"), nullable=False)
    name = Column(String(120), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD", server_default="USD")
    billing_interval = Column(String(16), nullable=False)
    max_employees = Column(Integer, nullable=True)
    max_companies = Column(Integer, nullable=True)
    max_hr_users = Column(Integer, nullable=True)
    features = Column(JSON, nullable=False, default=dict, server_default="{}")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    subscriptions = relationship("Subscription", back_populates="pricing_plan")
    plan_type_definition = relationship("PlanTypeCatalog", back_populates="pricing_plans")