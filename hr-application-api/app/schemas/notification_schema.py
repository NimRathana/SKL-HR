from uuid import UUID

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BulkNotificationRequest(BaseModel):
    user_ids: list[UUID] = Field(min_length=1, max_length=10000)
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=100000)


class BulkNotificationResponse(BaseModel):
    queued: int


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
