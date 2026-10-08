from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from typing import Optional


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    user_name: str
    email: str
    role: str
    status: str


class RegistrationResponse(BaseModel):
    message: str
    email: str


class VerifyRegistrationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    verification_code: str = Field(min_length=6, max_length=6)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_complexity(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include an uppercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include a number")
        if not any(not char.isalnum() for char in value):
            raise ValueError("Password must include a symbol")
        return value


class LoginHistoryResponse(BaseModel):
    id: UUID
    ip_address: str | None
    device_type: str
    browser: str | None
    device: str | None
    location: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SecurityEventResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    user_name: str | None
    user_email: str | None
    ip_address: str | None
    location: str | None
    method: str
    endpoint: str
    status_code: int | None
    reason: str
    action: str
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
