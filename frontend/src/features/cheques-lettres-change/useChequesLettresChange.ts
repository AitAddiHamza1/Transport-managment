import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chequesLettresChangeApi } from './chequesLettresChangeApi';
import { QueryChequesLettresChangeParams, UpdateStatutPayload } from './types';

export const chequesLettresChangeKeys = {
  all: ['cheques-lettres-change'] as const,
  lists: () => [...chequesLettresChangeKeys.all, 'list'] as const,
  list: (params: QueryChequesLettresChangeParams) =>
    [...chequesLettresChangeKeys.lists(), params] as const,
  stats: (params?: QueryChequesLettresChangeParams) =>
    [...chequesLettresChangeKeys.all, 'stats', params || {}] as const,
};

export function useChequesLettresChangeQuery(params: QueryChequesLettresChangeParams) {
  return useQuery({
    queryKey: chequesLettresChangeKeys.list(params),
    queryFn: () => chequesLettresChangeApi.getAll(params),
  });
}

export function useChequesLettresChangeStatsQuery(params?: QueryChequesLettresChangeParams) {
  return useQuery({
    queryKey: chequesLettresChangeKeys.stats(params),
    queryFn: () => chequesLettresChangeApi.getStats(params),
  });
}

export function useUpdateStatutChequeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateStatutPayload }) =>
      chequesLettresChangeApi.updateStatutCheque(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequesLettresChangeKeys.all });
    },
  });
}

export function useUpdateStatutLettreMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateStatutPayload }) =>
      chequesLettresChangeApi.updateStatutLettre(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chequesLettresChangeKeys.all });
    },
  });
}
