import { api } from '../../lib/axios';
import {
  CreateVehiculePayload,
  UpdateVehiculePayload,
  UpdateVehiculeStatusPayload,
  Vehicule,
  VehiculeStats,
  VehiculesQueryParams,
} from './types';

export interface PaginatedVehiculesResponse {
  data: Vehicule[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const vehiclesApi = {
  getStats: async (): Promise<VehiculeStats> => {
    const response = await api.get<VehiculeStats>('/vehicules/stats');
    return response.data;
  },

  getAll: async (params?: VehiculesQueryParams): Promise<PaginatedVehiculesResponse> => {
    const response = await api.get<PaginatedVehiculesResponse>('/vehicules', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Vehicule> => {
    const response = await api.get<Vehicule>(`/vehicules/${id}`);
    return response.data;
  },

  create: async (payload: CreateVehiculePayload): Promise<Vehicule> => {
    const response = await api.post<Vehicule>('/vehicules', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateVehiculePayload): Promise<Vehicule> => {
    const response = await api.patch<Vehicule>(`/vehicules/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateVehiculeStatusPayload): Promise<Vehicule> => {
    const response = await api.patch<Vehicule>(`/vehicules/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/vehicules/${id}`);
    return response.data;
  },
};
