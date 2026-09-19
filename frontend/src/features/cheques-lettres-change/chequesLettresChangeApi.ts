import { api } from '../../lib/axios';
import {
  PaymentInstrumentView,
  InstrumentStatsView,
  QueryChequesLettresChangeParams,
  UpdateStatutPayload,
} from './types';

export interface PaginatedInstrumentsResponse {
  data: PaymentInstrumentView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const chequesLettresChangeApi = {
  getStats: async (
    params?: QueryChequesLettresChangeParams,
  ): Promise<InstrumentStatsView> => {
    const response = await api.get<InstrumentStatsView>(
      '/cheques-lettres-change/stats',
      { params },
    );
    return response.data;
  },

  getAll: async (
    params?: QueryChequesLettresChangeParams,
  ): Promise<PaginatedInstrumentsResponse> => {
    const response = await api.get<PaginatedInstrumentsResponse>(
      '/cheques-lettres-change',
      { params },
    );
    return response.data;
  },

  updateStatutCheque: async (
    id: number,
    payload: UpdateStatutPayload,
  ): Promise<PaymentInstrumentView> => {
    const response = await api.patch<PaymentInstrumentView>(
      `/cheques-lettres-change/cheques/${id}/statut`,
      payload,
    );
    return response.data;
  },

  updateStatutLettre: async (
    id: number,
    payload: UpdateStatutPayload,
  ): Promise<PaymentInstrumentView> => {
    const response = await api.patch<PaymentInstrumentView>(
      `/cheques-lettres-change/lettres-de-change/${id}/statut`,
      payload,
    );
    return response.data;
  },
};
