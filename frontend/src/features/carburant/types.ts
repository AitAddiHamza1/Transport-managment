export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface BonCarburant {
  idBon: number;
  immatriculation: string;
  nomConducteur: string | null;
  nomStation: string | null;
  litres: number;
  prixParLitre: number;
  montantTotal: number;
  dateCarburant: string;
  vehicule?: CompactVehiculeSummary | null;
}

export interface BonCarburantStats {
  totalCount: number;
  totalLitres: number;
  totalMontant: number;
  prixMoyenLitre: number;
}

export interface CreateBonCarburantPayload {
  immatriculation: string;
  nomConducteur?: string;
  nomStation?: string;
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
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
