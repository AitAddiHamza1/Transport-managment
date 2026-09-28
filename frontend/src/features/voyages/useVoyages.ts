import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { notify } from '../../utils/notify';
import { dashboardKeys } from '../dashboard/dashboardKeys';
import {
  CreateVoyagePayload,
  UpdateVoyagePayload,
  UpdateVoyageStatusPayload,
  VoyagesQueryParams,
} from './types';
import { voyagesApi } from './voyagesApi';

/**
 * Clés de requête stables pour le domaine Voyages.
 */
export const voyageKeys = {
  all: (companyId?: number) => ['voyages', companyId] as const,
  lists: (companyId?: number) => [...voyageKeys.all(companyId), 'list'] as const,
  list: (companyId?: number, params?: VoyagesQueryParams) => [...voyageKeys.lists(companyId), params] as const,
  details: (companyId?: number) => [...voyageKeys.all(companyId), 'detail'] as const,
  detail: (companyId?: number, id?: number | null) => [...voyageKeys.details(companyId), id] as const,
  stats: (companyId?: number) => [...voyageKeys.all(companyId), 'stats'] as const,
  documents: (companyId?: number, id?: number | null) => [...voyageKeys.all(companyId), 'documents', id] as const,
  frais: (companyId?: number, id?: number | null) => [...voyageKeys.all(companyId), 'frais', id] as const,
};

export function useVoyageStats() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: voyageKeys.stats(companyId),
    queryFn: () => voyagesApi.getStats(),
    enabled: Boolean(companyId),
  });
}

export function useVoyagesQuery(params?: VoyagesQueryParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: voyageKeys.list(companyId, params),
    queryFn: () => voyagesApi.getAll(params),
    enabled: Boolean(companyId),
    placeholderData: keepPreviousData,
  });
}

export function useVoyageQuery(id: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: voyageKeys.detail(companyId, id),
    queryFn: () => (id ? voyagesApi.getById(id) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useLocateVoyage(id: number | null, limit: number = 10) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: [...voyageKeys.all(companyId), 'locate', id, limit],
    queryFn: () => (id ? voyagesApi.locate(id, limit) : null),
    enabled: Boolean(companyId && id !== null && id > 0),
  });
}

export function useCreateVoyage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: async (
      payload: CreateVoyagePayload & {
        files?: File[];
        fraisImmobilisation?: { prixParJour: number; nombreJoursRetard: number };
      },
    ) => {
      const { files, fraisImmobilisation, ...dto } = payload;
      const voyage = await voyagesApi.create(dto);

      if (
        fraisImmobilisation &&
        (fraisImmobilisation.prixParJour > 0 || fraisImmobilisation.nombreJoursRetard > 0)
      ) {
        try {
          await voyagesApi.createFraisImmobilisation(voyage.idVoyage, fraisImmobilisation);
        } catch (fraisErr: any) {
          const msg = fraisErr.response?.data?.message || 'Erreur lors de l\'ajout des frais d\'immobilisation';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }

      if (files && files.length > 0) {
        try {
          await voyagesApi.uploadDocuments(voyage.idVoyage, files);
        } catch (docErr: any) {
          const msg = docErr.response?.data?.message || 'Erreur lors de l\'envoi des documents';
          notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }

      return voyage;
    },
    onSuccess: (data) => {
      notify.success(`Voyage #${data.idVoyage} (${data.lieuChargement} → ${data.lieuDechargement}) créé avec succès`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(companyId, data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(companyId, data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicules', companyId] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all(companyId) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyagePayload }) =>
      voyagesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Voyage #${data.idVoyage} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures', companyId] });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicules', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyageStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyageStatusPayload }) =>
      voyagesApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du voyage #${data.idVoyage} mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicules', companyId] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de statut du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (id: number) => voyagesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Voyage supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats(companyId) });
      queryClient.removeQueries({ queryKey: voyageKeys.detail(companyId, deletedId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicules', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// --- HOOKS DOCUMENTS DE VOYAGE ---
export function useVoyageDocumentsQuery(idVoyage: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: voyageKeys.documents(companyId, idVoyage),
    queryFn: () => (idVoyage ? voyagesApi.getDocuments(idVoyage) : []),
    enabled: Boolean(companyId && idVoyage !== null && idVoyage > 0),
  });
}

export function useUploadVoyageDocuments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ idVoyage, files }: { idVoyage: number; files: File[] }) =>
      voyagesApi.uploadDocuments(idVoyage, files),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Document(s) de voyage ajouté(s) avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, idVoyage) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi des documents';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyageDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({ docId, idVoyage }: { docId: number; idVoyage: number }) =>
      voyagesApi.deleteDocument(idVoyage, docId),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Document supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, idVoyage) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// --- HOOKS FRAIS D'IMMOBILISATION ---
export function useVoyageFraisQuery(idVoyage: number | null) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: voyageKeys.frais(companyId, idVoyage),
    queryFn: () => (idVoyage ? voyagesApi.getFraisImmobilisation(idVoyage) : null),
    enabled: Boolean(companyId && idVoyage !== null && idVoyage > 0),
  });
}

export function useCreateVoyageFrais() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({
      idVoyage,
      data,
    }: {
      idVoyage: number;
      data: { prixParJour: number; nombreJoursRetard: number };
    }) => voyagesApi.createFraisImmobilisation(idVoyage, data),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Frais d\'immobilisation ajoutés avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures', companyId] });
      queryClient.invalidateQueries({ queryKey: ['creances', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyageFrais() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: ({
      idVoyage,
      data,
    }: {
      idVoyage: number;
      data: { prixParJour?: number; nombreJoursRetard?: number };
    }) => voyagesApi.updateFraisImmobilisation(idVoyage, data),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Frais d\'immobilisation mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures', companyId] });
      queryClient.invalidateQueries({ queryKey: ['creances', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyageFrais() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useMutation({
    mutationFn: (idVoyage: number) => voyagesApi.deleteFraisImmobilisation(idVoyage),
    onSuccess: (_, idVoyage) => {
      notify.success('Frais d\'immobilisation supprimés avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(companyId, idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures', companyId] });
      queryClient.invalidateQueries({ queryKey: ['creances', companyId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
