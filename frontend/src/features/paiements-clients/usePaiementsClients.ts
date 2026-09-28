import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { paiementsClientsApi } from './paiementsClientsApi';
import type {
  CreatePaiementClientPayload,
  UpdatePaiementClientPayload,
  CancelPaiementClientPayload,
  QueryPaiementClientDto,
} from './types';
import { CREANCE_KEYS } from '../creances/useCreances';
import { factureKeys } from '../factures/useFactures';

export const PAIEMENT_CLIENT_KEYS = {
  all: (companyId?: number) => ['paiements-clients', companyId] as const,
  lists: (companyId?: number) => [...PAIEMENT_CLIENT_KEYS.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: QueryPaiementClientDto) => [...PAIEMENT_CLIENT_KEYS.lists(companyId), params] as const,
  details: (companyId?: number) => [...PAIEMENT_CLIENT_KEYS.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number) => [...PAIEMENT_CLIENT_KEYS.details(companyId), id] as const,
  stats: (companyId?: number, params?: QueryPaiementClientDto) => [...PAIEMENT_CLIENT_KEYS.all(companyId), 'stats', params] as const,
};

export function usePaiementsClientsQuery(params?: QueryPaiementClientDto) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.list(companyId, params),
    queryFn: () => paiementsClientsApi.getPaiementsClients(params),
    enabled: Boolean(companyId),
  });
}

export function usePaiementClientStats(params?: QueryPaiementClientDto) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.stats(companyId, params),
    queryFn: () => paiementsClientsApi.getPaiementClientStats(params),
    enabled: Boolean(companyId),
  });
}

export function usePaiementClientDetail(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: PAIEMENT_CLIENT_KEYS.detail(companyId, id!),
    queryFn: () => paiementsClientsApi.getPaiementClient(id!),
    enabled: Boolean(companyId && id),
  });
}

export function useCreatePaiementClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (payload: CreatePaiementClientPayload) =>
      paiementsClientsApi.createPaiementClient(payload),
    onSuccess: () => {
      // Invalidate relevant tenant-scoped caches
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: CREANCE_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePaiementClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePaiementClientPayload }) =>
      paiementsClientsApi.updatePaiementClient(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.detail(companyId, variables.id) });
      queryClient.invalidateQueries({ queryKey: CREANCE_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cheques-lettres-change'] });
    },
  });
}

export function useCancelPaiementClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CancelPaiementClientPayload }) =>
      paiementsClientsApi.cancelPaiementClient(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_CLIENT_KEYS.detail(companyId, variables.id) });
      queryClient.invalidateQueries({ queryKey: CREANCE_KEYS.all(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cheques-lettres-change'] });
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
