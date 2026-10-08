from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUPPORTED_CURRENCIES = {
    "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "INR", "JPY", "KHR",
    "MYR", "NZD", "SGD", "THB", "USD",
}


class PricingPlanFields(BaseModel):
    plan_type: str = Field(min_length=1, max_length=32, pattern="^[a-z][a-z0-9_]*$")
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    billing_interval: Literal["monthly", "yearly"]
    max_employees: int | None = Field(default=None, ge=0)
    max_companies: int | None = Field(default=None, ge=0)
    max_hr_users: int | None = Field(default=None, ge=0)
    features: dict[str, bool] = Field(default_factory=dict)

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        normalized = str(value).upper()
        if normalized not in SUPPORTED_CURRENCIES:
            raise ValueError("Currency must be a supported ISO 4217 code")
        return normalized


class PricingPlanCreate(PricingPlanFields):
    pass


class PricingPlanUpdate(BaseModel):
    plan_type: str | None = Field(default=None, min_length=1, max_length=32, pattern="^[a-z][a-z0-9_]*$")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    billing_interval: Literal["monthly", "yearly"] | None = None
    max_employees: int | None = Field(default=None, ge=0)
    max_companies: int | None = Field(default=None, ge=0)
    max_hr_users: int | None = Field(default=None, ge=0)
    features: dict[str, bool] | None = None
    is_active: bool | None = None

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = str(value).upper()
        if normalized not in SUPPORTED_CURRENCIES:
            raise ValueError("Currency must be a supported ISO 4217 code")
        return normalized


class PricingPlanResponse(PricingPlanFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool


class PricingPlanActivation(BaseModel):
    is_active: bool