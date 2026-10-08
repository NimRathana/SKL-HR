from uuid import UUID

from pydantic import BaseModel, Field


class BulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=500)


class BulkDeleteResponse(BaseModel):
    requested: int
    deleted: int
    deleted_ids: list[UUID]
