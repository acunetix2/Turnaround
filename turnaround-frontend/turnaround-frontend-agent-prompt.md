# AGENT BUILD PROMPT — Turnaround Frontend (React + TypeScript + Vite)

## ROLE

You are a senior frontend engineer operating autonomously in an agentic coding environment with terminal, filesystem, and package-manager access. Work in phases, run the app locally against the live backend API (or a mocked API layer if the backend isn't reachable yet — see "Backend Contract" below), and do not stop for clarification except at the flagged checkpoints. Log deviations/assumptions in `DECISIONS.md`.

## MISSION

Build the frontend for **Turnaround** — a web dashboard that turns raw fleet GPS/dwell data into operational intelligence for fleet managers, operations managers, dispatchers, and logistics company owners. The product's job is to answer, visually and immediately: *"Where are our trucks losing productive time, why, and how much is it costing us?"* This is not a GPS tracker skin — every screen should foreground **excess time and money lost**, not just raw location data.

## NON-GOALS

- Do not build the backend, do not implement business logic that belongs server-side (dwell calculation, cost calculation, insight generation) — the frontend consumes computed values from the API, it does not recompute them.
- No route optimization / dispatch assignment UI.
- Don't build a generic GPS-tracker clone — every view must surface the *understanding* layer (bottleneck, cost, recommendation), not just position.

## TECH STACK (fixed)

- **Framework**: React 18 + TypeScript (strict mode on — no `any` in committed code without a `// TODO` justification)
- **Build tool**: Vite
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (own the generated component code, customize don't fork blindly)
- **Charts**: Recharts
- **Maps**: Mapbox (GL JS + react-map-gl or equivalent)
- **Auth**: Supabase Auth (client SDK) — obtain JWT, attach as `Authorization: Bearer` to all API calls
- **Data fetching/caching**: TanStack Query (React Query) — do not hand-roll fetch+useState+useEffect data loading; use Query for caching, polling, and stale-while-revalidate on dashboard/live views
- **Routing**: React Router
- **Forms**: React Hook Form + Zod (schema validation shared shape with backend Pydantic models where practical)
- **Hosting target**: Vercel — build must succeed with `vite build` unmodified

## BACKEND CONTRACT (bind to this exactly — do not invent field names)

Base URL from `VITE_API_BASE_URL` env var. All requests carry `Authorization: Bearer <supabase_jwt>`.

```
GET    /vehicles                GET /vehicles/{id}
POST   /vehicles                PATCH /vehicles/{id}     DELETE /vehicles/{id}
GET    /locations                POST /locations
GET    /locations/{id}            PATCH /locations/{id}
POST   /gps/events                GET /gps/events/{vehicle_id}
GET    /dwell-events               GET /dwell-events/{vehicle_id}
GET    /analytics/dashboard
GET    /analytics/locations
GET    /analytics/vehicles
GET    /analytics/trends
GET    /insights                    POST /insights/analyze
POST   /predictions/dwell
POST   /predictions/delay-risk
```

Build a single typed API client module (`src/lib/api/client.ts` + one file per resource under `src/lib/api/`) with generated/hand-written TypeScript types mirroring backend Pydantic schemas. If backend OpenAPI schema is available at `/openapi.json`, generate types from it (`openapi-typescript` is acceptable); otherwise hand-write interfaces in `src/lib/api/types.ts` and flag this in `DECISIONS.md` as needing reconciliation once the real schema lands. **Every screen must be able to run against a mock/fixture data layer** (`src/lib/api/mocks/`) behind a `VITE_USE_MOCKS` flag so the frontend is independently demoable before/without the live backend.

## PROJECT STRUCTURE

```
/src
  app/
    App.tsx                 # router shell, providers (QueryClientProvider, AuthProvider)
    routes.tsx
  auth/
    AuthProvider.tsx         # Supabase session, exposes current user + role
    ProtectedRoute.tsx
  lib/
    api/                      # typed client, one module per resource, mocks/
    format.ts                  # shared formatters: minutes->"3h 42m", currency "KES 64,200", relative time
    query-keys.ts                # centralized React Query key factory
  components/
    ui/                            # shadcn primitives
    layout/                         # AppShell, Sidebar, TopBar
    charts/                          # thin Recharts wrappers matching this app's design tokens
    map/                              # Mapbox wrapper components (VehicleMarker, GeofenceOverlay, DelayBadge)
  features/
    dashboard/
    live-map/
    vehicles/
    locations/
    insights/
    analytics/
  hooks/
    useDashboard.ts, useVehicles.ts, useLocations.ts, useInsights.ts, ... (thin wrappers around React Query + api client)
  types/                              # shared/derived types not owned by a single feature
```

Feature-first organization: each of the six main pages below is a `features/<name>/` folder with its own components, hooks, and page component. Shared primitives live in `components/`.

## DESIGN DIRECTION

Read and follow the frontend-design conventions available in this environment for typography, spacing, and non-templated visual choices before writing components — this product is data-dense and needs a confident, high-contrast, dark-friendly operational dashboard aesthetic (the reference document itself uses a dark, monospace-accented style for data readouts — lean into that for numeric/status displays, e.g. dwell times, cost figures, severity badges). Avoid generic admin-template look: give delay severity, cost figures, and bottleneck rankings strong visual hierarchy since those are the product's core value, not decoration.

## PAGES — build in this order, each is a complete phase with its own DoD

### Phase 0 — Shell & Auth
- `AppShell` with sidebar nav (Dashboard, Live Fleet Map, Vehicles, Locations, Insights, Analytics) + top bar (company name, user menu, role badge).
- Supabase Auth: login screen, session persistence, `ProtectedRoute` wrapper, role available via `useAuth()` for conditional UI (e.g. hide vehicle-delete for `dispatcher`/`analyst` roles per backend RBAC).
- Global loading/error boundary pattern for all data views (skeletons, not spinners, for dashboard-density screens).

### Phase 1 — Dashboard (`/`)
Bind directly to `GET /analytics/dashboard`. Must show, per spec section 7.1, as the first thing the user sees:
- Active trucks count
- Trucks delayed count
- Excess dwell today (formatted duration)
- Estimated financial impact today (KES, formatted)
- Top bottleneck (location name, clickable through to that location's detail page)
- Average excess delay

Use React Query with a short polling interval (e.g. 30–60s, configurable) for near-live feel without full websockets in v1. Each stat card should visually encode severity (e.g. financial impact and delayed-truck count use warning/danger color scale, not neutral).

### Phase 2 — Live Fleet Map (`/map`)
Mapbox map showing:
- Vehicle positions (from latest `gps_events` per vehicle — expose via a hook that either hits a dedicated live endpoint or derives "latest position" client-side from `/gps/events/{vehicle_id}` per active vehicle; prefer asking the backend to add a `/vehicles/live` aggregate if none exists — flag this gap rather than doing N+1 client-side fetches for every truck).
- Vehicle status (moving/stationary/delayed) as marker color/icon.
- Warehouse/customer/location geofence overlays (circle radius from `locations.geofence_radius`).
- Active delays surfaced as a distinct marker treatment (e.g. pulsing/red) with a click-through popover showing truck, location, elapsed dwell, expected dwell, excess — matching the spec's example readout style (Truck / Location / Status / Time).

### Phase 3 — Vehicles (`/vehicles`, `/vehicles/:id`)
List view: sortable/filterable table (registration, type, status, current location if available, today's excess dwell). Detail view: vehicle info, trip history, dwell history (table + small trend chart), operational performance summary. CRUD form (create/edit) gated by role, using React Hook Form + Zod, submitting to `POST/PATCH /vehicles`.

### Phase 4 — Locations (`/locations`, `/locations/:id`)
List view: location performance table (name, type, visits, avg turnaround, excess dwell, financial impact) — this is the "where is money leaking" screen, sort by financial impact descending by default. Detail view must reproduce the spec's location-intelligence readout (section 10): total visits, average dwell, expected dwell, average excess delay, highest-risk days, highest-risk period — bind to `GET /analytics/locations` (or `/locations/{id}` + analytics merge, whichever the backend actually returns — confirm against the live schema, don't assume).

### Phase 5 — Insights (`/insights`)
Card/list view of `GET /insights`, each rendering: severity badge, title, description, affected location (linked), financial impact, and the human-readable recommendation — matching the "TURNAROUND INSIGHT" example block in spec section 14 (e.g. "ABC Distribution Centre accounts for 31% of total excess dwell time... Recommended Action: Schedule deliveries between 08:00–10:00 AM... Potential Outcome: ~2 fewer hours per trip"). Include a manual "Run Analysis" action wired to `POST /insights/analyze` with an optimistic/loading state and toast on completion. Filterable by severity and location.

### Phase 6 — Analytics (`/analytics`)
Charts (Recharts) bound to `GET /analytics/trends` (+ `/locations`, `/vehicles` as needed):
- Daily dwell trend (line)
- Location comparison (bar, ranked by excess dwell or financial impact)
- Delay trends over time (line/area)
- Financial losses over time (bar/area, cumulative option)
- Fleet productivity (whatever composite metric the backend exposes — if none exists yet, derive a reasonable one client-side and flag it in `DECISIONS.md` as a candidate for a dedicated backend metric)
Support a shared date-range filter across this page's charts.

## CROSS-CUTTING REQUIREMENTS

- **Formatting consistency**: one shared formatter module for durations (`312 minutes` → `"5h 12m"`), currency (`64200` → `"KES 64,200"`), and relative/absolute timestamps. Never format inline in components.
- **Empty/zero states**: every list/table/chart needs a designed empty state (e.g. "No insights yet — run an analysis" ), not a blank div.
- **Error states**: distinguish "no data" from "request failed" — failed requests get a retry affordance, not a silent empty table.
- **Accessibility**: severity/status must never be color-only — pair with icon or text label (colorblind-safe, and matches how the spec's plain-text readouts already convey status via labels, not just color).
- **Responsiveness**: dashboard and analytics must degrade gracefully to tablet width at minimum; map and dense tables can assume desktop-first but shouldn't hard-break below ~1024px.
- **Performance**: paginate/virtualize any table that could realistically exceed ~200 rows (dwell history, gps events); do not fetch unbounded lists.
- **Testing**: component tests (Vitest + React Testing Library) for the formatter module and at least the Dashboard and Insights feature components (they carry the most business meaning); an E2E smoke test (Playwright) covering login → dashboard load → navigate to Insights → run analysis is required before calling this done.
- **Env config**: `.env.example` with `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`, `VITE_USE_MOCKS`.

## DEFINITION OF DONE

- All six pages implemented, typed, and functional against either the live backend or the mock data layer (`VITE_USE_MOCKS=true` must produce a fully navigable, populated demo with no console errors).
- `vite build` succeeds with zero TypeScript errors.
- Vitest suite green; Playwright smoke test green.
- `README.md`: setup steps, env vars, how to toggle mocks, how to point at a different backend URL, RBAC-driven UI behavior summary.
- `DECISIONS.md`: every place you had to guess a backend field name, endpoint shape, or missing aggregate endpoint, with what you assumed and what should be confirmed.

## CHECKPOINT — pause and flag to the human operator if:

- The live backend's actual response shape for `/analytics/dashboard`, `/analytics/locations`, or `/insights` diverges from the field names implied by the spec (don't silently rename/coerce — surface the mismatch).
- There is no live-position aggregate endpoint and per-vehicle polling for the map view would produce an unacceptable number of concurrent requests at realistic fleet sizes (e.g. >50 vehicles) — this needs a backend decision, not a frontend workaround.
- Mapbox token/billing setup is required and not yet provisioned.

Everything else: decide, implement, document, move on.
