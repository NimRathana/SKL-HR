from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import position_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.position_schema import PositionCreate, PositionResponse, PositionUpdate
from app.schemas.bulk_schema import BulkDeleteRequest, BulkDeleteResponse

router = APIRouter(prefix="/positions", tags=["positions"])


@router.get("", response_model=list[PositionResponse])
def get_positions(db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return position_controller.list_positions(auth_user_id, db)


@router.post("", response_model=PositionResponse, status_code=201)
def create_position(payload: PositionCreate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return position_controller.create_position(payload, auth_user_id, db)


@router.delete("/bulk-delete", response_model=BulkDeleteResponse)
@router.delete("/bulk", response_model=BulkDeleteResponse, include_in_schema=False)
def bulk_delete_positions(payload: BulkDeleteRequest, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return position_controller.bulk_delete_positions(payload.ids, auth_user_id, db)


@router.put("/{position_id}", response_model=PositionResponse)
def update_position(position_id: UUID, payload: PositionUpdate, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return position_controller.update_position(position_id, payload, auth_user_id, db)


@router.delete("/{position_id}", status_code=204)
def delete_position(position_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    position_controller.delete_position(position_id, auth_user_id, db)
