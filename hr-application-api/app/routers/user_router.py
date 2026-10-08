from uuid import UUID

from fastapi import APIRouter, Depends, Form, Request, UploadFile, File as FastAPIFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.controllers import user_controller
from app.dependencies.auth import get_db, verify_access_token
from app.enums.user_status import UserStatus
from app.schemas.user_schema import AccountDeletionRequest, TenantOwnerResponse, UserPreferencesUpdate, UserProfileResponse, UserResponseInfo

router = APIRouter(tags=["users"])


class InviteEmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)


class InviteVerificationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    verification_code: str = Field(min_length=6, max_length=6)
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(max_length=128)
    invite_token: str = Field(min_length=10, max_length=500)


class UserStatusUpdateRequest(BaseModel):
    status: UserStatus


@router.get("/users", response_model=list[UserResponseInfo])
def get_user_info(db: Session = Depends(get_db), user_id=Depends(verify_access_token)):
    return user_controller.get_all_users(user_id, db)


@router.get("/tenants", response_model=list[TenantOwnerResponse])
def get_tenants(db: Session = Depends(get_db), user_id=Depends(verify_access_token)):
    return user_controller.get_all_tenants(user_id, db)


@router.get("/users/profile", response_model=UserProfileResponse)
def get_current_user_profile(request: Request, db: Session = Depends(get_db), user_id=Depends(verify_access_token)):
    return user_controller.get_profile(user_id, request, db)


@router.patch("/users/profile/preferences")
def update_current_user_preferences(
    payload: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    user_id=Depends(verify_access_token),
):
    return user_controller.update_user_preferences(user_id, payload.user_preferences, db)


@router.put("/users/profile", response_model=UserProfileResponse)
def update_current_user_profile(
    request: Request,
    name: str | None = Form(default=None),
    email: str | None = Form(default=None),
    phone: str | None = Form(default=None),
    date_of_birth: str | None = Form(default=None),
    address: str | None = Form(default=None),
    profile_image: UploadFile | None = FastAPIFile(default=None),
    db: Session = Depends(get_db),
    user_id=Depends(verify_access_token),
):
    return user_controller.update_profile(user_id, name, email, phone, date_of_birth, address, profile_image, request, db)


@router.delete("/users/profile/image", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user_profile_image(db: Session = Depends(get_db), user_id=Depends(verify_access_token)):
    user_controller.delete_profile_image(user_id, db)


@router.delete("/users/profile", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user_account(
    payload: AccountDeletionRequest,
    db: Session = Depends(get_db),
    user_id=Depends(verify_access_token),
):
    user_controller.delete_own_account(user_id, payload.current_password, db)


@router.patch("/users/{user_id}/status")
def update_user_status(user_id: UUID, payload: UserStatusUpdateRequest, db: Session = Depends(get_db), auth_user_id=Depends(verify_access_token)):
    return user_controller.update_status(user_id, payload.status, auth_user_id, db)


@router.post("/users/invite")
def send_user_invite(
    request: Request,
    payload: InviteEmailRequest,
    db: Session = Depends(get_db),
    auth_user_id=Depends(verify_access_token),
):
    return user_controller.send_invite(payload.email, auth_user_id, request, db)


@router.post("/users/invite/verify")
def verify_user_invite(payload: InviteVerificationRequest, db: Session = Depends(get_db)):
    return user_controller.verify_invite(payload, db)