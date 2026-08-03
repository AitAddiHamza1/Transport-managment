import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { carburantApi } from './carburantApi';
import {
  BonCarburantQueryParams,
  CreateBonCarburantPayload,
  UpdateBonCarburantPayload,
} from './types';

export const consommationGasoilKeys = {
  all: ['consommations-gasoil'] as const,
  lists: () => [...consommationGasoilKeys.all, 'list'] as const,
  list: (params?: BonCarburantQueryParams) => [...consommationGasoilKeys.lists(), params] as const,
  details: () => [...consommationGasoilKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...consommationGasoilKeys.details(), id] as const,
  stats: (params?: BonCarburantQueryParams) => [...consommationGasoilKeys.all, 'stats', params] as const,
};

export function useConsommationGasoilStats(params?: BonCarburantQueryParams) {
  return useQuery({
    queryKey: consommationGasoilKeys.stats(params),
    queryFn: () => carburantApi.getStats(params),
  });
}

export function useConsommationsGasoilQuery(params?: BonCarburantQueryParams) {
  return useQuery({
    queryKey: consommationGasoilKeys.list(params),
    queryFn: () => carburantApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useConsommationGasoilQuery(id: number | null) {
  return useQuery({
    queryKey: consommationGasoilKeys.detail(id),
    queryFn: () => (id ? carburantApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateConsommationGasoil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBonCarburantPayload) => carburantApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Bon de carburant ${data.numeroBon ? `#${data.numeroBon}` : ''} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: consommationGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du bon de carburant';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateConsommationGasoil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateBonCarburantPayload }) =>
      carburantApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Bon de carburant #${data.idBon} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: consommationGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du bon de carburant';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteConsommationGasoil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => carburantApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Bon de carburant supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: consommationGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.removeQueries({ queryKey: consommationGasoilKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du bon de carburant';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
