import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employesApi } from './employesApi';
import { CreateEmployeFormData, EmployesQueryParams, UpdateEmployeFormData } from './types';

export const EMPLOYES_QUERY_KEY = ['employes'];
export const EMPLOYE_STATS_QUERY_KEY = ['employes', 'stats'];
export const EMPLOYE_DETAILS_QUERY_KEY = (id: number) => ['employes', id];
export const EMPLOYE_DOCUMENTS_QUERY_KEY = (id: number) => ['employes', id, 'documents'];

export function useEmployesQuery(params: EmployesQueryParams) {
  return useQuery({
    queryKey: [...EMPLOYES_QUERY_KEY, params],
    queryFn: () => employesApi.getEmployes(params),
  });
}

export function useEmployeStats() {
  return useQuery({
    queryKey: EMPLOYE_STATS_QUERY_KEY,
    queryFn: () => employesApi.getEmployeStats(),
  });
}

export function useEmployeQuery(id: number | null) {
  return useQuery({
    queryKey: EMPLOYE_DETAILS_QUERY_KEY(id!),
    queryFn: () => employesApi.getEmploye(id!),
    enabled: Boolean(id),
  });
}

export function useEmployeDocumentsQuery(id: number | null) {
  return useQuery({
    queryKey: EMPLOYE_DOCUMENTS_QUERY_KEY(id!),
    queryFn: () => employesApi.getEmployeDocuments(id!),
    enabled: Boolean(id),
  });
}

export function useCreateEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeFormData) => employesApi.createEmploye(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_STATS_QUERY_KEY });
    },
  });
}

export function useUpdateEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEmployeFormData }) =>
      employesApi.updateEmploye(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_DETAILS_QUERY_KEY(variables.id) });
    },
  });
}

export function useDeleteEmploye() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employesApi.deleteEmploye(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_STATS_QUERY_KEY });
    },
  });
}

export function useUploadEmployePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      employesApi.uploadEmployePhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_DETAILS_QUERY_KEY(variables.id) });
    },
  });
}

export function useDeleteEmployePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employesApi.deleteEmployePhoto(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYE_DETAILS_QUERY_KEY(id) });
    },
  });
}

export function useUploadEmployeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { typeDocument: string; numeroDocument?: string; dateEmission?: string; dateExpiration?: string; notes?: string; file: File };
    }) => employesApi.uploadEmployeDocument(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYE_DOCUMENTS_QUERY_KEY(variables.id) });
    },
  });
}

export function useDeleteEmployeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId }: { id: number; docId: number }) =>
      employesApi.deleteEmployeDocument(id, docId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMPLOYE_DOCUMENTS_QUERY_KEY(variables.id) });
    },
  });
}
