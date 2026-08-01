export type ConducteurStatut = 'DISPONIBLE' | 'EN_VOYAGE' | 'INDISPONIBLE' | 'INACTIF';

export interface ConducteurDocumentSummary {
  id: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateExpiration: string | null;
  statut: string;
}

export interface Conducteur {
  id: number;
  nomConducteur: string;
  telephone: string | null;
  adresse: string | null;
  statut: ConducteurStatut;
  creeLe: string;
  documents?: ConducteurDocumentSummary[];
}

export interface ConducteurStats {
  total: number;
  disponibles: number;
  enVoyage: number;
  indisponibles: number;
  inactifs: number;
}

export interface CreateConducteurPayload {
  nomConducteur: string;
  telephone?: string | null;
  adresse?: string | null;
  statut?: ConducteurStatut;
}

export interface UpdateConducteurPayload {
  nomConducteur?: string;
  telephone?: string | null;
  adresse?: string | null;
  statut?: ConducteurStatut;
}

export interface UpdateConducteurStatusPayload {
  statut: ConducteurStatut;
}

export interface ConducteursQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: ConducteurStatut;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
