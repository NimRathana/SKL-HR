from sqlalchemy import Column, Text, String
from app.database.session import Base
from uuid6 import uuid7
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class SystemParameter(Base):
    __tablename__ = "system_parameters"
    id = Column(
            PG_UUID(as_uuid=True),
            primary_key=True,
            default=uuid7,
            nullable=False,
        )
    code = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    value = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    category = Column(String(150), nullable=True)