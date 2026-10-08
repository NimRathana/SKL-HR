from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base

from app.enums.tenant_status import TenantStatus


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
        nullable=False,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    plan = Column(
        String(32),
        ForeignKey("plan_types.code", ondelete="RESTRICT"),
        nullable=False,
        default="free",
        server_default="free",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    companies = relationship(
        "Company",
        back_populates="tenant",
    )

    users = relationship(
        "User",
        back_populates="tenant",
    )

    company_users = relationship(
        "CompanyUser",
        back_populates="tenant",
    )