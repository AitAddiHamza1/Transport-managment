import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateVoyagePayload,
  UpdateVoyagePayload,
  UpdateVoyageStatusPayload,
  VoyagesQueryParams,
} from './types';
import { voyagesApi } from './voyagesApi';

/**
 * Clés de requête stables pour le domaine Voyages.
 */
export const voyageKeys = {
  all: ['voyages'] as const,
  lists: () => [...voyageKeys.all, 'list'] as const,
  list: (params?: VoyagesQueryParams) => [...voyageKeys.lists(), params] as const,
  details: () => [...voyageKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...voyageKeys.details(), id] as const,
  stats: () => [...voyageKeys.all, 'stats'] as const,
};

export function useVoyageStats() {
  return useQuery({
    queryKey: voyageKeys.stats(),
    queryFn: () => voyagesApi.getStats(),
  });
}

export function useVoyagesQuery(params?: VoyagesQueryParams) {
  return useQuery({
    queryKey: voyageKeys.list(params),
    queryFn: () => voyagesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useVoyageQuery(id: number | null) {
  return useQuery({
    queryKey: voyageKeys.detail(id),
    queryFn: () => (id ? voyagesApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateVoyage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVoyagePayload) => voyagesApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Voyage #${data.idVoyage} (${data.lieuChargement} → ${data.lieuDechargement}) créé avec succès`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyagePayload }) =>
      voyagesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Voyage #${data.idVoyage} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyageStatusPayload }) =>
      voyagesApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du voyage #${data.idVoyage} mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de statut du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => voyagesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Voyage supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.removeQueries({ queryKey: voyageKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
