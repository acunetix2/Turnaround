import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export function useCorridorAnalysis() {
  return useQuery({
    queryKey: ['ai', 'corridor-analysis'],
    queryFn: apiClient.getCorridorAnalysis,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useCopilotQuery() {
  return useMutation({
    mutationFn: ({ query, context }: { query: string; context?: Record<string, unknown> }) =>
      apiClient.sendCopilotQuery(query, context),
  });
}
