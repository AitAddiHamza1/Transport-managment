import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../utils/notify';
import { lettresDeChangeApi } from './lettresDeChangeApi';

export const lettreDeChangeKeys = {
  all: ['lettres-de-change'] as const,
  document: (id: number | null) => [...lettreDeChangeKeys.all, 'document', id] as const,
};

export function useLettreDeChangeDocumentQuery(idLettreDeChange: number | null) {
  return useQuery({
    queryKey: lettreDeChangeKeys.document(idLettreDeChange),
    queryFn: () => (idLettreDeChange ? lettresDeChangeApi.getDocumentMetadata(idLettreDeChange) : null),
    enabled: idLettreDeChange !== null && idLettreDeChange > 0,
  });
}

export function useUploadLettreDeChangeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idLettreDeChange, file }: { idLettreDeChange: number; file: File }) =>
      lettresDeChangeApi.uploadDocument(idLettreDeChange, file),
    onSuccess: (_, { idLettreDeChange }) => {
      notify.success('Document de la lettre de change attaché avec succès');
      queryClient.invalidateQueries({ queryKey: lettreDeChangeKeys.document(idLettreDeChange) });
      queryClient.invalidateQueries({ queryKey: ['paiements-clients'] });
      queryClient.invalidateQueries({ queryKey: ['gestion-paiements'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteLettreDeChangeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idLettreDeChange: number) => lettresDeChangeApi.removeDocument(idLettreDeChange),
    onSuccess: (_, idLettreDeChange) => {
      notify.success('Document de la lettre de change supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: lettreDeChangeKeys.document(idLettreDeChange) });
      queryClient.invalidateQueries({ queryKey: ['paiements-clients'] });
      queryClient.invalidateQueries({ queryKey: ['gestion-paiements'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
