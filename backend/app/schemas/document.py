"""Document request/response schemas"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id:         int
    title:      str
    filename:   str
    file_type:  str
    file_size:  int
    summary:    Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
