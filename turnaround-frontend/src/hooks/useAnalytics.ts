import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

export function useAnalyticsTrends(days?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.trends(days),
    queryFn: () => apiClient.getTrendData(days),
    staleTime: 120_000,
  });
}

export function useLocationStats() {
  return useQuery({
    queryKey: queryKeys.locations.stats(),
    queryFn: apiClient.getLocationStats,
    staleTime: 120_000,
  });
}

export function useVehicleStats() {
  return useQuery({
    queryKey: queryKeys.vehicles.stats(),
    queryFn: apiClient.getVehicleStats,
    staleTime: 120_000,
  });
}

/**
 * D-004: Fleet productivity score from GET /analytics/fleet-productivity.
 * Returns score (0–100), visit breakdown, and total financial waste for the period.
 */
export function useFleetProductivity(days?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.productivity(days),
    queryFn: () => apiClient.getFleetProductivity(days),
    staleTime: 120_000,
  });
}
