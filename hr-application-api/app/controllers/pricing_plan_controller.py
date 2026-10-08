from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.models.pricing_plan import PricingPlan
from app.models.plan_type_catalog import PlanTypeCatalog
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.pricing_plan_schema import PricingPlanCreate, PricingPlanUpdate


def _require_admin(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can manage pricing plans")
    return user


def list_plans(
    db: Session,
    include_inactive: bool = False,
    auth_user_id: UUID | None = None,
) -> list[PricingPlan]:
    query = db.query(PricingPlan)
    if include_inactive:
        if auth_user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        _require_admin(auth_user_id, db)
    else:
        query = query.filter(PricingPlan.is_active.is_(True))
    return query.order_by(PricingPlan.price, PricingPlan.name).all()


def get_plan(plan_id: UUID, db: Session) -> PricingPlan:
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id, PricingPlan.is_active.is_(True)).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")
    return plan


def _require_active_type(plan_type: str, db: Session) -> PlanTypeCatalog:
    plan_type_record = db.query(PlanTypeCatalog).filter(
        PlanTypeCatalog.code == plan_type,
        PlanTypeCatalog.is_active.is_(True),
    ).first()
    if plan_type_record is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Plan type is not active or does not exist")
    return plan_type_record


def _ensure_offering_available(plan_type: str, interval: str, db: Session, exclude_id: UUID | None = None) -> None:
    query = db.query(PricingPlan.id).filter(
        PricingPlan.plan_type == plan_type,
        PricingPlan.billing_interval == interval,
    )
    if exclude_id is not None:
        query = query.filter(PricingPlan.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A {interval} offering already exists for this plan type",
        )


def create_plan(payload: PricingPlanCreate, auth_user_id: UUID, db: Session) -> PricingPlan:
    _require_admin(auth_user_id, db)
    _require_active_type(payload.plan_type, db)
    _ensure_offering_available(payload.plan_type, payload.billing_interval, db)
    plan_data = payload.model_dump()
    sibling = db.query(PricingPlan).filter(PricingPlan.plan_type == payload.plan_type).first()
    if sibling is not None:
        for field in ("max_employees", "max_companies", "max_hr_users"):
            plan_data[field] = getattr(sibling, field)
    plan = PricingPlan(**plan_data)
    db.add(plan)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pricing plan with this name already exists") from exc
    db.refresh(plan)
    return plan


def update_plan(plan_id: UUID, payload: PricingPlanUpdate, auth_user_id: UUID, db: Session) -> PricingPlan:
    _require_admin(auth_user_id, db)
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")
    changes = payload.model_dump(exclude_unset=True)
    nullable_fields = {"description", "max_employees", "max_companies", "max_hr_users"}
    if any(value is None for key, value in changes.items() if key not in nullable_fields):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Plan fields cannot be null")
    if changes.get("plan_type") and changes["plan_type"] != plan.plan_type:
        _require_active_type(changes["plan_type"], db)
    _ensure_offering_available(
        changes.get("plan_type", plan.plan_type),
        changes.get("billing_interval", plan.billing_interval),
        db,
        exclude_id=plan.id,
    )
    for key, value in changes.items():
        setattr(plan, key, value)
    limit_fields = ("max_employees", "max_companies", "max_hr_users")
    if any(field in changes for field in limit_fields):
        target_type = changes.get("plan_type", plan.plan_type)
        siblings = db.query(PricingPlan).filter(
            PricingPlan.plan_type == target_type,
            PricingPlan.id != plan.id,
        ).all()
        for sibling in siblings:
            for field in limit_fields:
                setattr(sibling, field, getattr(plan, field))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pricing plan with this name already exists") from exc
    db.refresh(plan)
    return plan


def set_plan_active(plan_id: UUID, is_active: bool, auth_user_id: UUID, db: Session) -> PricingPlan:
    _require_admin(auth_user_id, db)
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")
    plan.is_active = is_active
    db.commit()
    db.refresh(plan)
    return plan


def deactivate_plan(plan_id: UUID, auth_user_id: UUID, db: Session) -> None:
    set_plan_active(plan_id, False, auth_user_id, db)


def delete_plan(plan_id: UUID, auth_user_id: UUID, db: Session) -> None:
    _require_admin(auth_user_id, db)
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing plan not found")

    subscription_count = db.query(Subscription.id).filter(
        Subscription.pricing_plan_id == plan.id,
    ).count()
    if subscription_count:
        tenant_count = db.query(Subscription.tenant_id).filter(
            Subscription.pricing_plan_id == plan.id,
            Subscription.tenant_id.isnot(None),
        ).distinct().count()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Pricing plan is referenced by {subscription_count} subscription(s) "
                f"for {tenant_count} tenant(s) and cannot be deleted"
            ),
        )

    db.delete(plan)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pricing plan is still referenced and cannot be deleted",
        ) from exc