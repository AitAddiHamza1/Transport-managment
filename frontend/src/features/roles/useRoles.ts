import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from './rolesApi';
import type { RolePayload, RolesQueryParams } from './types';
import { notify } from '../../utils/notify';
import { getApiErrorMessage } from '../../lib/axios';

const ROLES_KEY = 'roles';

export function useRolesQuery(params: RolesQueryParams) {
  return useQuery({
    queryKey: [ROLES_KEY, params],
    queryFn: () => rolesApi.list(params),
    placeholderData: (prev) => prev, // conserve l'affichage pendant la pagination
  });
}

/** Liste complète des rôles (pour les listes déroulantes de formulaires). */
export function useRoleOptions() {
  return useQuery({
    queryKey: [ROLES_KEY, 'options'],
    queryFn: () => rolesApi.list({ page: 1, limit: 100, sortBy: 'nom', sortOrder: 'asc' }),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RolePayload) => rolesApi.create(payload),
    onSuccess: () => {
      notify.success('Rôle créé avec succès.');
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Création impossible')),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RolePayload }) =>
      rolesApi.update(id, payload),
    onSuccess: () => {
      notify.success('Rôle modifié avec succès.');
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Modification impossible')),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rolesApi.remove(id),
    onSuccess: () => {
      notify.success('Rôle supprimé.');
      qc.invalidateQueries({ queryKey: [ROLES_KEY] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Suppression impossible')),
  });
}

