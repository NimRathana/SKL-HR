from collections import defaultdict, deque
from ipaddress import ip_address, ip_network
import logging
from threading import Lock
from time import monotonic
from uuid import UUID

from fastapi import Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.session import SessionLocal
from app.models.security_event import SecurityEvent
from app.utils.request_metadata import get_request_metadata

logger = logging.getLogger(__name__)

FAILED_LOGIN_WINDOW_SECONDS = 10 * 60
FAILED_LOGIN_THRESHOLD = 5
PROTECTED_REQUEST_WINDOW_SECONDS = 5 * 60
PROTECTED_REQUEST_THRESHOLD = 5
NOT_FOUND_WINDOW_SECONDS = 5 * 60
NOT_FOUND_THRESHOLD = 5
REQUEST_FREQUENCY_WINDOW_SECONDS = 60
REQUEST_FREQUENCY_THRESHOLD = 60
ALERT_COOLDOWN_SECONDS = 5 * 60
MAX_TRACKING_WINDOW_SECONDS = FAILED_LOGIN_WINDOW_SECONDS
CLEANUP_INTERVAL_SECONDS = 60


class SecurityEventTracker:
    def __init__(self):
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._last_alert: dict[tuple[str, str], float] = {}
        self._pending_logins: dict[str, int] = defaultdict(int)
        self._lock = Lock()
        self._last_cleanup = monotonic()

    def observe(
        self,
        source_ip: str,
        signal: str,
        window_seconds: int,
        threshold: int,
        now: float | None = None,
    ) -> int | None:
        current_time = monotonic() if now is None else now
        count = self.record(source_ip, signal, window_seconds, current_time)
        return self.alert_for_count(source_ip, signal, count, threshold, current_time)

    def record(
        self,
        source_ip: str,
        signal: str,
        window_seconds: int,
        now: float | None = None,
    ) -> int:
        current_time = monotonic() if now is None else now
        key = (source_ip, signal)
        with self._lock:
            if current_time - self._last_cleanup >= CLEANUP_INTERVAL_SECONDS:
                stale_cutoff = current_time - MAX_TRACKING_WINDOW_SECONDS
                for stale_key, stale_events in list(self._events.items()):
                    while stale_events and stale_events[0] < stale_cutoff:
                        stale_events.popleft()
                    if not stale_events:
                        self._events.pop(stale_key)
                        self._last_alert.pop(stale_key, None)
                self._last_cleanup = current_time

            events = self._events[key]
            cutoff = current_time - window_seconds
            while events and events[0] < cutoff:
                events.popleft()
            events.append(current_time)
            return len(events)

    def recent_count(
        self,
        source_ip: str,
        signal: str,
        window_seconds: int,
        now: float | None = None,
    ) -> int:
        current_time = monotonic() if now is None else now
        key = (source_ip, signal)
        with self._lock:
            events = self._events.get(key)
            if events is None:
                return 0
            cutoff = current_time - window_seconds
            while events and events[0] < cutoff:
                events.popleft()
            if not events:
                self._events.pop(key, None)
                self._last_alert.pop(key, None)
                return 0
            return len(events)

    def begin_login_attempt(
        self,
        source_ip: str,
        now: float | None = None,
    ) -> bool:
        current_time = monotonic() if now is None else now
        key = (source_ip, "failed_login")
        with self._lock:
            events = self._events.get(key)
            cutoff = current_time - FAILED_LOGIN_WINDOW_SECONDS
            if events is not None:
                while events and events[0] < cutoff:
                    events.popleft()
                if not events:
                    self._events.pop(key, None)
                    self._last_alert.pop(key, None)
                    events = None

            failed_count = len(events) if events is not None else 0
            if failed_count + self._pending_logins.get(source_ip, 0) >= FAILED_LOGIN_THRESHOLD:
                return False

            self._pending_logins[source_ip] += 1
            return True

    def finish_login_attempt(
        self,
        source_ip: str,
        failed: bool = False,
        now: float | None = None,
    ) -> int:
        current_time = monotonic() if now is None else now
        key = (source_ip, "failed_login")
        with self._lock:
            pending = self._pending_logins.get(source_ip, 0)
            if pending <= 1:
                self._pending_logins.pop(source_ip, None)
            else:
                self._pending_logins[source_ip] = pending - 1

            if not failed:
                return len(self._events.get(key, ()))

            events = self._events[key]
            cutoff = current_time - FAILED_LOGIN_WINDOW_SECONDS
            while events and events[0] < cutoff:
                events.popleft()
            events.append(current_time)
            return len(events)

    def alert_for_count(
        self,
        source_ip: str,
        signal: str,
        count: int,
        threshold: int,
        now: float | None = None,
    ) -> int | None:
        current_time = monotonic() if now is None else now
        key = (source_ip, signal)
        with self._lock:
            if count < threshold:
                return None

            last_alert = self._last_alert.get(key)
            if last_alert is not None and current_time - last_alert < ALERT_COOLDOWN_SECONDS:
                return None

            self._last_alert[key] = current_time
            return count


tracker = SecurityEventTracker()


def get_security_request_metadata(request: Request) -> tuple[str | None, str | None]:
    _, _, location = get_request_metadata(request)
    client_ip = request.client.host if request.client else None
    try:
        parsed_client_ip = ip_address(client_ip) if client_ip else None
    except ValueError:
        parsed_client_ip = None

    if parsed_client_ip is None:
        return None, location

    is_trusted_proxy = any(
        parsed_client_ip in ip_network(proxy_network, strict=False)
        for proxy_network in settings.TRUSTED_PROXY_IPS
    )
    if not is_trusted_proxy:
        return parsed_client_ip.compressed, location

    forwarded_for, _, _ = get_request_metadata(request)
    if forwarded_for:
        try:
            return ip_address(forwarded_for).compressed, location
        except ValueError:
            pass
    return parsed_client_ip.compressed, location


def store_security_event(
    request: Request,
    source_ip: str | None,
    location: str | None,
    reason: str,
    action: str,
    status_code: int | None,
    user_id: UUID | None = None,
    db: Session | None = None,
) -> None:
    owns_session = db is None
    session = db if db is not None else SessionLocal()
    try:
        session.add(SecurityEvent(
            user_id=user_id,
            ip_address=source_ip,
            location=location,
            method=request.method[:10],
            endpoint=request.url.path[:255],
            status_code=status_code,
            reason=reason,
            action=action,
        ))
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Unable to persist a security event for endpoint %s", request.url.path)
    finally:
        if owns_session:
            session.close()


def observe_failed_login(request: Request, user_id: UUID | None, db: Session) -> None:
    source_ip, location = get_security_request_metadata(request)
    if not source_ip:
        return

    count = tracker.finish_login_attempt(source_ip, failed=True)
    store_security_event(
        request,
        source_ip,
        location,
        "Failed login attempt",
        "Login rejected; no additional blocking applied",
        401,
        user_id,
        db,
    )

    alert_count = tracker.alert_for_count(
        source_ip,
        "failed_login",
        count,
        FAILED_LOGIN_THRESHOLD,
    )
    if alert_count is not None:
        store_security_event(
            request,
            source_ip,
            location,
            f"{alert_count} failed login attempts from this IP within 10 minutes",
            "Repeated attempts detected; no additional blocking applied",
            401,
            user_id,
            db,
        )


def store_rate_limit_event(
    request: Request,
    source_ip: str,
    location: str | None,
    reason: str,
    user_id: UUID | None = None,
    db: Session | None = None,
) -> None:
    store_security_event(
        request,
        source_ip,
        location,
        reason,
        "Rate-limited; request blocked (HTTP 429)",
        429,
        user_id,
        db,
    )


def should_log_rate_limit(source_ip: str, signal: str, count: int, threshold: int) -> bool:
    return tracker.alert_for_count(source_ip, signal, count, threshold) is not None


def observe_request(request: Request, status_code: int, user_id: UUID | None) -> None:
    source_ip, location = get_security_request_metadata(request)
    if not source_ip or request.url.path.startswith("/uploads/"):
        return

    request_count = tracker.recent_count(
        source_ip,
        "api_request",
        REQUEST_FREQUENCY_WINDOW_SECONDS,
    )
    alert_count = tracker.alert_for_count(
        source_ip,
        "request_frequency",
        request_count,
        REQUEST_FREQUENCY_THRESHOLD,
    )
    if alert_count is not None:
        store_security_event(
            request,
            source_ip,
            location,
            f"Unusual request frequency: at least {alert_count} requests from this IP within 1 minute",
            "Monitored; request not blocked",
            status_code,
            user_id,
        )

    observations: list[tuple[str, int, int, str]] = []
    if status_code in (401, 403) and request.url.path not in {"/auth/login", "/user/login"}:
        observations.append((
            f"protected:{request.method}:{request.url.path}",
            PROTECTED_REQUEST_WINDOW_SECONDS,
            PROTECTED_REQUEST_THRESHOLD,
            f"Repeated denied requests to a protected endpoint (HTTP {status_code})",
        ))
    if status_code == 404:
        observations.append((
            f"not_found:{request.method}:{request.url.path}",
            NOT_FOUND_WINDOW_SECONDS,
            NOT_FOUND_THRESHOLD,
            "Repeated requests to a nonexistent endpoint (HTTP 404)",
        ))

    for signal, window_seconds, threshold, reason in observations:
        count = tracker.observe(source_ip, signal, window_seconds, threshold)
        if count is None:
            continue
        action = (
            f"Request denied (HTTP {status_code})"
            if status_code in (401, 403, 404)
            else "Monitored; request not blocked"
        )
        store_security_event(request, source_ip, location, reason, action, status_code, user_id)

    if status_code == 429:
        store_security_event(
            request,
            source_ip,
            location,
            "Request was rate-limited by the application",
            "Rate-limited (HTTP 429)",
            status_code,
            user_id,
        )
