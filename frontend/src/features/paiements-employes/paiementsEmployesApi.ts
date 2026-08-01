import { api } from '../../lib/axios';
import type {
  CancelVersementPayload,
  CreatePaiementEmployePayload,
  CreateVersementPayload,
  PaiementEmployeStats,
  PaiementEmployeView,
  QueryPaiementEmployeDto,
  UpdatePaiementEmployePayload,
  VersementView,
} from './types';

export interface PaginatedPaiementsEmployesResponse {
  data: PaiementEmployeView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paiementsEmployesApi = {
  getPaiementsEmployes: async (
    params?: QueryPaiementEmployeDto,
  ): Promise<PaginatedPaiementsEmployesResponse> => {
    const response = await api.get<PaginatedPaiementsEmployesResponse>('/paiements-employes', {
      params,
    });
    return response.data;
  },

  getPaiementEmployeStats: async (
    params?: QueryPaiementEmployeDto,
  ): Promise<PaiementEmployeStats> => {
    const response = await api.get<PaiementEmployeStats>('/paiements-employes/stats', {
      params,
    });
    return response.data;
  },

  getPaiementEmploye: async (id: number): Promise<PaiementEmployeView> => {
    const response = await api.get<PaiementEmployeView>(`/paiements-employes/${id}`);
    return response.data;
  },

  createPaiementEmploye: async (
    payload: CreatePaiementEmployePayload,
  ): Promise<PaiementEmployeView> => {
    const response = await api.post<PaiementEmployeView>('/paiements-employes', payload);
    return response.data;
  },

  updatePaiementEmploye: async (
    id: number,
    payload: UpdatePaiementEmployePayload,
  ): Promise<PaiementEmployeView> => {
    const response = await api.patch<PaiementEmployeView>(`/paiements-employes/${id}`, payload);
    return response.data;
  },

  deletePaiementEmploye: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/paiements-employes/${id}`);
    return response.data;
  },

  listVersements: async (idPaiementEmploye: number): Promise<VersementView[]> => {
    const response = await api.get<VersementView[]>(`/paiements-employes/${idPaiementEmploye}/versements`);
    return response.data;
  },

  createVersement: async (
    idPaiementEmploye: number,
    payload: CreateVersementPayload,
  ): Promise<PaiementEmployeView> => {
    const response = await api.post<PaiementEmployeView>(
      `/paiements-employes/${idPaiementEmploye}/versements`,
      payload,
    );
    return response.data;
  },

  cancelVersement: async (
    idPaiementEmploye: number,
    versementId: number,
    payload: CancelVersementPayload,
  ): Promise<PaiementEmployeView> => {
    const response = await api.post<PaiementEmployeView>(
      `/paiements-employes/${idPaiementEmploye}/versements/${versementId}/annuler`,
      payload,
    );
    return response.data;
  },
};
