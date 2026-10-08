from uuid import UUID

from redis import Redis
from redis.exceptions import RedisError
from rq import Queue

from app.config.settings import settings


class EmailQueueUnavailableError(RuntimeError):
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