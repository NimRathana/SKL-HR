from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import billing_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.billing_schema import BillingSummary, InvoiceResponse


router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/me", response_model=BillingSummary)
def get_billing_summary(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return billing_controller.get_billing_summary(auth_user_id, db)


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return billing_controller.list_invoices(auth_user_id, db)