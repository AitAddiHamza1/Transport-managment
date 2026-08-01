import { api } from '../../lib/axios';
import type {
  CreateDetteFournisseurPayload,
  DetteFournisseurStats,
  DetteFournisseurView,
  QueryDetteFournisseurDto,
  UpdateDetteFournisseurPayload,
} from './types';

export interface PaginatedDettesResponse {
  data: DetteFournisseurView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const dettesFournisseursApi = {
  getDettes: async (params?: QueryDetteFournisseurDto): Promise<PaginatedDettesResponse> => {
    const response = await api.get<PaginatedDettesResponse>('/dettes-fournisseurs', {
      params,
    });
    return response.data;
  },

  getStats: async (params?: QueryDetteFournisseurDto): Promise<DetteFournisseurStats> => {
    const response = await api.get<DetteFournisseurStats>('/dettes-fournisseurs/stats', {
      params,
    });
    return response.data;
  },

  getDette: async (id: number): Promise<DetteFournisseurView> => {
    const response = await api.get<DetteFournisseurView>(`/dettes-fournisseurs/${id}`);
    return response.data;
  },

  createDette: async (payload: CreateDetteFournisseurPayload): Promise<DetteFournisseurView> => {
    const response = await api.post<DetteFournisseurView>('/dettes-fournisseurs', payload);
    return response.data;
  },

  updateDette: async (
    id: number,
    payload: UpdateDetteFournisseurPayload,
  ): Promise<DetteFournisseurView> => {
    const response = await api.patch<DetteFournisseurView>(`/dettes-fournisseurs/${id}`, payload);
    return response.data;
  },

  deleteDette: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/dettes-fournisseurs/${id}`);
    return response.data;
  },
};
