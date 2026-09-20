from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


class ContainerCreate(BaseModel):
    container_number: str = Field(min_length=4, max_length=32)
    container_type: Optional[str] = None
    status: Literal['available', 'maintenance', 'retired'] = 'available'
    notes: Optional[str] = None


class ContainerResponse(ContainerCreate):
    id: str
    company_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
