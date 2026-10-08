from uuid import UUID

from pydantic import BaseModel, Field


class CompanyUserCreate(BaseModel):
    user_id: UUID
    company_id: UUID


class CompanyUserUpdate(BaseModel):
    user_id: UUID
    company_id: UUID


class CompanyUserResponse(BaseModel):
    id: UUID
    user_id: UUID
    company_id: UUID
    tenant_id: UUID
    user_name: str
    company_name: str


class AssignCompaniesRequest(BaseModel):
    company_ids: list[UUID] = Field(min_length=1, max_length=500)


class AssignUsersRequest(BaseModel):
    user_ids: list[UUID] = Field(min_length=1, max_length=500)


class BulkAssignmentResponse(BaseModel):
    created: list[CompanyUserResponse]
    skipped: int
