import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsVehiculesApi } from './documentsVehiculesApi';
import type {
  CreateDocumentVehiculeInput,
  QueryDocumentVehiculeParams,
  UpdateDocumentVehiculeInput,
} from './types';

export const DOCUMENTS_VEHICULES_QUERY_KEY = ['documents-vehicules'];
export const DOCUMENTS_VEHICULES_STATS_QUERY_KEY = ['documents-vehicules', 'stats'];

export function useDocumentsVehiculesQuery(params?: QueryDocumentVehiculeParams) {
  return useQuery({
    queryKey: [...DOCUMENTS_VEHICULES_QUERY_KEY, params],
    queryFn: () => documentsVehiculesApi.getAll(params),
  });
}

export function useDocumentVehiculeStatsQuery() {
  return useQuery({
    queryKey: DOCUMENTS_VEHICULES_STATS_QUERY_KEY,
    queryFn: () => documentsVehiculesApi.getStats(),
  });
}

export function useDocumentVehiculeDetailQuery(id: number | null) {
  return useQuery({
    queryKey: [...DOCUMENTS_VEHICULES_QUERY_KEY, id],
    queryFn: () => (id ? documentsVehiculesApi.getById(id) : null),
    enabled: !!id,
  });
}

export function useCreateDocumentVehiculeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentVehiculeInput) => documentsVehiculesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_VEHICULES_QUERY_KEY });
    },
  });
}

export function useUpdateDocumentVehiculeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentVehiculeInput }) =>
      documentsVehiculesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_VEHICULES_QUERY_KEY });
    },
  });
}

export function useDeleteDocumentVehiculeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentsVehiculesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_VEHICULES_QUERY_KEY });
    },
  });
}

export function useUploadDocumentFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      documentsVehiculesApi.uploadFile(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_VEHICULES_QUERY_KEY });
    },
  });
}

export function useDeleteDocumentFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentsVehiculesApi.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_VEHICULES_QUERY_KEY });
    },
  });
}
