from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enums.company_status import CompanyStatus
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.company import Company
from app.models.user import User
from app.schemas.company_schema import CompanyCreate, CompanyUpdate
from app.controllers.access import require_management_user, scope_companies
from app.services.plan_entitlements import enforce_resource_capacity, require_plan_feature


def list_companies(auth_user_id: UUID, db: Session) -> list[Company]:
    user = _get_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Company)
    if user.role != UserRole.ADMIN:
        query = query.filter(Company.tenant_id == user.tenant_id)
        query = scope_companies(query, user, Company.id)
    return query.order_by(Company.created_at.desc()).all()


def create_company(payload: CompanyCreate, auth_user_id: UUID, db: Session) -> Company:
    user = _get_user(auth_user_id, db)
    require_management_user(user)
    if user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='A tenant is required before creating a company',
        )
    require_plan_feature(user.tenant_id, "employee_management", db)
    tenant_id = user.tenant_id
    name = payload.name.strip()
    code = payload.code.strip()
    if not name or not code:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Company name and code are required')

    _ensure_unique_company_fields(name, code, tenant_id, db)
    enforce_resource_capacity(tenant_id, "companies", db)

    if payload.parent_id is not None:
        _get_company(payload.parent_id, tenant_id, db)

    company = Company(
        tenant_id=tenant_id,
        parent_id=payload.parent_id,
        name=name,
        code=code,
        description=_clean(payload.description),
        address=_clean(payload.address),
        phone=_clean(payload.phone),
        email=_clean(payload.email),
        website=_clean(payload.website),
        status=CompanyStatus.ACTIVE,
    )
    db.add(company)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='A company with this name and code already exists')
    db.refresh(company)
    return company


def update_status(company_id: UUID, new_status: CompanyStatus, auth_user_id: UUID, db: Session) -> Company:
    user = _get_user(auth_user_id, db)
    require_management_user(user)
    require_plan_feature(user.tenant_id, "employee_management", db)
    company = _get_company(company_id, user.tenant_id, db, user.role == UserRole.ADMIN)
    if new_status == CompanyStatus.ACTIVE and company.status != CompanyStatus.ACTIVE:
        enforce_resource_capacity(company.tenant_id, "companies", db)
    company.status = new_status
    db.commit()
    db.refresh(company)
    return company


def update_company(company_id: UUID, payload: CompanyUpdate, auth_user_id: UUID, db: Session) -> Company:
    user = _get_user(auth_user_id, db)
    require_management_user(user)
    require_plan_feature(user.tenant_id, "employee_management", db)
    company = _get_company(company_id, user.tenant_id, db, user.role == UserRole.ADMIN)
    name = payload.name.strip()
    code = payload.code.strip()
    if not name or not code:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Company name and code are required')

    _ensure_unique_company_fields(name, code, company.tenant_id, db, company.id)

    if payload.parent_id is not None:
        _get_company(payload.parent_id, company.tenant_id, db, user.role == UserRole.ADMIN)
        if payload.parent_id == company.id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='A company cannot be its own parent')
        if _is_descendant(payload.parent_id, company.id, db):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='A company cannot be assigned under its descendant')

    company.name = name
    company.code = code
    company.parent_id = payload.parent_id
    company.description = _clean(payload.description)
    company.address = _clean(payload.address)
    company.phone = _clean(payload.phone)
    company.email = _clean(payload.email)
    company.website = _clean(payload.website)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='A company with this name and code already exists')
    db.refresh(company)
    return company


def _ensure_unique_company_fields(
    name: str,
    code: str,
    tenant_id: UUID,
    db: Session,
    company_id: UUID | None = None,
) -> None:
    query = db.query(Company).filter(Company.tenant_id == tenant_id)
    if company_id is not None:
        query = query.filter(Company.id != company_id)

    if query.filter(Company.name == name, Company.code == code).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='A company with this name and code already exists',
        )


def _get_user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid user')
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User is not assigned to a tenant')
    return user


def _get_company(company_id: UUID, tenant_id: UUID | None, db: Session, is_global_admin: bool = False) -> Company:
    query = db.query(Company).filter(Company.id == company_id)
    if not is_global_admin:
        query = query.filter(Company.tenant_id == tenant_id)
    company = query.first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Company not found')
    return company


def _is_descendant(company_id: UUID, ancestor_id: UUID, db: Session) -> bool:
    current = db.query(Company).filter(Company.id == company_id).first()
    visited = set()
    while current is not None and current.parent_id is not None:
        if current.id in visited:
            return True
        visited.add(current.id)
        if current.parent_id == ancestor_id:
            return True
        current = db.query(Company).filter(Company.id == current.parent_id).first()
    return False


def _clean(value: str | None) -> str | None:
    cleaned = value.strip() if value else None
    return cleaned or None
