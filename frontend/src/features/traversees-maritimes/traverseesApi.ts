import { api } from '../../lib/axios';
import type {
  CreateTraverseePayload,
  QueryTraverseeParams,
  TraverseeMaritime,
  TraverseeMaritimeStats,
  UpdateTraverseePayload,
} from './types';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const traverseesApi = {
  getAll: async (params?: QueryTraverseeParams): Promise<PaginatedResponse<TraverseeMaritime>> => {
    const response = await api.get<PaginatedResponse<TraverseeMaritime>>('/traversees-maritimes', { params });
    return response.data;
  },

  getStats: async (): Promise<TraverseeMaritimeStats> => {
    const response = await api.get<TraverseeMaritimeStats>('/traversees-maritimes/stats');
    return response.data;
  },

  getById: async (id: number): Promise<TraverseeMaritime> => {
    const response = await api.get<TraverseeMaritime>(`/traversees-maritimes/${id}`);
    return response.data;
  },

  create: async (payload: CreateTraverseePayload): Promise<TraverseeMaritime> => {
    const formData = new FormData();
    if (payload.idVoyage) formData.append('idVoyage', String(payload.idVoyage));
    formData.append('immatriculation', payload.immatriculation);
    formData.append('idConducteur', String(payload.idConducteur));
    formData.append('dateTraversee', payload.dateTraversee);
    formData.append('bateau', payload.bateau);
    formData.append('lieuEmbarquement', payload.lieuEmbarquement);
    formData.append('prix', String(payload.prix));
    formData.append('devise', 'MAD');
    if (payload.estVerifiee !== undefined) formData.append('estVerifiee', String(payload.estVerifiee));
    if (payload.file) formData.append('file', payload.file);

    const response = await api.post<TraverseeMaritime>('/traversees-maritimes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, payload: UpdateTraverseePayload): Promise<TraverseeMaritime> => {
    const response = await api.patch<TraverseeMaritime>(`/traversees-maritimes/${id}`, {
      ...payload,
      devise: 'MAD',
    });
    return response.data;
  },

  toggleVerification: async (id: number, estVerifiee?: boolean): Promise<TraverseeMaritime> => {
    const response = await api.patch<TraverseeMaritime>(`/traversees-maritimes/${id}/verification`, {
      estVerifiee,
    });
    return response.data;
  },

  remove: async (id: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(`/traversees-maritimes/${id}`);
    return response.data;
  },

  uploadJustificatif: async (id: number, file: File): Promise<TraverseeMaritime> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<TraverseeMaritime>(`/traversees-maritimes/${id}/fichier`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteJustificatif: async (id: number): Promise<TraverseeMaritime> => {
    const response = await api.delete<TraverseeMaritime>(`/traversees-maritimes/${id}/fichier`);
    return response.data;
  },

  downloadJustificatif: async (id: number, originalFilename?: string): Promise<void> => {
    const response = await api.get(`/traversees-maritimes/${id}/fichier/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const filename = originalFilename || `justificatif-traversee-${id}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  previewJustificatif: async (id: number): Promise<string> => {
    const response = await api.get(`/traversees-maritimes/${id}/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], { type: contentType });
    return window.URL.createObjectURL(blob);
  },
};
