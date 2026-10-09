import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { documentsConducteursApi } from './documentsConducteursApi';
import type {
  CreateDocumentConducteurInput,
  QueryDocumentConducteurParams,
  UpdateDocumentConducteurInput,
} from './types';
import { notify } from '../../utils/notify';

export const documentConducteurKeys = {
  all: (companyId?: number) => ['documents-conducteurs', companyId] as const,
  lists: (companyId?: number) => [...documentConducteurKeys.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: QueryDocumentConducteurParams) =>
    [...documentConducteurKeys.lists(companyId), params] as const,
  details: (companyId?: number) => [...documentConducteurKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number | null) =>
    [...documentConducteurKeys.details(companyId), id] as const,
  stats: (companyId?: number) => [...documentConducteurKeys.all(companyId), 'stats'] as const,
};

export function useDocumentsConducteursQuery(params?: QueryDocumentConducteurParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: documentConducteurKeys.list(companyId, params),
    queryFn: () => documentsConducteursApi.getAll(params),
    enabled: Boolean(companyId),
    placeholderData: keepPreviousData,
  });
}

export function useDocumentConducteurStatsQuery() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: documentConducteurKeys.stats(companyId),
    queryFn: () => documentsConducteursApi.getStats(),
    enabled: Boolean(companyId),
  });
}

export function useDocumentConducteurDetailQuery(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: documentConducteurKeys.detail(companyId, id),
    queryFn: () => (id ? documentsConducteursApi.getById(id) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useLocateDocumentConducteur(id: number | null, limit: number = 10) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: [...documentConducteurKeys.all(companyId), 'locate', id, limit],
    queryFn: () => (id ? documentsConducteursApi.locate(id, limit) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useCreateDocumentConducteurMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (data: CreateDocumentConducteurInput) => documentsConducteursApi.create(data),
    onSuccess: (data) => {
      notify.success(`Document « ${data.typeDocument} » ajouté avec succès`);
      queryClient.invalidateQueries({ queryKey: documentConducteurKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateDocumentConducteurMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentConducteurInput }) =>
      documentsConducteursApi.update(id, data),
    onSuccess: (data) => {
      notify.success(`Document #${data.id} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: documentConducteurKeys.all(companyId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteDocumentConducteurMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => documentsConducteursApi.remove(id),
    onSuccess: (_, deletedId) => {
      notify.success('Document supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: documentConducteurKeys.all(companyId) });
      queryClient.removeQueries({ queryKey: documentConducteurKeys.detail(companyId, deletedId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUploadDocumentConducteurFileMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      documentsConducteursApi.uploadFile(id, file),
    onSuccess: () => {
      notify.success('Fichier joint avec succès');
      queryClient.invalidateQueries({ queryKey: documentConducteurKeys.all(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi du fichier';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteDocumentConducteurFileMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => documentsConducteursApi.deleteFile(id),
    onSuccess: () => {
      notify.success('Fichier supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: documentConducteurKeys.all(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du fichier';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
