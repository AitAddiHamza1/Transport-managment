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
  idEmploye: number | null;
  employe: {
    id: number;
    matricule: string;
    nom: string;
    prenom: string;
    nomComplet: string;
    telephone: string | null;
    adresse: string | null;
    statut: string;
    poste: string;
    salaireBase: number | null;
  } | null;
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
  idEmploye?: number | null;
}

export interface UpdateConducteurPayload {
  nomConducteur?: string;
  telephone?: string | null;
  adresse?: string | null;
  statut?: ConducteurStatut;
  idEmploye?: number | null;
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
