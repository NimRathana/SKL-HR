from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.models.company import Company
from app.models.company_user import CompanyUser
from app.models.user import User
from app.controllers.access import require_active_company


def _manager(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    if user.tenant_id is None and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")
    if user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and owners can manage assignments")
    return user


def list_assignments(auth_user_id: UUID, db: Session) -> list[dict]:
    manager = _manager(auth_user_id, db)
    query = db.query(CompanyUser, User.name, Company.name).join(User, User.id == CompanyUser.user_id).join(Company, Company.id == CompanyUser.company_id)
    if manager.role != UserRole.ADMIN:
        query = query.filter(CompanyUser.tenant_id == manager.tenant_id)
    return [
        {"id": item.id, "user_id": item.user_id, "company_id": item.company_id, "tenant_id": item.tenant_id,
         "user_name": user_name, "company_name": company_name}
        for item, user_name, company_name in query.order_by(User.name, Company.name).all()
    ]


def create_assignment(payload, auth_user_id: UUID, db: Session) -> dict:
    manager = _manager(auth_user_id, db)
    target = db.query(User).filter(User.id == payload.user_id).first()
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if target is not None and target.role != UserRole.HR:
        raise HTTPException(status_code=400, detail="Companies can only be assigned to HR users")
    if target is not None and target.id == manager.id:
        raise HTTPException(status_code=400, detail="You cannot assign yourself to a company")
    if target is None or company is None or target.tenant_id != company.tenant_id:
        raise HTTPException(status_code=404, detail="User or company not found")
    require_active_company(company)
    if manager.role != UserRole.ADMIN and company.tenant_id != manager.tenant_id:
        raise HTTPException(status_code=404, detail="User or company not found")
    if db.query(CompanyUser).filter_by(user_id=target.id, company_id=company.id, tenant_id=company.tenant_id).first():
        raise HTTPException(status_code=409, detail="User is already assigned to this company")
    item = CompanyUser(tenant_id=company.tenant_id, user_id=target.id, company_id=company.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "user_id": item.user_id, "company_id": item.company_id, "tenant_id": item.tenant_id,
            "user_name": target.name, "company_name": company.name}


def assign_companies_to_user(user_id: UUID, company_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    manager = _manager(auth_user_id, db)
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role != UserRole.HR:
        raise HTTPException(status_code=400, detail="Companies can only be assigned to HR users")
    if target.id == manager.id:
        raise HTTPException(status_code=400, detail="You cannot assign yourself to a company")

    unique_company_ids = list(dict.fromkeys(company_ids))
    companies = db.query(Company).filter(Company.id.in_(unique_company_ids)).all()
    if len(companies) != len(unique_company_ids):
        raise HTTPException(status_code=404, detail="One or more companies were not found")
    if target.tenant_id is None or any(company.tenant_id != target.tenant_id for company in companies):
        raise HTTPException(status_code=404, detail="User or company not found")
    if manager.role != UserRole.ADMIN and target.tenant_id != manager.tenant_id:
        raise HTTPException(status_code=404, detail="User or company not found")

    for company in companies:
        require_active_company(company)

    existing = {
        company_id
        for (company_id,) in db.query(CompanyUser.company_id)
        .filter(CompanyUser.user_id == target.id, CompanyUser.company_id.in_(unique_company_ids))
        .all()
    }
    items = [
        CompanyUser(tenant_id=target.tenant_id, user_id=target.id, company_id=company.id)
        for company in companies
        if company.id not in existing
    ]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)

    return {
        "created": [
            {"id": item.id, "user_id": item.user_id, "company_id": item.company_id, "tenant_id": item.tenant_id,
             "user_name": target.name, "company_name": next(company.name for company in companies if company.id == item.company_id)}
            for item in items
        ],
        "skipped": len(existing),
    }


def assign_users_to_company(company_id: UUID, user_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    manager = _manager(auth_user_id, db)
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    if manager.role != UserRole.ADMIN and company.tenant_id != manager.tenant_id:
        raise HTTPException(status_code=404, detail="Company not found")
    require_active_company(company)

    unique_user_ids = list(dict.fromkeys(user_ids))
    users = db.query(User).filter(User.id.in_(unique_user_ids)).all()
    if len(users) != len(unique_user_ids):
        raise HTTPException(status_code=404, detail="One or more users were not found")
    if any(user.role != UserRole.HR for user in users):
        raise HTTPException(status_code=400, detail="Companies can only be assigned to HR users")
    if any(user.id == manager.id for user in users):
        raise HTTPException(status_code=400, detail="You cannot assign yourself to a company")
    if any(user.tenant_id != company.tenant_id for user in users):
        raise HTTPException(status_code=404, detail="User or company not found")

    existing = {
        user_id
        for (user_id,) in db.query(CompanyUser.user_id)
        .filter(CompanyUser.company_id == company.id, CompanyUser.user_id.in_(unique_user_ids))
        .all()
    }
    items = [
        CompanyUser(tenant_id=company.tenant_id, user_id=user.id, company_id=company.id)
        for user in users
        if user.id not in existing
    ]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)

    user_names = {user.id: user.name for user in users}
    return {
        "created": [
            {"id": item.id, "user_id": item.user_id, "company_id": item.company_id, "tenant_id": item.tenant_id,
             "user_name": user_names[item.user_id], "company_name": company.name}
            for item in items
        ],
        "skipped": len(existing),
    }


def update_assignment(assignment_id: UUID, payload, auth_user_id: UUID, db: Session) -> dict:
    manager = _manager(auth_user_id, db)
    item = db.query(CompanyUser).filter(CompanyUser.id == assignment_id).first()
    target = db.query(User).filter(User.id == payload.user_id).first()
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if item is None or target is None or company is None:
        raise HTTPException(status_code=404, detail="Assignment, user, or company not found")
    if target.role != UserRole.HR:
        raise HTTPException(status_code=400, detail="Companies can only be assigned to HR users")
    if target.id == manager.id:
        raise HTTPException(status_code=400, detail="You cannot assign yourself to a company")
    if manager.role != UserRole.ADMIN and item.tenant_id != manager.tenant_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if target.tenant_id != company.tenant_id or (
        manager.role != UserRole.ADMIN and company.tenant_id != manager.tenant_id
    ):
        raise HTTPException(status_code=404, detail="User or company not found")
    require_active_company(company)
    duplicate = db.query(CompanyUser).filter(
        CompanyUser.user_id == target.id,
        CompanyUser.company_id == company.id,
        CompanyUser.tenant_id == company.tenant_id,
        CompanyUser.id != item.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="User is already assigned to this company")
    item.user_id = target.id
    item.company_id = company.id
    item.tenant_id = company.tenant_id
    db.commit()
    db.refresh(item)
    return {"id": item.id, "user_id": item.user_id, "company_id": item.company_id, "tenant_id": item.tenant_id,
            "user_name": target.name, "company_name": company.name}


def delete_assignment(assignment_id: UUID, auth_user_id: UUID, db: Session) -> None:
    manager = _manager(auth_user_id, db)
    item = db.query(CompanyUser).filter(CompanyUser.id == assignment_id).first()
    if item is None or (manager.role != UserRole.ADMIN and item.tenant_id != manager.tenant_id):
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(item)
    db.commit()


def bulk_delete_assignments(assignment_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    manager = _manager(auth_user_id, db)
    ids = list(dict.fromkeys(assignment_ids))
    query = db.query(CompanyUser).filter(CompanyUser.id.in_(ids))
    if manager.role != UserRole.ADMIN:
        query = query.filter(CompanyUser.tenant_id == manager.tenant_id)
    assignments = query.all()
    found_ids = {item.id for item in assignments}
    missing = [str(item_id) for item_id in ids if item_id not in found_ids]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Assignment not found", "ids": missing},
        )
    for item in assignments:
        db.delete(item)
    db.commit()
    return {"requested": len(ids), "deleted": len(assignments), "deleted_ids": ids}
