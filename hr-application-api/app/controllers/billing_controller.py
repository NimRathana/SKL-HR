from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_management_user
from app.controllers.subscription_controller import _active_or_pending
from app.enums.user_role import UserRole
from app.models.invoice import Invoice
from app.models.subscription import Subscription
from app.schemas.billing_schema import BillingSummary
from app.services.plan_entitlements import get_tenant_limit_summary


def get_billing_summary(auth_user_id: UUID, db: Session) -> BillingSummary:
    user = authorized_user(auth_user_id, db)
    require_management_user(user)
    subscription = _active_or_pending(user, db)
    plan = subscription.pricing_plan if subscription else None
    limit_summary = (
        get_tenant_limit_summary(user.tenant_id, db)
        if user.tenant_id is not None
        else None
    )
    return BillingSummary(
        subscription=subscription,
        plan_type=limit_summary["plan_type"] if limit_summary else plan.plan_type if plan else None,
        amount=plan.price if plan else None,
        currency=plan.currency if plan else None,
        billing_interval=plan.billing_interval if plan else None,
        payment_status=subscription.payment_status if subscription else None,
        current_period_start=subscription.current_period_start if subscription else None,
        current_period_end=subscription.current_period_end if subscription else None,
        renews_at=subscription.current_period_end if subscription and subscription.status == "active" else None,
        cancel_at_period_end=subscription.cancel_at_period_end if subscription else False,
        payment_method=("Stripe Checkout" if subscription and subscription.stripe_session_id else None),
        billing_address=subscription.billing_address if subscription else None,
        limits_plan_name=limit_summary["limits_plan_name"] if limit_summary else None,
        limits=limit_summary["limits"] if limit_summary else None,
        usage=limit_summary["usage"] if limit_summary else None,
    )


def list_invoices(auth_user_id: UUID, db: Session) -> list[Invoice]:
    user = authorized_user(auth_user_id, db)
    require_management_user(user)
    query = db.query(Invoice)
    if user.role != UserRole.ADMIN:
        query = query.filter(Invoice.tenant_id == user.tenant_id)
    return query.order_by(Invoice.created_at.desc()).all()