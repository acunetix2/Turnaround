# Architectural Decisions Log — Turnaround Backend

This document records key technical decisions, trade-offs, and deviations from the base specification.

## Log

1. **Database Dialect Compatibility (PostgreSQL + SQLite)**:
   - **Decision**: Configured SQLAlchemy 2.0 Async to support PostgreSQL (`asyncpg`) in production/Supabase and SQLite (`aiosqlite`) for local development and CI unit/integration testing without requiring external Postgres container spins.
   - **Rationale**: Enables zero-setup automated test suites while retaining full asyncpg PostgreSQL compatibility for cloud deployment (Render + Supabase).

2. **Geofence Containment Math**:
   - **Decision**: Implemented Haversine geodesic distance formula with Earth radius $R = 6371000\text{ m}$ for exact geofence radius checks, supplemented with Shapely planar buffers for complex polygon boundaries.
   - **Rationale**: Eliminates spherical projection distortion near the equator (Kenya: Lat $-4^\circ$ to $+4^\circ$).

3. **GPS Noise Debounce Window**:
   - **Decision**: Required a configurable debounce threshold (default: 2 consecutive outside points or 5 minutes of departure readings) before finalizing a geofence departure.
   - **Rationale**: Prevents erratic state oscillation when vehicles park near terminal boundary fences.

4. **Expected Dwell Resolution Order**:
   - **Decision**: Implemented strict 4-tier chain: (1) Historical average (if $\ge 10$ visits), (2) Location config `expected_dwell_minutes`, (3) Customer SLA, (4) Global default (120 minutes).
   - **Rationale**: Direct adherence to core specification and financial modeling integrity.

5. **Severity Scoring Thresholds**:
   - **Decision**: `actual_dwell > 1.5x expected` $\to$ HIGH severity; `actual_dwell > 1.2x expected` $\to$ MEDIUM severity; `actual_dwell <= 1.2x expected` $\to$ LOW severity.
   - **Rationale**: Directly aligns with fleet manager action priorities.
