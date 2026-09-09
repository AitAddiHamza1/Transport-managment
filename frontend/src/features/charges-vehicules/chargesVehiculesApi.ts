import { api } from '../../lib/axios';
import {
  CreateChargeVehiculePayload,
  UpdateChargeVehiculePayload,
  ChargeVehicule,
  ChargeVehiculeStats,
  ChargesVehiculesQueryParams,
} from './types';

export interface PaginatedChargesVehiculesResponse {
  data: ChargeVehicule[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const chargesVehiculesApi = {
  getStats: async (): Promise<ChargeVehiculeStats> => {
    const response = await api.get<ChargeVehiculeStats>('/depenses-vehicules/stats');
    return response.data;
  },

  getAll: async (params?: ChargesVehiculesQueryParams): Promise<PaginatedChargesVehiculesResponse> => {
    const response = await api.get<PaginatedChargesVehiculesResponse>('/depenses-vehicules', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ChargeVehicule> => {
    const response = await api.get<ChargeVehicule>(`/depenses-vehicules/${id}`);
    return response.data;
  },

  create: async (payload: CreateChargeVehiculePayload, file?: File): Promise<ChargeVehicule> => {
    if (file) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file);
      const response = await api.post<ChargeVehicule>('/depenses-vehicules', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await api.post<ChargeVehicule>('/depenses-vehicules', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateChargeVehiculePayload, file?: File): Promise<ChargeVehicule> => {
    if (file) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });
      formData.append('file', file);
      const response = await api.patch<ChargeVehicule>(`/depenses-vehicules/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await api.patch<ChargeVehicule>(`/depenses-vehicules/${id}`, payload);
    return response.data;
  },

  uploadReceipt: async (id: number, file: File): Promise<ChargeVehicule> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ChargeVehicule>(`/depenses-vehicules/${id}/recu`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteReceipt: async (id: number): Promise<ChargeVehicule> => {
    const response = await api.delete<ChargeVehicule>(`/depenses-vehicules/${id}/recu`);
    return response.data;
  },

  delete: async (id: number): Promise<{ idDepense: number }> => {
    const response = await api.delete<{ idDepense: number }>(`/depenses-vehicules/${id}`);
    return response.data;
  },

  getReceiptUrl: (id: number): string => `/api/depenses-vehicules/${id}/recu`,
  getReceiptDownloadUrl: (id: number): string => `/api/depenses-vehicules/${id}/recu/download`,
};
