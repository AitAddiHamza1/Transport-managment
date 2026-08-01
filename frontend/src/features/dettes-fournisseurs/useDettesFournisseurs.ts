import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dettesFournisseursApi } from './dettesFournisseursApi';
import type {
  CreateDetteFournisseurPayload,
  QueryDetteFournisseurDto,
  UpdateDetteFournisseurPayload,
} from './types';

export const DETTES_FOURNISSEURS_QUERY_KEY = 'dettes-fournisseurs';
export const DETTES_STATS_QUERY_KEY = 'dettes-fournisseurs-stats';

export function useDettesFournisseursQuery(params?: QueryDetteFournisseurDto) {
  return useQuery({
    queryKey: [DETTES_FOURNISSEURS_QUERY_KEY, params],
    queryFn: () => dettesFournisseursApi.getDettes(params),
  });
}

export function useDetteFournisseurStatsQuery(params?: QueryDetteFournisseurDto) {
  return useQuery({
    queryKey: [DETTES_STATS_QUERY_KEY, params],
    queryFn: () => dettesFournisseursApi.getStats(params),
  });
}

export function useDetteFournisseurQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: [DETTES_FOURNISSEURS_QUERY_KEY, id],
    queryFn: () => dettesFournisseursApi.getDette(id),
    enabled: enabled && !!id,
  });
}

export function useCreateDetteFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDetteFournisseurPayload) =>
      dettesFournisseursApi.createDette(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_STATS_QUERY_KEY] });
    },
  });
}

export function useUpdateDetteFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDetteFournisseurPayload }) =>
      dettesFournisseursApi.updateDette(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_STATS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY, variables.id] });
    },
  });
}

export function useDeleteDetteFournisseur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dettesFournisseursApi.deleteDette(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DETTES_FOURNISSEURS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DETTES_STATS_QUERY_KEY] });
    },
  });
}
