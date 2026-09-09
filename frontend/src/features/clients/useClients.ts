import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateClientPayload,
  UpdateClientPayload,
  UpdateClientStatusPayload,
  ClientsQueryParams,
} from './types';
import { clientsApi } from './clientsApi';

/**
 * Clés de requête stables pour le domaine Clients.
 */
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params?: ClientsQueryParams) => [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...clientKeys.details(), id] as const,
  stats: () => [...clientKeys.all, 'stats'] as const,
};

export function useClientStats() {
  return useQuery({
    queryKey: clientKeys.stats(),
    queryFn: () => clientsApi.getStats(),
  });
}

export function useClientsQuery(params?: ClientsQueryParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => clientsApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useClientQuery(id: number | null) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => (id ? clientsApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Client ${data.nomEntreprise} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientPayload }) =>
      clientsApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Client ${data.nomEntreprise} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateClientStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientStatusPayload }) =>
      clientsApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du client mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de statut du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientsApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Client supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
      queryClient.removeQueries({ queryKey: clientKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
