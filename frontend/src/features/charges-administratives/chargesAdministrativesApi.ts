import { api } from '../../lib/axios';
import {
  ChargeAdministrative,
  ChargeAdministrativeStats,
  ChargesAdministrativesQueryParams,
  CreateChargeAdministrativePayload,
  PaginatedChargesAdministrativesResponse,
  UpdateChargeAdministrativePayload,
} from './types';

export const chargesAdministrativesApi = {
  getStats: async (
    params?: ChargesAdministrativesQueryParams,
  ): Promise<ChargeAdministrativeStats> => {
    const response = await api.get<ChargeAdministrativeStats>(
      '/depenses-administratives/stats',
      { params },
    );
    return response.data;
  },

  getAll: async (
    params?: ChargesAdministrativesQueryParams,
  ): Promise<PaginatedChargesAdministrativesResponse> => {
    const response = await api.get<PaginatedChargesAdministrativesResponse>(
      '/depenses-administratives',
      { params },
    );
    return response.data;
  },

  getById: async (id: number): Promise<ChargeAdministrative> => {
    const response = await api.get<ChargeAdministrative>(`/depenses-administratives/${id}`);
    return response.data;
  },

  create: async (
    payload: CreateChargeAdministrativePayload,
  ): Promise<ChargeAdministrative> => {
    if (payload.recu) {
      const formData = new FormData();
      formData.append('categorieDepense', payload.categorieDepense);
      if (payload.description) formData.append('description', payload.description);
      formData.append('montant', payload.montant.toString());
      if (payload.dateDepense) formData.append('dateDepense', payload.dateDepense);
      formData.append('recu', payload.recu);

      const response = await api.post<ChargeAdministrative>(
        '/depenses-administratives',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data;
    }

    const jsonPayload = { ...payload };
    delete jsonPayload.recu;
    const response = await api.post<ChargeAdministrative>(
      '/depenses-administratives',
      jsonPayload,
    );
    return response.data;
  },

  update: async (
    id: number,
    payload: UpdateChargeAdministrativePayload,
  ): Promise<ChargeAdministrative> => {
    const response = await api.patch<ChargeAdministrative>(
      `/depenses-administratives/${id}`,
      payload,
    );
    return response.data;
  },

  uploadReceipt: async (id: number, file: File): Promise<ChargeAdministrative> => {
    const formData = new FormData();
    formData.append('recu', file);
    const response = await api.post<ChargeAdministrative>(
      `/depenses-administratives/${id}/recu`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  deleteReceipt: async (id: number): Promise<ChargeAdministrative> => {
    const response = await api.delete<ChargeAdministrative>(
      `/depenses-administratives/${id}/recu`,
    );
    return response.data;
  },

  remove: async (id: number): Promise<{ idDepense: number }> => {
    const response = await api.delete<{ idDepense: number }>(
      `/depenses-administratives/${id}`,
    );
    return response.data;
  },

  getReceiptUrl: (id: number): string => `/api/depenses-administratives/${id}/recu`,
  getReceiptDownloadUrl: (id: number): string =>
    `/api/depenses-administratives/${id}/recu/download`,
};
