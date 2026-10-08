from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.plan_type_catalog import PlanTypeCatalog


DEFAULT_PLAN_TYPES = (
    ("free", "Free", "Entry-level plan", 0),
    ("basic", "Basic", "Core plan for small teams", 10),
    ("medium", "Medium", "Advanced plan for growing teams", 20),
)


def seed_plan_types(db: Session) -> int:
    added = 0
    for code, name, description, sort_order in DEFAULT_PLAN_TYPES:
        existing = db.query(PlanTypeCatalog.code).filter(PlanTypeCatalog.code == code).first()
        if existing is not None:
            continue
        db.add(PlanTypeCatalog(code=code, name=name, description=description, sort_order=sort_order))
        added += 1
    if added:
        db.commit()
    return added


def run() -> None:
    db = SessionLocal()
    try:
        seed_plan_types(db)
    finally:
        db.close()
