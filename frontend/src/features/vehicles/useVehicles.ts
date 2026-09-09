import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateVehiculePayload,
  UpdateVehiculePayload,
  UpdateVehiculeStatusPayload,
  VehiculesQueryParams,
} from './types';
import { vehiclesApi } from './vehiclesApi';

/**
 * Clés de requête stables pour le domaine Véhicules.
 */
export const vehicleKeys = {
  all: ['vehicules'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (params?: VehiculesQueryParams) => [...vehicleKeys.lists(), params] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...vehicleKeys.details(), id] as const,
  stats: () => [...vehicleKeys.all, 'stats'] as const,
};

export function useVehicleStats() {
  return useQuery({
    queryKey: vehicleKeys.stats(),
    queryFn: () => vehiclesApi.getStats(),
  });
}

export function useVehiclesQuery(params?: VehiculesQueryParams) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehiclesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useVehicleQuery(id: number | null) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => (id ? vehiclesApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVehiculePayload) => vehiclesApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Véhicule ${data.immatriculation} créé avec succès`);
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du véhicule';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVehiculePayload }) =>
      vehiclesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Véhicule ${data.immatriculation} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.stats() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du véhicule';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVehiculeStatusPayload }) =>
      vehiclesApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du véhicule mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.stats() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de statut du véhicule';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => vehiclesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Véhicule supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.stats() });
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du véhicule';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
