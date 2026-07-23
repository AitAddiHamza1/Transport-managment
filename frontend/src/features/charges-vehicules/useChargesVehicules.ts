import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateChargeVehiculePayload,
  UpdateChargeVehiculePayload,
  ChargesVehiculesQueryParams,
} from './types';
import { chargesVehiculesApi } from './chargesVehiculesApi';

/**
 * Clés de requête stables pour le domaine Charges Véhicules.
 */
export const chargeVehiculeKeys = {
  all: ['charges-vehicules'] as const,
  lists: () => [...chargeVehiculeKeys.all, 'list'] as const,
  list: (params?: ChargesVehiculesQueryParams) => [...chargeVehiculeKeys.lists(), params] as const,
  details: () => [...chargeVehiculeKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...chargeVehiculeKeys.details(), id] as const,
  stats: () => [...chargeVehiculeKeys.all, 'stats'] as const,
};

export function useChargeVehiculeStats() {
  return useQuery({
    queryKey: chargeVehiculeKeys.stats(),
    queryFn: () => chargesVehiculesApi.getStats(),
  });
}

export function useChargesVehiculesQuery(params?: ChargesVehiculesQueryParams) {
  return useQuery({
    queryKey: chargeVehiculeKeys.list(params),
    queryFn: () => chargesVehiculesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useChargeVehiculeQuery(id: number | null) {
  return useQuery({
    queryKey: chargeVehiculeKeys.detail(id),
    queryFn: () => (id ? chargesVehiculesApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateChargeVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, file }: { payload: CreateChargeVehiculePayload; file?: File }) =>
      chargesVehiculesApi.create(payload, file),
    onSuccess: (data) => {
      notify.success(`Dépense #${data.idDepense} (${data.categorieDepense} - ${data.immatriculation}) enregistrée avec succès`);
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de la dépense';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateChargeVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, file }: { id: number; payload: UpdateChargeVehiculePayload; file?: File }) =>
      chargesVehiculesApi.update(id, payload, file),
    onSuccess: (data) => {
      notify.success(`Dépense #${data.idDepense} mise à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.stats() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.detail(data.idDepense) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de la dépense';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => chargesVehiculesApi.uploadReceipt(id, file),
    onSuccess: (data) => {
      notify.success(`Reçu de la dépense #${data.idDepense} téléversé avec succès`);
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.detail(data.idDepense) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors du téléversement du reçu';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => chargesVehiculesApi.deleteReceipt(id),
    onSuccess: (data) => {
      notify.success(`Reçu de la dépense #${data.idDepense} supprimé avec succès`);
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.detail(data.idDepense) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du reçu';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteChargeVehicule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => chargesVehiculesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Dépense supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chargeVehiculeKeys.stats() });
      queryClient.removeQueries({ queryKey: chargeVehiculeKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression de la dépense';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
