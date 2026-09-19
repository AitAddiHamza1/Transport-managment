import { api } from '../../lib/axios';
import type {
  CreateDocumentVehiculeInput,
  DocumentVehicule,
  DocumentVehiculeStats,
  PaginatedResponse,
  QueryDocumentVehiculeParams,
  UpdateDocumentVehiculeInput,
} from './types';

export const documentsVehiculesApi = {
  getAll: async (params?: QueryDocumentVehiculeParams): Promise<PaginatedResponse<DocumentVehicule>> => {
    const response = await api.get<PaginatedResponse<DocumentVehicule>>('/documents-vehicules', { params });
    return response.data;
  },

  getStats: async (): Promise<DocumentVehiculeStats> => {
    const response = await api.get<DocumentVehiculeStats>('/documents-vehicules/stats');
    return response.data;
  },

  getById: async (id: number): Promise<DocumentVehicule> => {
    const response = await api.get<DocumentVehicule>(`/documents-vehicules/${id}`);
    return response.data;
  },

  create: async (data: CreateDocumentVehiculeInput): Promise<DocumentVehicule> => {
    const response = await api.post<DocumentVehicule>('/documents-vehicules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDocumentVehiculeInput): Promise<DocumentVehicule> => {
    const response = await api.patch<DocumentVehicule>(`/documents-vehicules/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(`/documents-vehicules/${id}`);
    return response.data;
  },

  uploadFile: async (id: number, file: File): Promise<DocumentVehicule> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<DocumentVehicule>(`/documents-vehicules/${id}/fichier`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteFile: async (id: number): Promise<DocumentVehicule> => {
    const response = await api.delete<DocumentVehicule>(`/documents-vehicules/${id}/fichier`);
    return response.data;
  },

  getFileUrl: (id: number): string => `${api.defaults.baseURL}/documents-vehicules/${id}/fichier`,
  getDownloadUrl: (id: number): string => `${api.defaults.baseURL}/documents-vehicules/${id}/fichier/download`,

  downloadFile: async (id: number, originalFilename?: string): Promise<void> => {
    const response = await api.get(`/documents-vehicules/${id}/fichier/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const filename = originalFilename || `document-${id}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  previewFile: async (id: number): Promise<string> => {
    const response = await api.get(`/documents-vehicules/${id}/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], { type: contentType });
    return window.URL.createObjectURL(blob);
  },
};

