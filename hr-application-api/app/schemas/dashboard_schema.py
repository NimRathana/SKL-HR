from datetime import date

from pydantic import BaseModel


class DashboardEmployee(BaseModel):
    id: str
    name: str
    company_name: str
    position_title: str
    hire_date: date


class DashboardSummary(BaseModel):
    companies: int
    active_companies: int
    tenants: int
    positions: int
    employees: int
    active_employees: int
    users: int
    open_roles: int
    turnover_rate: float
    gender_breakdown: list[dict]
    company_distribution: list[dict]
    recent_employees: list[DashboardEmployee]
