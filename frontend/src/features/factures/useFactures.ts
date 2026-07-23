import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { facturesApi } from './facturesApi';
import { CreateFacturePayload, FacturesQueryParams, UpdateFacturePayload } from './types';

export const factureKeys = {
  all: ['factures'] as const,
  lists: () => [...factureKeys.all, 'list'] as const,
  list: (params?: FacturesQueryParams) => [...factureKeys.lists(), params] as const,
  details: () => [...factureKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...factureKeys.details(), id] as const,
  stats: () => [...factureKeys.all, 'stats'] as const,
};

export function useFactureStats() {
  return useQuery({
    queryKey: factureKeys.stats(),
    queryFn: () => facturesApi.getStats(),
  });
}

export function useFacturesQuery(params?: FacturesQueryParams) {
  return useQuery({
    queryKey: factureKeys.list(params),
    queryFn: () => facturesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useFactureQuery(id: number | null) {
  return useQuery({
    queryKey: factureKeys.detail(id),
    queryFn: () => (id ? facturesApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacturePayload) => facturesApi.create(payload),
    onSuccess: (data) => {
      notify.success(`Facture ${data.numeroFacture} (${data.nomClient}) créée avec succès`);
      queryClient.invalidateQueries({ queryKey: factureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats() });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFacturePayload }) =>
      facturesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Facture ${data.numeroFacture} mise à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: factureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats() });
      queryClient.invalidateQueries({ queryKey: factureKeys.detail(data.id) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => facturesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Facture annulée avec succès');
      queryClient.invalidateQueries({ queryKey: factureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: factureKeys.stats() });
      queryClient.removeQueries({ queryKey: factureKeys.detail(deletedId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l’annulation de la facture';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDownloadFacturePdf() {
  return useMutation({
    mutationFn: ({ id, numeroFacture }: { id: number; numeroFacture?: string }) =>
      facturesApi.downloadPdf(id, numeroFacture),
    onSuccess: () => {
      notify.success('Facture PDF téléchargée avec succès');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Impossible de télécharger la facture PDF';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
