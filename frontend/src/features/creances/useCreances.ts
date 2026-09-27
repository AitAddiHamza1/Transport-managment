import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { creancesApi } from './creancesApi';
import type { QueryCreanceDto } from './types';

export const CREANCE_KEYS = {
  all: (companyId?: number) => ['creances', companyId] as const,
  lists: (companyId?: number) => [...CREANCE_KEYS.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: QueryCreanceDto) => [...CREANCE_KEYS.lists(companyId), params] as const,
  details: (companyId?: number) => [...CREANCE_KEYS.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number) => [...CREANCE_KEYS.details(companyId), id] as const,
  stats: (companyId?: number, params?: QueryCreanceDto) => [...CREANCE_KEYS.all(companyId), 'stats', params] as const,
};

export function useCreancesQuery(params?: QueryCreanceDto) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: CREANCE_KEYS.list(companyId, params),
    queryFn: () => creancesApi.getCreances(params),
    enabled: Boolean(companyId),
  });
}

export function useCreanceStats(params?: QueryCreanceDto) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: CREANCE_KEYS.stats(companyId, params),
    queryFn: () => creancesApi.getCreanceStats(params),
    enabled: Boolean(companyId),
  });
}

export function useCreanceDetail(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: CREANCE_KEYS.detail(companyId, id!),
    queryFn: () => creancesApi.getCreance(id!),
    enabled: Boolean(companyId && id),
  });
}
