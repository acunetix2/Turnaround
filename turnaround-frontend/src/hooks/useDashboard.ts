import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

/** Hook for the /analytics/dashboard endpoint with live polling */
export function useDashboard(pollIntervalMs = 30_000) {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: apiClient.getDashboardStats,
    refetchInterval: pollIntervalMs,
    staleTime: 15_000,
  });
}
