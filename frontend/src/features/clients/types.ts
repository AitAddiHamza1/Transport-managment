export type ClientStatut = 'ACTIF' | 'INACTIF' | 'BLOQUE';

export interface Client {
  id: number;
  nomEntreprise: string;
  ice: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  delaiPaiementJours: number;
  limiteCredit: number;
  statut: ClientStatut;
}

export interface ClientStats {
  total: number;
  actifs: number;
  inactifs: number;
  bloques: number;
}

export interface CreateClientPayload {
  nomEntreprise: string;
  ice?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  delaiPaiementJours?: number;
  limiteCredit?: number;
  statut?: ClientStatut;
}

export interface UpdateClientPayload {
  nomEntreprise?: string;
  ice?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  delaiPaiementJours?: number;
  limiteCredit?: number;
  statut?: ClientStatut;
}

export interface UpdateClientStatusPayload {
  statut: ClientStatut;
}

export interface ClientsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: ClientStatut;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
