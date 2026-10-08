from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import dashboard_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.dashboard_schema import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return dashboard_controller.get_summary(auth_user_id, db)
