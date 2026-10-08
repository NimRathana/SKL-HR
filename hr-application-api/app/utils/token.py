from jose import JWTError, jwt
from fastapi import HTTPException, status
from app.config.settings import settings
from sqlalchemy.orm import Session
from uuid import UUID

def verify_token(token: str, db: Session) -> UUID:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id") or payload.get("sub")

        if user_id is None:
            raise ValueError("Missing user_id")
        
        return UUID(str(user_id))
    
    except (JWTError, ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
