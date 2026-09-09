import { api } from '../../lib/axios';
import {
  CreateConducteurPayload,
  UpdateConducteurPayload,
  UpdateConducteurStatusPayload,
  Conducteur,
  ConducteurStats,
  ConducteursQueryParams,
} from './types';

export interface PaginatedConducteursResponse {
  data: Conducteur[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const conducteursApi = {
  getStats: async (): Promise<ConducteurStats> => {
    const response = await api.get<ConducteurStats>('/conducteurs/stats');
    return response.data;
  },

  getAll: async (params?: ConducteursQueryParams): Promise<PaginatedConducteursResponse> => {
    const response = await api.get<PaginatedConducteursResponse>('/conducteurs', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Conducteur> => {
    const response = await api.get<Conducteur>(`/conducteurs/${id}`);
    return response.data;
  },

  create: async (payload: CreateConducteurPayload): Promise<Conducteur> => {
    const response = await api.post<Conducteur>('/conducteurs', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateConducteurPayload): Promise<Conducteur> => {
    const response = await api.patch<Conducteur>(`/conducteurs/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateConducteurStatusPayload): Promise<Conducteur> => {
    const response = await api.patch<Conducteur>(`/conducteurs/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/conducteurs/${id}`);
    return response.data;
  },
};
