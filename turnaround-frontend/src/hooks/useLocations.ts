import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';
import type { Location } from '../lib/api/types';

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations.all(),
    queryFn: apiClient.getLocations,
    staleTime: 30_000,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: queryKeys.locations.detail(id),
    queryFn: () => apiClient.getLocationById(id),
    enabled: Boolean(id),
  });
}

export function useLocationStats() {
  return useQuery({
    queryKey: queryKeys.locations.stats(),
    queryFn: apiClient.getLocationStats,
    staleTime: 60_000,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Location, 'id' | 'company_id'>) =>
      apiClient.createLocation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.locations.all() });
    },
  });
}

export function useUpdateLocation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Location>) => apiClient.updateLocation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.locations.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.locations.all() });
    },
  });
}
