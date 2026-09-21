export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export type JustificatifType = 'AVEC_FACTURE' | 'SANS_FACTURE';

export interface MaintenanceInterventionInfo {
  id: number;
  libelle: string;
  kilometrageRealise: number;
  prochainKmEcheance: number;
  notes?: string | null;
  intervalleKm?: number;
}

export interface ChargeVehicule {
  idDepense: number;
  categorieDepense: string;
  justificatifType: JustificatifType;
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
  maintenanceIntervention?: MaintenanceInterventionInfo | null;
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
  justificatifType?: JustificatifType;
  typeFacture?: string | null;
  immatriculation: string;
  description?: string | null;
  fichierRecu?: string | null;
  montant: number;
  dateDepense?: string;
  isMaintenanceIntervention?: boolean;
  libelleIntervention?: string;
  kilometrageRealise?: number;
  intervalleKm?: number;
  notesIntervention?: string;
}

export interface UpdateChargeVehiculePayload {
  categorieDepense?: string;
  justificatifType?: JustificatifType;
  typeFacture?: string | null;
  immatriculation?: string;
  description?: string | null;
  fichierRecu?: string | null;
  montant?: number;
  dateDepense?: string;
  isMaintenanceIntervention?: boolean;
  libelleIntervention?: string;
  kilometrageRealise?: number;
  intervalleKm?: number;
  notesIntervention?: string;
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
