from datetime import datetime, timezone, date
from typing import Annotated, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models.dwell_event import DwellEvent
from app.db.models.vehicle import Vehicle, VehicleStatus
from app.db.models.location import Location
from app.deps import get_current_company
from app.schemas.analytics import DashboardMetrics, LocationPerformance, VehiclePerformance, TrendAnalytics, TrendPoint
from app.engines.analytics import compute_dashboard_metrics, compute_location_analytics, DwellRecord

router = APIRouter(prefix="/analytics", tags=["Analytics"])


async def _load_dwell_records(db: AsyncSession, company_id: str, since: datetime = None) -> List[DwellRecord]:
    q = (
        select(DwellEvent)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(Vehicle.company_id == company_id, DwellEvent.departure_time.isnot(None))
    )
    if since:
        q = q.where(DwellEvent.arrival_time >= since)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        DwellRecord(
            id=r.id,
            vehicle_id=r.vehicle_id,
            location_id=r.location_id,
            arrival_time=r.arrival_time,
            departure_time=r.departure_time,
            dwell_minutes=r.dwell_minutes,
            expected_minutes=r.expected_minutes,
            excess_minutes=r.excess_minutes,
            estimated_cost=r.estimated_cost,
        )
        for r in rows
    ]


@router.get("/dashboard", response_model=DashboardMetrics, summary="Real-time operational KPI dashboard")
async def get_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    # Active vehicle count
    active_count = (await db.execute(
        select(func.count()).select_from(Vehicle).where(
            Vehicle.company_id == company_id,
            Vehicle.status.in_([VehicleStatus.ACTIVE, VehicleStatus.IN_TRANSIT, VehicleStatus.DELAYED])
        )
    )).scalar_one()

    # Delayed trucks — vehicles with active dwell events beyond expected minutes
    in_progress_delayed = (await db.execute(
        select(func.count()).select_from(DwellEvent)
        .join(Vehicle, DwellEvent.vehicle_id == Vehicle.id)
        .where(
            Vehicle.company_id == company_id,
            DwellEvent.departure_time.is_(None),
            DwellEvent.excess_minutes > 0
        )
    )).scalar_one()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_records = await _load_dwell_records(db, company_id, since=today_start)

    # Location name lookup
    locs = (await db.execute(select(Location.id, Location.name).where(Location.company_id == company_id))).all()
    loc_names = {l.id: l.name for l in locs}

    metrics = compute_dashboard_metrics(active_count, in_progress_delayed, today_records, loc_names)
    return DashboardMetrics(**metrics)


@router.get("/locations", response_model=List[LocationPerformance], summary="Per-location dwell performance")
async def get_location_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    locs_result = await db.execute(select(Location).where(Location.company_id == company_id))
    locations = locs_result.scalars().all()
    all_records = await _load_dwell_records(db, company_id)

    results = []
    for loc in locations:
        loc_records = [r for r in all_records if r.location_id == loc.id]
        perf = compute_location_analytics(
            loc.id, loc.name, loc.location_type.value,
            loc.expected_dwell_minutes, loc_records
        )
        results.append(LocationPerformance(**perf))

    return sorted(results, key=lambda x: x.avg_excess_delay_minutes, reverse=True)


@router.get("/vehicles", response_model=List[VehiclePerformance], summary="Per-vehicle turnaround performance")
async def get_vehicle_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    vehicles = (await db.execute(select(Vehicle).where(Vehicle.company_id == company_id))).scalars().all()
    all_records = await _load_dwell_records(db, company_id)

    results = []
    for v in vehicles:
        v_records = [r for r in all_records if r.vehicle_id == v.id]
        total_trips = len(v_records)
        total_dwell = sum(r.dwell_minutes for r in v_records)
        total_excess = sum(r.excess_minutes for r in v_records)
        total_cost = sum(r.estimated_cost for r in v_records)
        results.append(VehiclePerformance(
            id=v.id,
            registration_number=v.registration_number,
            vehicle_type=v.vehicle_type,
            total_trips=total_trips,
            total_dwell_minutes=round(total_dwell, 1),
            excess_dwell_minutes=round(total_excess, 1),
            total_excess_cost=round(total_cost, 2),
            status=v.status.value,
        ))
    return sorted(results, key=lambda x: x.excess_dwell_minutes, reverse=True)


@router.get("/trends", response_model=TrendAnalytics, summary="Time-series trends for charting")
async def get_trends(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    days: int = 30,
):
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    records = await _load_dwell_records(db, company_id, since=since)

    # Group by date
    day_map: dict = {}
    for r in records:
        day_key = r.arrival_time.date().isoformat()
        if day_key not in day_map:
            day_map[day_key] = {"dwell": 0.0, "excess": 0.0, "cost": 0.0, "visits": 0}
        day_map[day_key]["dwell"] += r.dwell_minutes
        day_map[day_key]["excess"] += r.excess_minutes
        day_map[day_key]["cost"] += r.estimated_cost
        day_map[day_key]["visits"] += 1

    points = [
        TrendPoint(
            date=day,
            total_dwell_minutes=round(v["dwell"], 1),
            excess_dwell_minutes=round(v["excess"], 1),
            financial_impact_kes=round(v["cost"], 2),
            visit_count=v["visits"],
        )
        for day, v in sorted(day_map.items())
    ]
    return TrendAnalytics(timeframe=f"last_{days}_days", points=points)
