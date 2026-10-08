from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.models.company import Company
from app.models.position import Position
from app.models.user import User
from app.schemas.position_schema import PositionCreate, PositionUpdate
from app.controllers.access import assigned_company_exists, require_active_company, scope_companies
from app.services.plan_entitlements import require_plan_feature


def _user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant user")
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")
    return user


def list_positions(auth_user_id: UUID, db: Session) -> list[Position]:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Position).join(Company, Position.company_id == Company.id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Company.tenant_id == user.tenant_id)
    query = scope_companies(query, user, Position.company_id)
    return query.order_by(Position.created_at.desc()).all()


def create_position(payload: PositionCreate, auth_user_id: UUID, db: Session) -> Position:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    company_query = db.query(Company).filter(Company.id == payload.company_id)
    if user.role != UserRole.ADMIN:
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    company = company_query.first()
    if company is not None and not assigned_company_exists(user, company.id, db):
        company = None
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    require_active_company(company)
    code = payload.code.strip()
    title = payload.title.strip()
    if not code or not title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Position code and title are required")
    if db.query(Position).filter(Position.company_id == company.id, Position.code == code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Position code is already assigned")
    position = Position(company_id=company.id, code=code, title=title, description=payload.description.strip() if payload.description else None)
    db.add(position)
    db.commit()
    db.refresh(position)
    return position


def update_position(position_id: UUID, payload: PositionUpdate, auth_user_id: UUID, db: Session) -> Position:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Position).join(Company, Position.company_id == Company.id).filter(Position.id == position_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Company.tenant_id == user.tenant_id)
    query = scope_companies(query, user, Position.company_id)
    position = query.first()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")

    values = payload.model_dump(exclude_unset=True)
    company_id = values.get("company_id", position.company_id)
    company_query = db.query(Company).filter(Company.id == company_id)
    if user.role != UserRole.ADMIN:
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    company = company_query.first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    require_active_company(company)
    code = values.get("code", position.code).strip()
    title = values.get("title", position.title).strip()
    if not code or not title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Position code and title are required")
    duplicate = db.query(Position).filter(Position.company_id == company.id, Position.code == code, Position.id != position.id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Position code is already assigned")
    position.company_id = company.id
    position.code = code
    position.title = title
    if "description" in values:
        position.description = values["description"].strip() if values["description"] else None
    db.commit()
    db.refresh(position)
    return position


def delete_position(position_id: UUID, auth_user_id: UUID, db: Session) -> None:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Position).join(Company, Position.company_id == Company.id).filter(Position.id == position_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Company.tenant_id == user.tenant_id)
    position = query.first()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    if position.employees or position.employment_histories:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Position is in use and cannot be deleted")
    db.delete(position)
    db.commit()


def bulk_delete_positions(position_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    ids = list(dict.fromkeys(position_ids))
    query = db.query(Position).join(Company, Position.company_id == Company.id).filter(Position.id.in_(ids))
    if user.role != UserRole.ADMIN:
        query = query.filter(Company.tenant_id == user.tenant_id)
    positions = {position.id: position for position in query.all()}
    missing = [str(position_id) for position_id in ids if position_id not in positions]
    if missing:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Position not found", "ids": missing})

    conflicts = [str(position.id) for position in positions.values() if position.employees or position.employment_histories]
    if conflicts:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "Position is in use and cannot be deleted", "ids": conflicts},
        )

    for position in positions.values():
        db.delete(position)
    db.commit()
    return {"requested": len(position_ids), "deleted": len(ids), "deleted_ids": ids}
