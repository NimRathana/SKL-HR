from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Enum,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.database.session import Base
from app.enums.plan_type import PlanType


class Registration(Base):
    __tablename__ = "registrations"

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

    email = Column(
        String(150),
        unique=True,
        nullable=False,
    )

    password_hash = Column(
        Text,
        nullable=False,
    )

    plan = Column(
        Enum(
            PlanType,
            name="plan_type",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    verification_code_hash = Column(
        Text,
        nullable=False,
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
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