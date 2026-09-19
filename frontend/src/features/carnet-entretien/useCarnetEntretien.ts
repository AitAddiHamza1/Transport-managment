import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { carnetEntretienApi } from './carnetEntretienApi';
import {
  CreateMaintenanceInterventionPayload,
  CreateMaintenanceRulePayload,
  QueryCarnetEntretienParams,
  UpdateMaintenanceInterventionPayload,
  UpdateMaintenanceRulePayload,
} from './types';

export const carnetEntretienKeys = {
  all: ['carnet-entretien'] as const,
  rules: () => [...carnetEntretienKeys.all, 'rules'] as const,
  interventions: () => [...carnetEntretienKeys.all, 'interventions'] as const,
  interventionList: (params?: QueryCarnetEntretienParams) =>
    [...carnetEntretienKeys.interventions(), params] as const,
  interventionDetail: (id: number | null) =>
    [...carnetEntretienKeys.interventions(), id] as const,
  vehicleSituation: (immatriculation: string | null) =>
    [...carnetEntretienKeys.all, 'vehicule', immatriculation] as const,
};

// -------------------------------------------------------------------
// Rules Hooks
// -------------------------------------------------------------------
export function useCarnetRules() {
  return useQuery({
    queryKey: carnetEntretienKeys.rules(),
    queryFn: () => carnetEntretienApi.getAllRules(),
  });
}

export function useCreateCarnetRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMaintenanceRulePayload) => carnetEntretienApi.createRule(payload),
    onSuccess: (data) => {
      notify.success(`Règle d'entretien "${data.nom}" créée avec succès`);
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.rules() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de la règle d’entretien';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateCarnetRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMaintenanceRulePayload }) =>
      carnetEntretienApi.updateRule(id, payload),
    onSuccess: (data) => {
      notify.success(`Règle d'entretien "${data.nom}" mise à jour`);
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.rules() });
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.interventions() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de la règle';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteCarnetRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => carnetEntretienApi.deleteRule(id),
    onSuccess: () => {
      notify.success('Règle d’entretien supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.rules() });
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.interventions() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression de la règle';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// -------------------------------------------------------------------
// Interventions Hooks
// -------------------------------------------------------------------
export function useCarnetInterventions(params?: QueryCarnetEntretienParams) {
  return useQuery({
    queryKey: carnetEntretienKeys.interventionList(params),
    queryFn: () => carnetEntretienApi.getAllInterventions(params),
    placeholderData: keepPreviousData,
  });
}

export function useCarnetIntervention(id: number | null) {
  return useQuery({
    queryKey: carnetEntretienKeys.interventionDetail(id),
    queryFn: () => (id ? carnetEntretienApi.getInterventionById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useVehicleSituation(immatriculation: string | null) {
  return useQuery({
    queryKey: carnetEntretienKeys.vehicleSituation(immatriculation),
    queryFn: () => (immatriculation ? carnetEntretienApi.getVehicleSituation(immatriculation) : null),
    enabled: !!immatriculation,
  });
}

export function useCreateCarnetIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMaintenanceInterventionPayload) =>
      carnetEntretienApi.createIntervention(payload),
    onSuccess: (data) => {
      notify.success(`Intervention "${data.libelle}" enregistrée avec succès`);
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de l’intervention';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateCarnetIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMaintenanceInterventionPayload }) =>
      carnetEntretienApi.updateIntervention(id, payload),
    onSuccess: (data) => {
      notify.success(`Intervention "${data.libelle}" mise à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de l’intervention';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteCarnetIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => carnetEntretienApi.deleteIntervention(id),
    onSuccess: (_, deletedId) => {
      notify.success('Intervention d’entretien supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: carnetEntretienKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.removeQueries({ queryKey: carnetEntretienKeys.interventionDetail(deletedId) });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        'Cette intervention est liée à une charge véhicule et ne peut pas être supprimée dans cet état.';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
