import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.models.plan_type_catalog import PlanTypeCatalog
from app.models.pricing_plan import PricingPlan
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.plan_type_schema import PlanTypeCreate, PlanTypeUpdate


def _require_admin(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can manage plan types")
    return user


def _make_code(name: str) -> str:
    code = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")[:32].rstrip("_")
    if not code:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Plan type name must contain letters or numbers")
    return code


def list_plan_types(
    db: Session,
    include_inactive: bool = False,
    auth_user_id: UUID | None = None,
) -> list[PlanTypeCatalog]:
    query = db.query(PlanTypeCatalog)
    if include_inactive:
        if auth_user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        _require_admin(auth_user_id, db)
    else:
        query = query.filter(PlanTypeCatalog.is_active.is_(True))
    return query.order_by(PlanTypeCatalog.sort_order, PlanTypeCatalog.name).all()


def get_plan_type(code: str, db: Session) -> PlanTypeCatalog:
    plan_type = db.query(PlanTypeCatalog).filter(
        PlanTypeCatalog.code == code,
        PlanTypeCatalog.is_active.is_(True),
    ).first()
    if plan_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan type not found")
    return plan_type


def create_plan_type(payload: PlanTypeCreate, auth_user_id: UUID, db: Session) -> PlanTypeCatalog:
    _require_admin(auth_user_id, db)
    plan_type = PlanTypeCatalog(
        code=_make_code(payload.name),
        name=payload.name.strip(),
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(plan_type)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A plan type with this name or code already exists") from exc
    db.refresh(plan_type)
    return plan_type


def update_plan_type(code: str, payload: PlanTypeUpdate, auth_user_id: UUID, db: Session) -> PlanTypeCatalog:
    _require_admin(auth_user_id, db)
    plan_type = db.query(PlanTypeCatalog).filter(PlanTypeCatalog.code == code).first()
    if plan_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan type not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None and key != "description":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Plan type fields cannot be null")
        setattr(plan_type, key, value.strip() if key == "name" and value is not None else value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A plan type with this name already exists") from exc
    db.refresh(plan_type)
    return plan_type


def set_plan_type_active(code: str, is_active: bool, auth_user_id: UUID, db: Session) -> PlanTypeCatalog:
    _require_admin(auth_user_id, db)
    plan_type = db.query(PlanTypeCatalog).filter(PlanTypeCatalog.code == code).first()
    if plan_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan type not found")
    if not is_active:
        active_offerings = db.query(PricingPlan.id).filter(
            PricingPlan.plan_type == code,
            PricingPlan.is_active.is_(True),
        ).count()
        if active_offerings:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Deactivate all active pricing plans for this type first",
            )
    plan_type.is_active = is_active
    db.commit()
    db.refresh(plan_type)
    return plan_type


def deactivate_plan_type(code: str, auth_user_id: UUID, db: Session) -> None:
    set_plan_type_active(code, False, auth_user_id, db)


def delete_plan_type(code: str, auth_user_id: UUID, db: Session) -> None:
    _require_admin(auth_user_id, db)
    plan_type = db.query(PlanTypeCatalog).filter(PlanTypeCatalog.code == code).first()
    if plan_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan type not found")

    pricing_plan_count = db.query(PricingPlan.id).filter(PricingPlan.plan_type == code).count()
    tenant_count = db.query(Tenant.id).filter(Tenant.plan == code).count()
    if pricing_plan_count or tenant_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Plan type is in use and cannot be deleted "
                f"({pricing_plan_count} pricing plans, {tenant_count} tenants reference it). Deactivate it instead."
            ),
        )

    db.delete(plan_type)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plan type is still referenced and cannot be deleted") from exc
