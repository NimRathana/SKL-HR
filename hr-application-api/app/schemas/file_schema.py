from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    file_name: str
    file_type: str | None
    file_category: str | None
    created_at: datetime
