import type { PermissionsMatrix } from '../../constants/permissions';

export type UserStatut = 'ACTIF' | 'INACTIF' | 'SUSPENDU';

export interface UserRoleRef {
  id: number;
  nom: string;
}

export interface User {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  statut: UserStatut;
  permissions: PermissionsMatrix | null;
  derniereConnexion: string | null;
  creeLe: string;
  idRole: number;
  role: UserRoleRef;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUsers {
  data: User[];
  meta: PaginationMeta;
}

export interface UsersQueryParams {
  page: number;
  limit: number;
  search?: string;
  statut?: UserStatut;
  idRole?: number;
  sortBy?: 'id' | 'nom' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  nom: string;
  email: string;
  telephone?: string;
  motDePasse: string;
  idRole: number;
  statut?: UserStatut;
  permissions?: PermissionsMatrix;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export interface UsersStats {
  total: number;
  actifs: number;
  inactifs: number;
  suspendus: number;
  parProfil: { profil: string; count: number }[];
}
