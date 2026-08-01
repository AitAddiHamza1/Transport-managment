import { api } from '../../lib/axios';
import {
  BonCarburant,
  BonCarburantQueryParams,
  BonCarburantStats,
  CreateBonCarburantPayload,
  UpdateBonCarburantPayload,
} from './types';

export interface PaginatedBonsCarburantResponse {
  data: BonCarburant[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const carburantApi = {
  getAll: async (params?: BonCarburantQueryParams): Promise<PaginatedBonsCarburantResponse> => {
    const response = await api.get<PaginatedBonsCarburantResponse>('/bons-carburant', { params });
    return response.data;
  },

  getStats: async (): Promise<BonCarburantStats> => {
    const response = await api.get<BonCarburantStats>('/bons-carburant/stats');
    return response.data;
  },

  getById: async (id: number): Promise<BonCarburant> => {
    const response = await api.get<BonCarburant>(`/bons-carburant/${id}`);
    return response.data;
  },

  create: async (payload: CreateBonCarburantPayload): Promise<BonCarburant> => {
    const response = await api.post<BonCarburant>('/bons-carburant', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateBonCarburantPayload): Promise<BonCarburant> => {
    const response = await api.patch<BonCarburant>(`/bons-carburant/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ idBon: number }> => {
    const response = await api.delete<{ idBon: number }>(`/bons-carburant/${id}`);
    return response.data;
  },
};
