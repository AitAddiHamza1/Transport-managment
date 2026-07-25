import { api } from '../../lib/axios';
import type { CreanceClient, CreanceStats, QueryCreanceDto } from './types';

export interface PaginatedCreancesResponse {
  data: CreanceClient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const creancesApi = {
  getCreances: async (params?: QueryCreanceDto): Promise<PaginatedCreancesResponse> => {
    const response = await api.get<PaginatedCreancesResponse>('/api/creances-clients', {
      params,
    });
    return response.data;
  },

  getCreanceStats: async (): Promise<CreanceStats> => {
    const response = await api.get<CreanceStats>('/api/creances-clients/stats');
    return response.data;
  },

  getCreance: async (id: number): Promise<CreanceClient> => {
    const response = await api.get<CreanceClient>(`/api/creances-clients/${id}`);
    return response.data;
  },
};
