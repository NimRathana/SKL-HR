from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import company_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.company_schema import CompanyCreate, CompanyResponse, CompanyStatusUpdate, CompanyUpdate

router = APIRouter(prefix='/companies', tags=['companies'])


@router.get('', response_model=list[CompanyResponse])
def get_companies(db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return company_controller.list_companies(auth_user_id, db)


@router.post('', response_model=CompanyResponse, status_code=201)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return company_controller.create_company(payload, auth_user_id, db)


@router.patch('/{company_id}/status', response_model=CompanyResponse)
def update_company_status(
    company_id: UUID,
    payload: CompanyStatusUpdate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_controller.update_status(company_id, payload.status, auth_user_id, db)


@router.put('/{company_id}', response_model=CompanyResponse)
def edit_company(
    company_id: UUID,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_controller.update_company(company_id, payload, auth_user_id, db)
