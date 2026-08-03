export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

export type ConsommationGasoilStatus = 'STOCK_INITIAL' | 'CALCULE' | 'NON_CALCULABLE';

export interface BonCarburant {
  idBon: number;
  numeroBon: string | null;
  dateCarburant: string;
  immatriculation: string;
  vehicule?: CompactVehiculeSummary | null;
  driverName: string | null;
  nomConducteur?: string | null; // fallback alias
  nomStation: string | null;
  kilometrage: number | null;
  litres: string | number;
  prixParLitre: string | number;
  montantTotal: string | number;
  distance: number | null;
  consommationL100: string | null;
  coutKm: string | null;
  status: ConsommationGasoilStatus;
}

export interface BonCarburantStats {
  litresTotal: string;
  consommationMoyenneL100: string | null;
  coutTotal: string;
  coutMoyenKm: string | null;
  distanceTotale: number;
  calculableRecords: number;
  totalRecords: number;
}

export interface CreateBonCarburantPayload {
  numeroBon: string;
  immatriculation: string;
  nomConducteur?: string;
  nomStation?: string;
  kilometrage?: number;
  litres: number;
  prixParLitre: number;
  dateCarburant?: string;
}

export type UpdateBonCarburantPayload = Partial<CreateBonCarburantPayload>;

export interface BonCarburantQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  immatriculation?: string;
  nomConducteur?: string;
  nomStation?: string;
  preset?: 'AUJOURDHUI' | 'CE_MOIS' | 'CE_TRIMESTRE' | 'CETTE_ANNEE' | 'PERSONNALISE';
  dateFrom?: string;
  dateTo?: string;
  statut?: ConsommationGasoilStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
