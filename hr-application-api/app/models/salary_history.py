from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Date,
    ForeignKey,
    Numeric,
    Enum,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base

from app.enums.salary_type import SalaryType


class SalaryHistory(Base):
    __tablename__ = "salary_histories"

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

    employee_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )

    salary_amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    currency = Column(
        String(3),
        nullable=False,
    )

    salary_type = Column(
        Enum(
            SalaryType,
            name="salary_type",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    effective_date = Column(
        Date,
        nullable=False,
    )

    end_date = Column(
        Date,
        nullable=True,
    )

    reason = Column(
        String(255),
        nullable=True,
    )

    approved_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    employee = relationship(
        "Employee",
        back_populates="salary_histories",
    )

    approver = relationship(
        "User",
        back_populates="approved_salary_histories",
    )