export type UserRole = 'admin' | 'fleet_manager' | 'dispatcher' | 'analyst';

export type LocationType =
  | 'warehouse'
  | 'customer_facility'
  | 'depot'
  | 'port'
  | 'border_crossing'
  | 'loading_point'
  | 'unloading_point';

export type VehicleStatus = 'active' | 'idle' | 'maintenance' | 'in_transit' | 'delayed';

export type SeverityType = 'low' | 'medium' | 'high';

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  company_name?: string;
  name: string;
  email: string;
  role: UserRole | 'driver' | 'viewer';
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  updated_at?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  vehicle_type: string;
  capacity: number; // in tonnes/kg or volume
  hourly_operating_cost: number; // in KES
  status: VehicleStatus;
  created_at?: string;
  // Extended Tracking, Driver & Asset Details
  image_url?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_license?: string;
  driver_avatar?: string;
  driver_status?: 'on_duty' | 'resting' | 'driving';
  trailer_number?: string;
  container_number?: string;
  container_type?: string;
  cargo_type?: string;
  telematics_provider?: string;
  tracker_imei?: string;
  fuel_level?: number; // 0-100 percentage
  odometer_km?: number;
  maintenance_status?: 'good' | 'due_soon' | 'in_service';
  next_inspection_date?: string;
  // Computed client-side helper fields if joined
  current_location_name?: string;
  today_excess_dwell_minutes?: number;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  location_type: LocationType;
  latitude: number;
  longitude: number;
  geofence_radius: number; // in meters
  expected_dwell_minutes: number;
}

export interface TripCheckpoint {
  location_id: string;
  location_name: string;
  location_type: LocationType;
  status: 'completed' | 'current' | 'pending';
  arrival_time?: string;
  departure_time?: string;
  actual_dwell_minutes?: number;
  expected_dwell_minutes: number;
  excess_dwell_minutes?: number;
  estimated_cost?: number;
  // legacy client-side only fields kept for mock backward compat
  id?: string;
  eta?: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  origin_id: string;
  destination_id: string;
  planned_departure: string;
  planned_arrival: string;
  actual_departure?: string;
  actual_arrival?: string;
  departure_time?: string;
  arrival_time?: string;
  status?: 'planned' | 'in_transit' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';
  corridor_name?: string;
  customs_seal_number?: string;
  container_number?: string;
  cargo_description?: string;
  cargo_type?: string;
  cargo_weight_tonnes?: number;
  checkpoints?: TripCheckpoint[];
  // Denormalised display fields (derived from joined origin/destination on backend)
  vehicle_reg?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  origin_name?: string;
  destination_name?: string;
  // Client-only fields for live tracking / predictions
  risk_score?: number;
  current_speed_kmh?: number;
  current_latitude?: number;
  current_longitude?: number;
}

export type ClaimStatus = 'flagged' | 'invoiced' | 'disputed' | 'settled' | 'written_off';
export type ResponsibleParty = 'terminal_operator' | 'customs_authority' | 'shipper' | 'weighbridge_authority' | 'rail_freight';

// Delay Charges (formerly Demurrage) - User-friendly terminology for delay penalty tracking
export interface DelayChargeClaim {
  id: string;
  claim_number: string;
  dwell_event_id?: string;
  vehicle_id: string;
  vehicle_reg: string;
  location_id: string;
  location_name: string;
  container_number?: string;
  driver_name?: string;
  carrier_name: string;
  responsible_party: ResponsibleParty;
  arrival_time: string;
  departure_time?: string;
  sla_threshold_minutes: number;
  total_dwell_minutes: number;
  excess_delay_minutes: number;
  hourly_operating_rate: number;
  claimed_amount_kes: number;
  settled_amount_kes?: number;
  status: ClaimStatus;
  invoice_date?: string;
  due_date?: string;
  settlement_date?: string;
  dispute_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Backward compatibility alias
export type DemurrageClaim = DelayChargeClaim;

export interface GatePassData {
  // Backend persisted fields (optional on creation, present on response)
  id?: string;
  vehicle_id?: string;
  trip_id?: string;
  issued_by?: string;
  issued_by_name?: string;    // resolved display name from backend
  created_at?: string;
  updated_at?: string;
  // Core fields
  pass_number: string;
  vehicle_reg: string;
  vehicle_type?: string;
  driver_name: string;
  driver_phone?: string;
  driver_license?: string;
  container_number?: string;
  customs_seal_number?: string;
  cargo_type?: string;
  cargo_weight_tonnes?: number;
  terminal_name: string;
  terminal_gate?: string;
  time_window_start: string;
  time_window_end: string;
  status: 'pre_approved' | 'cleared' | 'inspected' | 'expired' | 'cancelled';
  carrier_name?: string;
  digital_signature?: string;
}

export interface GPSEvent {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h
  recorded_at: string;
}

export interface DwellEvent {
  id: string;
  vehicle_id: string;
  location_id: string;
  trip_id?: string;
  arrival_time: string;
  departure_time?: string; // missing for in-progress dwells
  dwell_minutes: number;
  expected_minutes: number;
  excess_minutes: number;
  estimated_cost: number; // in KES
  // joined fields
  vehicle_reg?: string;
  location_name?: string;
  location_type?: LocationType;
}

export interface Insight {
  id: string;
  company_id: string;
  type: string; // EXCESSIVE_DWELL, RECURRING_BOTTLENECK, etc.
  severity: SeverityType;
  title: string;
  description: string;
  location_id: string;
  financial_impact: number; // KES
  recommendation: string;
  created_at: string;
  // joined fields
  location_name?: string;
}

export interface DashboardStats {
  active_trucks: number;
  trucks_delayed: number;
  excess_dwell_today_minutes: number;
  estimated_financial_impact: number; // in KES
  top_bottleneck: {
    location_id: string;
    location_name: string;
    financial_impact: number;
  } | null;
  average_excess_delay_minutes: number;
}

export interface LocationStats {
  location_id: string;
  location_name: string;
  location_type: LocationType;
  total_visits: number;
  avg_dwell_minutes: number;
  expected_dwell_minutes: number;
  avg_excess_delay_minutes: number;
  financial_impact: number; // in KES
  highest_risk_days: string[]; // e.g. ["Monday", "Friday"]
  highest_risk_period: string; // e.g. "08:00 - 10:00"
}

export interface VehicleStats {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  total_trips: number;
  total_dwell_events: number;
  total_excess_dwell_minutes: number;
  total_financial_loss: number; // in KES
  avg_dwell_minutes: number;
}

export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  average_dwell_minutes: number;
  excess_dwell_minutes: number;
  estimated_cost: number;
  visit_count: number;
  delayed_visit_count: number;
}

export interface PredictionDwellResponse {
  predicted_dwell_minutes: number;
  model_version: string;
}

export interface PredictionDelayRiskResponse {
  predicted_dwell: number;
  expected_dwell: number;
  risk_percent: number;
  reason: string;
  recommendation: string;
  model_version: string;
}

// ─── AI Advisor Types ────────────────────────────────────────────────────────

export interface AIBottleneck {
  location: string;
  severity: 'high' | 'medium' | 'low';
  issue: string;
  recommendation: string;
}

export interface AICorridorAnalysis {
  executive_summary: string;
  financial_impact_analysis: string;
  primary_bottlenecks: AIBottleneck[];
  immediate_actions: string[];
  strategic_recommendations: string[];
  estimated_monthly_savings_kes: number;
  model_used?: string;
  analysis_timestamp?: string;
}

export interface AICopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AICopilotResponse {
  response: string;
  suggestions?: string[];
  model_used?: string;
}

