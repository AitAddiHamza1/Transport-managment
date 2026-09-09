import { api } from '../../lib/axios';
import type {
  CreatePaiementClientPayload,
  PaiementClient,
  PaiementStats,
  QueryPaiementClientDto,
} from './types';

export interface PaginatedPaiementsResponse {
  data: PaiementClient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paiementsClientsApi = {
  getPaiementsClients: async (
    params?: QueryPaiementClientDto,
  ): Promise<PaginatedPaiementsResponse> => {
    const response = await api.get<PaginatedPaiementsResponse>('/paiements-clients', {
      params,
    });
    return response.data;
  },

  getPaiementClientStats: async (
    params?: QueryPaiementClientDto,
  ): Promise<PaiementStats> => {
    const response = await api.get<PaiementStats>('/paiements-clients/stats', {
      params,
    });
    return response.data;
  },

  getPaiementClient: async (id: number): Promise<PaiementClient> => {
    const response = await api.get<PaiementClient>(`/paiements-clients/${id}`);
    return response.data;
  },

  createPaiementClient: async (payload: CreatePaiementClientPayload): Promise<PaiementClient> => {
    const response = await api.post<PaiementClient>('/paiements-clients', payload);
    return response.data;
  },

  getForexRate: async (date?: string): Promise<{ from: string; to: string; rate: number; date: string; source: string }> => {
    const response = await api.get('/forex/rate', {
      params: date ? { date } : undefined,
    });
    return response.data;
  },
};
