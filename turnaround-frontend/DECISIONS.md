# DECISIONS.md

This file logs every assumption, deviation, or gap that needs confirmation once the live backend is connected.

---

## D-001 — API Types: Hand-Written Instead of Generated

**Status**: Open — needs reconciliation  
**Context**: The backend's `/openapi.json` was not reachable during frontend build. TypeScript interfaces were hand-written in `src/lib/api/types.ts` to mirror the Pydantic schema shapes implied by the spec.  
**Action required**: Once the backend is live, run `npx openapi-typescript <VITE_API_BASE_URL>/openapi.json -o src/lib/api/generated.ts` and reconcile any field name differences.

---

## D-002 — Live GPS Aggregate Endpoint

**Status**: Open — backend decision needed  
**Context**: The spec notes vehicles may have per-vehicle GPS history at `GET /gps/events/{vehicle_id}`. A per-vehicle N+1 fetch for every truck on the live map is unacceptable at fleet sizes >50.  
**Assumed**: A single `GET /gps/events` aggregate endpoint exists that returns `Record<vehicle_id, GPSEvent>` (latest position per vehicle). The mock layer implements this assumption.  
**Action required**: Confirm or add a `/vehicles/live` aggregate endpoint on the backend. If not available, the frontend will need server-side pagination or a WebSocket subscription.

---

## D-003 — Map Provider: OpenStreetMap via Leaflet (not Mapbox)

**Status**: Decided by user  
**Context**: The spec lists Mapbox GL JS. The user explicitly instructed: *"use open street map for now"*.  
**Implemented**: Leaflet with CartoDB Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) for the dark aesthetic. Custom `L.divIcon` markers replace Mapbox GL layers.  
**Migration path**: Swap to `react-map-gl` + Mapbox token by replacing `src/features/live-map/LiveMap.tsx` and `src/components/map/` with Mapbox equivalents. No other files need changing.

---

## D-004 — Fleet Productivity Metric (Analytics Page)

**Status**: Open — candidate for a backend metric  
**Context**: The spec says "Fleet productivity (whatever composite metric the backend exposes)". No dedicated endpoint exists yet.  
**Assumed**: Derived client-side as `(total_expected_dwell / total_actual_dwell) * 100` across all vehicles in the trend dataset. This is flagged in `Analytics.tsx` with a `// DECISION D-004` comment.  
**Action required**: Backend should expose a `/analytics/fleet-productivity` series endpoint, or confirm the client-side derivation is acceptable.

---

## D-005 — Authentication: Mock Mode Bypasses Supabase

**Status**: By design, no action needed  
**Context**: When `VITE_USE_MOCKS=true`, the `AuthProvider` uses a local mock user object instead of hitting Supabase. This enables fully offline demos.  
**Production requirement**: Set `VITE_USE_MOCKS=false`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in `.env.production`.

---

## D-006 — Financial Cost Estimate in DelayBadge Popup

**Status**: Client-side approximation  
**Context**: The map popup shows an estimated cost for delayed vehicles. The actual `hourly_operating_cost` per vehicle is not available in the live GPS event payload.  
**Assumed**: KES 2,500/hour as a baseline estimate in `src/components/map/DelayBadge.ts`. The vehicle detail page uses the actual `vehicle.hourly_operating_cost` from the API.  
**Action required**: Optionally enrich the GPS aggregate endpoint to include `hourly_operating_cost` per vehicle for accurate map-level cost display.

---

## D-007 — Testing: Playwright Installed but Backend Not Live

**Status**: Smoke test uses mock mode  
**Context**: Playwright E2E tests run against `VITE_USE_MOCKS=true` dev server since the backend isn't live yet.  
**Production**: Point `VITE_API_BASE_URL` at the staging backend and re-run Playwright with `VITE_USE_MOCKS=false`.
