import { api } from '../../lib/axios';
import {
  CreateMaintenanceInterventionPayload,
  CreateMaintenanceRulePayload,
  MaintenanceIntervention,
  MaintenanceRule,
  PaginatedCarnetEntretienResponse,
  QueryCarnetEntretienParams,
  UpdateMaintenanceInterventionPayload,
  UpdateMaintenanceRulePayload,
  VehicleSituation,
} from './types';

export const carnetEntretienApi = {
  // Rules API
  getAllRules: async (): Promise<MaintenanceRule[]> => {
    const response = await api.get<MaintenanceRule[]>('/carnet-entretien/rules');
    return response.data;
  },

  createRule: async (payload: CreateMaintenanceRulePayload): Promise<MaintenanceRule> => {
    const response = await api.post<MaintenanceRule>('/carnet-entretien/rules', payload);
    return response.data;
  },

  updateRule: async (id: number, payload: UpdateMaintenanceRulePayload): Promise<MaintenanceRule> => {
    const response = await api.patch<MaintenanceRule>(`/carnet-entretien/rules/${id}`, payload);
    return response.data;
  },

  deleteRule: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/carnet-entretien/rules/${id}`);
    return response.data;
  },

  // Vehicle situation
  getVehicleSituation: async (immatriculation: string): Promise<VehicleSituation> => {
    const response = await api.get<VehicleSituation>(`/carnet-entretien/vehicules/${encodeURIComponent(immatriculation)}`);
    return response.data;
  },

  // Interventions API
  getAllInterventions: async (
    params?: QueryCarnetEntretienParams,
  ): Promise<PaginatedCarnetEntretienResponse> => {
    const response = await api.get<PaginatedCarnetEntretienResponse>('/carnet-entretien', { params });
    return response.data;
  },

  getInterventionById: async (id: number): Promise<MaintenanceIntervention> => {
    const response = await api.get<MaintenanceIntervention>(`/carnet-entretien/${id}`);
    return response.data;
  },

  createIntervention: async (
    payload: CreateMaintenanceInterventionPayload,
  ): Promise<MaintenanceIntervention> => {
    const response = await api.post<MaintenanceIntervention>('/carnet-entretien', payload);
    return response.data;
  },

  updateIntervention: async (
    id: number,
    payload: UpdateMaintenanceInterventionPayload,
  ): Promise<MaintenanceIntervention> => {
    const response = await api.patch<MaintenanceIntervention>(`/carnet-entretien/${id}`, payload);
    return response.data;
  },

  deleteIntervention: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/carnet-entretien/${id}`);
    return response.data;
  },
};
