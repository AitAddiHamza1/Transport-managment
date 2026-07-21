import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import {
  CreateVehiculePayload,
  UpdateVehiculePayload,
  UpdateVehiculeStatusPayload,
  VehiculesQueryParams,
} from './types';
import { vehiclesApi } from './vehiclesApi';

export const VEHICLES_QUERY_KEY = ['vehicules'];

export function useVehicleStats() {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, 'stats'],
    queryFn: () => vehiclesApi.getStats(),
  });
}

export function useVehiclesQuery(params?: VehiculesQueryParams) {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, 'list', params],
    queryFn: () => vehiclesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useVehicleQuery(id: number | null) {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, 'detail', id],
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
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
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
    onSuccess: () => {
      notify.success('Véhicule supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du véhicule';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
