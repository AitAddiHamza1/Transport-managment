import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './usersApi';
import type { CreateUserPayload, UpdateUserPayload, UsersQueryParams } from './types';
import { notify } from '../../utils/notify';
import { getApiErrorMessage } from '../../lib/axios';

const USERS_KEY = 'users';

export function useUsersQuery(params: UsersQueryParams) {
  return useQuery({
    queryKey: [USERS_KEY, 'list', params],
    queryFn: () => usersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: [USERS_KEY, 'stats'],
    queryFn: () => usersApi.stats(),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [USERS_KEY] });
  qc.invalidateQueries({ queryKey: ['roles'] });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      notify.success('Utilisateur créé avec succès.');
      invalidate(qc);
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Création impossible')),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      notify.success('Utilisateur modifié avec succès.');
      invalidate(qc);
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Modification impossible')),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      notify.success('Utilisateur supprimé.');
      invalidate(qc);
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Suppression impossible')),
  });
}
