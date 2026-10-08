import asyncio
import logging
import re
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import parseaddr
from typing import Iterable
from uuid import UUID

from sqlalchemy import func

from app.config.settings import settings
from app.database.session import SessionLocal
from app.models.email_log import EmailBulkOperation, EmailLog
from app.services.notification_service import email_failure_notifier

logger = logging.getLogger(__name__)

EMAIL_PENDING = "pending"
EMAIL_SENDING = "sending"
EMAIL_SENT = "sent"
EMAIL_FAILED = "failed"
_VALID_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_email(value: str) -> bool:
    return bool(_VALID_EMAIL.fullmatch(parseaddr(value)[1]))


def _is_permanent_error(exc: Exception) -> bool:
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return True
    if isinstance(exc, smtplib.SMTPResponseException):
        return exc.smtp_code >= 500
    return isinstance(exc, ValueError)


def _send_smtp(recipient: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_USER
    message["To"] = recipient
    message.set_content(body)

    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=settings.EMAIL_SMTP_TIMEOUT) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
            smtp.send_message(message)
        return

    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=settings.EMAIL_SMTP_TIMEOUT) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
        smtp.send_message(message)


def _claim_log(log_id: UUID) -> bool:
    db = SessionLocal()
    try:
        updated = (
            db.query(EmailLog)
            .filter(EmailLog.id == log_id, EmailLog.status == EMAIL_PENDING)
            .update({EmailLog.status: EMAIL_SENDING}, synchronize_session=False)
        )
        db.commit()
        return updated == 1
    finally:
        db.close()


def _update_log(log_id: UUID, status: str, retry_count: int, error_message: str | None = None) -> None:
    db = SessionLocal()
    try:
        log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
        if log is None:
            logger.error("Email log %s disappeared while processing", log_id)
            return
        log.status = status
        log.retry_count = retry_count
        log.error_message = error_message
        if status == EMAIL_SENT:
            log.sent_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist email log status for %s", log_id)
        raise
    finally:
        db.close()


async def _process_log(log_id: UUID) -> None:
    if not _claim_log(log_id):
        return

    db = SessionLocal()
    try:
        log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
        if log is None:
            logger.error("Email log %s not found after claim", log_id)
            return
        user_id = log.user_id
        operation = db.query(EmailBulkOperation).filter(
            EmailBulkOperation.id == log.operation_id
        ).first()
        notification_user_id = user_id or (operation.created_by if operation else None)
        recipient, subject, body = log.recipient_email, log.subject, log.body
    finally:
        db.close()

    retry_count = 0
    while True:
        if not _is_valid_email(recipient):
            error_message = "Invalid recipient email address"
            _update_log(log_id, EMAIL_FAILED, retry_count, error_message)
            if notification_user_id is not None:
                email_failure_notifier.notify_final_failure(
                    notification_user_id, recipient, error_message
                )
            return
        try:
            await asyncio.to_thread(_send_smtp, recipient, subject, body)
            _update_log(log_id, EMAIL_SENT, retry_count)
            return
        except Exception as exc:
            retry_count += 1
            message = str(exc)[:2000]
            logger.warning("Email %s attempt %s failed: %s", log_id, retry_count, message)
            if _is_permanent_error(exc) or retry_count > settings.EMAIL_MAX_RETRIES:
                _update_log(log_id, EMAIL_FAILED, retry_count, message)
                if notification_user_id is not None:
                    email_failure_notifier.notify_final_failure(
                        notification_user_id, recipient, message
                    )
                return
            await asyncio.sleep(settings.EMAIL_RETRY_BACKOFF_SECONDS * (2 ** (retry_count - 1)))


async def _run_bounded(items: list[UUID], handler, concurrency: int) -> None:
    queue: asyncio.Queue[UUID] = asyncio.Queue()
    for log_id in items:
        queue.put_nowait(log_id)

    async def worker() -> None:
        while True:
            log_id = await queue.get()
            try:
                await handler(log_id)
            except Exception:
                logger.exception("Unhandled error while processing email log %s", log_id)
                try:
                    _update_log(log_id, EMAIL_FAILED, 0, "Unexpected email processing error")
                except Exception:
                    logger.exception("Could not mark email log %s as failed", log_id)
            finally:
                queue.task_done()

    workers = [
        asyncio.create_task(worker())
        for _ in range(min(concurrency, len(items)))
    ]
    await queue.join()
    for task in workers:
        task.cancel()
    await asyncio.gather(*workers, return_exceptions=True)


async def process_bulk_email(operation_id: UUID) -> None:
    recover_stale_sending_logs()
    db = SessionLocal()
    try:
        logs = db.query(EmailLog.id).filter(
            EmailLog.operation_id == operation_id,
            EmailLog.status == EMAIL_PENDING,
        ).all()
        log_ids = [item[0] for item in logs]
    finally:
        db.close()
    await _run_bounded(log_ids, _process_log, settings.EMAIL_MAX_CONCURRENCY)


def run_bulk_email(operation_id: UUID) -> None:
    """Synchronous RQ entry point for the async email processor."""
    asyncio.run(process_bulk_email(operation_id))


def recover_stale_sending_logs() -> int:
    cutoff = datetime.now(timezone.utc) - settings.EMAIL_SENDING_TIMEOUT
    db = SessionLocal()
    try:
        count = (
            db.query(EmailLog)
            .filter(EmailLog.status == EMAIL_SENDING, EmailLog.updated_at < cutoff)
            .update({EmailLog.status: EMAIL_PENDING}, synchronize_session=False)
        )
        db.commit()
        return count
    finally:
        db.close()


def create_bulk_email(
    db,
    created_by: UUID,
    users: Iterable,
    subject: str,
    body: str,
    ip_address: str | None = None,
    device_type: str | None = None,
    location: str | None = None,
) -> EmailBulkOperation:
    operation = EmailBulkOperation(created_by=created_by, total=0)
    db.add(operation)
    db.flush()
    for user in users:
        db.add(EmailLog(
            operation_id=operation.id,
            user_id=user.id,
            recipient_email=user.email.strip().lower(),
            ip_address=ip_address,
            device_type=device_type,
            location=location,
            subject=subject,
            body=body,
            status=EMAIL_PENDING,
        ))
        operation.total += 1
    db.commit()
    db.refresh(operation)
    return operation


def create_queued_email(
    db,
    created_by: UUID | None,
    recipient_email: str,
    subject: str,
    body: str,
    user_id: UUID | None = None,
    ip_address: str | None = None,
    device_type: str | None = None,
    location: str | None = None,
) -> EmailBulkOperation:
    operation = EmailBulkOperation(created_by=created_by, total=1)
    db.add(operation)
    db.flush()
    db.add(EmailLog(
        operation_id=operation.id,
        user_id=user_id,
        recipient_email=recipient_email.strip().lower(),
        ip_address=ip_address,
        device_type=device_type,
        location=location,
        subject=subject,
        body=body,
        status=EMAIL_PENDING,
    ))
    db.commit()
    db.refresh(operation)
    return operation


def get_bulk_status(db, operation_id: UUID) -> dict:
    rows = db.query(EmailLog.status, func.count(EmailLog.id)).filter(
        EmailLog.operation_id == operation_id
    ).group_by(EmailLog.status).all()
    counts = {status: count for status, count in rows}
    return {
        "operation_id": operation_id,
        "total": sum(counts.values()),
        "pending": counts.get(EMAIL_PENDING, 0),
        "sending": counts.get(EMAIL_SENDING, 0),
        "sent": counts.get(EMAIL_SENT, 0),
        "failed": counts.get(EMAIL_FAILED, 0),
    }
