import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

/**
 * Fetches the latest GPS position for every active vehicle via the
 * GET /vehicles/live aggregate endpoint (D-002).
 *
 * Returns Record<vehicle_id, LiveVehiclePosition> — one request covers the
 * entire fleet regardless of size, eliminating N+1 per-vehicle fetches.
 * Polls every 15 seconds for near-live map updates.
 */
export function useLiveGPSEvents(pollIntervalMs = 15_000) {
  return useQuery({
    queryKey: queryKeys.liveMap.gpsEvents(),
    queryFn: apiClient.getLiveGPSEvents,
    refetchInterval: pollIntervalMs,
    staleTime: 10_000,
  });
}
