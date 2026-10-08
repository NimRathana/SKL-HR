from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums.employment_status import EmploymentStatus
from app.enums.gender import Gender


class EmployeeCreate(BaseModel):
    company_id: UUID
    position_id: UUID
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    gender: Gender
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=150)
    address: str | None = Field(default=None, max_length=5000)
    hire_date: date

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else None
        if not value:
            return None
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("A valid email is required")
        return value.lower()


class EmployeeUpdate(BaseModel):
    company_id: UUID | None = None
    position_id: UUID | None = None
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    gender: Gender | None = None
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=150)
    address: str | None = Field(default=None, max_length=5000)
    hire_date: date | None = None
    employment_status: EmploymentStatus | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else None
        if not value:
            return None
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("A valid email is required")
        return value.lower()


class EmployeeResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    company_id: UUID
    position_id: UUID
    first_name: str
    last_name: str
    gender: Gender
    date_of_birth: date | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    hire_date: date
    employment_status: EmploymentStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
