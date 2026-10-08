from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.controllers import pricing_plan_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.pricing_plan_schema import (
    PricingPlanActivation,
    PricingPlanCreate,
    PricingPlanResponse,
    PricingPlanUpdate,
)
from app.utils.token import verify_token


router = APIRouter(prefix="/plans", tags=["pricing-plans"])


def _optional_user_id(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> UUID | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format")
    return verify_token(token, db)


@router.post("", response_model=PricingPlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PricingPlanCreate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return pricing_plan_controller.create_plan(payload, auth_user_id, db)


@router.get("", response_model=list[PricingPlanResponse])
def list_plans(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    auth_user_id: UUID | None = Depends(_optional_user_id),
):
    return pricing_plan_controller.list_plans(db, include_inactive, auth_user_id)


@router.get("/{plan_id}", response_model=PricingPlanResponse)
def get_plan(plan_id: UUID, db: Session = Depends(get_db)):
    return pricing_plan_controller.get_plan(plan_id, db)


@router.put("/{plan_id}", response_model=PricingPlanResponse)
def update_plan(
    plan_id: UUID,
    payload: PricingPlanUpdate,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return pricing_plan_controller.update_plan(plan_id, payload, auth_user_id, db)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    pricing_plan_controller.delete_plan(plan_id, auth_user_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{plan_id}/activation", response_model=PricingPlanResponse)
def set_plan_active(
    plan_id: UUID,
    payload: PricingPlanActivation,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return pricing_plan_controller.set_plan_active(plan_id, payload.is_active, auth_user_id, db)