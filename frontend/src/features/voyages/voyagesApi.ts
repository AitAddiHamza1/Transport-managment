import { api } from '../../lib/axios';
import {
  CreateVoyagePayload,
  UpdateVoyagePayload,
  UpdateVoyageStatusPayload,
  Voyage,
  VoyageStats,
  VoyagesQueryParams,
} from './types';

export interface PaginatedVoyagesResponse {
  data: Voyage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const voyagesApi = {
  getStats: async (): Promise<VoyageStats> => {
    const response = await api.get<VoyageStats>('/voyages/stats');
    return response.data;
  },

  getAll: async (params?: VoyagesQueryParams): Promise<PaginatedVoyagesResponse> => {
    const response = await api.get<PaginatedVoyagesResponse>('/voyages', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Voyage> => {
    const response = await api.get<Voyage>(`/voyages/${id}`);
    return response.data;
  },

  create: async (payload: CreateVoyagePayload): Promise<Voyage> => {
    const response = await api.post<Voyage>('/voyages', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateVoyagePayload): Promise<Voyage> => {
    const response = await api.patch<Voyage>(`/voyages/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateVoyageStatusPayload): Promise<Voyage> => {
    const response = await api.patch<Voyage>(`/voyages/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ idVoyage: number }> => {
    const response = await api.delete<{ idVoyage: number }>(`/voyages/${id}`);
    return response.data;
  },
};
