from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import employee_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.employee_schema import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.schemas.bulk_schema import BulkDeleteRequest, BulkDeleteResponse

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeResponse])
def get_employees(db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return employee_controller.list_employees(auth_user_id, db)


@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return employee_controller.create_employee(payload, auth_user_id, db)


@router.delete("/bulk-delete", response_model=BulkDeleteResponse)
@router.delete("/bulk", response_model=BulkDeleteResponse, include_in_schema=False)
def bulk_delete_employees(payload: BulkDeleteRequest, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return employee_controller.bulk_delete_employees(payload.ids, auth_user_id, db)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: UUID, payload: EmployeeUpdate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return employee_controller.update_employee(employee_id, payload, auth_user_id, db)


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    employee_controller.delete_employee(employee_id, auth_user_id, db)
