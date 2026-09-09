import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paiementsClientsApi } from './paiementsClientsApi';
import type { CreatePaiementClientPayload, QueryPaiementClientDto } from './types';
import { CREANCE_KEYS } from '../creances/useCreances';
import { factureKeys } from '../factures/useFactures';

export const PAIEMENT_CLIENT_KEYS = {
  all: ['paiements-clients'] as const,
  lists: () => [...PAIEMENT_CLIENT_KEYS.all, 'list'] as const,
  list: (params?: QueryPaiementClientDto) => [...PAIEMENT_CLIENT_KEYS.lists(), params] as const,
  details: () => [...PAIEMENT_CLIENT_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...PAIEMENT_CLIENT_KEYS.details(), id] as const,
  stats: (params?: QueryPaiementClientDto) => [...PAIEMENT_CLIENT_KEYS.all, 'stats', params] as const,
};

export function usePaiementsClientsQuery(params?: QueryPaiementClientDto) {
  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.list(params),
    queryFn: () => paiementsClientsApi.getPaiementsClients(params),
  });
}

export function usePaiementClientStats(params?: QueryPaiementClientDto) {
  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.stats(params),
    queryFn: () => paiementsClientsApi.getPaiementClientStats(params),
  });
}

export function usePaiementClientDetail(id: number | null) {
  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.detail(id!),
    queryFn: () => paiementsClientsApi.getPaiementClient(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePaiementClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePaiementClientPayload) =>
      paiementsClientsApi.createPaiementClient(payload),
    onSuccess: () => {
      // Invalidate relevant caches on successful payment
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CREANCE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: factureKeys.all });
    },
  });
}

export function useForexRateQuery(date?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['forex-rate', date],
    queryFn: () => paiementsClientsApi.getForexRate(date),
    enabled: Boolean(enabled && date),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
  });
}
