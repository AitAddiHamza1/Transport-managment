import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { traverseesApi } from './traverseesApi';
import type {
  CreateTraverseePayload,
  QueryTraverseeParams,
  UpdateTraverseePayload,
} from './types';
import { notify } from '../../utils/notify';

export const TRAVERSEES_QUERY_KEY = ['traversees-maritimes'];
export const TRAVERSEES_STATS_QUERY_KEY = ['traversees-maritimes', 'stats'];

export function useTraverseesQuery(params?: QueryTraverseeParams) {
  return useQuery({
    queryKey: [...TRAVERSEES_QUERY_KEY, params],
    queryFn: () => traverseesApi.getAll(params),
  });
}

export function useTraverseeStatsQuery() {
  return useQuery({
    queryKey: TRAVERSEES_STATS_QUERY_KEY,
    queryFn: () => traverseesApi.getStats(),
  });
}

export function useTraverseeDetailQuery(id: number | null) {
  return useQuery({
    queryKey: [...TRAVERSEES_QUERY_KEY, id],
    queryFn: () => traverseesApi.getById(id!),
    enabled: Boolean(id && id > 0),
  });
}

export function useCreateTraverseeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTraverseePayload) => traverseesApi.create(payload),
    onSuccess: () => {
      notify.success('Traversée maritime créée avec succès');
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['voyages'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de la traversée';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateTraverseeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTraverseePayload }) =>
      traverseesApi.update(id, payload),
    onSuccess: () => {
      notify.success('Traversée maritime mise à jour avec succès');
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['voyages'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la modification de la traversée';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useToggleVerificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, estVerifiee }: { id: number; estVerifiee?: boolean }) =>
      traverseesApi.toggleVerification(id, estVerifiee),
    onSuccess: (data) => {
      if (data.estVerifiee) {
        notify.success('Traversée marquée comme vérifiée.');
      } else {
        notify.info('Vérification annulée.');
      }
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de statut de vérification';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteTraverseeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => traverseesApi.remove(id),
    onSuccess: () => {
      notify.success('Traversée maritime supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['voyages'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUploadJustificatifMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      traverseesApi.uploadJustificatif(id, file),
    onSuccess: () => {
      notify.success('Justificatif de traversée téléversé avec succès');
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du téléversement du justificatif';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteJustificatifMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => traverseesApi.deleteJustificatif(id),
    onSuccess: () => {
      notify.success('Justificatif supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: TRAVERSEES_QUERY_KEY });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du justificatif';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
