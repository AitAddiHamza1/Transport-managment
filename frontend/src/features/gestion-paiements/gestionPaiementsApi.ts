import { api } from '../../lib/axios';
import {
  FinancialMovement,
  GestionPaiementsQueryParams,
  GestionPaiementsStats,
  PaginatedGestionPaiementsResponse,
} from './types';

export const gestionPaiementsApi = {
  getStats: async (params?: GestionPaiementsQueryParams): Promise<GestionPaiementsStats> => {
    const response = await api.get<GestionPaiementsStats>('/gestion-paiements/stats', { params });
    return response.data;
  },

  getAll: async (
    params?: GestionPaiementsQueryParams,
  ): Promise<PaginatedGestionPaiementsResponse> => {
    const response = await api.get<PaginatedGestionPaiementsResponse>('/gestion-paiements', {
      params,
    });
    return response.data;
  },

  getBySource: async (
    sourceType: string,
    sourceId: number,
  ): Promise<FinancialMovement> => {
    const response = await api.get<FinancialMovement>(
      `/gestion-paiements/${sourceType}/${sourceId}`,
    );
    return response.data;
  },
};
