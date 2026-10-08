from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base

from app.enums.company_status import CompanyStatus


class Position(Base):
    __tablename__ = "positions"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
        nullable=False,
    )

    company_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=False,
    )

    code = Column(
        String(50),
        nullable=False,
    )

    title = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    status = Column(
        Enum(
            CompanyStatus,
            name="position_status",
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

    company = relationship(
        "Company",
        back_populates="positions",
    )

    employees = relationship(
        "Employee",
        back_populates="position",
    )

    employment_histories = relationship(
        "EmploymentHistory",
        back_populates="position",
    )