import { api } from '../../lib/axios';
import type { PermissionsMatrix } from '../../constants/permissions';
import type { AuthTokens, AuthUser, LoginPayload, ChangePasswordPayload } from './types';

interface MeResponse {
  id: number;
  nom: string;
  email: string;
  role: string;
  isAdminGeneral: boolean;
  mustChangePassword?: boolean;
  permissions: PermissionsMatrix;
}

/** Appels HTTP du domaine authentification. */
export const authApi = {
  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/login', payload);
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<MeResponse>('/auth/me');
    return {
      id: data.id,
      nom: data.nom,
      email: data.email,
      role: data.role,
      isAdminGeneral: data.isAdminGeneral,
      mustChangePassword: Boolean(data.mustChangePassword),
      permissions: data.permissions,
    };
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/change-password', payload);
    return data;
  },
};
