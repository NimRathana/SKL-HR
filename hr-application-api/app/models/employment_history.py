from uuid6 import uuid7

from sqlalchemy import (
    Column,
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

from app.enums.employment_type import EmploymentType
from app.enums.employment_history_status import EmploymentHistoryStatus


class EmploymentHistory(Base):
    __tablename__ = "employment_histories"

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

    company_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=False,
    )

    position_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("positions.id"),
        nullable=False,
    )

    employment_type = Column(
        Enum(
            EmploymentType,
            name="employment_type",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    start_date = Column(
        Date,
        nullable=False,
    )

    end_date = Column(
        Date,
        nullable=True,
    )

    status = Column(
        Enum(
            EmploymentHistoryStatus,
            name="employment_history_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=EmploymentHistoryStatus.ACTIVE,
        server_default=EmploymentHistoryStatus.ACTIVE.value,
    )

    reason = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    employee = relationship(
        "Employee",
        back_populates="employment_histories",
    )

    position = relationship(
        "Position",
        back_populates="employment_histories",
    )