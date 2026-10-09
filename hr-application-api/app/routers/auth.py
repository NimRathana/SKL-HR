from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Request, status
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies.auth import get_db
from app.dependencies.auth import verify_access_token
from app.enums.tenant_status import TenantStatus
from app.enums.plan_type import PlanType
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.tenant import Tenant
from app.models.user import LoginHistory, User
from app.models.security_event import SecurityEvent
from app.models.registration import Registration
from app.schemas.auth_schema import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginHistoryResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegistrationResponse,
    ResetPasswordRequest,
    SecurityEventResponse,
    VerifyRegistrationRequest,
)
from app.config.settings import settings
from app.services.email_queue import EmailQueueUnavailableError, enqueue_email_operation
from app.services.email_service import create_queued_email
from app.utils.request_metadata import get_browser_and_device, get_request_metadata
from app.utils.security_monitor import (
    FAILED_LOGIN_THRESHOLD,
    FAILED_LOGIN_WINDOW_SECONDS,
    get_security_request_metadata,
    observe_failed_login,
    should_log_rate_limit,
    store_rate_limit_event,
    tracker,
)

router = APIRouter(tags=["auth"])
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEFAULT_MAX_AGE = 60 * 60 * 24
REMEMBER_MAX_AGE = 60 * 60 * 24 * 30
ACCESS_TOKEN_MINUTES = DEFAULT_MAX_AGE // 60
REMEMBERED_TOKEN_MINUTES = REMEMBER_MAX_AGE // 60
VERIFICATION_MINUTES = 15
PASSWORD_RESET_MINUTES = 15

def _email(value: str) -> str:
    value = value.strip().lower()
    if "@" not in value or value.startswith("@") or value.endswith("@") or value.count("@") != 1:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A valid email is required")
    return value

def _access_token(user: User, remember: bool = False) -> str:
    token_minutes = REMEMBERED_TOKEN_MINUTES if remember else ACCESS_TOKEN_MINUTES
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=token_minutes)
    return jwt.encode(
        {"sub": str(user.id), "user_id": str(user.id), "exp": expires_at},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

def _response(user: User, remember: bool = False) -> AuthResponse:
    return AuthResponse(
        access_token=_access_token(user, remember),
        user_id=str(user.id),
        user_name=user.name,
        email=user.email,
        role=user.role.value,
        status=user.status.value,
    )

@router.post("/auth/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = _email(payload.email)
    user = db.query(User).filter(func.lower(User.email) == email).first()

    if user is not None and user.deleted_at is None and user.status == UserStatus.ACTIVE:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_MINUTES)
        token = jwt.encode(
            {"sub": str(user.id), "email": email, "purpose": "password_reset", "exp": expires_at},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        operation = create_queued_email(
            db,
            user.id,
            email,
            "Reset your Recruitment account password",
            (
                f"Use this link to reset your password: "
                f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?token={token}\n"
                f"This link expires in {PASSWORD_RESET_MINUTES} minutes."
            ),
            user_id=user.id,
        )
        try:
            enqueue_email_operation(operation.id)
        except EmailQueueUnavailableError:
            return MessageResponse(message="If an account exists for this email, reset instructions have been queued for delivery")

    return MessageResponse(message="If an account exists for this email, reset instructions have been sent")

@router.post("/auth/reset-password", response_model=AuthResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        claims = jwt.decode(
            payload.token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired") from exc

    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token") from exc

    if claims.get("purpose") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    user = db.query(User).filter(User.id == claims.get("sub")).first()
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    user.password_hash = password_context.hash(payload.password)
    db.commit()
    return _response(user)

@router.post("/auth/register", response_model=RegistrationResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/user/register", response_model=RegistrationResponse, status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)) -> RegistrationResponse:
    email = _email(payload.email)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is required")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    code = f"{secrets.randbelow(1_000_000):06d}"
    pending = db.query(Registration).filter(Registration.email == email).first()
    if pending is None:
        pending = Registration(email=email)
        db.add(pending)

    pending.name = name
    pending.password_hash = password_context.hash(payload.password)
    pending.plan = PlanType.FREE
    pending.verification_code_hash = password_context.hash(code)
    pending.expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_MINUTES)
    pending.verified_at = None
    db.commit()

    ip_address, location = get_security_request_metadata(request)
    _, device_type, _ = get_request_metadata(request)
    operation = create_queued_email(
        db,
        None,
        email,
        "Verify your Recruitment account",
        f"Your verification code is {code}. It expires in {VERIFICATION_MINUTES} minutes.",
        ip_address=ip_address,
        device_type=device_type,
        location=location,
    )
    try:
        enqueue_email_operation(operation.id)
    except EmailQueueUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration saved but verification email delivery is temporarily unavailable. Start Redis and the email worker, then try again.",
        ) from exc

    return RegistrationResponse(message="Verification code sent", email=email)

@router.post("/auth/register/verify", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def verify_registration(payload: VerifyRegistrationRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = _email(payload.email)
    pending = db.query(Registration).filter(Registration.email == email).first()
    now = datetime.now(timezone.utc)
    if pending is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    if pending.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired")

    if not password_context.verify(payload.verification_code, pending.verification_code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    if db.query(User).filter(func.lower(User.email) == email).first():
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    tenant = Tenant(name=pending.name)
    user = User(
        tenant=tenant,
        email=email,
        name=pending.name,
        password_hash=pending.password_hash,
        role=UserRole.OWNER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.delete(pending)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    return _response(user)

@router.post("/auth/login", response_model=AuthResponse)
@router.post("/user/login", response_model=AuthResponse, include_in_schema=False)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    source_ip, location = get_security_request_metadata(request)
    attempt_reserved = bool(source_ip)

    if source_ip and not tracker.begin_login_attempt(source_ip):
        failed_attempt_count = tracker.recent_count(
            source_ip,
            "failed_login",
            FAILED_LOGIN_WINDOW_SECONDS,
        )
        if should_log_rate_limit(
            source_ip,
            "failed_login_block",
            failed_attempt_count,
            FAILED_LOGIN_THRESHOLD,
        ):
            store_rate_limit_event(
                request,
                source_ip,
                location,
                "Login attempt blocked after repeated failures from this IP",
                db=db,
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(FAILED_LOGIN_WINDOW_SECONDS)},
        )

    try:
        email = _email(payload.email)
        user = db.query(User).filter(func.lower(User.email) == email).first()

        if user is None or user.deleted_at is not None:
            observe_failed_login(request, None, db)
            attempt_reserved = False
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email not found")

        if not password_context.verify(payload.password, user.password_hash):
            observe_failed_login(request, user.id, db)
            attempt_reserved = False
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

        _, device_type, location = get_request_metadata(request)
        browser, device = get_browser_and_device(request.headers.get('user-agent', ''))
        db.add(LoginHistory(
            user_id=user.id,
            ip_address=source_ip,
            device_type=device_type,
            browser=browser,
            device=device,
            location=location,
        ))
        db.commit()
        if source_ip:
            tracker.finish_login_attempt(source_ip)
            attempt_reserved = False
        return _response(user, payload.remember)
    finally:
        if attempt_reserved and source_ip:
            tracker.finish_login_attempt(source_ip)


@router.post("/auth/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    user_id=Depends(verify_access_token),
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")
    if not password_context.verify(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if password_context.verify(payload.new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a new password")
    user.password_hash = password_context.hash(payload.new_password)
    db.commit()
    return MessageResponse(message="Password updated")


@router.get("/auth/recent-logins", response_model=list[LoginHistoryResponse])
def recent_logins(
    user_id=Depends(verify_access_token),
    db: Session = Depends(get_db),
) -> list[LoginHistory]:
    return (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == user_id)
        .order_by(LoginHistory.created_at.desc())
        .limit(10)
        .all()
    )


@router.get("/auth/security-events", response_model=list[SecurityEventResponse])
def security_events(
    user_id=Depends(verify_access_token),
    db: Session = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[SecurityEventResponse]:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")

    rows = (
        db.query(SecurityEvent, User.name, User.email)
        .outerjoin(User, SecurityEvent.user_id == User.id)
        .order_by(SecurityEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    response_events = [
        SecurityEventResponse(
            id=event.id,
            user_id=event.user_id,
            user_name=user_name,
            user_email=user_email,
            ip_address=event.ip_address,
            location=event.location,
            method=event.method,
            endpoint=event.endpoint,
            status_code=event.status_code,
            reason=event.reason,
            action=event.action,
            created_at=event.created_at,
        )
        for event, user_name, user_email in rows
    ]
    successful_logins = (
        db.query(LoginHistory, User.name, User.email)
        .join(User, LoginHistory.user_id == User.id)
        .order_by(LoginHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    response_events.extend(
        SecurityEventResponse(
            id=login.id,
            user_id=login.user_id,
            user_name=user_name,
            user_email=user_email,
            ip_address=login.ip_address,
            location=login.location,
            method="POST",
            endpoint="/auth/login",
            status_code=200,
            reason="Successful sign-in",
            action="Allowed",
            created_at=login.created_at,
        )
        for login, user_name, user_email in successful_logins
    )
    response_events.sort(key=lambda event: event.created_at, reverse=True)
    return response_events[:limit]

@router.post("/auth/refresh", response_model=AuthResponse)
def refresh_token(auth_user_id=Depends(verify_access_token), db: Session = Depends(get_db), authPersistent: str | None = Cookie(None)) -> AuthResponse:
    user = db.query(User).filter(User.id == auth_user_id).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    remember = (authPersistent == '1')
    return _response(user, remember)

@router.get("/auth/me", response_model=AuthResponse)
def current_user(user_id=Depends(verify_access_token), db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    return _response(user)
