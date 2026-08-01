import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paiementsFournisseursApi } from './paiementsFournisseursApi';
import { DETTES_FOURNISSEURS_QUERY_KEY, DETTES_STATS_QUERY_KEY } from '../dettes-fournisseurs/useDettesFournisseurs';
import type {
  CancelPaiementFournisseurPayload,
  CreatePaiementFournisseurPayload,
  QueryPaiementFournisseurDto,
} from './types';

export const PAIEMENTS_FOURNISSEURS_QUERY_KEY = 'paiements-fournisseurs';
export const PAIEMENTS_STATS_QUERY_KEY = 'paiements-fournisseurs-stats';

export function useGlobalPaiementsFournisseursQuery(params?: QueryPaiementFournisseurDto) {
  return useQuery({
    queryKey: [PAIEMENTS_FOURNISSEURS_QUERY_KEY, params],
    queryFn: () => paiementsFournisseursApi.getGlobalPaiements(params),
  });
}

export function useGlobalPaiementFournisseurStatsQuery(params?: QueryPaiementFournisseurDto) {
  return useQuery({
    queryKey: [PAIEMENTS_STATS_QUERY_KEY, params],
    queryFn: () => paiementsFournisseursApi.getGlobalStats(params),
  });
}

export function useDebtPaiementsFournisseursQuery(idDetteFournisseur: number, enabled = true) {
  return useQuery({
    queryKey: [PAIEMENTS_FOURNISSEURS_QUERY_KEY, 'debt', idDetteFournisseur],
    queryFn: () => paiementsFournisseursApi.getDebtPaiements(idDetteFournisseur),
    enabled: enabled && !!idDetteFournisseur,
  });
}

export function useCreatePaiementFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idDetteFournisseur,
      payload,
    }: {
      idDetteFournisseur: number;
      payload: CreatePaiementFournisseurPayload;
    }) => paiementsFournisseursApi.createPaiement(idDetteFournisseur, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_STATS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY, variables.idDetteFournisseur] });
      queryClient.invalidateQueries({ queryKey: [PAIEMENTS_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PAIEMENTS_STATS_QUERY_KEY] });
    },
  });
}

export function useCancelPaiementFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idDetteFournisseur,
      versementId,
      payload,
    }: {
      idDetteFournisseur: number;
      versementId: number;
      payload: CancelPaiementFournisseurPayload;
    }) => paiementsFournisseursApi.cancelPaiement(idDetteFournisseur, versementId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_STATS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY, variables.idDetteFournisseur] });
      queryClient.invalidateQueries({ queryKey: [PAIEMENTS_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PAIEMENTS_STATS_QUERY_KEY] });
    },
  });
}
