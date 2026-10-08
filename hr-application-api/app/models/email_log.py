from uuid6 import uuid7

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.database.session import Base


class EmailBulkOperation(Base):
    __tablename__ = "email_bulk_operations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    total = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    operation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("email_bulk_operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    recipient_email = Column(String(150), nullable=False)
    ip_address = Column(String(45), nullable=True)
    device_type = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    retry_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
