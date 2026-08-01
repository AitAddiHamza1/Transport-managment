export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface ChargeVehicule {
  idDepense: number;
  categorieDepense: string;
  typeFacture: string | null;
  immatriculation: string;
  description: string | null;
  fichierRecu: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptDownloadUrl: string | null;
  montant: number;
  dateDepense: string;
  vehicule?: CompactVehiculeSummary | null;
}

export interface ChargeVehiculeStats {
  totalCount: number;
  totalMontant: number;
  entretienMontant: number;
  reparationsMontant: number;
  carburantMontant: number;
  autresMontant: number;
}

export interface CreateChargeVehiculePayload {
  categorieDepense: string;
  typeFacture?: string | null;
  immatriculation: string;
  description?: string | null;
  fichierRecu?: string | null;
  montant: number;
  dateDepense?: string;
}

export interface UpdateChargeVehiculePayload {
  categorieDepense?: string;
  typeFacture?: string | null;
  immatriculation?: string;
  description?: string | null;
  fichierRecu?: string | null;
  montant?: number;
  dateDepense?: string;
}

export interface ChargesVehiculesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categorieDepense?: string;
  immatriculation?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
