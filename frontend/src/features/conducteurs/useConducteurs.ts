import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateConducteurPayload,
  UpdateConducteurPayload,
  UpdateConducteurStatusPayload,
  ConducteursQueryParams,
} from './types';
import { conducteursApi } from './conducteursApi';

/**
 * Clés de requête stables pour le domaine Conducteurs.
 */
export const conducteurKeys = {
  all: ['conducteurs'] as const,
  lists: () => [...conducteurKeys.all, 'list'] as const,
  list: (params?: ConducteursQueryParams) => [...conducteurKeys.lists(), params] as const,
  details: () => [...conducteurKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...conducteurKeys.details(), id] as const,
  stats: () => [...conducteurKeys.all, 'stats'] as const,
};

export function useConducteurStats() {
  return useQuery({
    queryKey: conducteurKeys.stats(),
    queryFn: () => conducteursApi.getStats(),
  });
}

export function useConducteursQuery(params?: ConducteursQueryParams) {
  return useQuery({
    queryKey: conducteurKeys.list(params),
    queryFn: () => conducteursApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useConducteurQuery(id: number | null) {
  return useQuery({
    queryKey: conducteurKeys.detail(id),
    queryFn: () => (id ? conducteursApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateConducteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConducteurPayload) => conducteursApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Conducteur ${data.nomConducteur} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: conducteurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du conducteur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateConducteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateConducteurPayload }) =>
      conducteursApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Conducteur ${data.nomConducteur} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: conducteurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.stats() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du conducteur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateConducteurStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateConducteurStatusPayload }) =>
      conducteursApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du conducteur mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: conducteurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.stats() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de statut du conducteur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteConducteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => conducteursApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Conducteur supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: conducteurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conducteurKeys.stats() });
      queryClient.removeQueries({ queryKey: conducteurKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du conducteur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
