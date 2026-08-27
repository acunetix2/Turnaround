from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.insight import InsightSeverity
from app.schemas.location import LocationResponse


class InsightBase(BaseModel):
    type: str = Field("EXCESSIVE_DWELL", description="Insight category identifier")
    severity: InsightSeverity = Field(InsightSeverity.MEDIUM, description="Severity ranking: low, medium, high")
    title: str = Field(..., description="Short descriptive headline")
    description: str = Field(..., description="Root cause diagnosis and context")
    financial_impact: float = Field(0.0, description="Estimated total excess cost in KES")
    recommendation: str = Field(..., description="Actionable recommendation for dispatcher")
    location_id: Optional[str] = None


class InsightCreate(InsightBase):
    pass


class InsightResponse(InsightBase):
    id: str
    company_id: str
    created_at: datetime
    location: Optional[LocationResponse] = None

    model_config = ConfigDict(from_attributes=True)
