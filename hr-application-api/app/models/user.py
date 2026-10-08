from uuid6 import uuid7

from sqlalchemy import (
    Column,
    JSON,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Enum,
    UniqueConstraint,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import deferred, relationship

from app.database.session import Base

from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus


class User(Base):
    __tablename__ = "users"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
        nullable=False,
    )

    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    email = Column(
        String(150),
        nullable=False,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    date_of_birth = Column(
        Date,
        nullable=True,
    )

    address = Column(
        Text,
        nullable=True,
    )

    password_hash = Column(
        Text,
        nullable=False,
    )

    role = Column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )

    status = Column(
        Enum(
            UserStatus,
            name="user_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE.value,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user_preferences = deferred(
        Column(
            JSON,
            nullable=True,
        )
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

    profile_image_file = relationship(
        "File",
        uselist=False,
        back_populates="user",
        foreign_keys="[File.user_id]",
    )

    tenant = relationship(
        "Tenant",
        back_populates="users",
    )

    company_users = relationship(
        "CompanyUser",
        back_populates="user",
    )

    approved_salary_histories = relationship(
        "SalaryHistory",
        back_populates="approver",
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "email",
            name="uq_users_tenant_email",
        ),
    )


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    device_type = Column(String(50), nullable=False)
    browser = Column(String(50), nullable=True)
    device = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_login_history_user_created", "user_id", "created_at"),)