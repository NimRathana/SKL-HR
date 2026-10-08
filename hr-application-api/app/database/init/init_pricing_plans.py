from decimal import Decimal

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.database.init.init_plan_types import seed_plan_types
from app.models.pricing_plan import PricingPlan


PLAN_DEFAULTS = (
    {
        "plan_type": "free",
        "name": "Free Monthly",
        "description": "A simple start for small teams.",
        "price": Decimal("0.00"),
        "billing_interval": "monthly",
        "max_employees": 10,
        "max_companies": 1,
        "max_hr_users": 1,
        "features": {"employee_management": True, "employment_history": True, "salary_history": False},
    },
    {
        "plan_type": "free",
        "name": "Free Yearly",
        "description": "A simple start for small teams.",
        "price": Decimal("0.00"),
        "billing_interval": "yearly",
        "max_employees": 10,
        "max_companies": 1,
        "max_hr_users": 1,
        "features": {"employee_management": True, "employment_history": True, "salary_history": False},
    },
    {
        "plan_type": "basic",
        "name": "Basic Monthly",
        "description": "For small teams.",
        "price": Decimal("9.99"),
        "billing_interval": "monthly",
        "max_employees": 50,
        "max_companies": 3,
        "max_hr_users": 5,
        "features": {"employee_management": True, "employment_history": True, "salary_history": True},
    },
    {
        "plan_type": "basic",
        "name": "Basic Yearly",
        "description": "For small teams.",
        "price": Decimal("95.90"),
        "billing_interval": "yearly",
        "max_employees": 50,
        "max_companies": 3,
        "max_hr_users": 5,
        "features": {"employee_management": True, "employment_history": True, "salary_history": True},
    },
    {
        "plan_type": "medium",
        "name": "Medium Monthly",
        "description": "Advanced tools for growing HR teams.",
        "price": Decimal("19.99"),
        "billing_interval": "monthly",
        "max_employees": 200,
        "max_companies": 10,
        "max_hr_users": 20,
        "features": {
            "employee_management": True,
            "employment_history": True,
            "salary_history": True,
            "performance_management": True,
            "advanced_reports": True,
        },
    },
    {
        "plan_type": "medium",
        "name": "Medium Yearly",
        "description": "Advanced tools for growing HR teams.",
        "price": Decimal("191.90"),
        "billing_interval": "yearly",
        "max_employees": 200,
        "max_companies": 10,
        "max_hr_users": 20,
        "features": {
            "employee_management": True,
            "employment_history": True,
            "salary_history": True,
            "performance_management": True,
            "advanced_reports": True,
        },
    },
)


def seed_pricing_plans(db: Session) -> int:
    seed_plan_types(db)
    added = 0
    updated = False
    for plan_data in PLAN_DEFAULTS:
        existing = db.query(PricingPlan).filter(
            PricingPlan.plan_type == plan_data["plan_type"],
            PricingPlan.billing_interval == plan_data["billing_interval"],
        ).first()
        if existing is not None:
            for field in ("max_employees", "max_companies", "max_hr_users"):
                if getattr(existing, field) is None:
                    setattr(existing, field, plan_data[field])
                    updated = True
            if not existing.features:
                existing.features = plan_data["features"]
                updated = True
            continue
        db.add(PricingPlan(currency="USD", **plan_data))
        added += 1
    if added or updated:
        db.commit()
    return added


def run() -> None:
    db = SessionLocal()
    try:
        seed_pricing_plans(db)
    finally:
        db.close()
