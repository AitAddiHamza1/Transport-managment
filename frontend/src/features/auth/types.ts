import type { PermissionsMatrix } from '../../constants/permissions';

export interface AuthUser {
  id: number;
  nom: string;
  email: string;
  role: string;
  isAdminGeneral: boolean;
  permissions: PermissionsMatrix;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    nom: string;
    email: string;
    role: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
