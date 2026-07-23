export type VoyageType = 'NATIONAL' | 'INTERNATIONAL' | 'IMPORT' | 'EXPORT';

export type VoyageStatut = 'PLANIFIE' | 'EN_COURS' | 'LIVRE' | 'ANNULE' | 'FACTURE';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface Voyage {
  idVoyage: number;
  typeVoyage: VoyageType;
  tracteur: string | null;
  remorque: string | null;
  nomConducteur: string | null;
  nomClient: string | null;
  lieuChargement: string;
  lieuDechargement: string;
  dateChargement: string | null;
  numeroCmr: string | null;
  statut: VoyageStatut;
  montantVoyage: number;
  tracteurVehicule?: CompactVehiculeSummary | null;
  remorqueVehicule?: CompactVehiculeSummary | null;
}

export interface VoyageStats {
  total: number;
  planifies: number;
  enCours: number;
  livres: number;
  annules: number;
  factures: number;
}

export interface CreateVoyagePayload {
  typeVoyage?: VoyageType;
  tracteur?: string | null;
  remorque?: string | null;
  nomConducteur?: string | null;
  nomClient?: string | null;
  lieuChargement: string;
  lieuDechargement: string;
  dateChargement?: string | null;
  numeroCmr?: string | null;
  statut?: VoyageStatut;
  montantVoyage?: number;
}

export interface UpdateVoyagePayload {
  typeVoyage?: VoyageType;
  tracteur?: string | null;
  remorque?: string | null;
  nomConducteur?: string | null;
  nomClient?: string | null;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateChargement?: string | null;
  numeroCmr?: string | null;
  statut?: VoyageStatut;
  montantVoyage?: number;
}

export interface UpdateVoyageStatusPayload {
  statut: VoyageStatut;
}

export interface VoyagesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: VoyageStatut;
  typeVoyage?: VoyageType;
  nomClient?: string;
  tracteur?: string;
  nomConducteur?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
