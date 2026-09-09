import { useQuery } from '@tanstack/react-query';
import { gestionPaiementsApi } from './gestionPaiementsApi';
import { GestionPaiementsQueryParams } from './types';

export const paymentManagementKeys = {
  all: ['gestion-paiements'] as const,
  lists: () => [...paymentManagementKeys.all, 'list'] as const,
  list: (params: GestionPaiementsQueryParams) =>
    [...paymentManagementKeys.lists(), params] as const,
  details: () => [...paymentManagementKeys.all, 'detail'] as const,
  detail: (sourceType: string, sourceId: number) =>
    [...paymentManagementKeys.details(), sourceType, sourceId] as const,
  stats: (params?: GestionPaiementsQueryParams) =>
    [...paymentManagementKeys.all, 'stats', params || {}] as const,
};

export function useGestionPaiementsQuery(params: GestionPaiementsQueryParams) {
  return useQuery({
    queryKey: paymentManagementKeys.list(params),
    queryFn: () => gestionPaiementsApi.getAll(params),
  });
}

export function useGestionPaiementStatsQuery(params?: GestionPaiementsQueryParams) {
  return useQuery({
    queryKey: paymentManagementKeys.stats(params),
    queryFn: () => gestionPaiementsApi.getStats(params),
  });
}

export function useGestionPaiementDetailQuery(
  sourceType: string | null,
  sourceId: number | null,
) {
  return useQuery({
    queryKey: paymentManagementKeys.detail(sourceType!, sourceId!),
    queryFn: () => gestionPaiementsApi.getBySource(sourceType!, sourceId!),
    enabled: Boolean(sourceType && sourceId),
  });
}
