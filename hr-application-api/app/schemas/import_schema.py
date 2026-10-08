from typing import Any

from pydantic import BaseModel, Field


class WorkbookImportRequest(BaseModel):
    companies: list[dict[str, Any]] = Field(default_factory=list)
    positions: list[dict[str, Any]] = Field(default_factory=list)
    employees: list[dict[str, Any]] = Field(default_factory=list)