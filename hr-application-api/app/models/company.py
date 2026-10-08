from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    func,
    UniqueConstraint,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base
from app.enums.company_status import CompanyStatus


class Company(Base):
    __tablename__ = "companies"

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", "code", name="uq_company_tenant_name_code"),
    )

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

    parent_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    code = Column(
        String(50),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    address = Column(
        Text,
        nullable=True,
    )

    phone = Column(
        String(20),
        nullable=True,
    )

    email = Column(
        String(70),
        nullable=True,
    )

    website = Column(
        String(100),
        nullable=True,
    )

    status = Column(
        Enum(
            CompanyStatus,
            name="company_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=CompanyStatus.ACTIVE,
        server_default=CompanyStatus.ACTIVE.value,
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

    tenant = relationship(
        "Tenant",
        back_populates="companies",
    )

    parent = relationship(
        "Company",
        remote_side=[id],
        back_populates="children",
    )

    children = relationship(
        "Company",
        back_populates="parent",
    )

    company_users = relationship(
        "CompanyUser",
        back_populates="company",
    )

    positions = relationship(
        "Position",
        back_populates="company",
    )

    employees = relationship(
        "Employee",
        back_populates="company",
    )