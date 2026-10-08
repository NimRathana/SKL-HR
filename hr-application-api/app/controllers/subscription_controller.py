from calendar import monthrange
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_management_user
from app.enums.subscription_status import SubscriptionStatus
from app.enums.user_role import UserRole
from app.models.company import Company
from app.models.employee import Employee
from app.models.invoice import Invoice
from app.models.plan_type_catalog import PlanTypeCatalog
from app.models.pricing_plan import PricingPlan
from app.models.subscription import Subscription
from app.models.user import User
from app.models.tenant import Tenant
from app.services.plan_entitlements import (
    enforce_plan_limits,
    expire_subscription_if_due,
)


def _active_or_pending(user: User, db: Session) -> Subscription | None:
    query = db.query(Subscription).filter(
        Subscription.status.in_(
            [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PENDING.value]
        )
    )
    query = (
        query.filter(Subscription.tenant_id == user.tenant_id)
        if user.tenant_id
        else query.filter(Subscription.user_id == user.id)
    )
    current = query.order_by(
        Subscription.status != SubscriptionStatus.ACTIVE.value,
        Subscription.created_at.desc(),
    ).first()
    if current is not None and expire_subscription_if_due(current, db):
        return query.order_by(
            Subscription.status != SubscriptionStatus.ACTIVE.value,
            Subscription.created_at.desc(),
        ).first()
    return current

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _add_period(start: datetime, billing_cycle: str) -> datetime:
    if billing_cycle == "yearly":
        year, month = start.year + 1, start.month
    else:
        year, month = start.year + (start.month == 12), start.month % 12 + 1
    return start.replace(year=year, month=month, day=min(start.day, monthrange(year, month)[1]))


def _load_plan(plan_id: UUID, db: Session) -> PricingPlan:
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")
    if not plan.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pricing plan is inactive")
    if not plan.plan_type_definition.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pricing plan type is inactive")
    return plan


def _validate_plan_limits(tenant_id: UUID, plan: PricingPlan, db: Session) -> None:
    enforce_plan_limits(tenant_id, db, plan=plan)


def _create_record(user: User, plan: PricingPlan, idempotency_key: str | None, db: Session) -> Subscription:
    start = _now()
    end = _add_period(start, plan.billing_interval)
    is_free = Decimal(plan.price) == Decimal("0")
    subscription = Subscription(
        tenant_id=user.tenant_id,
        user_id=user.id,
        pricing_plan_id=plan.id,
        idempotency_key=idempotency_key,
        plan_id=plan.plan_type,
        billing_cycle=plan.billing_interval,
        tenant_name=user.tenant.name,
        tenant_email=user.email,
        tenant_phone=user.phone,
        status=SubscriptionStatus.ACTIVE.value if is_free else SubscriptionStatus.PENDING.value,
        payment_status="not_required" if is_free else "pending",
        current_period_start=start,
        current_period_end=end,
    )
    if is_free:
        user.tenant.plan = plan.plan_type
    db.add(subscription)
    db.flush()
    if not is_free:
        db.add(Invoice(
            subscription_id=subscription.id,
            tenant_id=user.tenant_id,
            user_id=user.id,
            plan_name=plan.name,
            amount_due=plan.price,
            amount_paid=Decimal("0"),
            currency=plan.currency,
            status="pending",
            billing_period_start=start,
            billing_period_end=end,
        ))
    return subscription


def _manager(auth_user_id: UUID, db: Session) -> User:
    user = authorized_user(auth_user_id, db)
    require_management_user(user)
    return user


def _subscription_for_user(subscription_id: UUID, user: User, db: Session) -> Subscription:
    query = db.query(Subscription).filter(Subscription.id == subscription_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Subscription.tenant_id == user.tenant_id)
    subscription = query.first()
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    return subscription


def _subscription_account_user(subscription: Subscription, acting_user: User, db: Session) -> User:
    if acting_user.role != UserRole.ADMIN:
        return acting_user
    account_user = db.query(User).filter(User.id == subscription.user_id).first() if subscription.user_id else None
    if account_user is None or account_user.tenant_id != subscription.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription owner not found")
    return account_user


def _active_or_pending(user: User, db: Session) -> Subscription | None:
    query = db.query(Subscription).filter(
        Subscription.status.in_([SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PENDING.value])
    )
    query = query.filter(Subscription.tenant_id == user.tenant_id) if user.tenant_id else query.filter(Subscription.user_id == user.id)
    current = query.order_by(
        Subscription.status != SubscriptionStatus.ACTIVE.value,
        Subscription.created_at.desc(),
    ).first()
    if current is not None and expire_subscription_if_due(current, db):
        return query.order_by(
            Subscription.status != SubscriptionStatus.ACTIVE.value,
            Subscription.created_at.desc(),
        ).first()
    return current


def create_subscription(
    auth_user_id: UUID,
    plan_id: UUID,
    idempotency_key: str | None,
    db: Session,
) -> Subscription:
    user = _manager(auth_user_id, db)
    if user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a tenant owner can subscribe to a plan")
    if user.tenant_id is None or user.tenant is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a tenant")
    if idempotency_key:
        prior = db.query(Subscription).filter(
            Subscription.tenant_id == user.tenant_id,
            Subscription.idempotency_key == idempotency_key,
        ).first()
        if prior:
            if prior.pricing_plan_id != plan_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Idempotency key was already used for another plan")
            return prior

    plan = _load_plan(plan_id, db)
    current = _active_or_pending(user, db)
    if current:
        if current.pricing_plan_id == plan.id:
            return current
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This tenant already has an active or pending subscription")
    _validate_plan_limits(user.tenant_id, plan, db)

    try:
        subscription = _create_record(user, plan, idempotency_key, db)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This tenant already has an active or pending subscription") from exc
    db.refresh(subscription)
    return subscription


def get_current_subscription(auth_user_id: UUID, db: Session) -> Subscription | None:
    user = authorized_user(auth_user_id, db)
    return _active_or_pending(user, db)


def get_subscription(subscription_id: UUID, auth_user_id: UUID, db: Session) -> Subscription:
    user = authorized_user(auth_user_id, db)
    return _subscription_for_user(subscription_id, user, db)


def prepare_subscription_checkout(
    subscription_id: UUID,
    auth_user_id: UUID,
    db: Session,
) -> tuple[Subscription, PricingPlan]:
    user = _manager(auth_user_id, db)
    if user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a tenant owner can start subscription checkout")
    subscription = _subscription_for_user(subscription_id, user, db)
    if subscription.status != SubscriptionStatus.PENDING.value or subscription.payment_status == "paid":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only unpaid pending subscriptions can enter checkout")
    if subscription.pricing_plan is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subscription has no catalog pricing plan")
    return subscription, subscription.pricing_plan


def get_subscription_history(auth_user_id: UUID, db: Session) -> list[Subscription]:
    user = authorized_user(auth_user_id, db)
    query = db.query(Subscription)
    if user.role != UserRole.ADMIN:
        query = query.filter(Subscription.tenant_id == user.tenant_id) if user.tenant_id else query.filter(Subscription.user_id == user.id)
    return query.order_by(Subscription.created_at.desc()).all()


def change_subscription(subscription_id: UUID, plan_id: UUID, auth_user_id: UUID, db: Session) -> Subscription:
    user = _manager(auth_user_id, db)
    subscription = _subscription_for_user(subscription_id, user, db)
    if expire_subscription_if_due(subscription, db):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subscription has expired")
    if subscription.status != SubscriptionStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only active subscriptions can be changed")
    plan = _load_plan(plan_id, db)
    if subscription.pricing_plan_id == plan.id:
        return subscription
    account_user = _subscription_account_user(subscription, user, db)
    _validate_plan_limits(subscription.tenant_id, plan, db)

    pending_subscriptions = db.query(Subscription).filter(
        Subscription.tenant_id == subscription.tenant_id,
        Subscription.status == SubscriptionStatus.PENDING.value,
        Subscription.id != subscription.id,
    ).all()
    for pending in pending_subscriptions:
        pending.status = SubscriptionStatus.CANCELLED.value
        pending.cancelled_at = _now()
        pending.cancel_at_period_end = False

    if Decimal(plan.price) == Decimal("0"):
        subscription.status = SubscriptionStatus.CANCELLED.value
        subscription.cancelled_at = _now()
        subscription.cancel_at_period_end = False

    try:
        db.flush()
        replacement = _create_record(account_user, plan, None, db)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to change this subscription") from exc
    db.refresh(replacement)
    return replacement


def cancel_subscription(subscription_id: UUID, auth_user_id: UUID, db: Session) -> Subscription:
    user = _manager(auth_user_id, db)
    subscription = _subscription_for_user(subscription_id, user, db)
    if expire_subscription_if_due(subscription, db):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subscription has expired")
    if subscription.status not in (SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PENDING.value):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only active or pending subscriptions can be cancelled")
    subscription.status = SubscriptionStatus.CANCELLED.value
    subscription.cancelled_at = _now()
    subscription.cancel_at_period_end = False
    if subscription.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == subscription.tenant_id).with_for_update().first()
        active_subscription = db.query(Subscription.id).filter(
            Subscription.tenant_id == subscription.tenant_id,
            Subscription.status == SubscriptionStatus.ACTIVE.value,
            Subscription.id != subscription.id,
        ).first()
        if tenant is not None and active_subscription is None:
            tenant.plan = "free"
    db.commit()
    db.refresh(subscription)
    return subscription


def reactivate_subscription(subscription_id: UUID, auth_user_id: UUID, db: Session) -> Subscription:
    user = _manager(auth_user_id, db)
    subscription = _subscription_for_user(subscription_id, user, db)
    if subscription.status != SubscriptionStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only cancelled subscriptions can be reactivated")
    period_end = subscription.current_period_end
    if period_end is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subscription has no remaining billing period")
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)
    if period_end <= _now():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The subscription billing period has expired")
    account_user = _subscription_account_user(subscription, user, db)
    current = _active_or_pending(account_user, db)
    if current and current.id != subscription.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This tenant already has an active or pending subscription")
    subscription.status = (
        SubscriptionStatus.PENDING.value
        if subscription.payment_status not in ("paid", "not_required")
        else SubscriptionStatus.ACTIVE.value
    )
    if subscription.status == SubscriptionStatus.ACTIVE.value and account_user.tenant is not None:
        account_user.tenant.plan = (
            subscription.pricing_plan.plan_type
            if subscription.pricing_plan is not None
            else "medium" if subscription.plan_id == "professional" else subscription.plan_id
        )
    subscription.cancelled_at = None
    subscription.cancel_at_period_end = False
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This tenant already has an active subscription") from exc
    db.refresh(subscription)
    return subscription