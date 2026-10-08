from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.enums.company_status import CompanyStatus


class PositionCreate(BaseModel):
    company_id: UUID
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=5000)


class PositionUpdate(BaseModel):
    company_id: UUID | None = None
    code: str | None = Field(default=None, min_length=1, max_length=50)
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=5000)


class PositionResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    title: str
    description: str | None = None
    status: CompanyStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
