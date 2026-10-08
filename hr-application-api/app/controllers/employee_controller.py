from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_status import UserStatus
from app.enums.user_role import UserRole
from app.enums.employment_status import EmploymentStatus
from app.models.company import Company
from app.models.employee import Employee
from app.models.position import Position
from app.models.user import User
from app.schemas.employee_schema import EmployeeCreate, EmployeeUpdate
from app.controllers.access import assigned_company_exists, require_active_company, scope_companies
from app.services.plan_entitlements import enforce_resource_capacity, require_plan_feature


def _user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant user")
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")
    return user


def list_employees(auth_user_id: UUID, db: Session) -> list[Employee]:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Employee)
    if user.role != UserRole.ADMIN:
        query = query.filter(Employee.tenant_id == user.tenant_id)
    query = scope_companies(query, user, Employee.company_id)
    return query.order_by(Employee.created_at.desc()).all()


def create_employee(payload: EmployeeCreate, auth_user_id: UUID, db: Session) -> Employee:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    company_query = db.query(Company).filter(Company.id == payload.company_id)
    if user.role != UserRole.ADMIN:
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    company = company_query.first()
    if company is not None and not assigned_company_exists(user, company.id, db):
        company = None
    position = (
        db.query(Position)
        .join(Company, Position.company_id == Company.id)
        .filter(Position.id == payload.position_id, Position.company_id == payload.company_id)
        .first()
    )
    if company is None or position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company or position not found")
    require_active_company(company)
    enforce_resource_capacity(company.tenant_id, "employees", db)
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="First and last names are required")
    employee = Employee(
        tenant_id=company.tenant_id, company_id=company.id, position_id=position.id,
        first_name=first_name, last_name=last_name,
        gender=payload.gender, date_of_birth=payload.date_of_birth,
        phone=payload.phone.strip() if payload.phone else None, email=str(payload.email) if payload.email else None,
        address=payload.address.strip() if payload.address else None, hire_date=payload.hire_date,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(employee_id: UUID, payload: EmployeeUpdate, auth_user_id: UUID, db: Session) -> Employee:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Employee).filter(Employee.id == employee_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Employee.tenant_id == user.tenant_id)
    employee = query.first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    values = payload.model_dump(exclude_unset=True)
    company_id = values.get("company_id", employee.company_id)
    position_id = values.get("position_id", employee.position_id)
    company_query = db.query(Company).filter(Company.id == company_id)
    if user.role != UserRole.ADMIN:
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    company = company_query.first()
    position_query = db.query(Position).filter(Position.id == position_id, Position.company_id == company_id)
    if user.role != UserRole.ADMIN:
        position_query = position_query.join(Company, Position.company_id == Company.id).filter(Company.tenant_id == user.tenant_id)
    position = position_query.first()
    if company is None or position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company or position not found")
    require_active_company(company)
    if (
        values.get("employment_status") == EmploymentStatus.ACTIVE
        and employee.employment_status != EmploymentStatus.ACTIVE
    ):
        enforce_resource_capacity(company.tenant_id, "employees", db)

    first_name = values.get("first_name", employee.first_name).strip()
    last_name = values.get("last_name", employee.last_name).strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="First and last names are required")

    employee.company_id = company.id
    employee.position_id = position.id
    employee.first_name = first_name
    employee.last_name = last_name
    for field in ("gender", "date_of_birth", "hire_date", "employment_status"):
        if field in values:
            setattr(employee, field, values[field])
    for field in ("phone", "address"):
        if field in values:
            setattr(employee, field, values[field].strip() if values[field] else None)
    if "email" in values:
        employee.email = str(values["email"]) if values["email"] else None
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(employee_id: UUID, auth_user_id: UUID, db: Session) -> None:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    query = db.query(Employee).filter(Employee.id == employee_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(Employee.tenant_id == user.tenant_id)
    employee = query.first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    db.delete(employee)
    db.commit()


def bulk_delete_employees(employee_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    user = _user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employee_management", db)
    ids = list(dict.fromkeys(employee_ids))
    query = db.query(Employee).filter(Employee.id.in_(ids))
    if user.role != UserRole.ADMIN:
        query = query.filter(Employee.tenant_id == user.tenant_id)
    employees = {employee.id: employee for employee in query.all()}
    missing = [str(employee_id) for employee_id in ids if employee_id not in employees]
    if missing:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Employee not found", "ids": missing})

    for employee in employees.values():
        db.delete(employee)
    db.commit()
    return {"requested": len(employee_ids), "deleted": len(ids), "deleted_ids": ids}
