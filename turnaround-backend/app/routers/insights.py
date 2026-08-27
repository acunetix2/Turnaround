import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.insight import Insight
from app.db.models.location import Location
from app.db.models.vehicle import Vehicle
from app.db.models.dwell_event import DwellEvent
from app.deps import get_current_company
from app.schemas.insight import InsightResponse
from app.schemas.common import PaginatedResponse
from app.engines.intelligence import RuleBasedIntelligenceEngine
from app.engines.analytics import compute_location_analytics, DwellRecord
from app.config import settings

router = APIRouter(prefix="/insights", tags=["Insights"])
_scorer = RuleBasedIntelligenceEngine(
    high_mult=settings.SEVERITY_HIGH_MULTIPLIER,
    med_mult=settings.SEVERITY_MEDIUM_MULTIPLIER,
)


@router.get("", response_model=PaginatedResponse[InsightResponse], summary="List operational insights")
async def list_insights(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    base_q = (
        select(Insight)
        .where(Insight.company_id == company_id)
        .options(selectinload(Insight.location))
    )
    if severity:
        base_q = base_q.where(Insight.severity == severity)

    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    items = (await db.execute(base_q.order_by(Insight.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return PaginatedResponse(items=list(items), total=total, limit=limit, offset=offset)


@router.post("/analyze", response_model=List[InsightResponse],
             summary="Run intelligence analysis and persist new insights")
async def run_analysis(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    """
    Triggers the rule-based intelligence pipeline over all company locations.
    Generates severity-ranked insights from dwell event patterns and persists them.
    """
    # Load all locations and their dwell records
    locations = (await db.execute(select(Location).where(Location.company_id == company_id))).scalars().all()

    all_dwell_result = await db.execute(
        select(DwellEvent)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id, DwellEvent.departure_time.isnot(None))
    )
    all_dwell_rows = all_dwell_result.scalars().all()

    records_by_loc: dict = {}
    for r in all_dwell_rows:
        records_by_loc.setdefault(r.location_id, []).append(
            DwellRecord(
                id=r.id, vehicle_id=r.vehicle_id, location_id=r.location_id,
                arrival_time=r.arrival_time, departure_time=r.departure_time,
                dwell_minutes=r.dwell_minutes, expected_minutes=r.expected_minutes,
                excess_minutes=r.excess_minutes, estimated_cost=r.estimated_cost,
            )
        )

    new_insights: List[Insight] = []
    for loc in locations:
        loc_records = records_by_loc.get(loc.id, [])
        if not loc_records:
            continue

        perf = compute_location_analytics(
            loc.id, loc.name, loc.location_type.value,
            loc.expected_dwell_minutes, loc_records
        )

        delayed_count = sum(1 for r in loc_records if r.excess_minutes > 0)
        raw = _scorer.analyze_location_performance(
            location_id=loc.id,
            location_name=loc.name,
            location_type=loc.location_type.value,
            avg_dwell=perf["avg_dwell_minutes"],
            expected_dwell=perf["expected_dwell_minutes"],
            total_excess_cost=perf["total_excess_cost"],
            delayed_visits_count=delayed_count,
            peak_period=perf.get("peak_bottleneck_period"),
        )

        if raw:
            insight = Insight(
                id=str(uuid.uuid4()),
                company_id=company_id,
                location_id=raw.location_id,
                type=raw.type,
                severity=raw.severity,
                title=raw.title,
                description=raw.description,
                financial_impact=raw.financial_impact,
                recommendation=raw.recommendation,
            )
            db.add(insight)
            new_insights.append(insight)

    if new_insights:
        await db.commit()
        for ins in new_insights:
            await db.refresh(ins)

    return new_insights
