# AGENT BUILD PROMPT — Turnaround Backend (Python + FastAPI + Supabase Postgres)

## ROLE

You are a senior backend engineer operating autonomously in an agentic coding environment. You have full read/write access to the repository, a terminal, and the ability to run migrations, tests, and a local dev server. You do not stop to ask clarifying questions unless a decision is destructive, ambiguous at the data-integrity level, or explicitly flagged below as a checkpoint. Default to the spec. Log every assumption you make in `DECISIONS.md` at the repo root as you go.

## MISSION

Build the backend for **Turnaround**, an operational intelligence platform for trucking/logistics fleets. Turnaround ingests GPS/telematics events, detects geofenced dwell events at operational locations, compares actual vs expected dwell time, calculates the financial cost of excess delay, and generates ranked, actionable insights. This backend is the operational processing layer — it does not render UI. It is consumed by a separate React frontend and must expose a clean, versioned REST contract.

Core question the system must answer via its API: **"Where are our trucks losing productive time, why is it happening, and how much is it costing us?"**

## NON-GOALS (do not build these)

- No GPS tracking hardware integration in v1 — accept simulated/webhook-style GPS payloads.
- No route optimization or dispatch logic.
- No frontend code, no HTML templates.
- Do not replace or duplicate telematics/fleet-management systems — this is an intelligence layer that sits alongside them.

## TECH STACK (fixed — do not substitute without logging in DECISIONS.md)

- **Language**: Python 3.11+
- **API framework**: FastAPI
- **Validation**: Pydantic v2 (strict models, no `Any` leakage into response schemas)
- **ORM**: SQLAlchemy 2.0 (async engine, `asyncpg` driver)
- **DB**: PostgreSQL via Supabase
- **Auth**: Supabase Auth — backend validates Supabase-issued JWTs on every protected route; do not implement your own auth/session system
- **Geospatial**: Shapely + GeoPandas for geofence math (PostGIS is a future-phase optimization — do not block v1 on it)
- **Analytics**: Pandas, NumPy
- **ML (Phase 3 only, stub interfaces now)**: scikit-learn, XGBoost
- **Server**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Dependency file**: `requirements.txt`, installed via `pip install -r requirements.txt`
- **Testing**: pytest + pytest-asyncio + httpx AsyncClient against a test schema
- **Hosting target**: Render (build/start commands must work unmodified on Render)

## SYSTEM ARCHITECTURE (build to this shape exactly)

```
GPS Devices / Telematics / Simulated GPS
            │
            ▼
      FastAPI (app/main.py)
            │
   ┌────────┼────────┐
   ▼        ▼         ▼
Data      Geofencing  Dwell
Ingestion Engine      Engine
   └────────┼────────┘
            ▼
      Analytics Engine
            │
            ▼
      Intelligence Engine
            │
   ┌────────┴────────┐
   ▼                  ▼
Financial Impact   Predictions
Pattern Analysis    / ML Models
   └────────┬────────┘
            ▼
    Supabase Postgres
```

Each engine is a distinct, independently testable Python module/package under `app/engines/`. No engine should import FastAPI or Pydantic request/response models directly — engines operate on plain dataclasses/DataFrames and are called *from* route handlers, not coupled to HTTP.

## PROJECT STRUCTURE (scaffold this first)

```
/app
  main.py                  # FastAPI app factory, router registration, CORS, startup/shutdown
  config.py                # settings via pydantic-settings, env-driven
  deps.py                  # shared dependencies (db session, current_user, current_company)
  auth/
    jwt.py                 # Supabase JWT validation + claims extraction
    rbac.py                # role checks: admin, fleet_manager, dispatcher, analyst
  db/
    session.py              # async engine/session factory
    base.py                  # declarative base
    models/                  # SQLAlchemy models — one file per table (see schema below)
  schemas/                  # Pydantic request/response models, mirrors models/ 1:1
  routers/
    vehicles.py
    gps_events.py
    locations.py
    trips.py
    dwell_events.py
    analytics.py
    insights.py
    predictions.py
    health.py
  engines/
    geofencing.py           # point-in-geofence logic
    dwell.py                 # arrival/departure/dwell-minutes state machine
    analytics.py              # aggregate stats: mean/median/max dwell, trends
    intelligence.py            # rule-based insight generation (v1), pluggable scorer interface (v3)
    financial.py                # cost calculators
  services/                     # orchestration layer that composes engines + DB writes
  tests/
    unit/                        # per-engine, no DB, no network
    integration/                 # full route tests against test DB
  alembic/                        # migrations (or Supabase SQL migrations — pick one, document in DECISIONS.md)
requirements.txt
DECISIONS.md
README.md
```

## DATA MODEL — implement exactly these tables first (extend only if a route needs a field the schema is missing; log additions)

```sql
companies(id, name, created_at)

users(id, company_id, name, email, role, created_at)
-- role enum: admin | fleet_manager | dispatcher | analyst

vehicles(id, company_id, registration_number, vehicle_type, capacity,
         hourly_operating_cost, status, created_at)

locations(id, company_id, name, location_type, latitude, longitude,
          geofence_radius, expected_dwell_minutes)
-- location_type: warehouse | customer_facility | depot | port | border_crossing | loading_point | unloading_point

trips(id, vehicle_id, origin_id, destination_id,
      planned_departure, planned_arrival, actual_departure, actual_arrival)

gps_events(id, vehicle_id, latitude, longitude, speed, recorded_at)

dwell_events(id, vehicle_id, location_id, trip_id,
             arrival_time, departure_time,
             dwell_minutes, expected_minutes, excess_minutes,
             estimated_cost)

insights(id, company_id, type, severity, title, description,
         location_id, financial_impact, recommendation, created_at)
-- severity: low | medium | high
-- type: EXCESSIVE_DWELL | RECURRING_BOTTLENECK | DELAY_RISK | ... (extensible enum, don't hardcode a closed set beyond these)
```

Constraints to enforce at the DB level, not just in application code:
- Every tenant-scoped table (`vehicles`, `locations`, `trips`, `gps_events`, `dwell_events`, `insights`) must be filterable/isolated by `company_id` (directly or via join through `vehicle_id`/`location_id`). Add Supabase Row Level Security policies scoped to `company_id` matching the authenticated user's company — do not rely solely on application-layer filtering.
- Foreign keys with `ON DELETE CASCADE` where a child record is meaningless without its parent (e.g. `dwell_events.vehicle_id`), `ON DELETE RESTRICT` where deletion should be blocked (e.g. don't allow deleting a `location` with historical `dwell_events`).
- `dwell_minutes`, `expected_minutes`, `excess_minutes` must be computed server-side, never trusted from client input.

## CORE FORMULAS (implement as pure, unit-tested functions — these are the product's financial credibility, get them exactly right)

```python
dwell_minutes = departure_time - arrival_time
excess_minutes = max(0, actual_dwell_minutes - expected_dwell_minutes)
delay_cost = (excess_minutes / 60) * vehicle.hourly_operating_cost
```

Expected dwell time resolution order (implement as a chain, first match wins):
1. Location-specific historical average (if ≥ N historical visits, N configurable, default 10)
2. Company-defined threshold on the location record (`locations.expected_dwell_minutes`)
3. Customer SLA (if present — stub the field/hook now, full SLA model is Phase 2)
4. Global default fallback (configurable)

## BUILD ORDER — execute in phases, do not skip ahead. Each phase must have passing tests before you move to the next.

### Phase 0 — Scaffold
- Repo structure above, `config.py` reading `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `JWT_SECRET`/JWKS URL from env.
- `health.py` router with `GET /health` returning DB connectivity status.
- CI-runnable `pytest` with zero tests passing (green scaffold).

### Phase 1 — Auth
- Implement Supabase JWT validation middleware/dependency (`deps.get_current_user`). Reject unauthenticated requests to all non-health routes with 401.
- Implement `deps.get_current_company` derived from the authenticated user.
- Implement RBAC dependency factory `require_role(*roles)` and apply it per-route per section 6 of the spec (e.g. only `admin`/`fleet_manager` can mutate `vehicles`/`locations`; `dispatcher` and `analyst` are read-mostly — use your judgment on write scopes and document the matrix in `README.md`).
- Tests: valid token passes, expired/invalid token 401s, wrong-role write attempt 403s.

### Phase 2 — Core CRUD (Vehicles, Locations, Trips)
Implement exactly these endpoints, request/response schemas validated via Pydantic:

```
GET    /vehicles
GET    /vehicles/{id}
POST   /vehicles
PATCH  /vehicles/{id}
DELETE /vehicles/{id}

GET    /locations
POST   /locations
GET    /locations/{id}
PATCH  /locations/{id}

POST   /trips
GET    /trips/{id}
GET    /trips?vehicle_id=&status=
```
All list endpoints must support pagination (`limit`/`offset` or cursor — pick one, be consistent) and company scoping. Write integration tests for full CRUD + tenant isolation (company A cannot read/write company B's rows — this is a required test, not optional).

### Phase 3 — Data Ingestion + Geofencing Engine
```
POST /gps/events
GET  /gps/events/{vehicle_id}
```
- Ingestion pipeline per spec section 17: validate payload → identify vehicle → process location → detect geofence entry/exit → store event.
- Geofencing engine (`engines/geofencing.py`): given a lat/lon and a location's `(latitude, longitude, geofence_radius)`, determine containment. Use a proper haversine/geodesic distance check (Shapely planar buffer is acceptable only if you document the accuracy tradeoff at this latitude range — prefer geodesic distance for correctness).
- Handle noisy GPS: do not flip-flop arrival/departure state on single-point jitter — require the vehicle to be outside the geofence for a minimum debounce window (configurable, default e.g. 2 consecutive readings or N minutes) before recording a departure.
- Unit tests: point clearly inside, clearly outside, on-boundary, jittering near-boundary sequence.

### Phase 4 — Dwell Detection Engine
- Implement the state machine from spec section 19: geofence entry → arrival timestamp → monitor → geofence exit → departure timestamp → compute `dwell_minutes`.
- On departure, resolve `expected_minutes` via the resolution chain above, compute `excess_minutes` and `estimated_cost`, persist to `dwell_events`.
- Support an "in-progress" dwell state (truck currently stationary, no departure yet) queryable for the live dashboard — expose this via the dwell events endpoints, do not force the frontend to poll gps_events directly to infer it.
```
GET /dwell-events
GET /dwell-events/{vehicle_id}
```
- Unit tests against the exact worked example in the spec: arrival 08:30, expected exceeded at 09:30 (based on 1h expected... verify against actual location config in the test), departure 13:45, final dwell 5h15m — assert the engine reproduces this.

### Phase 5 — Analytics Engine
- Pure functions over `dwell_events` (accept a DataFrame or query results, return a DataFrame/dict — no HTTP coupling): average/median/max dwell, excess dwell aggregation, per-location performance, day-of-week and time-of-day trend breakdowns, per-vehicle performance.
```
GET /analytics/dashboard    # active trucks, trucks delayed, excess dwell today, financial impact today, top bottleneck, avg excess delay
GET /analytics/locations    # per-location: total visits, avg dwell, expected dwell, avg excess delay, highest-risk day/period
GET /analytics/vehicles
GET /analytics/trends       # time series for charting
```
- Match the exact shape of the dashboard example in spec section 7.1 and location intelligence in section 10 — the frontend will bind directly to these field names, so name response fields accordingly (`active_trucks`, `trucks_delayed`, `excess_dwell_today_minutes`, `estimated_financial_impact`, `top_bottleneck`, `average_excess_delay_minutes`, etc.) and put units in a consistent place (either suffix the field name or document units in the OpenAPI schema description — be consistent across all endpoints).

### Phase 6 — Intelligence Engine (Rule-Based v1)
```
GET  /insights
POST /insights/analyze     # triggers analysis run, persists new insights, returns them
```
- Implement the pipeline: Raw Events → Calculate Baseline → Compare Performance → Detect Anomaly → Identify Pattern → Calculate Financial Impact → Generate Insight.
- v1 rule: `if actual_dwell > expected_dwell * 1.5: severity = HIGH`. Add at least one more tier (e.g. `> 1.2x` = MEDIUM) — document your thresholds in `README.md`, they are a product decision, not a hidden constant.
- Each generated insight must include a human-readable `recommendation` (e.g. "Schedule deliveries before 10:00 AM") derived from the historical highest-risk period analysis, not a static string.
- Design `engines/intelligence.py` with a `Scorer` interface/protocol now, even though only the rule-based implementation exists — Phase 3 ML work must be able to plug in without changing callers.

### Phase 7 — Financial Impact
- Aggregate `dwell_events.estimated_cost` into the "THIS MONTH" style rollups shown in spec section 12 (total excess dwell hours, estimated financial impact, largest bottleneck). Expose via `/analytics/dashboard` and a dedicated breakdown if the dashboard payload gets too large — your call, document it.

### Phase 8 — Predictions (stub interface, do not fully implement ML)
```
POST /predictions/dwell         # given destination + planned arrival, return predicted dwell
POST /predictions/delay-risk    # return {predicted_dwell, expected_dwell, risk_percent, reason, recommendation}
```
- Implement using the Phase 2 statistical approach from spec section 22 (mean/std/percentiles by location + day-of-week + time-of-day bucket) — this is legitimate v1 behavior, not a placeholder. Return `model_version: "statistical-v1"` in the response so the frontend/consumers can distinguish it from a future ML-backed version.
- Define the scikit-learn/XGBoost model interface as an abstract class even if unimplemented, so Phase 3 is a drop-in.

## CROSS-CUTTING REQUIREMENTS (apply to every phase)

- **Error handling**: consistent error envelope `{"error": {"code": str, "message": str}}`, correct HTTP status codes (400 validation, 401 auth, 403 authz, 404 not found, 409 conflict, 422 pydantic validation — let FastAPI's default 422 stand for body validation).
- **Logging**: structured logging (JSON logs) on ingestion and insight-generation paths at minimum — these are the operationally critical paths.
- **Idempotency**: `POST /gps/events` should tolerate duplicate/replayed events without corrupting dwell state (dedupe on `(vehicle_id, recorded_at)` or similar).
- **Timezones**: all timestamps UTC in storage and API responses (ISO 8601 with `Z`). Never store naive datetimes.
- **OpenAPI**: FastAPI's auto-generated docs must be complete and accurate — every route needs a summary, every schema needs field descriptions with units (minutes vs hours, currency as KES per spec).
- **Migrations**: every schema change goes through a migration file, never a manual `ALTER TABLE` against the running DB.
- **Seed data**: provide a `scripts/seed.py` that creates a demo company, a handful of vehicles/locations, and simulated GPS event streams reproducing the "ABC Distribution Centre / KDA 123X, 5h12m dwell" scenario from the spec — the frontend team needs this to demo against.
- **No secrets in code**: `.env.example` committed, real `.env` gitignored.

## DEFINITION OF DONE

- All phases above implemented and tested (`pytest` green, including tenant-isolation and dwell-engine correctness tests).
- `uvicorn app.main:app --host 0.0.0.0 --port $PORT` boots cleanly against a fresh Supabase project with migrations applied and seed data loaded.
- OpenAPI docs at `/docs` fully describe every endpoint listed above with correct field names/units.
- `README.md` documents: setup steps, env vars, RBAC matrix, dwell/expected-time resolution logic, insight severity thresholds, and how to run the seed script.
- `DECISIONS.md` lists every place you deviated from or extended this spec, with a one-line reason each.

## CHECKPOINT — pause and flag to the human operator (do not silently decide) if:

- You need to choose between Alembic and raw Supabase SQL migrations and the choice affects deploy tooling.
- RBAC write permissions for `dispatcher`/`analyst` roles are ambiguous for a specific route not enumerated above.
- The 1.5x/1.2x severity thresholds materially change demo behavior on the seed dataset in a way that looks wrong.

Everything else: decide, implement, document, move on.
