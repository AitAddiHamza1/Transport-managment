import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateFournisseurPayload,
  UpdateFournisseurPayload,
  UpdateFournisseurStatusPayload,
  FournisseursQueryParams,
} from './types';
import { fournisseursApi } from './fournisseursApi';

/**
 * Clés de requête stables pour le domaine Fournisseurs.
 */
export const fournisseurKeys = {
  all: ['fournisseurs'] as const,
  lists: () => [...fournisseurKeys.all, 'list'] as const,
  list: (params?: FournisseursQueryParams) => [...fournisseurKeys.lists(), params] as const,
  details: () => [...fournisseurKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...fournisseurKeys.details(), id] as const,
  stats: () => [...fournisseurKeys.all, 'stats'] as const,
};

export function useFournisseurStats() {
  return useQuery({
    queryKey: fournisseurKeys.stats(),
    queryFn: () => fournisseursApi.getStats(),
  });
}

export function useFournisseursQuery(params?: FournisseursQueryParams) {
  return useQuery({
    queryKey: fournisseurKeys.list(params),
    queryFn: () => fournisseursApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useFournisseurQuery(id: number | null) {
  return useQuery({
    queryKey: fournisseurKeys.detail(id),
    queryFn: () => (id ? fournisseursApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFournisseurPayload) => fournisseursApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Fournisseur ${data.nomFournisseur} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du fournisseur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFournisseurPayload }) =>
      fournisseursApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Fournisseur ${data.nomFournisseur} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.stats() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du fournisseur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateFournisseurStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFournisseurStatusPayload }) =>
      fournisseursApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du fournisseur mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.stats() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de statut du fournisseur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fournisseursApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Fournisseur supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.stats() });
      queryClient.removeQueries({ queryKey: fournisseurKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du fournisseur';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
