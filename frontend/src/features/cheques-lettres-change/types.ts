export type StatutInstrumentBancaire =
  | 'EN_PORTEFEUILLE'
  | 'DEPOSE_EN_BANQUE'
  | 'ENCAISSE'
  | 'REJETE_IMPAYE'
  | 'ANNULE';

export const STATUT_BANCAIRE_LABELS: Record<StatutInstrumentBancaire, string> = {
  EN_PORTEFEUILLE: 'En portefeuille',
  DEPOSE_EN_BANQUE: 'Déposé en banque',
  ENCAISSE: 'Encaissé',
  REJETE_IMPAYE: 'Rejeté / Impayé',
  ANNULE: 'Annulé',
};

export const STATUT_BANCAIRE_COLORS: Record<
  StatutInstrumentBancaire,
  'default' | 'info' | 'success' | 'error' | 'warning'
> = {
  EN_PORTEFEUILLE: 'default',
  DEPOSE_EN_BANQUE: 'info',
  ENCAISSE: 'success',
  REJETE_IMPAYE: 'error',
  ANNULE: 'warning',
};

export interface PaymentInstrumentView {
  id: number;
  instrumentType: 'CHEQUE' | 'LETTRE_DE_CHANGE';
  source: 'CLIENT' | 'FOURNISSEUR';
  direction: 'IN' | 'OUT';
  numero: string;
  date: string;
  dateEcheance: string | null;
  montant: number;
  devise: string;
  beneficiaire: string;
  banque: string | null;
  agence: string | null;
  ville: string | null;
  serie: string | null;
  cause: string | null;
  tireNom: string | null;
  tireAdresse: string | null;
  partyName: string;
  partyType: 'CLIENT' | 'FOURNISSEUR';
  paymentId: number;
  paymentReference: string;
  statutBancaire: StatutInstrumentBancaire;
  isPaymentCancelled: boolean;
  hasDocument: boolean;
  fileUrl: string | null;
  downloadUrl: string | null;
}

export interface InstrumentStatsView {
  totalChequesCount: number;
  totalChequesAmountByCurrency: Record<string, number>;
  totalLettresCount: number;
  totalLettresAmountByCurrency: Record<string, number>;
  byStatusCount: Record<string, number>;
  bySourceCount: Record<string, number>;
}

export interface QueryChequesLettresChangeParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'CHEQUE' | 'LETTRE_DE_CHANGE';
  source?: 'CLIENT' | 'FOURNISSEUR';
  statutBancaire?: StatutInstrumentBancaire;
  dateDebut?: string;
  dateFin?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateStatutPayload {
  statutBancaire: StatutInstrumentBancaire;
}
