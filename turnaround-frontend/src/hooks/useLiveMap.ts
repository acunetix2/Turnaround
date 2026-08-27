import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

/**
 * Fetches the latest GPS position for every active vehicle.
 * Polls every 15 seconds for near-live map updates.
 *
 * DECISION: Using a single aggregate endpoint GET /gps/events rather than
 * N+1 per-vehicle fetches. If the backend doesn't expose an aggregate,
 * flag this and negotiate a /vehicles/live endpoint (see DECISIONS.md).
 */
export function useLiveGPSEvents(pollIntervalMs = 15_000) {
  return useQuery({
    queryKey: queryKeys.liveMap.gpsEvents(),
    queryFn: apiClient.getLiveGPSEvents,
    refetchInterval: pollIntervalMs,
    staleTime: 10_000,
  });
}
