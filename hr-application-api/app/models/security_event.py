from uuid6 import uuid7

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.database.session import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7, nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    location = Column(String(255), nullable=True)
    method = Column(String(10), nullable=False)
    endpoint = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=True)
    reason = Column(Text, nullable=False)
    action = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_security_events_created_at", "created_at"),)
