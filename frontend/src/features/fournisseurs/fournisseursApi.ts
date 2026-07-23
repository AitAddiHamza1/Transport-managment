import { api } from '../../lib/axios';
import {
  CreateFournisseurPayload,
  UpdateFournisseurPayload,
  UpdateFournisseurStatusPayload,
  Fournisseur,
  FournisseurStats,
  FournisseursQueryParams,
} from './types';

export interface PaginatedFournisseursResponse {
  data: Fournisseur[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fournisseursApi = {
  getStats: async (): Promise<FournisseurStats> => {
    const response = await api.get<FournisseurStats>('/fournisseurs/stats');
    return response.data;
  },

  getAll: async (params?: FournisseursQueryParams): Promise<PaginatedFournisseursResponse> => {
    const response = await api.get<PaginatedFournisseursResponse>('/fournisseurs', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Fournisseur> => {
    const response = await api.get<Fournisseur>(`/fournisseurs/${id}`);
    return response.data;
  },

  create: async (payload: CreateFournisseurPayload): Promise<Fournisseur> => {
    const response = await api.post<Fournisseur>('/fournisseurs', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateFournisseurPayload): Promise<Fournisseur> => {
    const response = await api.patch<Fournisseur>(`/fournisseurs/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateFournisseurStatusPayload): Promise<Fournisseur> => {
    const response = await api.patch<Fournisseur>(`/fournisseurs/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/fournisseurs/${id}`);
    return response.data;
  },
};
