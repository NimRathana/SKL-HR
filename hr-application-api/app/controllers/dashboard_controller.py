from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.enums.company_status import CompanyStatus
from app.enums.employment_status import EmploymentStatus
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.company import Company
from app.models.employee import Employee
from app.models.position import Position
from app.models.tenant import Tenant
from app.models.user import User


def get_summary(auth_user_id: UUID, db: Session) -> dict:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")

    def scoped(query, column):
        if user.role != UserRole.ADMIN:
            return query.filter(column == user.tenant_id)
        return query

    companies = scoped(db.query(Company), Company.tenant_id)
    employees = scoped(db.query(Employee), Employee.tenant_id)
    tenants = scoped(db.query(Tenant), Tenant.id)
    users = scoped(db.query(func.count(User.id)), User.tenant_id)
    positions = db.query(Position).join(Company, Position.company_id == Company.id)
    if user.role != UserRole.ADMIN:
        positions = positions.filter(Company.tenant_id == user.tenant_id)
    if user.role == UserRole.HR:
        from app.controllers.access import scope_companies
        companies = scope_companies(companies, user, Company.id)
        employees = scope_companies(employees, user, Employee.company_id)
        positions = scope_companies(positions, user, Position.company_id)

    recent_query = db.query(Employee, Company.name, Position.title).join(
        Company, Employee.company_id == Company.id
    ).join(
        Position, Employee.position_id == Position.id
    )
    if user.role != UserRole.ADMIN:
        recent_query = recent_query.filter(Employee.tenant_id == user.tenant_id)

    if user.role == UserRole.HR:
        recent_query = recent_query.filter(
            Employee.company_id.in_(
                db.query(Company.id).filter(Company.tenant_id == user.tenant_id)
            )
        )
        from app.models.company_user import CompanyUser
        recent_query = recent_query.filter(
            db.query(CompanyUser.id).filter(
                CompanyUser.user_id == user.id,
                CompanyUser.company_id == Employee.company_id,
            ).exists()
        )
    recent_query = (
        recent_query
        .order_by(Employee.created_at.desc())
        .limit(5)
    )

    gender_breakdown = [
        {"label": str(gender.value if gender else "unknown"), "value": count}
        for gender, count in employees.with_entities(Employee.gender, func.count(Employee.id)).group_by(Employee.gender).all()
    ]
    company_distribution = [
        {"label": name, "value": count}
        for name, count in employees.join(Company, Employee.company_id == Company.id)
        .with_entities(Company.name, func.count(Employee.id))
        .group_by(Company.name).order_by(func.count(Employee.id).desc()).limit(8).all()
    ]

    return {
        "companies": companies.count(),
        "active_companies": companies.filter(Company.status == CompanyStatus.ACTIVE).count(),
        "tenants": tenants.count(),
        "positions": positions.count(),
        "employees": employees.count(),
        "active_employees": employees.filter(Employee.employment_status == EmploymentStatus.ACTIVE).count(),
        "users": users.scalar(),
        "open_roles": positions.filter(Position.status == CompanyStatus.ACTIVE).count() - employees.filter(Employee.employment_status == EmploymentStatus.ACTIVE).count(),
        "turnover_rate": round(
            employees.filter(Employee.employment_status == EmploymentStatus.TERMINATED).count()
            / max(employees.count(), 1) * 100,
            1,
        ),
        "gender_breakdown": gender_breakdown,
        "company_distribution": company_distribution,
        "recent_employees": [
            {
                "id": str(employee.id),
                "name": f"{employee.first_name} {employee.last_name}",
                "company_name": company_name,
                "position_title": position_title,
                "hire_date": employee.hire_date,
            }
            for employee, company_name, position_title in recent_query.all()
        ],
    }
