from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.enums.company_status import CompanyStatus
from app.models.user import User
from app.models.company import Company
from app.models.company_user import CompanyUser
from sqlalchemy import exists
from sqlalchemy.orm import Query


def authorized_user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        )
    if user.tenant_id is None and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is not assigned to a tenant",
        )
    return user


def require_management_user(user: User) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can perform this action",
        )
    return user


def require_active_company(company: Company) -> Company:
    if company.status != CompanyStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The company is inactive and does not accept new operations",
        )
    return company


def assigned_company_exists(user: User, company_id: UUID, db: Session) -> bool:
    if user.role in (UserRole.ADMIN, UserRole.OWNER):
        return True
    return db.query(CompanyUser.id).filter(
        CompanyUser.user_id == user.id,
        CompanyUser.tenant_id == user.tenant_id,
        CompanyUser.company_id == company_id,
    ).first() is not None


def scope_companies(query: Query, user: User, company_column) -> Query:
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        query = query.filter(exists().where(
            CompanyUser.user_id == user.id,
            CompanyUser.tenant_id == user.tenant_id,
            CompanyUser.company_id == company_column,
        ))
    return query
