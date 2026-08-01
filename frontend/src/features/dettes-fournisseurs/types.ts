export type StatutPaiementCalculated = 'EN_ATTENTE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE';

export interface PaiementItemView {
  id: number;
  numeroPaiement: string;
  idDetteFournisseur: number;
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

export interface DetteFournisseurView {
  id: number;
  numeroDette: string;
  referenceFactureFournisseur: string | null;
  idFournisseur: number;
  nomFournisseurSnapshot: string;
  categorie: string | null;
  dateDette: string;
  delaiPaiementJours: number;
  dateEcheance: string;
  montantDu: number;
  montantPaye: number;
  soldeRestant: number;
  statutPaiement: StatutPaiementCalculated;
  estEnRetard: boolean;
  joursRetard: number;
  remarques: string | null;
  creeParId: number | null;
  creeLe: string;
  misAJourLe: string;
  paiementsCount: number;
  paiements?: PaiementItemView[];
}

export interface DetteFournisseurStats {
  totalDu: number;
  totalPaye: number;
  soldeRestant: number;
  dettesEnAttenteCount: number;
  dettesPartiellesCount: number;
  dettesSoldeesCount: number;
  dettesEnRetardCount: number;
}

export interface CreateInitialPaiementPayload {
  montant: number;
  modePaiement: string;
  datePaiement?: string;
  referenceExterne?: string;
  notes?: string;
}

export interface CreateDetteFournisseurPayload {
  idFournisseur: number;
  referenceFactureFournisseur?: string;
  dateDette?: string;
  delaiPaiementJours?: number;
  dateEcheance?: string;
  montantDu: number;
  categorie?: string;
  remarques?: string;
  initialPaiement?: CreateInitialPaiementPayload;
}

export interface UpdateDetteFournisseurPayload {
  idFournisseur?: number;
  referenceFactureFournisseur?: string;
  dateDette?: string;
  delaiPaiementJours?: number;
  dateEcheance?: string;
  montantDu?: number;
  categorie?: string;
  remarques?: string;
}

export interface QueryDetteFournisseurDto {
  search?: string;
  idFournisseur?: number;
  statutPaiement?: StatutPaiementCalculated;
  estEnRetard?: boolean;
  startDate?: string;
  endDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
