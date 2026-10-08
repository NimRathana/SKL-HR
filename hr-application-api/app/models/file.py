from uuid6 import uuid7

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


class File(Base):
    __tablename__ = "files"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
        nullable=False,
    )

    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        unique=True,
    )

    file_name = Column(
        String(255),
        nullable=False,
    )

    file_path = Column(
        String(500),
        nullable=True,
    )

    file_type = Column(
        String,
        nullable=True,
    )

    file_category = Column(
        String(50),
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

    user = relationship(
        "User",
        back_populates="profile_image_file",
    )