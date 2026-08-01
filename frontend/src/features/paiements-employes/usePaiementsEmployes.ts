import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paiementsEmployesApi } from './paiementsEmployesApi';
import type {
  CancelVersementPayload,
  CreatePaiementEmployePayload,
  CreateVersementPayload,
  QueryPaiementEmployeDto,
  UpdatePaiementEmployePayload,
} from './types';

export const PAIEMENTS_EMPLOYES_QUERY_KEY = ['paiements-employes'];
export const PAIEMENT_EMPLOYE_STATS_QUERY_KEY = ['paiements-employes', 'stats'];
export const PAIEMENT_EMPLOYE_DETAILS_QUERY_KEY = (id: number) => ['paiements-employes', id];
export const PAIEMENT_EMPLOYE_VERSEMENTS_QUERY_KEY = (id: number) => ['paiements-employes', id, 'versements'];

export function usePaiementsEmployesQuery(params: QueryPaiementEmployeDto) {
  return useQuery({
    queryKey: [...PAIEMENTS_EMPLOYES_QUERY_KEY, params],
    queryFn: () => paiementsEmployesApi.getPaiementsEmployes(params),
  });
}

export function usePaiementEmployeStats(params?: QueryPaiementEmployeDto) {
  return useQuery({
    queryKey: [...PAIEMENT_EMPLOYE_STATS_QUERY_KEY, params],
    queryFn: () => paiementsEmployesApi.getPaiementEmployeStats(params),
  });
}

export function usePaiementEmployeQuery(id: number | null) {
  return useQuery({
    queryKey: PAIEMENT_EMPLOYE_DETAILS_QUERY_KEY(id!),
    queryFn: () => paiementsEmployesApi.getPaiementEmploye(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePaiementEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaiementEmployePayload) => paiementsEmployesApi.createPaiementEmploye(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAIEMENTS_EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_STATS_QUERY_KEY });
    },
  });
}

export function useUpdatePaiementEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaiementEmployePayload }) =>
      paiementsEmployesApi.updatePaiementEmploye(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAIEMENTS_EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_DETAILS_QUERY_KEY(variables.id) });
    },
  });
}

export function useDeletePaiementEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => paiementsEmployesApi.deletePaiementEmploye(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAIEMENTS_EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_STATS_QUERY_KEY });
    },
  });
}

export function useCreateVersement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idPaiementEmploye,
      data,
    }: {
      idPaiementEmploye: number;
      data: CreateVersementPayload;
    }) => paiementsEmployesApi.createVersement(idPaiementEmploye, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAIEMENTS_EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_DETAILS_QUERY_KEY(variables.idPaiementEmploye) });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_VERSEMENTS_QUERY_KEY(variables.idPaiementEmploye) });
    },
  });
}

export function useCancelVersement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idPaiementEmploye,
      versementId,
      data,
    }: {
      idPaiementEmploye: number;
      versementId: number;
      data: CancelVersementPayload;
    }) => paiementsEmployesApi.cancelVersement(idPaiementEmploye, versementId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PAIEMENTS_EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_DETAILS_QUERY_KEY(variables.idPaiementEmploye) });
      queryClient.invalidateQueries({ queryKey: PAIEMENT_EMPLOYE_VERSEMENTS_QUERY_KEY(variables.idPaiementEmploye) });
    },
  });
}
