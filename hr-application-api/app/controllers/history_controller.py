from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_status import UserStatus
from app.enums.user_role import UserRole
from app.models.company import Company
from app.models.employee import Employee
from app.models.employment_history import EmploymentHistory
from app.models.position import Position
from app.models.salary_history import SalaryHistory
from app.models.user import User
from app.schemas.history_schema import EmploymentHistoryCreate, EmploymentHistoryUpdate, SalaryHistoryCreate, SalaryHistoryUpdate
from app.controllers.access import assigned_company_exists, require_active_company, scope_companies
from app.services.plan_entitlements import require_plan_feature


def _tenant_user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant user")
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")
    return user


def list_employment_histories(auth_user_id: UUID, db: Session, employee_id: UUID | None = None):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employment_history", db)
    query = db.query(EmploymentHistory)
    if user.role != UserRole.ADMIN:
        query = query.filter(EmploymentHistory.tenant_id == user.tenant_id)
        query = scope_companies(query, user, EmploymentHistory.company_id)
    if employee_id:
        query = query.filter(EmploymentHistory.employee_id == employee_id)
    return query.order_by(EmploymentHistory.start_date.desc(), EmploymentHistory.created_at.desc()).all()


def create_employment_history(payload: EmploymentHistoryCreate, auth_user_id: UUID, db: Session):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employment_history", db)
    employee_query = db.query(Employee).filter(Employee.id == payload.employee_id)
    company_query = db.query(Company).filter(Company.id == payload.company_id)
    if user.role != UserRole.ADMIN:
        employee_query = employee_query.filter(Employee.tenant_id == user.tenant_id)
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    employee = employee_query.first()
    company = company_query.first()
    if company is not None and not assigned_company_exists(user, company.id, db):
        company = None
    position = db.query(Position).filter(
        Position.id == payload.position_id, Position.company_id == payload.company_id
    ).first()
    if employee is None or company is None or position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee, company, or position not found")
    require_active_company(company)
    if user.role == UserRole.HR and not assigned_company_exists(user, company.id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee, company, or position not found")
    if employee.position_id != position.id and payload.start_date < employee.hire_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Start date cannot precede hire date")
    if payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date cannot precede start date")
    history = EmploymentHistory(tenant_id=employee.tenant_id, **payload.model_dump())
    db.add(history)
    employee.company_id = company.id
    employee.position_id = position.id
    db.commit()
    db.refresh(history)
    return history


def list_salary_histories(auth_user_id: UUID, db: Session, employee_id: UUID | None = None):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "salary_history", db)
    query = db.query(SalaryHistory)
    if user.role != UserRole.ADMIN:
        query = query.filter(SalaryHistory.tenant_id == user.tenant_id)
    if user.role == UserRole.HR:
        query = query.join(Employee, SalaryHistory.employee_id == Employee.id)
        query = scope_companies(query, user, Employee.company_id)
    if employee_id:
        query = query.filter(SalaryHistory.employee_id == employee_id)
    return query.order_by(SalaryHistory.effective_date.desc(), SalaryHistory.created_at.desc()).all()


def create_salary_history(payload: SalaryHistoryCreate, auth_user_id: UUID, db: Session):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "salary_history", db)
    employee_query = db.query(Employee).filter(Employee.id == payload.employee_id)
    if user.role != UserRole.ADMIN:
        employee_query = employee_query.filter(Employee.tenant_id == user.tenant_id)
    employee = employee_query.first()
    if employee is not None and user.role == UserRole.HR and not assigned_company_exists(user, employee.company_id, db):
        employee = None
    approver_query = db.query(User).filter(
        User.id == payload.approved_by, User.status == UserStatus.ACTIVE,
        User.role == UserRole.OWNER,
    )
    if employee is not None:
        approver_query = approver_query.filter(User.tenant_id == employee.tenant_id)
    approver = approver_query.first()
    if employee is None or approver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee or approver not found")
    employee_company = db.query(Company).filter(Company.id == employee.company_id).first()
    if employee_company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee company not found")
    require_active_company(employee_company)
    if payload.end_date and payload.end_date < payload.effective_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date cannot precede effective date")
    history = SalaryHistory(
        tenant_id=employee.tenant_id,
        currency=payload.currency.upper(),
        **{key: value for key, value in payload.model_dump().items() if key != "currency"},
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def update_employment_history(history_id: UUID, payload: EmploymentHistoryUpdate, auth_user_id: UUID, db: Session):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employment_history", db)
    query = db.query(EmploymentHistory).filter(EmploymentHistory.id == history_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(EmploymentHistory.tenant_id == user.tenant_id)
    history = query.first()
    if history is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employment history not found")
    values = payload.model_dump(exclude_unset=True)
    company_id = values.get("company_id", history.company_id)
    position_id = values.get("position_id", history.position_id)
    employee_query = db.query(Employee).filter(Employee.id == history.employee_id)
    company_query = db.query(Company).filter(Company.id == company_id)
    if user.role != UserRole.ADMIN:
        employee_query = employee_query.filter(Employee.tenant_id == user.tenant_id)
        company_query = company_query.filter(Company.tenant_id == user.tenant_id)
    employee = employee_query.first()
    company = company_query.first()
    position_query = db.query(Position).filter(Position.id == position_id, Position.company_id == company_id)
    if user.role != UserRole.ADMIN:
        position_query = position_query.join(Company, Position.company_id == Company.id).filter(Company.tenant_id == user.tenant_id)
    position = position_query.first()
    if employee is None or company is None or position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee, company, or position not found")
    require_active_company(company)
    if user.role == UserRole.HR and not assigned_company_exists(user, company.id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee, company, or position not found")
    start_date = values.get("start_date", history.start_date)
    end_date = values.get("end_date", history.end_date)
    if start_date < employee.hire_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Start date cannot precede hire date")
    if end_date and end_date < start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date cannot precede start date")
    for field, value in values.items():
        setattr(history, field, value)
    history.company_id = company.id
    history.position_id = position.id
    employee.company_id = company.id
    employee.position_id = position.id
    db.commit()
    db.refresh(history)
    return history


def delete_employment_history(history_id: UUID, auth_user_id: UUID, db: Session) -> None:
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employment_history", db)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employment history is retained and cannot be deleted")


def bulk_delete_employment_histories(history_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "employment_history", db)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employment history is retained and cannot be deleted")


def update_salary_history(history_id: UUID, payload: SalaryHistoryUpdate, auth_user_id: UUID, db: Session):
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "salary_history", db)
    query = db.query(SalaryHistory).filter(SalaryHistory.id == history_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(SalaryHistory.tenant_id == user.tenant_id)
    history = query.first()
    if history is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary history not found")
    values = payload.model_dump(exclude_unset=True)
    employee_query = db.query(Employee).filter(Employee.id == history.employee_id)
    if user.role != UserRole.ADMIN:
        employee_query = employee_query.filter(Employee.tenant_id == user.tenant_id)
    employee = employee_query.first()
    if employee is None or (user.role == UserRole.HR and not assigned_company_exists(user, employee.company_id, db)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    approver_id = values.get("approved_by", history.approved_by)
    approver_query = db.query(User).filter(
        User.id == approver_id,
        User.status == UserStatus.ACTIVE,
        User.role == UserRole.OWNER,
    )
    if user.role != UserRole.ADMIN:
        approver_query = approver_query.filter(User.tenant_id == user.tenant_id)
    if approver_query.first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approver not found")
    employee_company = db.query(Company).filter(Company.id == employee.company_id).first()
    if employee_company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee company not found")
    require_active_company(employee_company)
    effective_date = values.get("effective_date", history.effective_date)
    end_date = values.get("end_date", history.end_date)
    if end_date and end_date < effective_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date cannot precede effective date")
    for field, value in values.items():
        setattr(history, field, value.upper() if field == "currency" else value)
    db.commit()
    db.refresh(history)
    return history


def delete_salary_history(history_id: UUID, auth_user_id: UUID, db: Session) -> None:
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "salary_history", db)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Salary history is retained and cannot be deleted")


def bulk_delete_salary_histories(history_ids: list[UUID], auth_user_id: UUID, db: Session) -> dict:
    user = _tenant_user(auth_user_id, db)
    require_plan_feature(user.tenant_id, "salary_history", db)
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Salary history is retained and cannot be deleted")
