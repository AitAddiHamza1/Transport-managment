export type StatutPaiementEmployeUnion = 'EN_ATTENTE' | 'PARTIELLEMENT_PAYE' | 'PAYE';

export type PaiementModeEmploye = 'VIREMENT' | 'ESPECES' | 'CHEQUE';

export interface VersementView {
  id: number;
  idPaiementEmploye: number;
  montant: number;
  dateVersement: string;
  modePaiement: PaiementModeEmploye;
  referenceExterne: string | null;
  notes: string | null;
  estAnnule: boolean;
  dateAnnulation: string | null;
  motifAnnulation: string | null;
  creeLe: string;
}

export interface CompactEmployeForPaiement {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  cin: string | null;
  poste: string;
  departement: string | null;
}

export interface PaiementEmployeView {
  id: number;
  numeroPaiement: string;
  idEmploye: number;
  periode: string;
  salaireReference: number;
  montantDu: number;
  montantPaye: number;
  soldeRestant: number;
  statut: StatutPaiementEmployeUnion;
  latestVersementDate: string | null;
  motifAjustement: string | null;
  notes: string | null;
  creeLe: string;
  misAJourLe: string;
  employe?: CompactEmployeForPaiement | null;
  versements: VersementView[];
}

export interface PaiementEmployeStats {
  totalDu: number;
  totalPaye: number;
  soldeRestant: number;
  countAttente: number;
  countPartiel: number;
  countPaye: number;
}

export interface InitialVersementPayload {
  montant: number;
  dateVersement: string;
  modePaiement: PaiementModeEmploye;
  referenceExterne?: string;
  notes?: string;
}

export interface CreatePaiementEmployePayload {
  idEmploye: number;
  periode: string;
  salaireReference?: number;
  montantDu: number;
  motifAjustement?: string;
  notes?: string;
  initialVersement?: InitialVersementPayload;
}

export interface UpdatePaiementEmployePayload {
  periode?: string;
  salaireReference?: number;
  montantDu?: number;
  motifAjustement?: string;
  notes?: string;
}

export interface CreateVersementPayload {
  montant: number;
  dateVersement: string;
  modePaiement: PaiementModeEmploye;
  referenceExterne?: string;
  notes?: string;
}

export interface CancelVersementPayload {
  motifAnnulation: string;
}

export interface QueryPaiementEmployeDto {
  page?: number;
  limit?: number;
  search?: string;
  idEmploye?: number;
  periode?: string;
  annee?: number;
  mois?: number;
  statut?: StatutPaiementEmployeUnion;
  modePaiement?: PaiementModeEmploye;
  departement?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
