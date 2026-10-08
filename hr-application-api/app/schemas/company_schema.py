from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.enums.company_status import CompanyStatus


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=5000)
    address: str | None = Field(default=None, max_length=5000)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=70)
    website: str | None = Field(default=None, max_length=100)
    parent_id: UUID | None = None


class CompanyUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=5000)
    address: str | None = Field(default=None, max_length=5000)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=70)
    website: str | None = Field(default=None, max_length=100)
    parent_id: UUID | None = None


class CompanyStatusUpdate(BaseModel):
    status: CompanyStatus


class CompanyResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    parent_id: UUID | None = None
    name: str
    code: str
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    status: CompanyStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
