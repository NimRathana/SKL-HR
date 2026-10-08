from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    plan_id: str = Field(pattern="^(basic|medium|professional|enterprise)$")
    billing_cycle: str = Field(pattern="^(monthly|yearly)$")
    tenant_name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=150)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=50)
    billing_address: str | None = Field(default=None, max_length=5000)


class CheckoutResponse(BaseModel):
    subscription_id: UUID
    plan_id: str
    billing_cycle: str
    status: str
    message: str
    payment_url: str
    created_at: datetime
