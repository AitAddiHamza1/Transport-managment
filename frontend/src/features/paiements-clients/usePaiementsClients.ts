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
  stats: () => [...PAIEMENT_CLIENT_KEYS.all, 'stats'] as const,
};

export function usePaiementsClientsQuery(params?: QueryPaiementClientDto) {
  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.list(params),
    queryFn: () => paiementsClientsApi.getPaiementsClients(params),
  });
}

export function usePaiementClientStats() {
  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.stats(),
    queryFn: () => paiementsClientsApi.getPaiementClientStats(),
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
