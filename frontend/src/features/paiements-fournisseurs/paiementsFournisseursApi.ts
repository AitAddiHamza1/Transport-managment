import { api } from '../../lib/axios';
import type { DetteFournisseurView } from '../dettes-fournisseurs/types';
import type {
  CancelPaiementFournisseurPayload,
  CreatePaiementFournisseurPayload,
  PaiementFournisseurGlobalView,
  PaiementFournisseurStats,
  QueryPaiementFournisseurDto,
} from './types';

export interface PaginatedPaiementsGlobalResponse {
  data: PaiementFournisseurGlobalView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paiementsFournisseursApi = {
  getGlobalPaiements: async (
    params?: QueryPaiementFournisseurDto,
  ): Promise<PaginatedPaiementsGlobalResponse> => {
    const response = await api.get<PaginatedPaiementsGlobalResponse>('/paiements-fournisseurs', {
      params,
    });
    return response.data;
  },

  getGlobalStats: async (
    params?: QueryPaiementFournisseurDto,
  ): Promise<PaiementFournisseurStats> => {
    const response = await api.get<PaiementFournisseurStats>('/paiements-fournisseurs/stats', {
      params,
    });
    return response.data;
  },

  getDebtPaiements: async (idDetteFournisseur: number): Promise<PaiementFournisseurGlobalView[]> => {
    const response = await api.get<PaiementFournisseurGlobalView[]>(
      `/dettes-fournisseurs/${idDetteFournisseur}/paiements`,
    );
    return response.data;
  },

  createPaiement: async (
    idDetteFournisseur: number,
    payload: CreatePaiementFournisseurPayload,
  ): Promise<DetteFournisseurView> => {
    const response = await api.post<DetteFournisseurView>(
      `/dettes-fournisseurs/${idDetteFournisseur}/paiements`,
      payload,
    );
    return response.data;
  },

  cancelPaiement: async (
    idDetteFournisseur: number,
    versementId: number,
    payload: CancelPaiementFournisseurPayload,
  ): Promise<DetteFournisseurView> => {
    const response = await api.post<DetteFournisseurView>(
      `/dettes-fournisseurs/${idDetteFournisseur}/paiements/${versementId}/annuler`,
      payload,
    );
    return response.data;
  },
};
