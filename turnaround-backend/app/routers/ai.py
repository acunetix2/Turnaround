from typing import Annotated, Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.location import Location
from app.db.models.vehicle import Vehicle
from app.db.models.insight import Insight
from app.deps import get_current_company
from app.engines.ai_advisor import advisor
from app.routers.analytics import get_dashboard, get_location_analytics

router = APIRouter(prefix="/ai", tags=["AI Operational Advisor"])


class CopilotQueryRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None


class CopilotQueryResponse(BaseModel):
    answer: str
    model: str
    status: str


class CorridorAnalysisResponse(BaseModel):
    executive_summary: str
    financial_impact_analysis: str
    primary_bottlenecks: List[Dict[str, Any]]
    immediate_actions: List[str]
    strategic_recommendations: List[str]
    estimated_monthly_savings_kes: float


@router.post("/corridor-analysis", response_model=CorridorAnalysisResponse, summary="Generate AI corridor intelligence report")
async def analyze_corridor(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    # Pull current operational KPIs
    dashboard_metrics = await get_dashboard(db, company_id)
    kpis = dashboard_metrics.model_dump()

    # Pull location bottlenecks
    loc_analytics = await get_location_analytics(db, company_id)
    top_bottlenecks = [loc.model_dump() for loc in loc_analytics[:4]]

    # Pull recent insights
    insights_res = await db.execute(select(Insight).where(Insight.company_id == company_id).limit(5))
    recent_insights = [
        {"title": i.title, "severity": i.severity.value, "financial_impact": i.financial_impact}
        for i in insights_res.scalars().all()
    ]

    report = await advisor.generate_corridor_analysis(
        company_name="Siginon Global Logistics",
        kpi_summary=kpis,
        top_bottlenecks=top_bottlenecks,
        recent_insights=recent_insights
    )

    return CorridorAnalysisResponse(**report)


@router.post("/copilot-query", response_model=CopilotQueryResponse, summary="Query AI Dispatch Copilot")
async def copilot_query(
    payload: CopilotQueryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Pull fleet context
    dashboard_metrics = await get_dashboard(db, company_id)
    loc_analytics = await get_location_analytics(db, company_id)
    
    fleet_context = {
        "active_trucks": dashboard_metrics.active_trucks,
        "trucks_delayed": dashboard_metrics.trucks_delayed,
        "excess_dwell_today_minutes": dashboard_metrics.excess_dwell_today_minutes,
        "top_bottleneck": dashboard_metrics.top_bottleneck,
        "locations": [{"name": l.name, "type": l.location_type, "avg_delay": l.avg_excess_delay_minutes} for l in loc_analytics[:5]]
    }

    result = await advisor.copilot_query(
        query=payload.query,
        fleet_context=fleet_context,
        conversation_history=payload.conversation_history
    )

    return CopilotQueryResponse(**result)
