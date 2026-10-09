from datetime import date, datetime, timedelta, timezone
import secrets
from typing import Any
from urllib.parse import urlencode, urljoin
from uuid import UUID

from fastapi import HTTPException, Request, UploadFile, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.services.email_queue import EmailDeliveryUnavailableError, enqueue_or_send_email_operation
from app.services.email_service import create_queued_email
from app.enums.plan_type import PlanType
from app.enums.user_role import UserRole
from app.enums.user_status import UserStatus
from app.models.file import File as UserFile
from app.models.user import LoginHistory
from app.models.registration import Registration
from app.models.system_parameter import SystemParameter
from app.models.tenant import Tenant
from app.models.user import User
from app.controllers.access import require_management_user
from app.services.plan_entitlements import enforce_resource_capacity, require_plan_feature
from app.utils.file_handler import delete_file, get_file_url, save_upload_file
from app.utils.request_metadata import get_request_metadata
from app.utils.security_monitor import get_security_request_metadata

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def get_all_users(auth_user_id: UUID, db: Session):
    current_user = _get_authorized_user(auth_user_id, db)
    stmt = (
        select(
            User.id,
            User.name,
            User.email,
            User.phone,
            User.date_of_birth,
            User.address,
            User.role,
            User.status,
        )
        .order_by(User.created_at.desc())
    )
    if current_user.role != UserRole.ADMIN:
        stmt = stmt.where(User.tenant_id == current_user.tenant_id)

    result = db.execute(stmt)

    return result.all()


def get_all_tenants(auth_user_id: UUID, db: Session):
    current_user = _get_authorized_user(auth_user_id, db)
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only admins can view tenants')

    stmt = (
        select(
            User.id,
            User.tenant_id,
            Tenant.name.label('tenant_name'),
            User.email,
            User.status,
            Tenant.plan,
            Tenant.created_at,
        )
        .join(Tenant, User.tenant_id == Tenant.id)
        .where(User.role == UserRole.OWNER)
        .order_by(Tenant.created_at.desc())
    )
    return [dict(row) for row in db.execute(stmt).mappings().all()]


def get_profile(user_id: UUID, request: Request, db: Session) -> dict:
    user = _get_user_or_404(user_id, db)
    _refresh_profile_file(user, db)
    return _profile_payload(user, request, db)

def update_user_preferences(user_id: UUID, updates: dict[str, Any], db: Session) -> dict[str, Any] | None:
    user = _get_user_or_404(user_id, db)
    available, existing = _read_user_preferences(user, db)
    if not available:
        return None
    user.user_preferences = _merge_user_preferences(existing, updates)
    try:
        db.commit()
    except ProgrammingError as error:
        db.rollback()
        if _is_missing_user_preferences_column(error):
            return None
        raise
    db.refresh(user)
    return user.user_preferences

def update_profile(
    user_id: UUID,
    name: str | None,
    email: str | None,
    phone: str | None,
    date_of_birth: str | None,
    address: str | None,
    profile_image: UploadFile | None,
    request: Request,
    db: Session,
) -> dict:
    user = _get_user_or_404(user_id, db)

    if name is not None:
        cleaned_name = name.strip()
        if not cleaned_name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Name cannot be empty')
        user.name = cleaned_name

    if email is not None:
        cleaned_email = email.strip().lower()
        if not cleaned_email:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Email cannot be empty')
        if db.query(User).filter(User.email == cleaned_email, User.id != user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email is already assigned to another user')
        user.email = cleaned_email

    if phone is not None:
        user.phone = phone.strip() or None

    if date_of_birth is not None:
        try:
            user.date_of_birth = date.fromisoformat(date_of_birth) if date_of_birth else None
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A valid date of birth is required") from exc

    if address is not None:
        user.address = address.strip() or None

    if profile_image is not None and profile_image.filename:
        if user.profile_image_file is not None and user.profile_image_file.file_path:
            delete_file(user.profile_image_file.file_path)

        saved_path = save_upload_file(profile_image)
        existing_file = user.profile_image_file
        if existing_file is None:
            db.add(UserFile(
                user_id=user.id,
                file_name=profile_image.filename,
                file_category='profile_image',
                file_type=profile_image.content_type,
                file_path=saved_path,
            ))
        else:
            existing_file.file_name = profile_image.filename
            existing_file.file_category = 'profile_image'
            existing_file.file_type = profile_image.content_type
            existing_file.file_path = saved_path

    db.commit()
    db.refresh(user)
    _refresh_profile_file(user, db)
    return _profile_payload(user, request, db)

def delete_profile_image(user_id: UUID, db: Session) -> None:
    user = _get_user_or_404(user_id, db)
    existing_file = user.profile_image_file
    if existing_file is None:
        return
    if existing_file.file_path:
        delete_file(existing_file.file_path)
    db.delete(existing_file)
    db.commit()


def delete_own_account(user_id: UUID, current_password: str, db: Session) -> None:
    user = _get_user_or_404(user_id, db)
    if not bcrypt_context.verify(current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    profile_file = user.profile_image_file
    if profile_file is not None:
        if profile_file.file_path:
            delete_file(profile_file.file_path)
        db.delete(profile_file)

    db.query(LoginHistory).filter(LoginHistory.user_id == user.id).delete(synchronize_session=False)
    user.deleted_at = datetime.now(timezone.utc)
    user.status = UserStatus.INACTIVE
    user.name = "Deleted account"
    user.email = f"deleted-{user.id}@invalid.local"
    user.phone = None
    user.date_of_birth = None
    user.address = None
    user.user_preferences = None
    user.password_hash = bcrypt_context.hash(secrets.token_urlsafe(48))
    db.commit()

def update_status(user_id: UUID, new_status: UserStatus, auth_user_id: UUID, db: Session) -> dict:
    current_user = _get_authorized_user(auth_user_id, db)
    require_management_user(current_user)
    user = _get_user_or_404(user_id, db)
    if current_user.role != UserRole.ADMIN and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='You cannot change your own status')
    if (
        new_status == UserStatus.ACTIVE
        and user.status != UserStatus.ACTIVE
        and user.role == UserRole.HR
        and user.tenant_id is not None
    ):
        enforce_resource_capacity(user.tenant_id, "hr_users", db)
    user.status = new_status
    db.commit()
    db.refresh(user)
    return {
        'id': str(user.id),
        'status': user.status.value,
        'message': 'User status updated successfully',
    }

def _get_authorized_user(user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid user')
    if user.role != UserRole.ADMIN and user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User is not assigned to a tenant')
    return user

def send_invite(email: str, auth_user_id: UUID, request: Request, db: Session) -> dict:
    current_user = db.query(User).filter(User.id == auth_user_id).first()
    if current_user is None or current_user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or inactive user')
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only admins and owners can invite users')
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Current user is not assigned to a tenant')

    require_plan_feature(current_user.tenant_id, "employee_management", db)
    enforce_resource_capacity(current_user.tenant_id, "hr_users", db)

    email = _normalize_email(email)
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email is already assigned to a user')

    code = f'{secrets.randbelow(1_000_000):06d}'
    invite_token = _create_invite_token(email, current_user.tenant_id)
    pending = db.query(Registration).filter(func.lower(Registration.email) == email).first()
    if pending is None:
        pending = Registration(
            email=email,
            name='Pending User',
            password_hash='',
            plan=PlanType.FREE,
            verification_code_hash='',
            expires_at=_invite_expiry(),
        )
        db.add(pending)

    pending.name = pending.name or 'Pending User'
    pending.password_hash = pending.password_hash or ''
    pending.plan = PlanType.FREE
    pending.verification_code_hash = bcrypt_context.hash(code)
    pending.expires_at = _invite_expiry()
    pending.verified_at = None

    db.commit()
    ip_address, location = get_security_request_metadata(request)
    _, device_type, _ = get_request_metadata(request)
    invite_url = urljoin(
        f'{settings.APP_BASE_URL.rstrip("/")}/',
        f'invite?{urlencode({"email": email, "token": invite_token})}',
    )
    operation = create_queued_email(
        db,
        current_user.id,
        email,
        'Your employee invitation code',
        (
            f'Your invitation code is {code}.\n\n'
            f'Complete your setup here: {invite_url}\n\n'
            'Use the code and the secure link in the invitation to finish your account setup.'
        ),
        ip_address=ip_address,
        device_type=device_type,
        location=location,
    )
    try:
        enqueue_or_send_email_operation(operation.id, db)
    except EmailDeliveryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Invitation saved, but email delivery failed. Check the production SMTP settings and resend the invitation.",
        ) from exc
    return {
        'message': 'Invitation sent successfully',
        'email': email,
        'operation_id': operation.id,
    }

def verify_invite(payload, db: Session):
    token_email, tenant_id = _verify_invite_token(payload.invite_token)
    email = _normalize_email(payload.email)
    if token_email.lower() != email.lower():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invite token does not match the email')
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invite token is missing tenant information')

    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Username is required')

    pending = db.query(Registration).filter(func.lower(Registration.email) == email).first()
    if pending is None or pending.expires_at <= datetime.now(timezone.utc) or not bcrypt_context.verify(payload.verification_code, pending.verification_code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid or expired verification code')
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email is already assigned to a user')

    try:
        invite_tenant_id = UUID(tenant_id)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid invite tenant') from exc
    if db.query(Tenant).filter(Tenant.id == invite_tenant_id).first() is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invite tenant no longer exists')

    require_plan_feature(invite_tenant_id, "employee_management", db)
    enforce_resource_capacity(invite_tenant_id, "hr_users", db)
    _validate_new_user_password(payload.password, db)

    user = User(
        tenant_id=invite_tenant_id,
        email=email,
        name=username,
        password_hash=bcrypt_context.hash(payload.password),
        role=UserRole.HR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.delete(pending)
    try:
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Unable to create user') from exc

    return {
        'access_token': _access_token(user),
        'user_id': str(user.id),
        'user_name': user.name,
        'email': user.email,
        'phone': user.phone,
        'date_of_birth': user.date_of_birth,
        'address': user.address,
    }

def _validate_new_user_password(password: str, db: Session) -> None:
    parameter_codes = {
        'PASSWORD_SET_LIST_SPECIAL_CHARACTERS',
        'MINIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        'MAXIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        'AT_LEAST_ONE_NUMBER_REQUIRED_IN_PASSWORD',
        'AT_LEAST_ONE_LOWERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
        'AT_LEAST_ONE_UPPERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
    }
    parameters = {
        parameter.code: parameter.value.strip()
        for parameter in db.query(SystemParameter).filter(SystemParameter.code.in_(parameter_codes)).all()
    }
    violations = []

    minimum_length = parameters.get('MINIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD')
    if minimum_length:
        try:
            if len(password) < int(minimum_length):
                violations.append(f'at least {minimum_length} characters')
        except ValueError:
            pass

    maximum_length = parameters.get('MAXIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD')
    if maximum_length:
        try:
            if len(password) > int(maximum_length):
                violations.append(f'no more than {maximum_length} characters')
        except ValueError:
            pass

    special_characters = parameters.get('PASSWORD_SET_LIST_SPECIAL_CHARACTERS')
    if special_characters:
        has_allowed_special_character = any(
            character in special_characters for character in password
        )
        if not has_allowed_special_character:
            violations.append(
                f'at least one special character from {special_characters}'
            )

    if parameters.get('AT_LEAST_ONE_NUMBER_REQUIRED_IN_PASSWORD', '').lower() == 'true' and not any(
        character.isdigit() for character in password
    ):
        violations.append('at least one number')

    if parameters.get('AT_LEAST_ONE_LOWERCASE_CHARACTER_REQUIRED_IN_PASSWORD', '').lower() == 'true' and not any(
        character.islower() for character in password
    ):
        violations.append('at least one lowercase character')

    if parameters.get('AT_LEAST_ONE_UPPERCASE_CHARACTER_REQUIRED_IN_PASSWORD', '').lower() == 'true' and not any(
        character.isupper() for character in password
    ):
        violations.append('at least one uppercase character')

    if violations:
        conditions = ', '.join(violations)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f'Password must meet these conditions: {conditions}. '
                'Please update the password or configure the password conditions in System Parameters.'
            ),
        )

def _get_user_or_404(user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return user

def _is_missing_user_preferences_column(error: ProgrammingError) -> bool:
    return getattr(getattr(error, 'orig', None), 'pgcode', None) == '42703'

def _read_user_preferences(user: User, db: Session) -> tuple[bool, dict[str, Any] | None]:
    try:
        preferences = user.user_preferences
    except ProgrammingError as error:
        db.rollback()
        if _is_missing_user_preferences_column(error):
            return False, None
        raise
    return True, preferences if isinstance(preferences, dict) else None

def _merge_user_preferences(existing: dict[str, Any] | None, updates: dict[str, Any]) -> dict[str, Any]:
    merged = dict(existing) if isinstance(existing, dict) else {}
    for key, value in updates.items():
        current_value = merged.get(key)
        if isinstance(current_value, dict) and isinstance(value, dict):
            merged[key] = _merge_user_preferences(current_value, value)
        else:
            merged[key] = value
    return merged

def _refresh_profile_file(user: User, db: Session) -> None:
    if user.profile_image_file is not None:
        db.refresh(user.profile_image_file)

def _profile_payload(user: User, request: Request, db: Session) -> dict:
    preferences_available, user_preferences = _read_user_preferences(user, db)
    profile_image = None
    if user.profile_image_file and user.profile_image_file.file_path:
        profile_path = get_file_url(user.profile_image_file.file_path)
        profile_image = urljoin(str(request.base_url), profile_path)
    return {
        'id': user.id,
        'tenant_id': user.tenant_id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'date_of_birth': user.date_of_birth,
        'address': user.address,
        'role': user.role.value,
        'status': user.status.value,
        'user_preferences': user_preferences if preferences_available else None,
        'user_preferences_available': preferences_available,
        'profile_image': profile_image,
        'created_at': user.created_at,
        'updated_at': user.updated_at,
    }

def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if '@' not in normalized or normalized.startswith('@') or normalized.endswith('@') or normalized.count('@') != 1:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='A valid email is required')
    return normalized

def _invite_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=25)

def _create_invite_token(email: str, tenant_id: UUID) -> str:
    payload = {'sub': email, 'email': email, 'tenant_id': str(tenant_id), 'exp': _invite_expiry()}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def _verify_invite_token(token: str) -> tuple[str, str | None]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get('email') or payload.get('sub')
        if not email:
            raise ValueError('Missing email')
        tenant_id = payload.get('tenant_id')
        return str(email), str(tenant_id) if tenant_id else None
    except (JWTError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired invite token') from exc

def _access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    return jwt.encode({'sub': str(user.id), 'user_id': str(user.id), 'exp': expires_at}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)