export interface PaiementFournisseurGlobalView {
  id: number;
  numeroPaiement: string;
  idDetteFournisseur: number;
  numeroDette: string;
  referenceFactureFournisseur: string | null;
  idFournisseur: number;
  nomFournisseurSnapshot: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  referenceExterne: string | null;
  notes: string | null;
  estAnnule: boolean;
  dateAnnulation: string | null;
  motifAnnulation: string | null;
  annuleParId: number | null;
  creeParId: number | null;
  creeLe: string;
}

export interface PaiementFournisseurStats {
  totalPayePeriod: number;
  paymentsCount: number;
  activeMethodsCount: number;
  cancelledCount: number;
}

export interface CreatePaiementFournisseurPayload {
  montant: number;
  modePaiement: string;
  datePaiement?: string;
  referenceExterne?: string;
  notes?: string;
}

export interface CancelPaiementFournisseurPayload {
  motifAnnulation: string;
}

export interface QueryPaiementFournisseurDto {
  search?: string;
  idFournisseur?: number;
  idDetteFournisseur?: number;
  modePaiement?: string;
  estAnnule?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
