import { api } from '../../lib/axios';
import type {
  CreateTraverseePayload,
  QueryTraverseeParams,
  TraverseeMaritime,
  TraverseeMaritimeMeta,
  TraverseeMaritimeStats,
  UpdateTraverseePayload,
} from './types';

export interface PaginatedResponse<T> {
  data: T[];
  meta: TraverseeMaritimeMeta;
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
    if (payload.immatriculation) formData.append('immatriculation', payload.immatriculation);
    if (payload.idConducteur) formData.append('idConducteur', String(payload.idConducteur));
    if (payload.dateOperation) formData.append('dateOperation', payload.dateOperation);

    // Section 1: Circuit
    if (payload.hasCircuitPortuaire !== undefined) formData.append('hasCircuitPortuaire', String(payload.hasCircuitPortuaire));
    if (payload.circuitNature) formData.append('circuitNature', payload.circuitNature);
    if (payload.circuitMontant !== undefined && payload.circuitMontant !== null) formData.append('circuitMontant', String(payload.circuitMontant));
    if (payload.circuitNotes) formData.append('circuitNotes', payload.circuitNotes);

    // Section 2: Bateau
    if (payload.hasBateau !== undefined) formData.append('hasBateau', String(payload.hasBateau));
    if (payload.dateTraversee) formData.append('dateTraversee', payload.dateTraversee);
    if (payload.bateau) formData.append('bateau', payload.bateau);
    if (payload.lieuEmbarquement) formData.append('lieuEmbarquement', payload.lieuEmbarquement);
    if (payload.prix !== undefined && payload.prix !== null) formData.append('prix', String(payload.prix));
    formData.append('devise', 'MAD');
    if (payload.estVerifiee !== undefined) formData.append('estVerifiee', String(payload.estVerifiee));

    // Section 3: Transit
    if (payload.hasTransitAljaziras !== undefined) formData.append('hasTransitAljaziras', String(payload.hasTransitAljaziras));
    if (payload.transitTypeService) formData.append('transitTypeService', payload.transitTypeService);
    if (payload.transitPrix !== undefined && payload.transitPrix !== null) formData.append('transitPrix', String(payload.transitPrix));
    if (payload.transitNotes) formData.append('transitNotes', payload.transitNotes);

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

  // Independent Section Verifications
  toggleCircuitVerification: async (id: number, circuitEstVerifie?: boolean): Promise<TraverseeMaritime> => {
    const response = await api.patch<TraverseeMaritime>(`/traversees-maritimes/${id}/verification/circuit`, {
      circuitEstVerifie,
    });
    return response.data;
  },

  toggleBateauVerification: async (id: number, estVerifiee?: boolean): Promise<TraverseeMaritime> => {
    const response = await api.patch<TraverseeMaritime>(`/traversees-maritimes/${id}/verification/bateau`, {
      estVerifiee,
    });
    return response.data;
  },

  toggleTransitVerification: async (id: number, transitEstVerifie?: boolean): Promise<TraverseeMaritime> => {
    const response = await api.patch<TraverseeMaritime>(`/traversees-maritimes/${id}/verification/transit`, {
      transitEstVerifie,
    });
    return response.data;
  },

  // Legacy alias for Bateau verification
  toggleVerification: async (id: number, estVerifiee?: boolean): Promise<TraverseeMaritime> => {
    return traverseesApi.toggleBateauVerification(id, estVerifiee);
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
