import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chequesApi } from './chequesApi';
import { notify } from '../../utils/notify';
import { ChequeView, ChequeDocumentView } from './types';

export function useChequeById(id: number | null | undefined) {
  return useQuery<ChequeView>({
    queryKey: ['cheques', 'by-id', id],
    queryFn: () => chequesApi.getChequeById(id!),
    enabled: Boolean(id),
  });
}

export function useChequeByClientPaymentId(paymentId: number | null | undefined) {
  return useQuery<ChequeView>({
    queryKey: ['cheques', 'client-paiement', paymentId],
    queryFn: () => chequesApi.getChequeByClientPaymentId(paymentId!),
    enabled: Boolean(paymentId),
  });
}

export function useChequeBySupplierPaymentId(paymentId: number | null | undefined) {
  return useQuery<ChequeView>({
    queryKey: ['cheques', 'fournisseur-paiement', paymentId],
    queryFn: () => chequesApi.getChequeBySupplierPaymentId(paymentId!),
    enabled: Boolean(paymentId),
  });
}

export function useChequeDocumentMetadata(chequeId: number | null | undefined) {
  return useQuery<ChequeDocumentView>({
    queryKey: ['cheques', chequeId, 'document'],
    queryFn: () => chequesApi.getDocumentMetadata(chequeId!),
    enabled: Boolean(chequeId),
    retry: false,
  });
}

export function useUploadChequeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chequeId, file }: { chequeId: number; file: File }) =>
      chequesApi.uploadDocument(chequeId, file),
    onSuccess: (_, variables) => {
      notify.success('Document du chèque téléversé avec succès');
      queryClient.invalidateQueries({ queryKey: ['cheques', variables.chequeId] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      queryClient.invalidateQueries({ queryKey: ['paiements-clients'] });
      queryClient.invalidateQueries({ queryKey: ['paiements-fournisseurs'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Échec du téléversement du document du chèque';
      notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });
}

export function useRemoveChequeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chequeId: number) => chequesApi.removeDocument(chequeId),
    onSuccess: (_, chequeId) => {
      notify.success('Document du chèque supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['cheques', chequeId] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      queryClient.invalidateQueries({ queryKey: ['paiements-clients'] });
      queryClient.invalidateQueries({ queryKey: ['paiements-fournisseurs'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Échec de la suppression du document du chèque';
      notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });
}
