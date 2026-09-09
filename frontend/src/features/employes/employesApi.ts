import { api } from '../../lib/axios';
import {
  CreateEmployeFormData,
  DocumentEmploye,
  Employe,
  EmployesPaginatedResponse,
  EmployesQueryParams,
  EmployeStats,
  UpdateEmployeFormData,
} from './types';

export const employesApi = {
  getEmployes: async (params: EmployesQueryParams): Promise<EmployesPaginatedResponse> => {
    const response = await api.get<EmployesPaginatedResponse>('/employes', { params });
    return response.data;
  },

  getEmployeStats: async (): Promise<EmployeStats> => {
    const response = await api.get<EmployeStats>('/employes/stats');
    return response.data;
  },

  getEmploye: async (id: number): Promise<Employe> => {
    const response = await api.get<Employe>(`/employes/${id}`);
    return response.data;
  },

  createEmploye: async (data: CreateEmployeFormData): Promise<Employe> => {
    const response = await api.post<Employe>('/employes', data);
    return response.data;
  },

  updateEmploye: async (id: number, data: UpdateEmployeFormData): Promise<Employe> => {
    const response = await api.patch<Employe>(`/employes/${id}`, data);
    return response.data;
  },

  deleteEmploye: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/employes/${id}`);
    return response.data;
  },

  uploadEmployePhoto: async (id: number, file: File): Promise<Employe> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Employe>(`/employes/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteEmployePhoto: async (id: number): Promise<Employe> => {
    const response = await api.delete<Employe>(`/employes/${id}/photo`);
    return response.data;
  },

  getEmployeDocuments: async (id: number): Promise<DocumentEmploye[]> => {
    const response = await api.get<DocumentEmploye[]>(`/employes/${id}/documents`);
    return response.data;
  },

  uploadEmployeDocument: async (
    id: number,
    data: { typeDocument: string; numeroDocument?: string; dateEmission?: string; dateExpiration?: string; notes?: string; file: File },
  ): Promise<DocumentEmploye> => {
    const formData = new FormData();
    formData.append('typeDocument', data.typeDocument);
    if (data.numeroDocument) formData.append('numeroDocument', data.numeroDocument);
    if (data.dateEmission) formData.append('dateEmission', data.dateEmission);
    if (data.dateExpiration) formData.append('dateExpiration', data.dateExpiration);
    if (data.notes) formData.append('notes', data.notes);
    formData.append('file', data.file);

    const response = await api.post<DocumentEmploye>(`/employes/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteEmployeDocument: async (id: number, docId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/employes/${id}/documents/${docId}`);
    return response.data;
  },

  getPhotoUrl: (id: number): string => {
    return `${api.defaults.baseURL}/employes/${id}/photo`;
  },

  getDocumentFileUrl: (id: number, docId: number): string => {
    return `${api.defaults.baseURL}/employes/${id}/documents/${docId}/file`;
  },
};
