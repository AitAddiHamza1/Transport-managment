import type { ChequeView } from '../cheques/types';

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
  cheque?: ChequeView | null;
  lettreDeChange?: {
    id: number;
    numero: string;
    dateEcheance: string;
    montant: number;
    beneficiaire: string;
    cause: string;
    tireNom: string;
    tireAdresse: string;
  } | null;
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
  chequeNumero?: string;
  chequeSerie?: string;
  chequeDateCheque?: string;
  chequeBanque?: string;
  chequeAgence?: string;
  chequeBeneficiaire?: string;
  chequeVille?: string;
  lettreNumero?: string;
  lettreDateEcheance?: string;
  lettreMontant?: number;
  lettreBeneficiaire?: string;
  lettreCause?: string;
  lettreTireNom?: string;
  lettreTireAdresse?: string;
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

