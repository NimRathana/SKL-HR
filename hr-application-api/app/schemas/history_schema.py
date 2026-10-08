from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.enums.employment_history_status import EmploymentHistoryStatus
from app.enums.employment_type import EmploymentType
from app.enums.salary_type import SalaryType


class EmploymentHistoryCreate(BaseModel):
    employee_id: UUID
    company_id: UUID
    position_id: UUID
    employment_type: EmploymentType
    start_date: date
    end_date: date | None = None
    status: EmploymentHistoryStatus = EmploymentHistoryStatus.ACTIVE
    reason: str | None = Field(default=None, max_length=5000)


class EmploymentHistoryUpdate(BaseModel):
    company_id: UUID | None = None
    position_id: UUID | None = None
    employment_type: EmploymentType | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: EmploymentHistoryStatus | None = None
    reason: str | None = Field(default=None, max_length=5000)


class EmploymentHistoryResponse(EmploymentHistoryCreate):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SalaryHistoryCreate(BaseModel):
    employee_id: UUID
    salary_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(min_length=3, max_length=3)
    salary_type: SalaryType
    effective_date: date
    end_date: date | None = None
    reason: str | None = Field(default=None, max_length=255)
    approved_by: UUID


class SalaryHistoryUpdate(BaseModel):
    salary_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    salary_type: SalaryType | None = None
    effective_date: date | None = None
    end_date: date | None = None
    reason: str | None = Field(default=None, max_length=255)
    approved_by: UUID | None = None


class SalaryHistoryResponse(SalaryHistoryCreate):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
