export type PaiementMethode =
  | 'ESPECES'
  | 'CHEQUE'
  | 'VIREMENT'
  | 'CARTE'
  | 'EFFET'
  | 'PRELEVEMENT';

export interface CompactFactureForPaiement {
  id: number;
  numeroFacture: string;
  nomClient: string;
  sousTotal: number;
  montantTva: number;
  montantTotal: number;
  statut: string;
}

export interface CompactCreanceForPaiement {
  id: number;
  montantFacture: number;
  montantRecu: number;
  solde: number;
  statutPaiement: string;
}

export interface PaiementClient {
  id: number;
  numeroFacture: string;
  nomClient: string;
  datePaiement: string;
  montantRecu: number;
  methodePaiement: PaiementMethode;
  facture?: CompactFactureForPaiement | null;
  creance?: CompactCreanceForPaiement | null;
  devise: string;
  lettreDeChange?: {
    numero: string;
    dateEcheance: string;
    montant: number;
    beneficiaire: string;
    cause: string;
    tireNom: string;
    tireAdresse: string;
  } | null;
}

export interface CreatePaiementClientPayload {
  numeroFacture: string;
  nomClient?: string;
  datePaiement?: string;
  montantRecu: number;
  methodePaiement: PaiementMethode;
}

export interface PaiementStats {
  totalPaiements: number;
  montantTotalRecu: number;
  methodesCount: Record<string, number>;
  devise?: string;
}

export interface QueryPaiementClientDto {
  page?: number;
  limit?: number;
  search?: string;
  nomClient?: string;
  numeroFacture?: string;
  methodePaiement?: PaiementMethode | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  devise?: string;
}
