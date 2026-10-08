from uuid import UUID
import logging
from datetime import datetime, timedelta, timezone
from calendar import monthrange
from decimal import Decimal

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.dependencies.auth import enforce_read_only_user, get_db, verify_access_token
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.subscription import Subscription
from app.models.invoice import Invoice
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.subscription_schema import CheckoutRequest, CheckoutResponse
from app.schemas.billing_schema import SubscriptionChange, SubscriptionCreate, SubscriptionResponse
from app.controllers import subscription_controller
from app.utils.token import verify_token
from jose import jwt

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])
logger = logging.getLogger(__name__)
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _has_real_stripe_secret_key(value: str) -> bool:
    return value.startswith(("sk_test_", "sk_live_")) and "..." not in value


def _stripe_object_id(value) -> str | None:
    if value is None:
        return None
    return str(getattr(value, "id", value))


def _invoice_period(invoice) -> tuple[datetime | None, datetime | None]:
    lines = getattr(invoice, "lines", None)
    line_items = getattr(lines, "data", []) if lines is not None else []
    period = getattr(line_items[0], "period", None) if line_items else None
    if period is None:
        return None, None
    start = getattr(period, "start", None)
    end = getattr(period, "end", None)
    return (
        datetime.fromtimestamp(start, timezone.utc) if start else None,
        datetime.fromtimestamp(end, timezone.utc) if end else None,
    )


def _invoice_subscription_metadata(invoice) -> dict:
    parent = getattr(invoice, "parent", None)
    details = getattr(parent, "subscription_details", None) if parent else None
    return getattr(details, "metadata", None) or getattr(invoice, "metadata", None) or {}


def _optional_user_id(
    request: Request,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> UUID | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format")
    user_id = verify_token(token, db)
    enforce_read_only_user(request, user_id, db)
    return user_id


def _provision_subscription(
    subscription: Subscription,
    db: Session,
    stripe_subscription_id: str | None = None,
) -> User:
    if subscription.status not in ("pending", "active"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A cancelled or expired subscription cannot be activated")
    user = db.query(User).filter(User.id == subscription.user_id).first() if subscription.user_id else None
    if user is None:
        user = db.query(User).filter(User.email == subscription.tenant_email).first()
    if user is None:
        tenant = Tenant(name=subscription.tenant_name)
        user = User(
            tenant=tenant,
            name=subscription.tenant_name,
            email=subscription.tenant_email,
            phone=subscription.tenant_phone,
            password_hash=subscription.password_hash,
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        db.flush()
    target_tenant_id = subscription.tenant_id or user.tenant_id
    if target_tenant_id is not None:
        previous_subscriptions = db.query(Subscription).filter(
            Subscription.tenant_id == target_tenant_id,
            Subscription.status == "active",
            Subscription.id != subscription.id,
        ).all()
        for previous in previous_subscriptions:
            previous.status = "cancelled"
            previous.cancelled_at = datetime.now(timezone.utc)
            previous.cancel_at_period_end = False
        db.flush()

    if user.tenant is not None:
        user.tenant.plan = "medium" if subscription.plan_id == "professional" else subscription.plan_id
    if stripe_subscription_id:
        subscription.stripe_subscription_id = stripe_subscription_id
    subscription.tenant_id = user.tenant_id
    subscription.user_id = user.id
    subscription.status = "active"
    was_paid = subscription.payment_status == "paid"
    subscription.payment_status = "paid"
    now = datetime.now(timezone.utc)
    if not was_paid:
        subscription.current_period_start = now
        if subscription.billing_cycle == "yearly":
            year = now.year + 1
            subscription.current_period_end = now.replace(
                year=year,
                day=min(now.day, monthrange(year, now.month)[1]),
            )
        else:
            month = now.month % 12 + 1
            year = now.year + (now.month == 12)
            subscription.current_period_end = now.replace(
                year=year,
                month=month,
                day=min(now.day, monthrange(year, month)[1]),
            )
    invoice = db.query(Invoice).filter(Invoice.subscription_id == subscription.id).first()
    if invoice is None:
        monthly_price = Decimal("49.00") if subscription.plan_id == "professional" else Decimal("19.00")
        amount = monthly_price if subscription.billing_cycle == "monthly" else monthly_price * Decimal("9.6")
        invoice = Invoice(
            subscription_id=subscription.id,
            tenant_id=subscription.tenant_id,
            user_id=subscription.user_id,
            plan_name=f"SKL HR {subscription.plan_id.title()} plan",
            amount_due=amount,
            amount_paid=amount,
            currency="USD",
            status="paid",
            billing_period_start=subscription.current_period_start,
            billing_period_end=subscription.current_period_end,
            external_reference=subscription.stripe_session_id,
        )
        db.add(invoice)
    else:
        invoice.status = "paid"
        invoice.amount_paid = invoice.amount_due
        invoice.billing_period_start = subscription.current_period_start
        invoice.billing_period_end = subscription.current_period_end
        invoice.external_reference = invoice.external_reference or subscription.stripe_session_id
    db.commit()
    db.refresh(user)
    return user


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=128),
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.create_subscription(auth_user_id, payload.pricing_plan_id, idempotency_key, db)


@router.get("/me", response_model=SubscriptionResponse | None)
def get_current_subscription(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.get_current_subscription(auth_user_id, db)


@router.get("/history", response_model=list[SubscriptionResponse])
def get_subscription_history(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.get_subscription_history(auth_user_id, db)


@router.post("/{subscription_id}/checkout", response_model=CheckoutResponse)
def create_subscription_checkout(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    subscription, plan = subscription_controller.prepare_subscription_checkout(subscription_id, auth_user_id, db)
    if not _has_real_stripe_secret_key(settings.STRIPE_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe checkout is not configured. Set a real STRIPE_SECRET_KEY in the backend .env file.",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY
    if subscription.stripe_session_id:
        try:
            existing_session = stripe.checkout.Session.retrieve(subscription.stripe_session_id)
        except stripe.error.StripeError as exc:
            logger.exception("Unable to retrieve Stripe checkout session %s", subscription.stripe_session_id)
            stripe_message = getattr(exc, "user_message", None) or "Stripe rejected the session lookup"
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=stripe_message) from exc
        if existing_session.status == "open" and existing_session.url:
            return CheckoutResponse(
                subscription_id=subscription.id,
                plan_id=subscription.plan_id,
                billing_cycle=subscription.billing_cycle,
                status=subscription.status,
                message="Complete payment to activate the subscription.",
                payment_url=existing_session.url,
                created_at=subscription.created_at,
            )

    cancel_url = settings.STRIPE_CANCEL_URL or f"{settings.APP_BASE_URL}/billing?payment=cancelled"
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer_email=subscription.tenant_email,
            line_items=[{
                "price_data": {
                    "currency": plan.currency.lower(),
                    "product_data": {"name": plan.name},
                    "unit_amount": int(Decimal(plan.price) * 100),
                    "recurring": {"interval": "year" if plan.billing_interval == "yearly" else "month"},
                },
                "quantity": 1,
            }],
            metadata={"subscription_id": str(subscription.id)},
            subscription_data={
                "metadata": {"local_subscription_id": str(subscription.id)},
            },
            success_url=_success_url(),
            cancel_url=cancel_url,
        )
    except stripe.error.StripeError as exc:
        logger.exception("Stripe checkout session creation failed for subscription %s", subscription.id)
        stripe_message = getattr(exc, "user_message", None) or "Stripe rejected the checkout request"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to create Stripe checkout session: {stripe_message}",
        ) from exc

    if not session.url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Stripe did not return a checkout URL")
    subscription.stripe_session_id = session.id
    subscription.payment_status = "checkout_created"
    db.commit()
    db.refresh(subscription)
    return CheckoutResponse(
        subscription_id=subscription.id,
        plan_id=subscription.plan_id,
        billing_cycle=subscription.billing_cycle,
        status=subscription.status,
        message="Checkout created. Complete payment to activate the subscription.",
        payment_url=session.url,
        created_at=subscription.created_at,
    )


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.get_subscription(subscription_id, auth_user_id, db)


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def change_subscription(
    subscription_id: UUID,
    payload: SubscriptionChange,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.change_subscription(subscription_id, payload.pricing_plan_id, auth_user_id, db)


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.cancel_subscription(subscription_id, auth_user_id, db)


@router.post("/{subscription_id}/reactivate", response_model=SubscriptionResponse)
def reactivate_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return subscription_controller.reactivate_subscription(subscription_id, auth_user_id, db)


def _success_url() -> str:
    base = settings.STRIPE_SUCCESS_URL or f"{settings.APP_BASE_URL}/checkout/success"
    if "session_id=" in base:
        return base
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}session_id={{CHECKOUT_SESSION_ID}}"


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
def create_checkout(
    payload: CheckoutRequest,
    auth_user_id: UUID | None = Depends(_optional_user_id),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    user = db.query(User).filter(User.id == auth_user_id).first() if auth_user_id else None
    if auth_user_id and user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user was not found")
    if user is not None and user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive accounts cannot start checkout")
    if user is not None and user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a tenant owner can start subscription checkout")
    if user is not None and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant owner is not assigned to a tenant")

    if payload.plan_id == "enterprise":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enterprise checkout requires a sales-assisted subscription",
        )

    if not _has_real_stripe_secret_key(settings.STRIPE_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe checkout is not configured. Set a real STRIPE_SECRET_KEY in the backend .env file.",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY
    if user is None and not payload.password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password is required for a new account")
    account_name = (payload.tenant_name).strip()

    subscription = Subscription(
        tenant_id=user.tenant_id if user else None,
        user_id=user.id if user else None,
        plan_id=payload.plan_id,
        billing_cycle=payload.billing_cycle,
        tenant_name=account_name,
        tenant_email=payload.email.strip().lower(),
        tenant_phone=payload.phone,
        billing_address=payload.billing_address,
        password_hash=password_context.hash(payload.password) if user is None else None,
        status="pending",
    )
    db.add(subscription)
    db.flush()

    success_url = _success_url()
    cancel_url = settings.STRIPE_CANCEL_URL or f"{settings.APP_BASE_URL}/checkout?plan={payload.plan_id}&payment=cancelled"

    try:
        monthly_amount = 19 if payload.plan_id == "basic" else 49
        amount = monthly_amount * 100
        if payload.billing_cycle == "yearly":
            amount = int(monthly_amount * 0.8 * 12 * 100)

        session = stripe.checkout.Session.create(
            mode="subscription",
            customer_email=payload.email.strip().lower(),
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"SKL HR {payload.plan_id.title()} plan"},
                    "unit_amount": amount,
                    "recurring": {"interval": "year" if payload.billing_cycle == "yearly" else "month"},
                },
                "quantity": 1,
            }],
            metadata={"subscription_id": str(subscription.id)},
            subscription_data={
                "metadata": {"local_subscription_id": str(subscription.id)},
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except stripe.error.StripeError as exc:
        db.rollback()
        logger.exception("Stripe checkout session creation failed")
        stripe_message = getattr(exc, "user_message", None) or "Stripe rejected the checkout request"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to create Stripe checkout session: {stripe_message}",
        ) from exc

    if not session.url:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a checkout URL",
        )

    subscription.stripe_session_id = session.id
    subscription.payment_status = "checkout_created"
    db.commit()
    db.refresh(subscription)

    return CheckoutResponse(
        subscription_id=subscription.id,
        plan_id=subscription.plan_id,
        billing_cycle=subscription.billing_cycle,
        status=subscription.status,
        message="Checkout created. Complete payment to activate the subscription.",
        payment_url=session.url,
        created_at=subscription.created_at,
    )


@router.get("/checkout/complete")
def complete_checkout(session_id: str, db: Session = Depends(get_db)):
    if not _has_real_stripe_secret_key(settings.STRIPE_SECRET_KEY):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe checkout is not configured")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as exc:
        logger.exception("Unable to verify Stripe checkout session %s", session_id)
        stripe_message = getattr(exc, "user_message", None) or "Stripe rejected the session lookup"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to verify Stripe checkout: {stripe_message}",
        ) from exc

    if session.payment_status != "paid":
        logger.warning(
            "Stripe checkout session %s returned payment status %s",
            session_id,
            session.payment_status,
        )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Stripe payment is not complete yet. Please wait a moment and try again.",
        )

    metadata = session.metadata
    subscription_id = metadata["subscription_id"] if metadata and "subscription_id" in metadata else None
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if subscription is None:
        logger.error("No subscription found for Stripe checkout session %s", session_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription was not found")
    if subscription.status not in ("pending", "active"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A cancelled or expired subscription cannot be activated")
    account_user = (
        db.query(User).filter(User.id == subscription.user_id).first()
        if subscription.user_id
        else db.query(User).filter(User.email == subscription.tenant_email).first()
    )
    if account_user is not None and account_user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive accounts cannot upgrade plans")

    user = _provision_subscription(
        subscription,
        db,
        _stripe_object_id(getattr(session, "subscription", None)),
    )
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    token = jwt.encode(
        {"sub": str(user.id), "user_id": str(user.id), "exp": expires_at},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return {"access_token": token, "user_id": str(user.id), "user_name": user.name, "email": user.email}


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not settings.STRIPE_WEBHOOK_SECRET or not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe webhook")

    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe webhook") from exc

    event_type = event["type"]
    event_object = event["data"]["object"]

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        metadata = getattr(event_object, "metadata", None) or {}
        subscription_id = metadata.get("subscription_id")
        subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if subscription and subscription.status == "pending":
            _provision_subscription(
                subscription,
                db,
                _stripe_object_id(getattr(event_object, "subscription", None)),
            )
    elif event_type in {"invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed"}:
        parent = getattr(event_object, "parent", None)
        subscription_details = getattr(parent, "subscription_details", None) if parent else None
        stripe_subscription_id = _stripe_object_id(
            getattr(event_object, "subscription", None)
            or getattr(subscription_details, "subscription", None)
        )
        metadata = _invoice_subscription_metadata(event_object)
        local_id = metadata.get("local_subscription_id") if hasattr(metadata, "get") else None
        query = db.query(Subscription)
        subscription = None
        if stripe_subscription_id:
            subscription = query.filter(
                Subscription.stripe_subscription_id == stripe_subscription_id
            ).first()
        if subscription is None and local_id:
            subscription = query.filter(Subscription.id == local_id).first()
            if subscription is not None and stripe_subscription_id:
                subscription.stripe_subscription_id = stripe_subscription_id

        if subscription is not None and subscription.status in ("pending", "active"):
            period_start, period_end = _invoice_period(event_object)
            if event_type in {"invoice.paid", "invoice.payment_succeeded"}:
                if subscription.status == "pending":
                    _provision_subscription(subscription, db, stripe_subscription_id)
                subscription.payment_status = "paid"
            else:
                subscription.payment_status = "failed"
            if period_start is not None:
                subscription.current_period_start = period_start
            if period_end is not None:
                subscription.current_period_end = period_end
            db.commit()
    elif event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
        stripe_subscription_id = _stripe_object_id(event_object)
        metadata = getattr(event_object, "metadata", None) or {}
        local_id = metadata.get("local_subscription_id") if hasattr(metadata, "get") else None
        query = db.query(Subscription)
        subscription = None
        if stripe_subscription_id:
            subscription = query.filter(
                Subscription.stripe_subscription_id == stripe_subscription_id
            ).first()
        if subscription is None and local_id:
            subscription = query.filter(Subscription.id == local_id).first()
            if subscription is not None and stripe_subscription_id:
                subscription.stripe_subscription_id = stripe_subscription_id
        if subscription is not None:
            if event_type == "customer.subscription.deleted":
                subscription.status = "expired"
                subscription.cancelled_at = datetime.now(timezone.utc)
                subscription.cancel_at_period_end = False
                if subscription.tenant_id is not None:
                    tenant = db.query(Tenant).filter(Tenant.id == subscription.tenant_id).first()
                    if tenant is not None:
                        tenant.plan = "free"
            else:
                subscription.cancel_at_period_end = bool(
                    getattr(event_object, "cancel_at_period_end", False)
                )
            current_period_start = getattr(event_object, "current_period_start", None)
            current_period_end = getattr(event_object, "current_period_end", None)
            if current_period_start is not None:
                subscription.current_period_start = datetime.fromtimestamp(
                    current_period_start, timezone.utc
                )
            if current_period_end is not None:
                subscription.current_period_end = datetime.fromtimestamp(
                    current_period_end, timezone.utc
                )
            db.commit()

    return {"received": True}
