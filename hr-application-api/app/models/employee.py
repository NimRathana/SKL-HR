from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Date,
    ForeignKey,
    Enum,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base

from app.enums.gender import Gender
from app.enums.employment_status import EmploymentStatus


class Employee(Base):
    __tablename__ = "employees"

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

    company_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=False,
    )

    first_name = Column(
        String(100),
        nullable=False,
    )

    last_name = Column(
        String(100),
        nullable=False,
    )

    gender = Column(
        Enum(
            Gender,
            name="gender_type",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    date_of_birth = Column(
        Date,
        nullable=True,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    email = Column(
        String(150),
        nullable=True,
    )

    address = Column(
        Text,
        nullable=True,
    )

    hire_date = Column(
        Date,
        nullable=False,
    )

    employment_status = Column(
        Enum(
            EmploymentStatus,
            name="employment_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=EmploymentStatus.ACTIVE,
        server_default=EmploymentStatus.ACTIVE.value,
    )

    position_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("positions.id"),
        nullable=False,
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

    company = relationship(
        "Company",
        back_populates="employees",
    )

    position = relationship(
        "Position",
        back_populates="employees",
    )

    employment_histories = relationship(
        "EmploymentHistory",
        back_populates="employee",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    salary_histories = relationship(
        "SalaryHistory",
        back_populates="employee",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )