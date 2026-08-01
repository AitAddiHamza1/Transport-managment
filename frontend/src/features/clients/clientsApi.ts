import { api } from '../../lib/axios';
import {
  CreateClientPayload,
  UpdateClientPayload,
  UpdateClientStatusPayload,
  Client,
  ClientStats,
  ClientsQueryParams,
} from './types';

export interface PaginatedClientsResponse {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const clientsApi = {
  getStats: async (): Promise<ClientStats> => {
    const response = await api.get<ClientStats>('/clients/stats');
    return response.data;
  },

  getAll: async (params?: ClientsQueryParams): Promise<PaginatedClientsResponse> => {
    const response = await api.get<PaginatedClientsResponse>('/clients', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  create: async (payload: CreateClientPayload): Promise<Client> => {
    const response = await api.post<Client>('/clients', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateClientPayload): Promise<Client> => {
    const response = await api.patch<Client>(`/clients/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateClientStatusPayload): Promise<Client> => {
    const response = await api.patch<Client>(`/clients/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/clients/${id}`);
    return response.data;
  },
};
