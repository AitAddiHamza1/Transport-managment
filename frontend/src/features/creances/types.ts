export type CreanceStatut = 'NON_PAYE' | 'PARTIEL' | 'PAYE' | 'EN_RETARD';

export interface CompactFactureForCreance {
  id: number;
  numeroFacture: string;
  sousTotal: number;
  montantTva: number;
  montantTotal: number;
  supprimeLe: string | null;
}

export interface CompactPaiementSummary {
  id: number;
  datePaiement: string;
  montantRecu: number;
  methodePaiement: string;
}

export interface CreanceClient {
  id: number;
  numeroFacture: string;
  nomClient: string;
  dateEmission: string;
  delaiPaiementJours: number;
  montantFacture: number;
  montantRecu: number;
  solde: number;
  dateEcheance: string | null;
  statutPaiement: CreanceStatut;
  actionRecouvrement: string | null;
  facture?: CompactFactureForCreance | null;
  paiements?: CompactPaiementSummary[];
}

export interface CreanceStats {
  totalCreances: number;
  totalMontantFacture: number;
  totalMontantRecu: number;
  totalSolde: number;
  nonPayesCount: number;
  partielCount: number;
  payesCount: number;
  enRetardCount: number;
}

export interface QueryCreanceDto {
  page?: number;
  limit?: number;
  search?: string;
  nomClient?: string;
  statutPaiement?: CreanceStatut | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
