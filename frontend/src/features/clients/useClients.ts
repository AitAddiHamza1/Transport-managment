import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
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
  all: (companyId?: number) => ['clients', companyId] as const,
  lists: (companyId?: number) => [...clientKeys.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: ClientsQueryParams) => [...clientKeys.lists(companyId), params] as const,
  details: (companyId?: number) => [...clientKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number | null) => [...clientKeys.details(companyId), id] as const,
  stats: (companyId?: number) => [...clientKeys.all(companyId), 'stats'] as const,
};

export function useClientStats() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: clientKeys.stats(companyId),
    queryFn: () => clientsApi.getStats(),
    enabled: Boolean(companyId),
  });
}

export function useClientsQuery(params?: ClientsQueryParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: clientKeys.list(companyId, params),
    queryFn: () => clientsApi.getAll(params),
    enabled: Boolean(companyId),
    placeholderData: keepPreviousData,
  });
}

export function useClientQuery(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: clientKeys.detail(companyId, id),
    queryFn: () => (id ? clientsApi.getById(id) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Client ${data.nomEntreprise} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientPayload }) =>
      clientsApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Client ${data.nomEntreprise} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(companyId, data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateClientStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientStatusPayload }) =>
      clientsApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du client mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(companyId, data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du changement de statut du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => clientsApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Client supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats(companyId) });
      queryClient.removeQueries({ queryKey: clientKeys.detail(companyId, deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du client';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
