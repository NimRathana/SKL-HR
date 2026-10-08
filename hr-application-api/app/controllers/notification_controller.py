from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_management_user
from app.models.notification import Notification
from app.models.user import User


def create_bulk_notifications(
    auth_user_id: UUID,
    user_ids: list[UUID],
    title: str,
    body: str,
    db: Session,
) -> dict:
    current_user = require_management_user(authorized_user(auth_user_id, db))
    unique_ids = list(dict.fromkeys(user_ids))
    query = db.query(User).filter(User.id.in_(unique_ids), User.status == "active")
    if current_user.role.value != "admin":
        query = query.filter(User.tenant_id == current_user.tenant_id)
    users = query.all()
    if len(users) != len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users are invalid or inaccessible",
        )

    db.add_all([
        Notification(user_id=user.id, title=title.strip(), body=body.strip())
        for user in users
    ])
    db.commit()
    return {"queued": len(users)}


def list_notifications(auth_user_id: UUID, db: Session) -> list[Notification]:
    authorized_user(auth_user_id, db)
    return db.query(Notification).filter(
        Notification.user_id == auth_user_id
    ).order_by(Notification.created_at.desc()).limit(100).all()


def mark_notification_read(auth_user_id: UUID, notification_id: UUID, db: Session) -> Notification:
    authorized_user(auth_user_id, db)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == auth_user_id,
    ).first()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    return notification


def delete_notification(auth_user_id: UUID, notification_id: UUID, db: Session) -> None:
    authorized_user(auth_user_id, db)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == auth_user_id,
    ).first()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    db.delete(notification)
    db.commit()
