from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.controllers import plan_type_controller
from app.dependencies.auth import enforce_read_only_user, get_db
from app.schemas.plan_type_schema import PlanTypeCreate, PlanTypeResponse, PlanTypeUpdate
from app.utils.token import verify_token


router = APIRouter(prefix="/plan-types", tags=["plan-types"])


def _optional_user_id(
    request: Request,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> UUID | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format")
    user_id = verify_token(token, db)
    enforce_read_only_user(request, user_id, db)
    return user_id


@router.post("", response_model=PlanTypeResponse, status_code=status.HTTP_201_CREATED)
def create_plan_type(
    payload: PlanTypeCreate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(_optional_user_id),
):
    if auth_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return plan_type_controller.create_plan_type(payload, auth_user_id, db)


@router.get("", response_model=list[PlanTypeResponse])
def list_plan_types(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    auth_user_id: UUID | None = Depends(_optional_user_id),
):
    return plan_type_controller.list_plan_types(db, include_inactive, auth_user_id)


@router.get("/{code}", response_model=PlanTypeResponse)
def get_plan_type(code: str, db: Session = Depends(get_db)):
    return plan_type_controller.get_plan_type(code, db)


@router.put("/{code}", response_model=PlanTypeResponse)
def update_plan_type(
    code: str,
    payload: PlanTypeUpdate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(_optional_user_id),
):
    if auth_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return plan_type_controller.update_plan_type(code, payload, auth_user_id, db)


@router.patch("/{code}/activation", response_model=PlanTypeResponse)
def set_plan_type_active(
    code: str,
    is_active: bool,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(_optional_user_id),
):
    if auth_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return plan_type_controller.set_plan_type_active(code, is_active, auth_user_id, db)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_plan_type(
    code: str,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(_optional_user_id),
):
    if auth_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    plan_type_controller.delete_plan_type(code, auth_user_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
