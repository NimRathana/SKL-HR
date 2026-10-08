from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database.session import Base


class PlanTypeCatalog(Base):
    __tablename__ = "plan_types"

    code = Column(String(32), primary_key=True)
    name = Column(String(80), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    pricing_plans = relationship("PricingPlan", back_populates="plan_type_definition")