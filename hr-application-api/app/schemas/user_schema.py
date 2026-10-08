from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserResponseInfo(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    role: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class TenantOwnerResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    tenant_name: str
    email: str
    status: str
    plan: str
    created_at: datetime


class UserProfileResponse(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    name: str
    email: str
    phone: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    role: str
    status: str
    user_preferences: dict[str, Any] | None = None
    user_preferences_available: bool = True
    profile_image: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: str | None = Field(default=None, min_length=3, max_length=150)
    phone: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = None
    address: str | None = Field(default=None, max_length=5000)

    model_config = ConfigDict(from_attributes=True)


class UserPreferencesUpdate(BaseModel):
    user_preferences: dict[str, Any]


class AccountDeletionRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
