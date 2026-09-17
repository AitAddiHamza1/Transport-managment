import { api } from '../../lib/axios';
import {
  CreateVoyagePayload,
  DocumentVoyage,
  FraisImmobilisation,
  UpdateVoyagePayload,
  UpdateVoyageStatusPayload,
  Voyage,
  VoyageStats,
  VoyagesQueryParams,
} from './types';

export interface PaginatedVoyagesResponse {
  data: Voyage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const voyagesApi = {
  getStats: async (): Promise<VoyageStats> => {
    const response = await api.get<VoyageStats>('/voyages/stats');
    return response.data;
  },

  getAll: async (params?: VoyagesQueryParams): Promise<PaginatedVoyagesResponse> => {
    const response = await api.get<PaginatedVoyagesResponse>('/voyages', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Voyage> => {
    const response = await api.get<Voyage>(`/voyages/${id}`);
    return response.data;
  },

  create: async (payload: CreateVoyagePayload): Promise<Voyage> => {
    const response = await api.post<Voyage>('/voyages', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateVoyagePayload): Promise<Voyage> => {
    const response = await api.patch<Voyage>(`/voyages/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number, payload: UpdateVoyageStatusPayload): Promise<Voyage> => {
    const response = await api.patch<Voyage>(`/voyages/${id}/status`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ idVoyage: number }> => {
    const response = await api.delete<{ idVoyage: number }>(`/voyages/${id}`);
    return response.data;
  },

  // --- DOCUMENTS DE VOYAGE ---
  getDocuments: async (idVoyage: number): Promise<DocumentVoyage[]> => {
    const response = await api.get<DocumentVoyage[]>(`/voyages/${idVoyage}/documents`);
    return response.data;
  },

  uploadDocuments: async (idVoyage: number, files: File[]): Promise<DocumentVoyage[]> => {
    const results: DocumentVoyage[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<DocumentVoyage>(`/voyages/${idVoyage}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      results.push(response.data);
    }
    return results;
  },

  deleteDocument: async (idVoyage: number, docId: number): Promise<{ id: number }> => {
    const response = await api.delete<{ id: number }>(`/voyages/${idVoyage}/documents/${docId}`);
    return response.data;
  },

  downloadDocumentFile: async (
    idVoyage: number,
    docId: number,
    originalFilename?: string,
  ): Promise<void> => {
    const response = await api.get(`/voyages/${idVoyage}/documents/${docId}/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const filename = originalFilename || `document-${docId}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  viewDocumentFile: async (idVoyage: number, docId: number): Promise<string> => {
    const response = await api.get(`/voyages/${idVoyage}/documents/${docId}/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], { type: contentType });
    return window.URL.createObjectURL(blob);
  },

  // --- FRAIS D'IMMOBILISATION ---
  getFraisImmobilisation: async (idVoyage: number): Promise<FraisImmobilisation | null> => {
    const response = await api.get<FraisImmobilisation | null>(`/voyages/${idVoyage}/frais-immobilisation`);
    return response.data;
  },

  createFraisImmobilisation: async (
    idVoyage: number,
    data: { prixParJour: number; nombreJoursRetard: number },
  ): Promise<FraisImmobilisation> => {
    const response = await api.post<FraisImmobilisation>(`/voyages/${idVoyage}/frais-immobilisation`, data);
    return response.data;
  },

  updateFraisImmobilisation: async (
    idVoyage: number,
    data: { prixParJour?: number; nombreJoursRetard?: number },
  ): Promise<FraisImmobilisation> => {
    const response = await api.put<FraisImmobilisation>(`/voyages/${idVoyage}/frais-immobilisation`, data);
    return response.data;
  },

  deleteFraisImmobilisation: async (idVoyage: number): Promise<{ idVoyage: number }> => {
    const response = await api.delete<{ idVoyage: number }>(`/voyages/${idVoyage}/frais-immobilisation`);
    return response.data;
  },
};
