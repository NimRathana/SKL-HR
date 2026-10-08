from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_management_user
from app.models.email_log import EmailLog
from app.models.user import User
from app.services.email_service import create_bulk_email, get_bulk_status


def create_bulk_operation(
    auth_user_id: UUID,
    user_ids: list[UUID],
    subject: str,
    body: str,
    db: Session,
    ip_address: str | None = None,
    device_type: str | None = None,
    location: str | None = None,
):
    current_user = require_management_user(authorized_user(auth_user_id, db))
    unique_ids = list(dict.fromkeys(user_ids))
    query = db.query(User).filter(User.id.in_(unique_ids), User.status == "active")
    if current_user.role.value != "admin":
        query = query.filter(User.tenant_id == current_user.tenant_id)
    users = query.all()
    if len(users) != len(unique_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more users are invalid or inaccessible")

    already_sent = db.query(EmailLog.user_id).filter(
        EmailLog.user_id.in_(unique_ids),
        EmailLog.subject == subject,
        EmailLog.status == "sent",
    ).first()
    if already_sent:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more selected users already received this email",
        )
    return create_bulk_email(
        db,
        auth_user_id,
        users,
        subject.strip(),
        body,
        ip_address,
        device_type,
        location,
    )


def bulk_status(auth_user_id: UUID, operation_id: UUID, db: Session) -> dict:
    current_user = authorized_user(auth_user_id, db)
    from app.models.email_log import EmailBulkOperation

    operation = db.query(EmailBulkOperation).filter(EmailBulkOperation.id == operation_id).first()
    if operation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email operation not found")
    if current_user.role.value != "admin" and operation.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this email operation")
    return get_bulk_status(db, operation_id)
