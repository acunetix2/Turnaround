"""
Turnaround Demo Seed Script
===========================
Generates a realistic East African haulage demo dataset:
- Siginon Global Logistics Ltd company & users
- 5 vehicles (Scania G460, Volvo FH16, Mercedes Actros, MAN TGX, DAF XF)
- 5 key corridor locations (Kilindini Port, Nairobi ICD, Malaba OSBP, Athi River, Namanga)
- 30 days of simulated GPS events producing realistic dwell incidents

Usage:
    python scripts/seed.py

Requires DATABASE_URL set in .env or environment.
"""

import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.db.base import Base
from app.db.models.company import Company
from app.db.models.user import User, UserRole
from app.db.models.vehicle import Vehicle, VehicleStatus
from app.db.models.location import Location, LocationType
from app.db.models.trip import Trip, TripStatus
from app.db.models.dwell_event import DwellEvent


# ── Seed Data ────────────────────────────────────────────────────────────────

COMPANY = {
    "id": "seed-company-siginon-001",
    "name": "Siginon Global Logistics Ltd",
}

USERS = [
    {"id": "seed-user-admin-001", "name": "James Mwangi", "email": "operations@siginon.com", "role": UserRole.ADMIN},
    {"id": "seed-user-fm-001", "name": "Patricia Achieng", "email": "fleetmanager@siginon.com", "role": UserRole.FLEET_MANAGER},
    {"id": "seed-user-disp-001", "name": "Kevin Otieno", "email": "dispatcher@siginon.com", "role": UserRole.DISPATCHER},
    {"id": "seed-user-analyst-001", "name": "Amina Hassan", "email": "analyst@siginon.com", "role": UserRole.ANALYST},
]

VEHICLES = [
    {"id": "seed-veh-001", "registration_number": "KBZ 482T", "vehicle_type": "Scania G460 6x4 Tractor", "hourly_operating_cost": 4200.0},
    {"id": "seed-veh-002", "registration_number": "KCA 210P", "vehicle_type": "Volvo FH16 750 6x4", "hourly_operating_cost": 3800.0},
    {"id": "seed-veh-003", "registration_number": "KDD 531M", "vehicle_type": "Mercedes-Benz Actros 3340", "hourly_operating_cost": 3500.0},
    {"id": "seed-veh-004", "registration_number": "KDB 914Y", "vehicle_type": "MAN TGX 33.440 6x4", "hourly_operating_cost": 3600.0},
    {"id": "seed-veh-005", "registration_number": "KDA 123X", "vehicle_type": "DAF XF 480 Super Space Cab", "hourly_operating_cost": 3700.0},
]

LOCATIONS = [
    {
        "id": "seed-loc-kilindini-001",
        "name": "Kilindini Container Port Gate 14",
        "location_type": LocationType.PORT,
        "latitude": -4.0680,
        "longitude": 39.6632,
        "geofence_radius": 400.0,
        "expected_dwell_minutes": 90.0,
    },
    {
        "id": "seed-loc-nairobi-icd-001",
        "name": "Nairobi ICD Dry Port – Embakasi",
        "location_type": LocationType.DEPOT,
        "latitude": -1.3134,
        "longitude": 36.9038,
        "geofence_radius": 350.0,
        "expected_dwell_minutes": 75.0,
    },
    {
        "id": "seed-loc-malaba-001",
        "name": "Malaba OSBP Border Crossing",
        "location_type": LocationType.BORDER_CROSSING,
        "latitude": 0.6333,
        "longitude": 34.2667,
        "geofence_radius": 300.0,
        "expected_dwell_minutes": 120.0,
    },
    {
        "id": "seed-loc-athi-001",
        "name": "Athi River Logistics Park – Bay 12",
        "location_type": LocationType.WAREHOUSE,
        "latitude": -1.4618,
        "longitude": 36.9922,
        "geofence_radius": 250.0,
        "expected_dwell_minutes": 60.0,
    },
    {
        "id": "seed-loc-namanga-001",
        "name": "Namanga Border Post",
        "location_type": LocationType.BORDER_CROSSING,
        "latitude": -2.5474,
        "longitude": 36.7917,
        "geofence_radius": 300.0,
        "expected_dwell_minutes": 90.0,
    },
]


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


async def seed(db: AsyncSession):
    print("🌱 Seeding Turnaround demo data into Supabase PostgreSQL...")

    # Company
    company = Company(id=COMPANY["id"], name=COMPANY["name"])
    db.add(company)
    await db.flush()
    print(f"  ✓ Company: {company.name}")

    # Users
    for u in USERS:
        db.add(User(id=u["id"], company_id=company.id, name=u["name"], email=u["email"], role=u["role"]))
    await db.flush()
    print(f"  ✓ {len(USERS)} users created")

    # Vehicles
    vehicles = []
    for v in VEHICLES:
        veh = Vehicle(
            id=v["id"],
            company_id=company.id,
            registration_number=v["registration_number"],
            vehicle_type=v["vehicle_type"],
            hourly_operating_cost=v["hourly_operating_cost"],
            status=VehicleStatus.ACTIVE,
        )
        db.add(veh)
        vehicles.append(veh)
    await db.flush()
    print(f"  ✓ {len(vehicles)} vehicles registered")

    # Locations
    locations = []
    for l in LOCATIONS:
        loc = Location(company_id=company.id, **l)
        db.add(loc)
        locations.append(loc)
    await db.flush()
    print(f"  ✓ {len(locations)} corridor locations created")

    # Simulate 30 days of dwell events (incl. the spec's 5h12m KDA 123X scenario)
    now = datetime.now(timezone.utc)
    dwell_events_created = 0

    for day_offset in range(30):
        day_start = now - timedelta(days=day_offset)

        for vehicle in vehicles:
            # 1-3 location visits per vehicle per day
            visit_count = random.randint(1, 3)
            visited = random.sample(locations, min(visit_count, len(locations)))

            hour = random.randint(5, 22)
            for loc in visited:
                arrival = day_start.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)

                # Occasionally simulate severe delay (spec scenario)
                if vehicle.registration_number == "KDA 123X" and loc.name.startswith("Kilindini") and day_offset == 0:
                    dwell_mins = 312.0  # 5h 12m — spec reference scenario
                else:
                    base = loc.expected_dwell_minutes
                    # 30% chance of delay, rest are normal or slightly over
                    roll = random.random()
                    if roll < 0.15:
                        dwell_mins = base * random.uniform(1.5, 2.8)  # severe
                    elif roll < 0.35:
                        dwell_mins = base * random.uniform(1.2, 1.5)  # medium delay
                    else:
                        dwell_mins = base * random.uniform(0.7, 1.15)  # normal

                departure = arrival + timedelta(minutes=dwell_mins)
                expected = loc.expected_dwell_minutes
                excess = max(0.0, dwell_mins - expected)
                cost = round((excess / 60.0) * vehicle.hourly_operating_cost, 2)

                dwell = DwellEvent(
                    id=str(uuid.uuid4()),
                    vehicle_id=vehicle.id,
                    location_id=loc.id,
                    arrival_time=_utc(arrival),
                    departure_time=_utc(departure),
                    dwell_minutes=round(dwell_mins, 2),
                    expected_minutes=expected,
                    excess_minutes=round(excess, 2),
                    estimated_cost=cost,
                )
                db.add(dwell)
                dwell_events_created += 1
                hour = (hour + int(dwell_mins / 60) + 1) % 24

    await db.flush()
    print(f"  ✓ {dwell_events_created} dwell events generated (30 days)")
    print(f"    → Spec scenario: KDA 123X at Kilindini Gate 14 — 5h 12m dwell seeded")

    await db.commit()
    print("\n✅ Seed complete. Start the API: uvicorn app.main:app --reload --port 8000")


async def main():
    eng = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
    SessionLocal = async_sessionmaker(bind=eng, expire_on_commit=False, class_=AsyncSession)

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        await seed(db)

    await eng.dispose()


if __name__ == "__main__":
    asyncio.run(main())
