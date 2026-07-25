import { useQuery } from '@tanstack/react-query';
import { creancesApi } from './creancesApi';
import type { QueryCreanceDto } from './types';

export const CREANCE_KEYS = {
  all: ['creances'] as const,
  lists: () => [...CREANCE_KEYS.all, 'list'] as const,
  list: (params?: QueryCreanceDto) => [...CREANCE_KEYS.lists(), params] as const,
  details: () => [...CREANCE_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...CREANCE_KEYS.details(), id] as const,
  stats: () => [...CREANCE_KEYS.all, 'stats'] as const,
};

export function useCreancesQuery(params?: QueryCreanceDto) {
  return useQuery({
    queryKey: CREANCE_KEYS.list(params),
    queryFn: () => creancesApi.getCreances(params),
  });
}

export function useCreanceStats() {
  return useQuery({
    queryKey: CREANCE_KEYS.stats(),
    queryFn: () => creancesApi.getCreanceStats(),
  });
}

export function useCreanceDetail(id: number | null) {
  return useQuery({
    queryKey: CREANCE_KEYS.detail(id!),
    queryFn: () => creancesApi.getCreance(id!),
    enabled: Boolean(id),
  });
}
