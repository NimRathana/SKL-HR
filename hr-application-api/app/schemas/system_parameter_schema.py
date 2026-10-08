from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemParameterUpdate(BaseModel):
    value: str = Field(min_length=0, max_length=5000)


class SystemParameterResponse(BaseModel):
    id: UUID
    code: str
    name: str
    value: str
    type: str
    category: str | None = None

    model_config = ConfigDict(from_attributes=True)