import {
  mockDashboardStats,
  mockDwellEvents,
  mockInsights,
  mockLocations,
  mockVehicles,
  mockTrendData,
  mockLocationStats,
  mockVehicleStats,
  mockTrips,
  mockDemurrageClaims,
  mockLiveGpsEvents
} from './mocks/fixtures';
import type {
  DashboardStats,
  Location,
  Vehicle,
  DwellEvent,
  Insight,
  TrendDataPoint,
  LocationStats,
  VehicleStats,
  GPSEvent,
  Trip,
  DelayChargeClaim,
  PredictionDwellResponse,
  PredictionDelayRiskResponse,
  AICorridorAnalysis,
  AICopilotResponse
} from './types';

// Read configuration from environment
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const localApiUrl = 'http://localhost:8000/api/v1';
const productionApiUrl = 'https://turnaround-99kc.onrender.com/api/v1';
const API_BASE_URL = configuredApiUrl || (
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? localApiUrl
    : productionApiUrl
);

async function fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const request = () => globalThis.fetch(input, { ...init, credentials: 'include' });
  const response = await request();
  if (response.status !== 401 || String(input).includes('/auth/')) return response;

  const refresh = await globalThis.fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST', credentials: 'include',
  });
  return refresh.ok ? request() : response;
}

// Local state for mock data persistence during session
let memoryVehicles = [...mockVehicles];
let memoryLocations = [...mockLocations];
let memoryDwellEvents = [...mockDwellEvents];
let memoryInsights = [...mockInsights];
let memoryTrips = [...mockTrips];
let memoryUsers: import('./types').User[] = [
  {
    id: 'user_demo_admin',
    company_id: 'seed-company-siginon-001',
    name: 'Demo Administrator',
    email: 'admin@siginon.com',
    role: 'admin',
    phone: '+254 700 000 001',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];
let memoryCompanyConfig: import('./types').CompanyConfig = {
  id: 'seed-company-siginon-001',
  name: 'Siginon Global Logistics',
  created_at: new Date().toISOString(),
  country: 'Kenya',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
  sla_warning_threshold_minutes: 30,
  sla_breach_threshold_minutes: 60,
  hourly_operating_rate: 7500,
  demurrage_rate_multiplier: 1.5,
  gps_polling_interval_seconds: 30,
  geofence_buffer_meters: 100,
  auto_revoke_expired_passes: true,
  notify_on_delay: true,
  notify_on_gate_pass: true,
};
let memoryDemurrageClaims = [...mockDemurrageClaims];
let memoryDashboardStats = { ...mockDashboardStats };
let memoryGatePasses: import('./types').GatePassData[] = [];

// Helper to simulate network latency
const sleep = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for fetch headers
function getHeaders(): HeadersInit {
  const token = USE_MOCKS
    ? localStorage.getItem('supabase_session_jwt') || 'demo-token:seed-user-admin-001:seed-company-siginon-001:fleet_manager'
    : localStorage.getItem('supabase_session_jwt');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

/**
 * Normalise a raw backend Trip response into the frontend Trip interface.
 * The backend returns nested `origin` / `destination` objects; the frontend
 * expects flat `origin_name` / `destination_name` strings for display.
 */
function _normalizeTrip(raw: any): import('./types').Trip {
  return {
    ...raw,
    origin_name:      raw.origin_name      ?? raw.origin?.name      ?? '',
    destination_name: raw.destination_name ?? raw.destination?.name ?? '',
    vehicle_reg:      raw.vehicle_reg      ?? raw.vehicle?.registration_number ?? '',
    vehicle_type:     raw.vehicle_type     ?? raw.vehicle?.vehicle_type ?? '',
    driver_name:      raw.driver_name      ?? raw.vehicle?.driver_name ?? '',
    driver_phone:     raw.driver_phone     ?? raw.vehicle?.driver_phone ?? '',
    // checkpoints come directly from backend now
    checkpoints: raw.checkpoints ?? [],
  };
}

export const apiClient = {
  // --- Backend-owned authentication ---
  async login(email: string, password: string): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Invalid email or password');
    return (await res.json()).user;
  },

  async signup(data: { email: string; password: string; name: string; company: string }): Promise<{ user: import('./types').User; requires_email_confirmation?: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Unable to create account');
    return res.json();
  },

  async getAuthUser(): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async refreshAuth(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Session expired');
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  },

  async getSessions(): Promise<Array<{ id: string; created_at: string; last_used_at: string; expires_at: string; current: boolean }>> {
    if (USE_MOCKS) {
      const now = new Date().toISOString();
      return [{ id: 'mock-current-session', created_at: now, last_used_at: now, expires_at: new Date(Date.now() + 3600000).toISOString(), current: true }];
    }
    const res = await fetch(`${API_BASE_URL}/auth/sessions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active sessions');
    return res.json();
  },

  async revokeSession(id: string): Promise<void> {
    if (USE_MOCKS) return;
    const res = await fetch(`${API_BASE_URL}/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to revoke session');
  },

  async requestPasswordReset(email: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Unable to send reset instructions');
  },

  // --- Dashboard ---
  async getDashboardStats(): Promise<DashboardStats> {
    if (USE_MOCKS) {
      await sleep(150);
      // dynamically update active stats based on memory lists
      const delayedCount = memoryVehicles.filter(v => v.status === 'delayed').length;
      // movingCount available for future live stats display
      memoryDashboardStats.active_trucks = memoryVehicles.length;
      memoryDashboardStats.trucks_delayed = delayedCount;
      return memoryDashboardStats;
    }
    const res = await fetchWithTimeout(`${API_BASE_URL}/analytics/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // --- Vehicles ---
  async getVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return memoryVehicles;
    }
    const res = await fetchWithTimeout(`${API_BASE_URL}/vehicles`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async getFleetStaff(): Promise<import('./types').FleetStaff[]> {
    const res = await fetch(`${API_BASE_URL}/fleet-staff`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch fleet staff');
    return res.json();
  },

  async createFleetStaff(data: Omit<import('./types').FleetStaff, 'id' | 'company_id' | 'created_at' | 'assigned_vehicle_count'>): Promise<import('./types').FleetStaff> {
    const res = await fetch(`${API_BASE_URL}/fleet-staff`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to add fleet staff');
    return res.json();
  },

  async updateFleetStaff(id: string, data: Partial<import('./types').FleetStaff>): Promise<import('./types').FleetStaff> {
    const res = await fetch(`${API_BASE_URL}/fleet-staff/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to update fleet staff');
    return res.json();
  },

  async deleteFleetStaff(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/fleet-staff/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to remove fleet staff');
  },

  async getVehicleById(id: string): Promise<Vehicle> {
    if (USE_MOCKS) {
      await sleep(100);
      const vehicle = memoryVehicles.find((v) => v.id === id);
      if (!vehicle) throw new Error('Vehicle not found');
      return vehicle;
    }
    const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vehicle');
    return res.json();
  },

  async createVehicle(data: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>): Promise<Vehicle> {
    // Normalise any legacy frontend status values to backend enum values
    const rawStatus = (data.status as string) || 'active';
    const normalizedStatus: any =
      rawStatus === 'moving'     ? 'in_transit' :
      rawStatus === 'stationary' ? 'active'     : rawStatus;

    if (USE_MOCKS) {
      await sleep(300);
      const newVehicle: Vehicle = {
        id: `vh_${Math.random().toString(36).substr(2, 9)}`,
        company_id: 'seed-company-siginon-001',
        registration_number: data.registration_number,
        vehicle_type: data.vehicle_type,
        capacity: Number(data.capacity),
        hourly_operating_cost: Number(data.hourly_operating_cost),
        status: normalizedStatus,
        fuel_level: data.fuel_level,
        fuel_tank_capacity_liters: data.fuel_tank_capacity_liters,
        fuel_consumption_liters_per_100km: data.fuel_consumption_liters_per_100km,
        odometer_km: data.odometer_km,
        maintenance_status: data.maintenance_status,
        next_inspection_date: data.next_inspection_date,
        created_at: new Date().toISOString(),
        current_location_name: 'Unassigned Loading Bay',
        today_excess_dwell_minutes: 0
      };
      memoryVehicles.push(newVehicle);
      return newVehicle;
    }

    const payload = {
      registration_number: data.registration_number,
      vehicle_type: data.vehicle_type,
      capacity: Number(data.capacity),
      hourly_operating_cost: Number(data.hourly_operating_cost),
      status: normalizedStatus,
      image_url: data.image_url,
      driver_name: data.driver_name,
      driver_phone: data.driver_phone,
      driver_license: data.driver_license,
      driver_status: data.driver_status,
      driver_id: data.driver_id,
      co_driver_id: data.co_driver_id,
      trailer_number: data.trailer_number,
      container_number: data.container_number,
      container_type: data.container_type,
      cargo_type: data.cargo_type,
      telematics_provider: data.telematics_provider,
      tracker_imei: data.tracker_imei,
      fuel_level: data.fuel_level,
      fuel_tank_capacity_liters: data.fuel_tank_capacity_liters,
      fuel_consumption_liters_per_100km: data.fuel_consumption_liters_per_100km,
      odometer_km: data.odometer_km,
      maintenance_status: data.maintenance_status,
      next_inspection_date: data.next_inspection_date,
    };

    const res = await fetch(`${API_BASE_URL}/vehicles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err?.detail === 'string'
        ? err.detail
        : Array.isArray(err?.detail)
        ? err.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        : err?.detail?.message || err?.message || 'Failed to create vehicle';
      throw new Error(msg);
    }
    return res.json();
  },

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    let payload: any = { ...data };
    if (data.status) {
      const rawStatus = data.status as string;
      // Normalise any legacy frontend status values to backend enum values
      payload.status =
        rawStatus === 'moving'     ? 'in_transit' :
        rawStatus === 'stationary' ? 'active'     : rawStatus;
    }
    if (data.capacity !== undefined) payload.capacity = Number(data.capacity);
    if (data.hourly_operating_cost !== undefined) payload.hourly_operating_cost = Number(data.hourly_operating_cost);

    if (USE_MOCKS) {
      await sleep(250);
      const index = memoryVehicles.findIndex((v) => v.id === id);
      if (index === -1) throw new Error('Vehicle not found');
      const updated = { ...memoryVehicles[index], ...payload };
      memoryVehicles[index] = updated;
      return updated;
    }
    const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err?.detail === 'string'
        ? err.detail
        : Array.isArray(err?.detail)
        ? err.detail.map((d: any) => d.msg || d.message).join(', ')
        : err?.detail?.message || err?.message || 'Failed to update vehicle';
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteVehicle(id: string): Promise<boolean> {
    if (USE_MOCKS) {
      await sleep(200);
      memoryVehicles = memoryVehicles.filter((v) => v.id !== id);
      return true;
    }
    const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete vehicle');
    return true;
  },

  // --- Locations ---
  async getLocations(): Promise<Location[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return memoryLocations;
    }
    const res = await fetch(`${API_BASE_URL}/locations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch locations');
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.items || []);
    return rows.map((row: any) => ({
      ...row,
      vehicle_id: row.vehicle_id ?? row.id,
      total_dwell_events: row.total_dwell_events ?? row.total_trips ?? 0,
      total_excess_dwell_minutes: row.total_excess_dwell_minutes ?? row.excess_dwell_minutes ?? 0,
      total_financial_loss: row.total_financial_loss ?? row.total_excess_cost ?? 0,
      avg_dwell_minutes: row.avg_dwell_minutes ?? 0,
    }));
  },

  async getLocationById(id: string): Promise<Location> {
    if (USE_MOCKS) {
      await sleep(100);
      const loc = memoryLocations.find((l) => l.id === id);
      if (!loc) throw new Error('Location not found');
      return loc;
    }
    const res = await fetch(`${API_BASE_URL}/locations/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch location');
    return res.json();
  },

  async createLocation(data: Omit<Location, 'id' | 'company_id'>): Promise<Location> {
    if (USE_MOCKS) {
      await sleep(300);
      const newLoc: Location = {
        id: `loc_${Math.random().toString(36).substr(2, 9)}`,
        company_id: 'seed-company-siginon-001',
        name: data.name,
        location_type: data.location_type,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        geofence_radius: Number(data.geofence_radius),
        expected_dwell_minutes: Number(data.expected_dwell_minutes)
      };
      memoryLocations.push(newLoc);
      return newLoc;
    }
    const payload = {
      name: data.name,
      location_type: data.location_type,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      geofence_radius: Number(data.geofence_radius),
      expected_dwell_minutes: Number(data.expected_dwell_minutes)
    };
    const res = await fetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err?.detail === 'string'
        ? err.detail
        : Array.isArray(err?.detail)
        ? err.detail.map((d: any) => d.msg || d.message).join(', ')
        : err?.detail?.message || err?.message || 'Failed to create location';
      throw new Error(msg);
    }
    return res.json();
  },

  async updateLocation(id: string, data: Partial<Location>): Promise<Location> {
    let payload: any = { ...data };
    if (data.latitude !== undefined) payload.latitude = Number(data.latitude);
    if (data.longitude !== undefined) payload.longitude = Number(data.longitude);
    if (data.geofence_radius !== undefined) payload.geofence_radius = Number(data.geofence_radius);
    if (data.expected_dwell_minutes !== undefined) payload.expected_dwell_minutes = Number(data.expected_dwell_minutes);

    if (USE_MOCKS) {
      await sleep(250);
      const index = memoryLocations.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Location not found');
      const updated = { ...memoryLocations[index], ...payload };
      memoryLocations[index] = updated;
      return updated;
    }
    const res = await fetch(`${API_BASE_URL}/locations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err?.detail === 'string'
        ? err.detail
        : Array.isArray(err?.detail)
        ? err.detail.map((d: any) => d.msg || d.message).join(', ')
        : err?.detail?.message || err?.message || 'Failed to update location';
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteLocation(id: string): Promise<boolean> {
    if (USE_MOCKS) {
      await sleep(200);
      memoryLocations = memoryLocations.filter((l) => l.id !== id);
      return true;
    }
    const res = await fetch(`${API_BASE_URL}/locations/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete location');
    return true;
  },

  // --- Company configuration ---
  async getCompanyConfig(): Promise<import('./types').CompanyConfig> {
    if (USE_MOCKS) {
      await sleep(150);
      return memoryCompanyConfig;
    }
    const res = await fetchWithTimeout(`${API_BASE_URL}/company`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch company configuration');
    return res.json();
  },

  async updateCompanyConfig(data: Partial<import('./types').CompanyConfig>): Promise<import('./types').CompanyConfig> {
    if (USE_MOCKS) {
      await sleep(200);
      memoryCompanyConfig = { ...memoryCompanyConfig, ...data };
      return memoryCompanyConfig;
    }
    const res = await fetch(`${API_BASE_URL}/company`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update company configuration');
    return res.json();
  },

  // --- Account profile ---
  async getProfile(): Promise<import('./types').User> {
    if (USE_MOCKS) {
      await sleep(100);
      return memoryUsers[0];
    }
    const res = await fetch(`${API_BASE_URL}/account/profile`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch account profile');
    return res.json();
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<import('./types').User> {
    if (USE_MOCKS) {
      await sleep(150);
      memoryUsers[0] = { ...memoryUsers[0], ...data };
      return memoryUsers[0];
    }
    const res = await fetch(`${API_BASE_URL}/account/profile`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update account profile');
    return res.json();
  },

  async changePassword(current_password: string, new_password: string): Promise<{ message: string; status: string }> {
    const res = await fetch(`${API_BASE_URL}/account/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ current_password, new_password }),
    });
    if (!res.ok) throw new Error('Failed to change password');
    return res.json();
  },

  async getNotificationPreferences(): Promise<Record<string, boolean>> {
    if (USE_MOCKS) {
      await sleep(100);
      return {
        email_notifications: true, sms_notifications: false, push_notifications: true,
        notify_on_delay: true, notify_on_arrival: true, notify_on_gate_pass: true,
        notify_on_demurrage: true,
      };
    }
    const res = await fetch(`${API_BASE_URL}/account/notifications`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notification preferences');
    return res.json();
  },

  async updateNotificationPreferences(data: Record<string, boolean>): Promise<Record<string, boolean>> {
    if (USE_MOCKS) {
      await sleep(100);
      return data;
    }
    const res = await fetch(`${API_BASE_URL}/account/notifications`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update notification preferences');
    return res.json();
  },

  // --- Users / Team ---
  async getUsers(params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<{ items: import('./types').User[]; total: number; page: number; page_size: number }> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.page_size !== undefined) query.set('page_size', String(params.page_size));
    if (params.search) query.set('search', params.search);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);

    if (USE_MOCKS) {
      await sleep(150);
      const filtered = memoryUsers.filter((user) => {
        const matchesSearch = !params.search || `${user.name} ${user.email} ${user.phone ?? ''}`
          .toLowerCase().includes(params.search.toLowerCase());
        return matchesSearch && (!params.role || user.role === params.role) && (!params.status || user.status === params.status);
      });
      return { items: filtered, total: filtered.length, page: params.page ?? 1, page_size: params.page_size ?? 50 };
    }

    const res = await fetch(`${API_BASE_URL}/users?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch team users');
    return res.json();
  },

  async createUser(data: { email: string; name: string; role: string; phone?: string; status?: string }): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  async updateUser(id: string, data: { name?: string; role?: string; phone?: string; status?: string }): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async suspendUser(id: string): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}/suspend`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to suspend user');
    return res.json();
  },

  async activateUser(id: string): Promise<import('./types').User> {
    const res = await fetch(`${API_BASE_URL}/users/${id}/activate`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to activate user');
    return res.json();
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete user');
    return true;
  },

  // --- Notifications ---
  async getNotifications(params: { unread_only?: boolean; limit?: number; offset?: number } = {}): Promise<{ items: any[]; total: number; unread: number }> {
    if (USE_MOCKS) return { items: [], total: 0, unread: 0 };
    const query = new URLSearchParams();
    if (params.unread_only !== undefined) query.set('unread_only', String(params.unread_only));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    const res = await fetch(`${API_BASE_URL}/notifications?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  async markAllNotificationsRead(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to mark notifications as read');
  },

  async deleteNotification(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete notification');
    return true;
  },

  async registerMessagingToken(token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/devices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail?.error?.message || body?.detail || 'Failed to register notification device');
    }
  },

  // --- GPS Events / Live positions ---
  async getLiveGPSEvents(): Promise<Record<string, GPSEvent>> {
    if (USE_MOCKS) {
      await sleep(100);
      // Return mapping of vehicle_id -> latest gps event
      return mockLiveGpsEvents;
    }
    const res = await fetch(`${API_BASE_URL}/vehicles/live`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch live vehicle positions');
    return res.json();
  },

  // --- Dwell Events ---
  async getDwellEvents(vehicleId?: string): Promise<DwellEvent[]> {
    if (USE_MOCKS) {
      await sleep(200);
      if (vehicleId) {
        return memoryDwellEvents.filter((d) => d.vehicle_id === vehicleId);
      }
      return memoryDwellEvents;
    }
    const url = vehicleId
      ? `${API_BASE_URL}/dwell-events/${vehicleId}`
      : `${API_BASE_URL}/dwell-events`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dwell events');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  // --- Insights ---
  async getInsights(): Promise<Insight[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return memoryInsights;
    }
    const res = await fetch(`${API_BASE_URL}/insights`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch insights');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async triggerAnalysis(): Promise<Insight[]> {
    if (USE_MOCKS) {
      await sleep(1500); // simulate heavier analytical load
      // Add a mock new insight
      const hasInsight = memoryInsights.some(ins => ins.id === 'ins_new_001');
      if (!hasInsight) {
        const newInsight: Insight = {
          id: 'ins_new_001',
          company_id: 'seed-company-siginon-001',
          type: 'EXCESSIVE_DWELL',
          severity: 'danger' as any, // mapping to design system danger
          title: 'Critical Queue Spillover at Busia Border',
          description: 'Customs clearance times spiked to 6.2 hours over the last 24 hours (Expected: 4h). Impacting 3 transit vehicles.',
          location_id: 'loc_busia_border',
          financial_impact: 145000,
          recommendation: 'Re-route upcoming shipments through Malaba Border or delay dispatch until backlog clears (est. 12 hours).',
          created_at: new Date().toISOString(),
          location_name: 'Busia Border Clearance'
        };
        memoryInsights = [newInsight, ...memoryInsights];
      }
      return memoryInsights;
    }
    const res = await fetch(`${API_BASE_URL}/insights/analyze`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to trigger analysis run');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  // --- Analytics & Aggregates ---
  async getLocationStats(): Promise<LocationStats[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockLocationStats;
    }
    const res = await fetch(`${API_BASE_URL}/analytics/locations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch location stats');
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.items || []);
    return rows.map((row: any) => ({
      ...row,
      location_id: row.location_id ?? row.id,
      location_name: row.location_name ?? row.name ?? 'Unknown stop',
      financial_impact: row.financial_impact ?? row.total_excess_cost ?? row.financial_impact_kes ?? 0,
      avg_excess_delay_minutes: row.avg_excess_delay_minutes ?? row.average_excess_minutes ?? 0,
      total_visits: row.total_visits ?? row.visit_count ?? 0,
    }));
  },

  async getVehicleStats(): Promise<VehicleStats[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockVehicleStats;
    }
    const res = await fetch(`${API_BASE_URL}/analytics/vehicles`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vehicle stats');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async getTrendData(days = 30): Promise<TrendDataPoint[]> {
    if (USE_MOCKS) {
      await sleep(250);
      return mockTrendData;
    }
    const res = await fetch(`${API_BASE_URL}/analytics/trends?days=${days}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trend data');
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.points || []);
    return rows.map((row: any) => ({
      ...row,
      average_dwell_minutes: row.average_dwell_minutes ?? (row.visit_count ? row.total_dwell_minutes / row.visit_count : 0),
      estimated_cost: row.estimated_cost ?? row.financial_impact_kes ?? 0,
      delayed_visit_count: row.delayed_visit_count ?? 0,
    }));
  },

  async getFleetProductivity(days = 30): Promise<unknown> {
    if (USE_MOCKS) return { score: 0, visits: [], total_financial_waste: 0 };
    const res = await fetch(`${API_BASE_URL}/analytics/fleet-productivity?days=${days}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch fleet productivity');
    return res.json();
  },

  // --- Predictions ---
  async getPredictionsDwell(destinationId: string, plannedArrival: string): Promise<PredictionDwellResponse> {
    if (USE_MOCKS) {
      await sleep(400);
      // statistical mock: find location expected + add some jitter
      const loc = memoryLocations.find(l => l.id === destinationId);
      const base = loc ? loc.expected_dwell_minutes : 90;
      return {
        predicted_dwell_minutes: Math.round(base * 1.35),
        model_version: 'statistical-v1'
      };
    }
    const res = await fetch(`${API_BASE_URL}/predictions/dwell`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ destination_id: destinationId, planned_arrival: plannedArrival })
    });
    if (!res.ok) throw new Error('Failed to fetch predicted dwell');
    return res.json();
  },

  async getPredictionsDelayRisk(destinationId: string, plannedArrival: string): Promise<PredictionDelayRiskResponse> {
    if (USE_MOCKS) {
      await sleep(500);
      const loc = memoryLocations.find(l => l.id === destinationId);
      const expected = loc ? loc.expected_dwell_minutes : 90;
      const predicted = Math.round(expected * 1.45);
      const riskPercent = 78;
      return {
        predicted_dwell: predicted,
        expected_dwell: expected,
        risk_percent: riskPercent,
        reason: 'High outbound congestion detected at the facility during typical afternoon hours.',
        recommendation: 'Target arrival before 11:00 AM to benefit from early-day clearance speedups.',
        model_version: 'statistical-v1'
      };
    }
    const res = await fetch(`${API_BASE_URL}/predictions/delay-risk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ destination_id: destinationId, planned_arrival: plannedArrival })
    });
    if (!res.ok) throw new Error('Failed to fetch delay risk prediction');
    return res.json();
  },

  // --- AI Advisor ---
  async getCorridorAnalysis(): Promise<AICorridorAnalysis> {
    if (USE_MOCKS) {
      await sleep(1800);
      return {
        executive_summary: 'Fleet operations across East African transit nodes are experiencing localized dwell friction. The highest operational delay is concentrated at Athi River Logistics Park – Bay 12.',
        financial_impact_analysis: 'Cumulative excess dwell represents a significant financial liability exceeding KES 253,886/month.',
        primary_bottlenecks: [
          { location: 'Namanga Border Post', severity: 'high', issue: 'Excess delay averaging 46.4 min above expected window.', recommendation: 'Coordinate pre-clearance documentation before terminal gate-in.' },
          { location: 'Malaba OSBP Border Crossing', severity: 'medium', issue: 'Excess delay averaging 37.8 min above expected window.', recommendation: 'Coordinate pre-clearance documentation before terminal gate-in.' },
          { location: 'Kilindini Container Port Gate 14', severity: 'medium', issue: 'Excess delay averaging 37.5 min above expected window.', recommendation: 'Coordinate pre-clearance documentation before terminal gate-in.' },
        ],
        immediate_actions: [
          'Deploy digital document pre-checks before trucks depart inland container depots (ICD).',
          'Re-route time-sensitive consignments around Athi River during peak hours.',
          'Notify dispatch managers to monitor in-progress dwell alerts exceeding 60 minutes.',
        ],
        strategic_recommendations: [
          'Establish strict 45-minute customer facility loading SLAs with penalty-backed demurrage terms.',
          'Implement predictive departure windows based on historical customs clearing queues.',
        ],
        estimated_monthly_savings_kes: 180650,
        model_used: 'heuristic-fallback-v1',
        analysis_timestamp: new Date().toISOString(),
      };
    }
    const res = await fetch(`${API_BASE_URL}/ai/corridor-analysis`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error('Failed to fetch AI corridor analysis');
    return res.json();
  },

  async sendCopilotQuery(query: string, context?: Record<string, unknown>): Promise<AICopilotResponse> {
    if (USE_MOCKS) {
      await sleep(1200);
      return {
        response: `Based on your fleet data, I can see the corridor is experiencing elevated dwell at border crossings. For your query: "${query}" — I recommend checking the Namanga border post which currently shows the highest excess dwell at +46 min above SLA threshold.`,
        suggestions: [
          'Show me top bottleneck locations this week',
          'Which vehicles have the highest dwell costs?',
          'What is the estimated monthly savings if we optimize Namanga processing?',
        ],
        model_used: 'heuristic-advisor-v1',
      };
    }
    const res = await fetch(`${API_BASE_URL}/ai/copilot-query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, context })
    });
    if (!res.ok) throw new Error('Failed to send copilot query');
    const data = await res.json();
    return {
      response: data.answer || data.response || 'No response provided by AI engine.',
      model_used: data.model || data.model_used,
      suggestions: data.suggestions
    };
  },

  // --- Trips / Dispatch ---
  async getTrips(): Promise<Trip[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return memoryTrips;
    }
    const res = await fetchWithTimeout(`${API_BASE_URL}/trips`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trips');
    const data = await res.json();
    const items: any[] = Array.isArray(data) ? data : (data.items || []);
    // Map backend joined origin/destination objects → flat display fields
    return items.map(_normalizeTrip);
  },

  async getTripById(id: string): Promise<Trip> {
    if (USE_MOCKS) {
      await sleep(100);
      const trip = memoryTrips.find((item) => item.id === id);
      if (!trip) throw new Error('Trip not found');
      return trip;
    }
    const res = await fetch(`${API_BASE_URL}/trips/${id}`, { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 404) throw new Error('Trip not found');
      throw new Error('Failed to fetch trip');
    }
    return _normalizeTrip(await res.json());
  },

  async createTrip(data: Omit<Trip, 'id'>): Promise<Trip> {
    if (USE_MOCKS) {
      await sleep(350);
      const newTrip: Trip = {
        id: `trip_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'planned'
      };
      memoryTrips = [newTrip, ...memoryTrips];
      return newTrip;
    }
    const res = await fetch(`${API_BASE_URL}/trips`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create trip');
    return _normalizeTrip(await res.json());
  },

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
    if (USE_MOCKS) {
      await sleep(250);
      const index = memoryTrips.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Trip not found');
      memoryTrips[index] = { ...memoryTrips[index], ...data };
      return memoryTrips[index];
    }
    const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update trip');
    return _normalizeTrip(await res.json());
  },

  async startTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: 'in_transit' });
  },

  async completeTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: 'completed' });
  },

  async cancelTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: 'cancelled' });
  },

  async reassignTrip(id: string, data: { vehicle_id: string }): Promise<Trip> {
    return this.updateTrip(id, data);
  },

  async archiveTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: 'cancelled' });
  },

  async deleteTrip(id: string): Promise<boolean> {
    if (USE_MOCKS) {
      await sleep(200);
      memoryTrips = memoryTrips.filter((t) => t.id !== id);
      return true;
    }
    const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete trip');
    return true;
  },

  // --- Delay Charges (Demurrage) Claims & Invoicing ---
  async getDelayChargeClaims(): Promise<DelayChargeClaim[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return memoryDemurrageClaims;
    }
    const res = await fetch(`${API_BASE_URL}/demurrage/claims`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch delay charge claims');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async createDelayChargeClaim(data: Omit<DelayChargeClaim, 'id' | 'claim_number' | 'created_at' | 'updated_at'>): Promise<DelayChargeClaim> {
    if (USE_MOCKS) {
      const claimNum = `CLM-${data.location_name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const newClaim: DelayChargeClaim = {
        id: `clm_${Math.random().toString(36).substr(2, 9)}`,
        claim_number: claimNum,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data
      };
      await sleep(300);
      memoryDemurrageClaims = [newClaim, ...memoryDemurrageClaims];
      return newClaim;
    }
    const res = await fetch(`${API_BASE_URL}/demurrage/claims`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create delay charge claim');
    return res.json();
  },

  async updateDelayChargeClaim(id: string, data: Partial<DelayChargeClaim>): Promise<DelayChargeClaim> {
    if (USE_MOCKS) {
      await sleep(250);
      const index = memoryDemurrageClaims.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Claim not found');
      memoryDemurrageClaims[index] = { ...memoryDemurrageClaims[index], ...data };
      return memoryDemurrageClaims[index];
    }
    const res = await fetch(`${API_BASE_URL}/demurrage/claims/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update delay charge claim');
    return res.json();
  },

  // Backward compatibility aliases
  getDemurrageClaims: function() { return this.getDelayChargeClaims(); },
  createDemurrageClaim: function(data: any) { return this.createDelayChargeClaim(data); },
  updateDemurrageClaim: function(id: string, data: any) { return this.updateDelayChargeClaim(id, data); },

  // --- Gate Passes ---
  async getGatePasses(vehicleId?: string, tripId?: string): Promise<import('./types').GatePassData[]> {
    if (USE_MOCKS) {
      await sleep(150);
      let results = memoryGatePasses;
      if (vehicleId) results = results.filter(p => p.vehicle_id === vehicleId);
      if (tripId)    results = results.filter(p => p.trip_id === tripId);
      return [...results].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
    const params = new URLSearchParams();
    if (vehicleId) params.set('vehicle_id', vehicleId);
    if (tripId)    params.set('trip_id', tripId);
    const url = `${API_BASE_URL}/gate-passes${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch gate passes');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.items || []);
  },

  async getGatePassById(id: string): Promise<import('./types').GatePassData> {
    if (USE_MOCKS) {
      const pass = memoryGatePasses.find((item) => item.id === id);
      if (!pass) throw new Error('Gate pass not found');
      return pass;
    }
    const res = await fetch(`${API_BASE_URL}/gate-passes/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch gate pass');
    return res.json();
  },

  async approveGatePass(id: string): Promise<import('./types').GatePassData> {
    return this.updateGatePass(id, { status: 'approved' });
  },

  async markGatePassUsed(id: string): Promise<import('./types').GatePassData> {
    return this.updateGatePass(id, { status: 'used' });
  },

  async reissueGatePass(id: string): Promise<import('./types').GatePassData> {
    return this.updateGatePass(id, { status: 'pre_approved' });
  },

  async deleteGatePass(id: string): Promise<boolean> {
    return this.updateGatePass(id, { status: 'cancelled' }).then(() => true);
  },

  /** Returns the first active (non-expired, non-cancelled) gate pass for a trip, or null. */
  async getActiveGatePassForTrip(tripId: string): Promise<import('./types').GatePassData | null> {
    const passes = await this.getGatePasses(undefined, tripId);
    const active = passes.find(p => p.status !== 'expired' && p.status !== 'cancelled');
    return active ?? null;
  },

  async createGatePass(data: Omit<import('./types').GatePassData, 'pass_number'>): Promise<import('./types').GatePassData> {
    if (USE_MOCKS) {
      await sleep(300);
      // Mock duplicate check
      if (data.trip_id) {
        const existing = memoryGatePasses.find(
          p => p.trip_id === data.trip_id && p.status !== 'expired' && p.status !== 'cancelled'
        );
        if (existing) return existing;
      }
      const reg = (data.vehicle_reg || '').replace(/\s+/g, '');
      const ts  = Date.now().toString().slice(-6);
      const pass: import('./types').GatePassData = {
        id: `gp_${Math.random().toString(36).substr(2, 9)}`,
        pass_number: `GP-${reg}-${ts}`,
        issued_by_name: 'Fleet Manager',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      };
      memoryGatePasses = [pass, ...memoryGatePasses];
      return pass;
    }
    const res = await fetch(`${API_BASE_URL}/gate-passes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (res.status === 409) {
      // Duplicate — backend returns existing pass ID; fetch and return it
      const errBody = await res.json().catch(() => ({}));
      const existingId = errBody?.error?.existing_pass_id;
      if (existingId) {
        const existingRes = await fetch(`${API_BASE_URL}/gate-passes/${existingId}`, { headers: getHeaders() });
        if (existingRes.ok) return existingRes.json();
      }
      throw new Error(errBody?.error?.message || 'Duplicate gate pass');
    }
    if (!res.ok) throw new Error('Failed to create gate pass');
    return res.json();
  },

  async updateGatePass(id: string, data: Partial<import('./types').GatePassData>): Promise<import('./types').GatePassData> {
    if (USE_MOCKS) {
      await sleep(200);
      const idx = memoryGatePasses.findIndex(p => p.id === id);
      if (idx !== -1) memoryGatePasses[idx] = { ...memoryGatePasses[idx], ...data };
      return memoryGatePasses[idx] ?? { ...data } as import('./types').GatePassData;
    }
    const res = await fetch(`${API_BASE_URL}/gate-passes/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update gate pass');
    return res.json();
  },

  async revokeGatePass(id: string): Promise<import('./types').GatePassData> {
    if (USE_MOCKS) {
      await sleep(200);
      const idx = memoryGatePasses.findIndex(p => p.id === id);
      if (idx !== -1) memoryGatePasses[idx] = { ...memoryGatePasses[idx], status: 'cancelled' };
      return memoryGatePasses[idx];
    }
    const res = await fetch(`${API_BASE_URL}/gate-passes/${id}/revoke`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to revoke gate pass');
    }
    return res.json();
  },

  async _triggerDownload(url: string, filename: string): Promise<void> {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  },

  async downloadGatePassPDF(passId: string, passNumber: string): Promise<void> {
    if (USE_MOCKS) {
      alert('PDF download requires the backend server. Enable real API mode to download.');
      return;
    }
    await this._triggerDownload(
      `${API_BASE_URL}/gate-passes/${passId}/download`,
      `gate-pass-${passNumber}.pdf`
    );
  },

  async downloadDemurrageNoticePDF(claimId: string, claimNumber: string): Promise<void> {
    if (USE_MOCKS) {
      alert('PDF download requires the backend server. Enable real API mode to download.');
      return;
    }
    await this._triggerDownload(
      `${API_BASE_URL}/demurrage/claims/${claimId}/download`,
      `demurrage-notice-${claimNumber}.pdf`
    );
  },

  // --- CSV Export Helpers ---
  exportDwellEventsCSV(events: DwellEvent[]): void {
    const headers = ['Vehicle Reg', 'Location', 'Type', 'Arrival', 'Departure', 'Dwell (min)', 'Expected (min)', 'Excess (min)', 'Cost (KES)'];
    const rows = events.map(e => [
      e.vehicle_reg || e.vehicle_id,
      e.location_name || e.location_id,
      e.location_type || '',
      e.arrival_time,
      e.departure_time || 'In Progress',
      e.dwell_minutes,
      e.expected_minutes,
      e.excess_minutes,
      e.estimated_cost
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dwell-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportDelayChargeClaimsCSV(claims: DelayChargeClaim[]): void {
    const headers = ['Claim #', 'Vehicle Reg', 'Terminal Location', 'Container #', 'Responsible Party', 'Excess Dwell (min)', 'Rate (KES/hr)', 'Claim Amount (KES)', 'Settled Amount (KES)', 'Status', 'Date'];
    const rows = claims.map(c => [
      c.claim_number,
      c.vehicle_reg,
      c.location_name,
      c.container_number || 'N/A',
      c.responsible_party,
      c.excess_delay_minutes,
      c.hourly_operating_rate,
      c.claimed_amount_kes,
      c.settled_amount_kes || 0,
      c.status,
      c.created_at
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delay-charges-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Backward compatibility alias
  exportDemurrageClaimsCSV: function(claims: any[]) { return this.exportDelayChargeClaimsCSV(claims); }
};

