from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import system_parameter_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.system_parameter_schema import (
    SystemParameterResponse,
    SystemParameterUpdate,
)

router = APIRouter(prefix="/system-parameters", tags=["system-parameters"])


@router.get("", response_model=list[SystemParameterResponse])
def get_system_parameters(
    db: Session = Depends(get_db),
    auth_user_id=Depends(verify_access_token),
):
    return system_parameter_controller.get_system_parameters(auth_user_id, db)


@router.patch("/{parameter_id}", response_model=SystemParameterResponse)
def update_system_parameter(
    parameter_id: UUID,
    payload: SystemParameterUpdate,
    db: Session = Depends(get_db),
    auth_user_id=Depends(verify_access_token),
):
    return system_parameter_controller.update_system_parameter(
        parameter_id,
        payload.value,
        auth_user_id,
        db,
    )