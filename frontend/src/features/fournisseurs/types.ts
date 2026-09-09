export type FournisseurStatut = 'ACTIF' | 'INACTIF' | 'BLOQUE';

export interface Fournisseur {
  id: number;
  nomFournisseur: string;
  ice: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  statut: FournisseurStatut;
  creeLe: string;
}

export interface FournisseurStats {
  total: number;
  actifs: number;
  inactifs: number;
  bloques: number;
}

export interface CreateFournisseurPayload {
  nomFournisseur: string;
  ice?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  statut?: FournisseurStatut;
}

export interface UpdateFournisseurPayload {
  nomFournisseur?: string;
  ice?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  statut?: FournisseurStatut;
}

export interface UpdateFournisseurStatusPayload {
  statut: FournisseurStatut;
}

export interface FournisseursQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: FournisseurStatut;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
