from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.controllers import email_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.email_schema import BulkEmailQueuedResponse, BulkEmailRequest, BulkEmailStatusResponse
from app.services.email_queue import enqueue_email_operation
from app.utils.request_metadata import get_request_metadata

router = APIRouter(prefix="/emails", tags=["emails"])


@router.post("/send-bulk", response_model=BulkEmailQueuedResponse, status_code=status.HTTP_202_ACCEPTED)
def send_bulk_email(
    request: Request,
    payload: BulkEmailRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    ip_address, device_type, location = get_request_metadata(request)
    operation = email_controller.create_bulk_operation(
        auth_user_id,
        payload.user_ids,
        payload.subject,
        payload.body,
        db,
        ip_address,
        device_type,
        location,
    )
    enqueue_email_operation(operation.id)
    return {"operation_id": operation.id, "queued": operation.total}


@router.get("/bulk/{operation_id}", response_model=BulkEmailStatusResponse)
def get_bulk_email_status(
    operation_id: UUID,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return email_controller.bulk_status(auth_user_id, operation_id, db)
