import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  all: ['voyages'] as const,
  lists: () => [...voyageKeys.all, 'list'] as const,
  list: (params?: VoyagesQueryParams) => [...voyageKeys.lists(), params] as const,
  details: () => [...voyageKeys.all, 'detail'] as const,
  detail: (id: number | null) => [...voyageKeys.details(), id] as const,
  stats: () => [...voyageKeys.all, 'stats'] as const,
  documents: (id: number | null) => [...voyageKeys.all, 'documents', id] as const,
  frais: (id: number | null) => [...voyageKeys.all, 'frais', id] as const,
};

export function useVoyageStats() {
  return useQuery({
    queryKey: voyageKeys.stats(),
    queryFn: () => voyagesApi.getStats(),
  });
}

export function useVoyagesQuery(params?: VoyagesQueryParams) {
  return useQuery({
    queryKey: voyageKeys.list(params),
    queryFn: () => voyagesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useVoyageQuery(id: number | null) {
  return useQuery({
    queryKey: voyageKeys.detail(id),
    queryFn: () => (id ? voyagesApi.getById(id) : null),
    enabled: id !== null && id > 0,
  });
}

export function useCreateVoyage() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyagePayload }) =>
      voyagesApi.update(id, payload),
    onSuccess: (data) => {
      notify.success(`Voyage #${data.idVoyage} mis à jour avec succès`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVoyageStatusPayload }) =>
      voyagesApi.updateStatus(id, payload),
    onSuccess: (data) => {
      notify.success(`Statut du voyage #${data.idVoyage} mis à jour : ${data.statut}`);
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(data.idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
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

  return useMutation({
    mutationFn: (id: number) => voyagesApi.delete(id),
    onSuccess: (_, deletedId) => {
      notify.success('Voyage supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voyageKeys.stats() });
      queryClient.removeQueries({ queryKey: voyageKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['conducteurs'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du voyage';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// --- HOOKS DOCUMENTS DE VOYAGE ---
export function useVoyageDocumentsQuery(idVoyage: number | null) {
  return useQuery({
    queryKey: voyageKeys.documents(idVoyage),
    queryFn: () => (idVoyage ? voyagesApi.getDocuments(idVoyage) : []),
    enabled: idVoyage !== null && idVoyage > 0,
  });
}

export function useUploadVoyageDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idVoyage, files }: { idVoyage: number; files: File[] }) =>
      voyagesApi.uploadDocuments(idVoyage, files),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Document(s) de voyage ajouté(s) avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(idVoyage) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'envoi des documents';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyageDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docId, idVoyage }: { docId: number; idVoyage: number }) =>
      voyagesApi.deleteDocument(idVoyage, docId),
    onSuccess: (_, { idVoyage }) => {
      notify.success('Document supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.documents(idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(idVoyage) });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression du document';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

// --- HOOKS FRAIS D'IMMOBILISATION ---
export function useVoyageFraisQuery(idVoyage: number | null) {
  return useQuery({
    queryKey: voyageKeys.frais(idVoyage),
    queryFn: () => (idVoyage ? voyagesApi.getFraisImmobilisation(idVoyage) : null),
    enabled: idVoyage !== null && idVoyage > 0,
  });
}

export function useCreateVoyageFrais() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['creances'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la création des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useUpdateVoyageFrais() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['creances'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}

export function useDeleteVoyageFrais() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idVoyage: number) => voyagesApi.deleteFraisImmobilisation(idVoyage),
    onSuccess: (_, idVoyage) => {
      notify.success('Frais d\'immobilisation supprimés avec succès');
      queryClient.invalidateQueries({ queryKey: voyageKeys.frais(idVoyage) });
      queryClient.invalidateQueries({ queryKey: voyageKeys.detail(idVoyage) });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['creances'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression des frais';
      notify.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });
}
