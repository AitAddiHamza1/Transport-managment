import { api } from '../../lib/axios';
import { ChequeView, ChequeDocumentView } from './types';

export const chequesApi = {
  getChequeById: async (id: number): Promise<ChequeView> => {
    const response = await api.get<ChequeView>(`/cheques/${id}`);
    return response.data;
  },

  getChequeByClientPaymentId: async (paymentId: number): Promise<ChequeView> => {
    const response = await api.get<ChequeView>(`/cheques/client-paiement/${paymentId}`);
    return response.data;
  },

  getChequeBySupplierPaymentId: async (paymentId: number): Promise<ChequeView> => {
    const response = await api.get<ChequeView>(`/cheques/fournisseur-paiement/${paymentId}`);
    return response.data;
  },

  getDocumentMetadata: async (chequeId: number): Promise<ChequeDocumentView> => {
    const response = await api.get<ChequeDocumentView>(`/cheques/${chequeId}/document`);
    return response.data;
  },

  uploadDocument: async (chequeId: number, file: File): Promise<ChequeDocumentView> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ChequeDocumentView>(
      `/cheques/${chequeId}/document`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  downloadDocument: async (chequeId: number, nomOriginal?: string): Promise<void> => {
    const response = await api.get(`/cheques/${chequeId}/document/download`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const filename = nomOriginal || `chq-document-${chequeId}`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  viewDocumentFile: async (chequeId: number): Promise<string> => {
    const response = await api.get(`/cheques/${chequeId}/document/fichier`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers['content-type'] || 'application/pdf');
    const blob = new Blob([response.data], {
      type: contentType,
    });
    return window.URL.createObjectURL(blob);
  },

  removeDocument: async (chequeId: number): Promise<{ id: number; message: string }> => {
    const response = await api.delete<{ id: number; message: string }>(
      `/cheques/${chequeId}/document`,
    );
    return response.data;
  },
};
