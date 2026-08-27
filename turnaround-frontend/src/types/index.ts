/**
 * Shared / derived types not owned by a single feature.
 * These extend or combine the base API types from lib/api/types.ts.
 */

export type SeverityLevel = 'danger' | 'warning' | 'good' | 'neutral';

export type VehicleStatus = 'moving' | 'stationary' | 'delayed';

export type LocationType =
  | 'warehouse'
  | 'distribution_center'
  | 'border_crossing'
  | 'port'
  | 'customer_site'
  | 'depot';

/** UI role labels */
export type UserRole = 'admin' | 'fleet_manager' | 'dispatcher' | 'analyst';

/** Permission check helper */
export type Permission = 'mutate_vehicles' | 'mutate_locations' | 'view_analytics' | 'run_analysis';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['mutate_vehicles', 'mutate_locations', 'view_analytics', 'run_analysis'],
  fleet_manager: ['mutate_vehicles', 'mutate_locations', 'view_analytics', 'run_analysis'],
  dispatcher: ['view_analytics'],
  analyst: ['view_analytics', 'run_analysis'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Derived stat for a location card */
export interface LocationSummary {
  id: string;
  name: string;
  location_type: LocationType;
  avg_dwell_minutes: number;
  expected_dwell_minutes: number;
  excess_minutes: number;
  financial_impact: number;
  visit_count: number;
}

/** Map marker payload */
export interface VehicleMapMarker {
  vehicleId: string;
  registrationNumber: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  locationName?: string;
  excessDwellMinutes?: number;
}
