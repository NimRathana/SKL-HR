from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums.user_role import UserRole
from app.models.file import File
from app.models.user import User


def _tenant_user(auth_user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == auth_user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant user")
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not assigned to a tenant")
    return user


def list_files(auth_user_id: UUID, db: Session):
    user = _tenant_user(auth_user_id, db)
    query = db.query(File).join(User, File.user_id == User.id)
    if user.role != UserRole.ADMIN:
        query = query.filter(User.tenant_id == user.tenant_id)
    return query.order_by(File.created_at.desc()).all()


def get_file(file_id: UUID, auth_user_id: UUID, db: Session) -> tuple[File, Path]:
    user = _tenant_user(auth_user_id, db)
    query = db.query(File).join(User, File.user_id == User.id).filter(File.id == file_id)
    if user.role != UserRole.ADMIN:
        query = query.filter(User.tenant_id == user.tenant_id)
    file = query.first()
    if file is None or not file.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    uploads_root = Path("uploads").resolve()
    path = Path(file.file_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    path = path.resolve()
    try:
        path.relative_to(uploads_root)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file, path
