import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { queryKeys } from '../lib/query-keys';

export function useInsights() {
  return useQuery({
    queryKey: queryKeys.insights.all(),
    queryFn: apiClient.getInsights,
    staleTime: 60_000,
  });
}

export function useRunAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiClient.triggerAnalysis,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.insights.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
