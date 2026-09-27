import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { notify } from '../../utils/notify';
import { facturesApi } from './facturesApi';
import { CreateFacturePayload, FacturesQueryParams, UpdateFacturePayload } from './types';

export const factureKeys = {
  all: (companyId?: number) => ['factures', companyId] as const,
  lists: (companyId?: number) => [...factureKeys.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: FacturesQueryParams) => [...factureKeys.lists(companyId), params] as const,
  details: (companyId?: number) => [...factureKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number | null) => [...factureKeys.details(companyId), id] as const,
  stats: (companyId?: number, params?: FacturesQueryParams) => [...factureKeys.all(companyId), 'stats', params] as const,
};

export function useFactureStats(params?: FacturesQueryParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: factureKeys.stats(companyId, params),
    queryFn: () => facturesApi.getStats(params),
    enabled: Boolean(companyId),
  });
}

export function useFacturesQuery(params?: FacturesQueryParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: factureKeys.list(companyId, params),
    queryFn: () => facturesApi.getAll(params),
    enabled: Boolean(companyId),
    placeholderData: keepPreviousData,
  });
}

export function useFactureQuery(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: factureKeys.detail(companyId, id),
    queryFn: () => (id ? facturesApi.getById(id) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useCreateFacture() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (payload: CreateFacturePayload) => facturesApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Facture ${data.numeroFacture} (${data.nomClient}) créée avec succès`);
      queryClient.invalidateQueries({ queryKey: factureKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateFacture() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFacturePayload }) =>
      facturesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Facture ${data.numeroFacture} mise à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: factureKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.detail(companyId, data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteFacture() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => facturesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Facture annulée avec succès');
      queryClient.invalidateQueries({ queryKey: factureKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats(companyId) });
      queryClient.removeQueries({ queryKey: factureKeys.detail(companyId, deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l’annulation de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDownloadFacturePdf() {
  return useMutation({
    mutationFn: ({
      id,
      numeroFacture,
      includeStamp,
    }: {
      id: number;
      numeroFacture?: string;
      includeStamp?: boolean;
    }) => facturesApi.downloadPdf(id, numeroFacture, includeStamp ?? false),
    onSuccess: () => {
      notify.success('Facture PDF téléchargée avec succès');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Impossible de télécharger la facture PDF';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
