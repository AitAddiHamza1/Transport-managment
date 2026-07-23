import { api } from '../../lib/axios';
import {
  CreateFacturePayload,
  Facture,
  FactureStats,
  FacturesQueryParams,
  UpdateFacturePayload,
} from './types';

export interface PaginatedFacturesResponse {
  data: Facture[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const facturesApi = {
  getAll: async (params?: FacturesQueryParams): Promise<PaginatedFacturesResponse> => {
    const response = await api.get<PaginatedFacturesResponse>('/factures', { params });
    return response.data;
  },

  getStats: async (): Promise<FactureStats> => {
    const response = await api.get<FactureStats>('/factures/stats');
    return response.data;
  },

  getById: async (id: number): Promise<Facture> => {
    const response = await api.get<Facture>(`/factures/${id}`);
    return response.data;
  },

  create: async (payload: CreateFacturePayload): Promise<Facture> => {
    const response = await api.post<Facture>('/factures', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateFacturePayload): Promise<Facture> => {
    const response = await api.patch<Facture>(`/factures/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(`/factures/${id}`);
    return response.data;
  },

  downloadPdf: async (id: number, numeroFacture?: string): Promise<void> => {
    const response = await api.get(`/factures/${id}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    let filename = `Facture-${numeroFacture || id}.pdf`;

    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
