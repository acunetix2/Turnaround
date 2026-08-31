import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';
import type { Vehicle } from '../lib/api/types';

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.all(),
    queryFn: apiClient.getVehicles,
    select: (data: Vehicle[]) => {
      if (!Array.isArray(data)) return [];
      const seen = new Set<string>();
      return data.filter((vh) => {
        const key = vh.registration_number ? vh.registration_number.trim().toUpperCase() : vh.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    staleTime: 20_000,
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: () => apiClient.getVehicleById(id),
    enabled: Boolean(id),
  });
}

export function useVehicleStats() {
  return useQuery({
    queryKey: queryKeys.vehicles.stats(),
    queryFn: apiClient.getVehicleStats,
    staleTime: 60_000,
  });
}

export function useVehicleDwells(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.dwells(vehicleId),
    queryFn: () => apiClient.getDwellEvents(vehicleId),
    enabled: Boolean(vehicleId),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Vehicle, 'id' | 'company_id' | 'created_at'>) =>
      apiClient.createVehicle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vehicle>) => apiClient.updateVehicle(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteVehicle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
