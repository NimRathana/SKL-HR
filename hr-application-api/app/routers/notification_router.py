from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.controllers import notification_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.notification_schema import (
    BulkNotificationRequest,
    BulkNotificationResponse,
    NotificationResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return notification_controller.list_notifications(auth_user_id, db)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return notification_controller.mark_notification_read(auth_user_id, notification_id, db)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    notification_controller.delete_notification(auth_user_id, notification_id, db)


@router.post("/send-bulk", response_model=BulkNotificationResponse, status_code=status.HTTP_201_CREATED)
def send_bulk_notifications(
    payload: BulkNotificationRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return notification_controller.create_bulk_notifications(
        auth_user_id, payload.user_ids, payload.title, payload.body, db
    )
