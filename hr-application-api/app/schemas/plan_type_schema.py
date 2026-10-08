from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=1000)
    sort_order: int = Field(default=0, ge=0)


class PlanTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=1000)
    sort_order: int | None = Field(default=None, ge=0)


class PlanTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str | None
    sort_order: int
    is_active: bool
    created_at: datetime