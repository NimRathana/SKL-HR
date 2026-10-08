
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.utils.token import verify_token
from app.database.session import SessionLocal
from app.enums.user_status import UserStatus
from app.models.user import User
from uuid import UUID

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_token_from_header(authorization: str | None = Header(None)) -> str:
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected: Bearer <token>"
        )
    return token

def enforce_read_only_user(request: Request, user_id: UUID, db: Session) -> None:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"} or request.url.path == "/auth/refresh":
        return

    user_status = db.query(User.status).filter(User.id == user_id).scalar()
    if user_status == UserStatus.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive accounts can only view data",
        )


def verify_access_token(
    request: Request,
    token: str = Depends(get_token_from_header),
    db: Session = Depends(get_db),
) -> UUID:
    user_id = verify_token(token, db)
    user = db.query(User.id, User.deleted_at).filter(User.id == user_id).first()
    if user is None or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is unavailable",
        )
    request.state.user_id = user_id
    enforce_read_only_user(request, user_id, db)
    return user_id
