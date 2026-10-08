from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.controllers import history_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.history_schema import (
    EmploymentHistoryCreate,
    EmploymentHistoryUpdate,
    EmploymentHistoryResponse,
    SalaryHistoryCreate,
    SalaryHistoryUpdate,
    SalaryHistoryResponse,
)
from app.schemas.bulk_schema import BulkDeleteRequest, BulkDeleteResponse

router = APIRouter(tags=["histories"])


@router.get("/employment-histories", response_model=list[EmploymentHistoryResponse])
def get_employment_histories(employee_id: UUID | None = Query(None), db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.list_employment_histories(auth_user_id, db, employee_id)


@router.post("/employment-histories", response_model=EmploymentHistoryResponse, status_code=201)
def post_employment_history(payload: EmploymentHistoryCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.create_employment_history(payload, auth_user_id, db)


@router.delete("/employment-histories/bulk-delete", response_model=BulkDeleteResponse)
@router.delete("/employment-histories/bulk", response_model=BulkDeleteResponse, include_in_schema=False)
def bulk_remove_employment_histories(payload: BulkDeleteRequest, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.bulk_delete_employment_histories(payload.ids, auth_user_id, db)


@router.put("/employment-histories/{history_id}", response_model=EmploymentHistoryResponse)
def edit_employment_history(history_id: UUID, payload: EmploymentHistoryUpdate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.update_employment_history(history_id, payload, auth_user_id, db)


@router.delete("/employment-histories/{history_id}", status_code=204)
def remove_employment_history(history_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    history_controller.delete_employment_history(history_id, auth_user_id, db)


@router.get("/salary-histories", response_model=list[SalaryHistoryResponse])
def get_salary_histories(employee_id: UUID | None = Query(None), db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.list_salary_histories(auth_user_id, db, employee_id)


@router.post("/salary-histories", response_model=SalaryHistoryResponse, status_code=201)
def post_salary_history(payload: SalaryHistoryCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.create_salary_history(payload, auth_user_id, db)


@router.delete("/salary-histories/bulk-delete", response_model=BulkDeleteResponse)
@router.delete("/salary-histories/bulk", response_model=BulkDeleteResponse, include_in_schema=False)
def bulk_remove_salary_histories(payload: BulkDeleteRequest, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.bulk_delete_salary_histories(payload.ids, auth_user_id, db)


@router.put("/salary-histories/{history_id}", response_model=SalaryHistoryResponse)
def edit_salary_history(history_id: UUID, payload: SalaryHistoryUpdate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return history_controller.update_salary_history(history_id, payload, auth_user_id, db)


@router.delete("/salary-histories/{history_id}", status_code=204)
def remove_salary_history(history_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    history_controller.delete_salary_history(history_id, auth_user_id, db)
