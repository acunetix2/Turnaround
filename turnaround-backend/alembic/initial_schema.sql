-- =============================================================================
-- Turnaround Operational Intelligence — Initial Schema Migration
-- Compatible with Supabase PostgreSQL
-- =============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('admin', 'fleet_manager', 'dispatcher', 'analyst');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehiclestatus AS ENUM ('active', 'idle', 'maintenance', 'in_transit', 'delayed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE locationtype AS ENUM ('warehouse', 'customer_facility', 'depot', 'port', 'border_crossing', 'loading_point', 'unloading_point');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tripstatus AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE insightseverity AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Companies
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role userrole NOT NULL DEFAULT 'fleet_manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- 4. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL DEFAULT 'Semi-Trailer Truck',
    capacity DOUBLE PRECISION,
    hourly_operating_cost DOUBLE PRECISION NOT NULL DEFAULT 3500.0,
    status vehiclestatus NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS ix_vehicles_registration_number ON vehicles(registration_number);

-- 5. Locations (Geofences)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location_type locationtype NOT NULL DEFAULT 'warehouse',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geofence_radius DOUBLE PRECISION NOT NULL DEFAULT 250.0,
    expected_dwell_minutes DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    customer_sla_minutes DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_locations_company_id ON locations(company_id);
CREATE INDEX IF NOT EXISTS ix_locations_name ON locations(name);

-- 6. Trips
CREATE TABLE IF NOT EXISTS trips (
    id VARCHAR(36) PRIMARY KEY,
    vehicle_id VARCHAR(36) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    origin_id VARCHAR(36) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    destination_id VARCHAR(36) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    planned_departure TIMESTAMPTZ,
    planned_arrival TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    status tripstatus NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_trips_vehicle_id ON trips(vehicle_id);

-- 7. GPS Events (Telemetry)
CREATE TABLE IF NOT EXISTS gps_events (
    id VARCHAR(36) PRIMARY KEY,
    vehicle_id VARCHAR(36) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    heading DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vehicle_recorded_at UNIQUE (vehicle_id, recorded_at)
);
CREATE INDEX IF NOT EXISTS ix_gps_events_vehicle_id ON gps_events(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_gps_events_recorded_at ON gps_events(recorded_at);

-- 8. Dwell Events (Dwell Incidents & Financial Cost)
CREATE TABLE IF NOT EXISTS dwell_events (
    id VARCHAR(36) PRIMARY KEY,
    vehicle_id VARCHAR(36) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    location_id VARCHAR(36) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    trip_id VARCHAR(36) REFERENCES trips(id) ON DELETE SET NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    departure_time TIMESTAMPTZ,
    dwell_minutes DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    expected_minutes DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    excess_minutes DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    estimated_cost DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dwell_events_vehicle_id ON dwell_events(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_dwell_events_location_id ON dwell_events(location_id);
CREATE INDEX IF NOT EXISTS ix_dwell_events_arrival_time ON dwell_events(arrival_time);

-- 9. Insights & Bottleneck Alerts
CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    location_id VARCHAR(36) REFERENCES locations(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'EXCESSIVE_DWELL',
    severity insightseverity NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    financial_impact DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recommendation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_insights_company_id ON insights(company_id);
CREATE INDEX IF NOT EXISTS ix_insights_location_id ON insights(location_id);

-- 10. Alembic version tracking table
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) PRIMARY KEY NOT NULL
);
INSERT INTO alembic_version (version_num) 
VALUES ('001_initial_schema') 
ON CONFLICT (version_num) DO NOTHING;
