import { api } from '../../lib/axios';
import type { AuthTokens, AuthUser, LoginPayload, RegisterPayload } from './types';

/** Appels HTTP du domaine authentification. */
export const authApi = {
  async register(payload: RegisterPayload): Promise<void> {
    await api.post('/auth/register', payload);
  },

  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/login', payload);
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<{ id: number; nom: string; email: string; role: { nom: string } }>(
      '/auth/me',
    );
    return { id: data.id, nom: data.nom, email: data.email, role: data.role.nom };
  },
};
