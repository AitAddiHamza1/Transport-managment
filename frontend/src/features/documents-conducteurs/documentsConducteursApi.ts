import { api } from '../../lib/axios';
import type {
  CreateDocumentConducteurInput,
  DocumentConducteur,
  DocumentConducteurStats,
  PaginatedResponse,
  QueryDocumentConducteurParams,
  UpdateDocumentConducteurInput,
} from './types';

export const documentsConducteursApi = {
  getAll: async (params?: QueryDocumentConducteurParams): Promise<PaginatedResponse<DocumentConducteur>> => {
    const response = await api.get<PaginatedResponse<DocumentConducteur>>('/documents-conducteurs', { params });
    return response.data;
  },

  getStats: async (): Promise<DocumentConducteurStats> => {
    const response = await api.get<DocumentConducteurStats>('/documents-conducteurs/stats');
    return response.data;
  },

  getById: async (id: number): Promise<DocumentConducteur> => {
    const response = await api.get<DocumentConducteur>(`/documents-conducteurs/${id}`);
    return response.data;
  },

  locate: async (id: number, limit: number = 10): Promise<{ found: boolean; page: number; total: number; targetId: number }> => {
    const response = await api.get<{ found: boolean; page: number; total: number; targetId: number }>(`/documents-conducteurs/locate/${id}`, {
      params: { limit },
    });
    return response.data;
  },

  create: async (data: CreateDocumentConducteurInput): Promise<DocumentConducteur> => {
    const response = await api.post<DocumentConducteur>('/documents-conducteurs', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDocumentConducteurInput): Promise<DocumentConducteur> => {
    const response = await api.patch<DocumentConducteur>(`/documents-conducteurs/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(`/documents-conducteurs/${id}`);
    return response.data;
  },

  uploadFile: async (id: number, file: File): Promise<DocumentConducteur> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<DocumentConducteur>(`/documents-conducteurs/${id}/fichier`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteFile: async (id: number): Promise<DocumentConducteur> => {
    const response = await api.delete<DocumentConducteur>(`/documents-conducteurs/${id}/fichier`);
    return response.data;
  },

  getFileUrl: (id: number): string => `${api.defaults.baseURL}/documents-conducteurs/${id}/fichier`,
  getDownloadUrl: (id: number): string => `${api.defaults.baseURL}/documents-conducteurs/${id}/fichier/download`,

  downloadFile: async (id: number, originalFilename?: string): Promise<void> => {
    const response = await api.get(`/documents-conducteurs/${id}/fichier/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const filename = originalFilename || `document-conducteur-${id}`;
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
    const response = await api.get(`/documents-conducteurs/${id}/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], { type: contentType });
    return window.URL.createObjectURL(blob);
  },
};
