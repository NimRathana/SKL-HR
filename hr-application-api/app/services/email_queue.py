from uuid import UUID
import logging

from redis import Redis
from redis.exceptions import RedisError
from rq import Queue
from sqlalchemy.orm import Session

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailQueueUnavailableError(RuntimeError):
    pass


class EmailDeliveryUnavailableError(RuntimeError):
    pass


def _queue() -> Queue:
    connection = Redis.from_url(settings.REDIS_URL)
    return Queue(
        name=settings.EMAIL_QUEUE_NAME,
        connection=connection,
        default_timeout=settings.EMAIL_QUEUE_JOB_TIMEOUT,
    )


def enqueue_email_operation(operation_id: UUID) -> str:
    try:
        job = _queue().enqueue(
            "app.services.email_service.run_bulk_email",
            operation_id,
            job_id=f"email-operation-{operation_id}",
            result_ttl=86400,
            failure_ttl=604800,
        )
    except RedisError as exc:
        raise EmailQueueUnavailableError(
            "Email queue is unavailable. Start Redis and the email worker."
        ) from exc
    return job.id


def enqueue_or_send_email_operation(operation_id: UUID, db: Session) -> str:
    try:
        return enqueue_email_operation(operation_id)
    except EmailQueueUnavailableError:
        logger.warning(
            "Email queue unavailable for operation %s; attempting immediate delivery",
            operation_id,
        )

    try:
        from app.services.email_service import get_bulk_status, run_bulk_email

        run_bulk_email(operation_id)
        delivery_status = get_bulk_status(db, operation_id)
    except Exception as exc:
        logger.exception("Immediate email delivery failed for operation %s", operation_id)
        raise EmailDeliveryUnavailableError(
            "Email delivery failed. Check the production SMTP settings and try again."
        ) from exc

    if delivery_status["total"] > 0 and delivery_status["sent"] == delivery_status["total"]:
        logger.info("Email operation %s delivered without the background queue", operation_id)
        return f"inline-{operation_id}"

    logger.error(
        "Immediate email delivery did not complete for operation %s: %s",
        operation_id,
        delivery_status,
    )
    raise EmailDeliveryUnavailableError(
        "Email delivery failed. Check the production SMTP settings and try again."
    )