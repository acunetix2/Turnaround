# Turnaround Pitch Deck Content

## Slide 1: Title

### Turnaround

#### Operational Intelligence for Fleet and Corridor Logistics

Real-time fleet visibility, dwell monitoring, and cost intelligence for commercial trucking corridors across East Africa.

**Presenter:** [YOUR NAME]

**Date:** [DATE]

---

## Slide 2: The Problem

Commercial carriers lose time and money because they cannot easily see where delays happen or how much those delays cost.

- Trucks wait at ports, container depots, customs yards, weighbridges, and customer facilities.
- Dispatchers often rely on phone calls, spreadsheets, and disconnected tracking tools.
- Delays are discovered late, after service-level agreements have already been affected.
- Fleet managers lack a clear link between operational delay and financial loss.
- Containers, vehicles, drivers, and trips are often managed in separate systems.

**Core problem:** Logistics teams need one operational view that connects movement, delay, cost, and action.

---

## Slide 3: The Solution

Turnaround is a fleet operational intelligence platform that turns GPS telemetry into practical decisions.

The platform combines:

- Live vehicle and corridor tracking.
- GPS telemetry ingestion.
- Geofence monitoring.
- Dwell-time detection.
- SLA and delay analysis.
- Operating-cost calculations.
- Container and trip dispatch management.
- Fleet, driver, and asset visibility.

**Outcome:** Teams can identify operational bottlenecks earlier, respond faster, and reduce unrecovered idle costs.

---

## Slide 4: How It Works

```mermaid
flowchart LR
    GPS[GPS Device] --> INGEST[Telemetry Ingestion]
    INGEST --> GEOFENCE[Geofence Detection]
    GEOFENCE --> DWELL[Dwell Lifecycle]
    DWELL --> SLA[SLA Comparison]
    SLA --> COST[Financial Impact]
    COST --> ACTION[Dispatcher Action]
    ACTION --> RESULT[Improved Turnaround]
```

1. A tracker sends location, speed, heading, and timestamp data.
2. Turnaround matches the coordinates against configured facilities and corridors.
3. The system detects arrival, dwell, and departure states.
4. Actual dwell is compared with expected service levels.
5. Excess time is converted into an estimated operating cost.
6. Dispatchers and fleet managers take action from the dashboard.

---

## Slide 5: Product Experience

### Live Corridor Tracker

- Map-based visibility across logistics corridors.
- Vehicle markers with status, speed, and location.
- Top 10 fleet tracker side panel.
- Expandable vehicle details for driver, co-driver, availability, and GPS connection.
- Trip route visualization between origin and destination.

### Fleet and Asset Management

- Category-aware asset registration.
- Separate workflows for trucks, tankers, trailers, chassis, ships, and containers.
- Container registry and container assignment.
- Driver and co-driver assignment for powered vehicles only.
- Telematics and tracker details per asset.

---

## Slide 6: Operational Intelligence

Turnaround translates movement data into operational and financial insight.

- Detects excessive dwell time.
- Identifies recurring facility bottlenecks.
- Tracks active and completed dwell events.
- Calculates excess delay minutes.
- Estimates idle operating cost.
- Highlights demurrage risk.
- Supports historical facility benchmarking.
- Provides actionable operational context for dispatchers.

### Financial Loss Formula

$$
\text{Financial Loss} = \max(0, \text{Actual Dwell} - \text{Expected Dwell}) \times \frac{\text{Hourly Operating Cost}}{60}
$$

---

## Slide 7: Dispatch and Container Workflow

Turnaround keeps the dispatch workflow aligned with how logistics operations actually work.

- Select a powered vehicle for the trip.
- Select origin and destination facilities.
- Assign an available registered container.
- Capture customs seal information.
- Record cargo type and payload weight.
- Schedule departure and estimated arrival.
- Check overlapping vehicle assignments before dispatch.
- Preserve a clear link between vehicle, container, route, and trip.

**Important design decision:** Containers are treated as cargo equipment, not as vehicles or driver-assigned units.

---

## Slide 8: Architecture and Technology

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Query
- React Hook Form and Zod
- MapLibre GL

### Backend

- Python
- FastAPI
- SQLAlchemy async ORM
- PostgreSQL
- Alembic migrations
- Geofencing and dwell engines

### Platform Services

- Supabase authentication and database infrastructure.
- Firebase Cloud Messaging for notifications.
- Render backend deployment.
- Vercel frontend deployment.

---

## Slide 9: Security and Access Control

Turnaround is designed as a multi-tenant operational platform.

- Company-level data isolation through tenant identifiers.
- JWT and Supabase authentication support.
- Role-based access control.
- Separate permissions for administrators, fleet managers, dispatchers, analysts, supervisors, and operational users.
- Server-side handling of sensitive service credentials.
- Vehicle, trip, GPS, container, and location data scoped to the correct company.

---

## Slide 10: Regional Impact

Turnaround is designed for the realities of East African commercial logistics corridors.

### Key Operating Contexts

- Mombasa Port and Kilindini Terminal.
- Nairobi Inland Container Depot.
- Athi River and Gilgil weighbridges.
- Malaba and Busia One-Stop Border Posts.
- Namanga and other cross-border routes.
- Long-haul corridors connecting Kenya, Uganda, Tanzania, Rwanda, and the wider region.

### Potential Impact

- Reduce avoidable vehicle idle time.
- Improve SLA compliance.
- Give dispatchers earlier visibility into delays.
- Improve container and vehicle coordination.
- Support more accurate customer and carrier reporting.

---

## Slide 11: Key Learnings

- Operational software must model real-world resources accurately.
- A container should not be treated like a drivable vehicle.
- GPS data becomes more useful when connected to geofences, trips, dwell states, and cost models.
- Clear role-based workflows are essential in multi-user logistics systems.
- Good operational dashboards need both high-level metrics and drill-down details.
- Data quality and identifier consistency are critical when connecting GPS devices, vehicles, drivers, and containers.

---

## Slide 12: Challenges Faced

- Designing one asset platform for multiple asset categories.
- Synchronizing GPS events with vehicle and trip records.
- Preventing false geofence transitions caused by GPS noise.
- Building reliable vehicle and container assignment workflows.
- Presenting complex operational data without overwhelming dispatchers.
- Supporting live updates while keeping the interface responsive.
- Converting operational events into understandable financial consequences.

---

## Slide 13: Future Roadmap

- Direct integrations with Traccar, Teltonika, Samsara, and Cartrack.
- Automated provider webhook mapping by tracker IMEI.
- Offline telemetry buffering for poor-connectivity corridors.
- Predictive arrival and delay forecasting.
- Carrier benchmarking and customer-facing reports.
- Automated demurrage claim workflows.
- Mobile driver application for trip updates and proof of delivery.
- More granular container lifecycle and yard-position tracking.

---

## Slide 14: Demo Flow

Use this sequence for the live demo:

1. Sign in and open the operations dashboard.
2. Open the Carrier Assets page.
3. Show the difference between a powered vehicle and a container asset.
4. Open the Trip Dispatch workflow.
5. Select a vehicle, route, facility, and available container.
6. Open the Corridor Tracker map.
7. Show the Top 10 fleet sidebar.
8. Expand a vehicle to show driver, co-driver, availability, and GPS status.
9. Show a vehicle marker and live telemetry details.
10. Explain how dwell data becomes cost and delay intelligence.

---

## Slide 15: Closing

### Turnaround

#### Make every delay visible. Make every minute actionable.

Turnaround gives commercial carriers the operational intelligence they need to improve fleet utilization, reduce dwell-related costs, and move freight more predictably.

**GitHub:** https://github.com/acunetix2/Turnaround.git

**Demo:** [DEMO_URL]

**Contact:** [YOUR EMAIL]
