export interface Role {
  id: number;
  nom: string;
  description: string | null;
  userCount: number;
  isSystem: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRoles {
  data: Role[];
  meta: PaginationMeta;
}

export interface RolesQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: 'id' | 'nom';
  sortOrder?: 'asc' | 'desc';
}

export interface RolePayload {
  nom: string;
  description?: string;
}
