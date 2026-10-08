import logging
from typing import Protocol
from uuid import UUID

from app.database.session import SessionLocal
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class EmailFailureNotifier(Protocol):
    def notify_final_failure(self, user_id: UUID, recipient_email: str, error_message: str) -> None:
        """Notify a user after an email reaches its final failed state."""


class InAppEmailFailureNotifier:
    """Persist final email failures so they appear in the user's notification feed."""

    def notify_final_failure(self, user_id: UUID, recipient_email: str, error_message: str) -> None:
        logger.error(
            "Email delivery permanently failed user_id=%s recipient=%s error=%s",
            user_id,
            recipient_email,
            error_message,
        )
        db = SessionLocal()
        try:
            db.add(Notification(
                user_id=user_id,
                title="Email delivery failed",
                body=(
                    f"Email to {recipient_email} could not be delivered. "
                    f"Error: {error_message[:1000]}"
                ),
            ))
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "Failed to create email failure notification for user_id=%s",
                user_id,
            )
            raise
        finally:
            db.close()


email_failure_notifier: EmailFailureNotifier = InAppEmailFailureNotifier()
