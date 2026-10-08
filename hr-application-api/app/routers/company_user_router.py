from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import company_user_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.company_user_schema import (
    AssignCompaniesRequest,
    AssignUsersRequest,
    BulkAssignmentResponse,
    CompanyUserCreate,
    CompanyUserResponse,
    CompanyUserUpdate,
)
from app.schemas.bulk_schema import BulkDeleteRequest, BulkDeleteResponse

router = APIRouter(prefix="/company-users", tags=["company-users"])


@router.get("", response_model=list[CompanyUserResponse])
def get_assignments(db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return company_user_controller.list_assignments(auth_user_id, db)


@router.post("", response_model=CompanyUserResponse, status_code=201)
def add_assignment(payload: CompanyUserCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return company_user_controller.create_assignment(payload, auth_user_id, db)


@router.post("/users/{user_id}/companies", response_model=BulkAssignmentResponse, status_code=201)
def assign_companies(
    user_id: UUID,
    payload: AssignCompaniesRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_user_controller.assign_companies_to_user(user_id, payload.company_ids, auth_user_id, db)


@router.post("/companies/{company_id}/users", response_model=BulkAssignmentResponse, status_code=201)
def assign_users(
    company_id: UUID,
    payload: AssignUsersRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_user_controller.assign_users_to_company(company_id, payload.user_ids, auth_user_id, db)


@router.put("/{assignment_id}", response_model=CompanyUserResponse)
def edit_assignment(
    assignment_id: UUID,
    payload: CompanyUserUpdate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_user_controller.update_assignment(assignment_id, payload, auth_user_id, db)


@router.delete("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_remove_assignments(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return company_user_controller.bulk_delete_assignments(payload.ids, auth_user_id, db)


@router.delete("/{assignment_id}", status_code=204)
def remove_assignment(assignment_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    company_user_controller.delete_assignment(assignment_id, auth_user_id, db)
