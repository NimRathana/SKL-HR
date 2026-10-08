from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.enums.subscription_status import SubscriptionStatus
from app.schemas.pricing_plan_schema import PricingPlanResponse


class SubscriptionCreate(BaseModel):
    pricing_plan_id: UUID


class SubscriptionChange(BaseModel):
    pricing_plan_id: UUID


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID | None
    user_id: UUID | None
    pricing_plan_id: UUID | None
    plan_id: str
    billing_cycle: str
    status: SubscriptionStatus
    payment_status: str
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancelled_at: datetime | None
    cancel_at_period_end: bool
    billing_address: str | None
    created_at: datetime
    pricing_plan: PricingPlanResponse | None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    subscription_id: UUID
    plan_name: str
    amount_due: Decimal
    amount_paid: Decimal
    currency: str
    status: str
    billing_period_start: datetime
    billing_period_end: datetime
    external_reference: str | None
    created_at: datetime


class ResourceUsage(BaseModel):
    employees: int
    companies: int
    hr_users: int


class ResourceLimits(BaseModel):
    employees: int | None
    companies: int | None
    hr_users: int | None


class BillingSummary(BaseModel):
    subscription: SubscriptionResponse | None
    plan_type: str | None
    amount: Decimal | None
    currency: str | None
    billing_interval: str | None
    payment_status: str | None
    current_period_start: datetime | None
    current_period_end: datetime | None
    renews_at: datetime | None
    cancel_at_period_end: bool
    payment_method: str | None
    billing_address: str | None
    limits_plan_name: str | None
    limits: ResourceLimits | None
    usage: ResourceUsage | None