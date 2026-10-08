from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.company_status import CompanyStatus
from app.enums.employment_status import EmploymentStatus
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.company import Company
from app.models.employee import Employee
from app.models.plan_type_catalog import PlanTypeCatalog
from app.models.pricing_plan import PricingPlan
from app.models.subscription import Subscription
from app.models.tenant import Tenant
from app.models.user import User


RESOURCE_LIMIT_FIELDS = {
    "employees": "max_employees",
    "companies": "max_companies",
    "hr_users": "max_hr_users",
}


def _lock_tenant(tenant_id: UUID, db: Session) -> Tenant:
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == tenant_id)
        .with_for_update()
        .first()
    )
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


def _period_expired(subscription: Subscription) -> bool:
    period_end = subscription.current_period_end
    if period_end is None:
        return False
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)
    return period_end <= datetime.now(timezone.utc)


def expire_subscription_if_due(subscription: Subscription, db: Session) -> bool:
    if subscription.status != "active" or not _period_expired(subscription):
        return False

    tenant = None
    if subscription.tenant_id is not None:
        tenant = _lock_tenant(subscription.tenant_id, db)
    subscription.status = "expired"
    if tenant is not None:
        tenant.plan = "free"
    db.commit()
    return True


def _plan_for_code(code: str, db: Session) -> PricingPlan | None:
    plans = (
        db.query(PricingPlan)
        .join(PlanTypeCatalog, PricingPlan.plan_type == PlanTypeCatalog.code)
        .filter(
            PricingPlan.plan_type == code,
            PricingPlan.is_active.is_(True),
            PlanTypeCatalog.is_active.is_(True),
        )
        .all()
    )
    return next(
        (plan for plan in plans if plan.billing_interval == "monthly"),
        plans[0] if plans else None,
    )


def _effective_plan(
    tenant: Tenant,
    db: Session,
    expire_due_subscription: bool = True,
) -> PricingPlan:
    current = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.status.in_(("active", "pending")),
        )
        .order_by(
            Subscription.status != "active",
            Subscription.created_at.desc(),
        )
        .first()
    )

    fallback_code = tenant.plan or "free"
    if current is not None and current.status == "active":
        if _period_expired(current):
            if expire_due_subscription:
                current.status = "expired"
                tenant.plan = "free"
                db.flush()
            fallback_code = "free"
        else:
            current_plan = current.pricing_plan
            if current_plan is not None:
                return current_plan
            legacy_plan = (
                db.query(PricingPlan)
                .filter(
                    PricingPlan.plan_type == current.plan_id,
                    PricingPlan.billing_interval == current.billing_cycle,
                )
                .first()
            )
            if legacy_plan is not None:
                return legacy_plan
    elif current is None:
        latest = (
            db.query(Subscription)
            .filter(Subscription.tenant_id == tenant.id)
            .order_by(Subscription.created_at.desc())
            .first()
        )
        if latest is not None and latest.status in ("cancelled", "expired"):
            fallback_code = "free"

    plan = _plan_for_code(fallback_code, db)
    if plan is None and fallback_code != "free":
        plan = _plan_for_code("free", db)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active pricing plan is configured for this tenant",
        )
    return plan


def _usage_counts(tenant_id: UUID, db: Session) -> dict[str, int]:
    return {
        "employees": db.query(Employee.id).filter(
            Employee.tenant_id == tenant_id,
            Employee.employment_status == EmploymentStatus.ACTIVE,
        ).count(),
        "companies": db.query(Company.id).filter(
            Company.tenant_id == tenant_id,
            Company.status == CompanyStatus.ACTIVE,
        ).count(),
        "hr_users": db.query(User.id).filter(
            User.tenant_id == tenant_id,
            User.role == UserRole.HR,
            User.status == UserStatus.ACTIVE,
        ).count(),
    }


def get_tenant_limit_summary(tenant_id: UUID, db: Session) -> dict:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    plan = _effective_plan(tenant, db, expire_due_subscription=False)
    return {
        "plan_type": plan.plan_type,
        "limits_plan_name": plan.name,
        "limits": {
            "employees": plan.max_employees,
            "companies": plan.max_companies,
            "hr_users": plan.max_hr_users,
        },
        "usage": _usage_counts(tenant_id, db),
    }


def enforce_plan_limits(
    tenant_id: UUID,
    db: Session,
    plan: PricingPlan | None = None,
    additions: dict[str, int] | None = None,
) -> None:
    tenant = _lock_tenant(tenant_id, db)
    selected_plan = plan or _effective_plan(tenant, db)
    usage = _usage_counts(tenant_id, db)
    additions = additions or {}

    for resource, field in RESOURCE_LIMIT_FIELDS.items():
        limit = getattr(selected_plan, field)
        projected_usage = usage[resource] + additions.get(resource, 0)
        if limit is not None and projected_usage > limit:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Tenant limit exceeded for {resource.replace('_', ' ')}: "
                    f"{usage[resource]} active, {additions.get(resource, 0)} requested, "
                    f"plan limit is {limit}"
                ),
            )


def enforce_resource_capacity(
    tenant_id: UUID,
    resource: str,
    db: Session,
    additions: int = 1,
) -> None:
    if resource not in RESOURCE_LIMIT_FIELDS:
        raise ValueError(f"Unsupported limited resource: {resource}")
    enforce_plan_limits(tenant_id, db, additions={resource: additions})


def require_plan_feature(tenant_id: UUID | None, feature: str, db: Session) -> None:
    if tenant_id is None:
        return
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    plan = _effective_plan(tenant, db, expire_due_subscription=False)
    if not (plan.features or {}).get(feature, False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"The {feature.replace('_', ' ')} feature is not included in the tenant's current plan",
        )
