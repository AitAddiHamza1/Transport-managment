import type { PermissionsMatrix } from '../../constants/permissions';

export interface AuthUser {
  id: number;
  nom: string;
  email: string;
  role: string;
  isAdminGeneral: boolean;
  mustChangePassword?: boolean;
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
    mustChangePassword?: boolean;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
