import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { traverseesApi } from './traverseesApi';
import type {
  CreateTraverseePayload,
  QueryTraverseeParams,
  UpdateTraverseePayload,
} from './types';
import { notify } from '../../utils/notify';
import { voyageKeys } from '../voyages/useVoyages';

/**
 * Clés de requête stables et isolées par tenant pour Tanger Med.
 */
export const traverseeKeys = {
  all: (companyId?: number) => ['traversees-maritimes', companyId] as const,
  lists: (companyId?: number) => [...traverseeKeys.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: QueryTraverseeParams) => [...traverseeKeys.lists(companyId), params] as const,
  details: (companyId?: number) => [...traverseeKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number | null) => [...traverseeKeys.details(companyId), id] as const,
  stats: (companyId?: number) => [...traverseeKeys.all(companyId), 'stats'] as const,
};

// Aliases pour rétrocompatibilité
export const TRAVERSEES_QUERY_KEY = ['traversees-maritimes'];
export const TRAVERSEES_STATS_QUERY_KEY = ['traversees-maritimes', 'stats'];

export function useTraverseesQuery(params?: QueryTraverseeParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: traverseeKeys.list(companyId, params),
    queryFn: () => traverseesApi.getAll(params),
    enabled: Boolean(companyId),
  });
}

export function useTraverseeStatsQuery() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: traverseeKeys.stats(companyId),
    queryFn: () => traverseesApi.getStats(),
    enabled: Boolean(companyId),
  });
}

export function useTraverseeDetailQuery(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: traverseeKeys.detail(companyId, id),
    queryFn: () => traverseesApi.getById(id!),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useCreateTraverseeMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (payload: CreateTraverseePayload) => traverseesApi.create(payload),
    onSuccess: (data) => {
      notify.success('Opération Tanger Med créée avec succès');
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.all(companyId) });
      if (data.idVoyage) {
        queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Erreur lors de la création de l'opération";
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateTraverseeMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTraverseePayload }) =>
      traverseesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success('Opération Tanger Med mise à jour avec succès');
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.all(companyId) });
      if (data.idVoyage) {
        queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Erreur lors de la modification de l'opération";
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// Independent Section Verification Hooks
export function useToggleCircuitVerificationMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, circuitEstVerifie }: { id: number; circuitEstVerifie?: boolean }) =>
      traverseesApi.toggleCircuitVerification(id, circuitEstVerifie),
    onSuccess: (data) => {
      if (data.circuitEstVerifie) {
        notify.success('Section Circuit portuaire marquée comme vérifiée.');
      } else {
        notify.info('Vérification du Circuit portuaire annulée.');
      }
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
      if (data.idVoyage) {
        queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de vérification Circuit portuaire';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useToggleBateauVerificationMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, estVerifiee }: { id: number; estVerifiee?: boolean }) =>
      traverseesApi.toggleBateauVerification(id, estVerifiee),
    onSuccess: (data) => {
      if (data.estVerifiee) {
        notify.success('Section Bateau marquée comme vérifiée.');
      } else {
        notify.info('Vérification du Bateau annulée.');
      }
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
      if (data.idVoyage) {
        queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de vérification Bateau';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useToggleTransitVerificationMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, transitEstVerifie }: { id: number; transitEstVerifie?: boolean }) =>
      traverseesApi.toggleTransitVerification(id, transitEstVerifie),
    onSuccess: (data) => {
      if (data.transitEstVerifie) {
        notify.success('Section Transit Aljaziras marquée comme vérifiée.');
      } else {
        notify.info('Vérification du Transit Aljaziras annulée.');
      }
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
      if (data.idVoyage) {
        queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de vérification Transit Aljaziras';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// Legacy alias mutation for backward compatibility
export function useToggleVerificationMutation() {
  return useToggleBateauVerificationMutation();
}

export function useDeleteTraverseeMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => traverseesApi.remove(id),
    onSuccess: (_, deletedId) => {
      notify.success('Opération Tanger Med supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.removeQueries({ queryKey: traverseeKeys.detail(companyId, deletedId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.all(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUploadJustificatifMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      traverseesApi.uploadJustificatif(id, file),
    onSuccess: (data) => {
      notify.success('Justificatif téléversé avec succès');
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du téléversement du justificatif';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteJustificatifMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => traverseesApi.deleteJustificatif(id),
    onSuccess: (data) => {
      notify.success('Justificatif supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: traverseeKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: traverseeKeys.detail(companyId, data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du justificatif';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
