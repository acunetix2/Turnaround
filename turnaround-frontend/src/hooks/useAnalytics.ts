import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

export function useAnalyticsTrends() {
  return useQuery({
    queryKey: queryKeys.analytics.trends(),
    queryFn: apiClient.getTrendData,
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
