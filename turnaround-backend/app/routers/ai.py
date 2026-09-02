from typing import Annotated, Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.company import Company
from app.db.models.dwell_event import DwellEvent
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
    chart_data: Optional[Dict[str, Any]] = None


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
    # Fetch company name
    company_res = await db.execute(select(Company).where(Company.id == company_id))
    company = company_res.scalar_one_or_none()
    company_name = company.name if company else "Siginon Global Logistics"

    # Pull current operational KPIs
    dashboard_metrics = await get_dashboard(db, company_id)
    kpis = dashboard_metrics.model_dump()

    # Pull location bottlenecks
    loc_analytics = await get_location_analytics(db, company_id)
    top_bottlenecks = [loc.model_dump() for loc in loc_analytics[:5]]

    # Pull recent insights
    insights_res = await db.execute(select(Insight).where(Insight.company_id == company_id).limit(5))
    recent_insights = [
        {"title": i.title, "severity": i.severity.value, "financial_impact": i.financial_impact}
        for i in insights_res.scalars().all()
    ]

    report = await advisor.generate_corridor_analysis(
        company_name=company_name,
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

    # Fetch company name
    company_res = await db.execute(select(Company).where(Company.id == company_id))
    company = company_res.scalar_one_or_none()
    company_name = company.name if company else "Siginon Global Logistics"

    # Pull live vehicles
    vehicles_res = await db.execute(select(Vehicle).where(Vehicle.company_id == company_id))
    vehicles = vehicles_res.scalars().all()

    # Pull active dwells (in-progress)
    active_dwells_res = await db.execute(
        select(DwellEvent, Vehicle, Location)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .join(Location, DwellEvent.location_id == Location.id)
        .where(Vehicle.company_id == company_id, DwellEvent.departure_time.is_(None))
    )
    active_dwells = [
        {
            "vehicle": v.registration_number,
            "location": loc.name,
            "arrival_time": d.arrival_time.isoformat() if d.arrival_time else "",
            "dwell_minutes": d.dwell_minutes,
            "expected_minutes": d.expected_minutes,
            "excess_minutes": d.excess_minutes,
            "estimated_cost_kes": d.estimated_cost
        }
        for d, v, loc in active_dwells_res.all()
    ]

    # Pull metrics & locations
    dashboard_metrics = await get_dashboard(db, company_id)
    loc_analytics = await get_location_analytics(db, company_id)

    fleet_context = {
        "company_name": company_name,
        "active_trucks": dashboard_metrics.active_trucks,
        "trucks_delayed": dashboard_metrics.trucks_delayed,
        "excess_dwell_today_minutes": dashboard_metrics.excess_dwell_today_minutes,
        "financial_loss_today_kes": dashboard_metrics.estimated_financial_impact,
        "top_bottleneck": dashboard_metrics.top_bottleneck,
        "vehicles": [
            {
                "plate": v.registration_number,
                "status": v.status.value if hasattr(v.status, 'value') else v.status,
                "type": v.vehicle_type,
                "hourly_operating_cost": v.hourly_operating_cost,
                "current_location": getattr(v, 'current_location_name', None),
                "driver": getattr(v, 'driver_name', None),
                "container": getattr(v, 'container_number', None),
            }
            for v in vehicles[:15]
        ],
        "active_delays_at_stops": active_dwells,
        "monitored_locations": [
            {
                "name": l.name,
                "type": l.location_type,
                "expected_sla_minutes": l.expected_dwell_minutes,
                "avg_actual_dwell_minutes": l.avg_dwell_minutes,
                "avg_excess_delay": l.avg_excess_delay_minutes,
                "total_visits": l.total_visits,
                "financial_loss_kes": getattr(l, 'total_excess_cost', 0)
            }
            for l in loc_analytics[:8]
        ],
        "corridors": [
            "Northern Corridor (Mombasa Port -> Nairobi ICD -> Malaba OSBP Border)",
            "Namanga Corridor (Nairobi -> Kajiado -> Namanga OSBP Border)",
            "Western Lake Link (Nakuru -> Kericho -> Kisumu Container Port)"
        ]
    }

    result = await advisor.copilot_query(
        query=payload.query,
        fleet_context=fleet_context,
        conversation_history=payload.conversation_history
    )

    return CopilotQueryResponse(**result)
