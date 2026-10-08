from uuid import UUID

from pydantic import BaseModel, Field


class BulkEmailRequest(BaseModel):
    user_ids: list[UUID] = Field(min_length=1, max_length=10000)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=100000)


class BulkEmailQueuedResponse(BaseModel):
    operation_id: UUID
    queued: int


class BulkEmailStatusResponse(BaseModel):
    operation_id: UUID
    total: int
    pending: int
    sending: int
    sent: int
    failed: int
