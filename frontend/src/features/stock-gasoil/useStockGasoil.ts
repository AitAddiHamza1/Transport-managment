import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { stockGasoilApi } from './stockGasoilApi';
import {
  CreateStockEntreePayload,
  QueryStockGasoilParams,
  UpdateStockEntreePayload,
} from './types';

export const stockGasoilKeys = {
  all: ['stock-gasoil'] as const,
  lists: () => [...stockGasoilKeys.all, 'list'] as const,
  list: (params?: QueryStockGasoilParams) => [...stockGasoilKeys.lists(), params] as const,
  details: () => [...stockGasoilKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...stockGasoilKeys.details(), id] as const,
  stats: (params?: QueryStockGasoilParams) => [...stockGasoilKeys.all, 'stats', params] as const,
};

export function useStockGasoilStats(params?: QueryStockGasoilParams) {
  return useQuery({
    queryKey: stockGasoilKeys.stats(params),
    queryFn: () => stockGasoilApi.getStats(params),
  });
}

export function useStockGasoilMovements(params?: QueryStockGasoilParams) {
  return useQuery({
    queryKey: stockGasoilKeys.list(params),
    queryFn: () => stockGasoilApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useStockGasoilMovement(id: number | null) {
  return useQuery({
    queryKey: stockGasoilKeys.detail(id),
    queryFn: () => (id ? stockGasoilApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateStockEntree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockEntreePayload) => stockGasoilApi.createEntree(payload),
    onSuccess: (data) => {
      notify.success(`Entrée de stock (+${data.quantiteLitres} L) créée avec succès`);
      queryClient.invalidateQueries({ queryKey: stockGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['consommations-gasoil'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de l’entrée de stock';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateStockEntree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateStockEntreePayload }) =>
      stockGasoilApi.updateEntree(id, payload),
    onSuccess: (data) => {
      notify.success(`Entrée de stock #${data.idMouvement} mise à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: stockGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['consommations-gasoil'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de l’entrée de stock';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteStockEntree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => stockGasoilApi.deleteEntree(id),
    onSuccess: (_, deletedId) => {
      notify.success('Entrée de stock supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: stockGasoilKeys.all });
      queryClient.invalidateQueries({ queryKey: ['consommations-gasoil'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.removeQueries({ queryKey: stockGasoilKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression de l’entrée de stock';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
