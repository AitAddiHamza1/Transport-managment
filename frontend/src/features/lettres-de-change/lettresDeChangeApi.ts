import { api } from '../../lib/axios';
import { LettreDeChangeDocumentView } from '../paiements-clients/types';

export const lettresDeChangeApi = {
  getDocumentMetadata: async (idLettreDeChange: number): Promise<LettreDeChangeDocumentView> => {
    const response = await api.get<LettreDeChangeDocumentView>(`/lettres-de-change/${idLettreDeChange}/document`);
    return response.data;
  },

  uploadDocument: async (idLettreDeChange: number, file: File): Promise<LettreDeChangeDocumentView> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<LettreDeChangeDocumentView>(
      `/lettres-de-change/${idLettreDeChange}/document`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  downloadDocument: async (idLettreDeChange: number, nomOriginal?: string): Promise<void> => {
    const response = await api.get(`/lettres-de-change/${idLettreDeChange}/document/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const filename = nomOriginal || `lc-document-${idLettreDeChange}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  viewDocumentFile: async (idLettreDeChange: number): Promise<string> => {
    const response = await api.get(`/lettres-de-change/${idLettreDeChange}/document/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], {
      type: contentType,
    });
    return window.URL.createObjectURL(blob);
  },

  removeDocument: async (idLettreDeChange: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(
      `/lettres-de-change/${idLettreDeChange}/document`,
    );
    return response.data;
  },
};
