import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chargesAdministrativesApi } from './chargesAdministrativesApi';
import {
  CreateChargeAdministrativePayload,
  ChargesAdministrativesQueryParams,
  UpdateChargeAdministrativePayload,
} from './types';

export const administrativeExpenseKeys = {
  all: ['depenses-administratives'] as const,
  lists: () => [...administrativeExpenseKeys.all, 'list'] as const,
  list: (params: ChargesAdministrativesQueryParams) =>
    [...administrativeExpenseKeys.lists(), params] as const,
  details: () => [...administrativeExpenseKeys.all, 'detail'] as const,
  detail: (id: number) => [...administrativeExpenseKeys.details(), id] as const,
  stats: (params?: ChargesAdministrativesQueryParams) =>
    [...administrativeExpenseKeys.all, 'stats', params || {}] as const,
};

export function useChargesAdministrativesQuery(params: ChargesAdministrativesQueryParams) {
  return useQuery({
    queryKey: administrativeExpenseKeys.list(params),
    queryFn: () => chargesAdministrativesApi.getAll(params),
  });
}

export function useChargeAdministrativeStatsQuery(params?: ChargesAdministrativesQueryParams) {
  return useQuery({
    queryKey: administrativeExpenseKeys.stats(params),
    queryFn: () => chargesAdministrativesApi.getStats(params),
  });
}

export function useChargeAdministrativeDetailQuery(id: number | null) {
  return useQuery({
    queryKey: administrativeExpenseKeys.detail(id!),
    queryFn: () => chargesAdministrativesApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateChargeAdministrativeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChargeAdministrativePayload) =>
      chargesAdministrativesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['gestion-paiements'] });
    },
  });
}

export function useUpdateChargeAdministrativeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateChargeAdministrativePayload }) =>
      chargesAdministrativesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['gestion-paiements'] });
    },
  });
}

export function useUploadReceiptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      chargesAdministrativesApi.uploadReceipt(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.stats() });
    },
  });
}

export function useDeleteReceiptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => chargesAdministrativesApi.deleteReceipt(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.stats() });
    },
  });
}

export function useDeleteChargeAdministrativeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => chargesAdministrativesApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: administrativeExpenseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: administrativeExpenseKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['gestion-paiements'] });
    },
  });
}
