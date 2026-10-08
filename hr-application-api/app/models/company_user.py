from uuid6 import uuid7

from sqlalchemy import (
    Column,
    ForeignKey,
    UniqueConstraint,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


class CompanyUser(Base):
    __tablename__ = "company_user"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
        nullable=False,
    )

    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
    )

    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    company_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=False,
    )

    tenant = relationship(
        "Tenant",
        back_populates="company_users",
    )

    user = relationship(
        "User",
        back_populates="company_users",
    )

    company = relationship(
        "Company",
        back_populates="company_users",
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "user_id",
            "company_id",
            name="uq_company_user",
        ),
    )