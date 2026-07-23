export interface CompactVoyageSummary {
  idVoyage: number;
  lieuChargement: string;
  lieuDechargement: string;
  statut: string;
  tracteur: string | null;
}

export interface Facture {
  id: number;
  numeroFacture: string;
  nomClient: string;
  idVoyage: number | null;
  dateFacture: string;
  joursEcheance: number;
  dateEcheance: string | null;
  devise: string;
  sousTotal: number;
  tauxTva: number;
  montantTva: number;
  montantTotal: number;
  montantEnLettres: string | null;
  cheminPdf: string | null;
  notes: string | null;
  fichierJoint: string | null;
  creePar: number | null;
  statut: string;
  supprimeLe: string | null;
  voyage?: CompactVoyageSummary | null;
}

export interface FactureStats {
  totalFactures: number;
  totalSousTotal: number;
  totalTva: number;
  totalTtc: number;
  emisesCount: number;
  payeesCount: number;
  annuleesCount: number;
}

export interface CreateFacturePayload {
  numeroFacture?: string;
  nomClient: string;
  idVoyage?: number;
  dateFacture?: string;
  joursEcheance?: number;
  sousTotal: number;
  tauxTva?: number;
  montantEnLettres?: string;
  notes?: string;
}

export type UpdateFacturePayload = Partial<CreateFacturePayload>;

export interface FacturesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  nomClient?: string;
  idVoyage?: number;
  statut?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
