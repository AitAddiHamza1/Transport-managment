import { api } from '../../lib/axios';
import {
  CreateStockEntreePayload,
  QueryStockGasoilParams,
  StockGasoilMovementView,
  StockGasoilStats,
  UpdateStockEntreePayload,
} from './types';

export interface PaginatedStockGasoilResponse {
  data: StockGasoilMovementView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const stockGasoilApi = {
  getAll: async (params?: QueryStockGasoilParams): Promise<PaginatedStockGasoilResponse> => {
    const response = await api.get<PaginatedStockGasoilResponse>('/stock-gasoil', { params });
    return response.data;
  },

  getStats: async (params?: QueryStockGasoilParams): Promise<StockGasoilStats> => {
    const response = await api.get<StockGasoilStats>('/stock-gasoil/stats', { params });
    return response.data;
  },

  getById: async (id: number): Promise<StockGasoilMovementView> => {
    const response = await api.get<StockGasoilMovementView>(`/stock-gasoil/${id}`);
    return response.data;
  },

  createEntree: async (payload: CreateStockEntreePayload): Promise<StockGasoilMovementView> => {
    const response = await api.post<StockGasoilMovementView>('/stock-gasoil/entrees', payload);
    return response.data;
  },

  updateEntree: async (
    id: number,
    payload: UpdateStockEntreePayload,
  ): Promise<StockGasoilMovementView> => {
    const response = await api.patch<StockGasoilMovementView>(`/stock-gasoil/entrees/${id}`, payload);
    return response.data;
  },

  deleteEntree: async (id: number): Promise<{ idMouvement: number }> => {
    const response = await api.delete<{ idMouvement: number }>(`/stock-gasoil/entrees/${id}`);
    return response.data;
  },
};
