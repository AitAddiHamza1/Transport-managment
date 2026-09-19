export type TypeMouvementGasoil = 'ENTREE' | 'SORTIE';

export type PeriodPresetStock =
  | 'AUJOURDHUI'
  | 'CE_MOIS'
  | 'CE_TRIMESTRE'
  | 'CETTE_ANNEE'
  | 'PERSONNALISE';

export interface StockGasoilMovementView {
  idMouvement: number;
  companyId: number;
  typeMouvement: TypeMouvementGasoil;
  dateMouvement: string;
  quantiteLitres: string;
  prixUnitaire: string | null;
  montantTotal: string | null;
  idBonCarburant: number | null;
  numeroBon: string | null;
  immatriculation: string | null;
  nomConducteur: string | null;
  nomFournisseur: string | null;
  referenceFacture: string | null;
  remarques: string | null;
  stockApresMouvement: string;
  creeLe: string;
}

export interface StockGasoilStats {
  stockActuelLitres: string;
  seuilAlerteLitres: string;
  statutAlerte: 'NORMAL' | 'LOW' | 'ZERO';
  isLowStock: boolean;
  pmpActuel: string | null;
  totalEntreesLitres: string;
  totalSortiesLitres: string;
  nombreMouvements: number;
}

export interface QueryStockGasoilParams {
  page?: number;
  limit?: number;
  search?: string;
  typeMouvement?: TypeMouvementGasoil;
  immatriculation?: string;
  preset?: PeriodPresetStock;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateStockEntreePayload {
  dateMouvement?: string;
  quantiteLitres: number;
  prixUnitaire: number;
  nomFournisseur?: string;
  referenceFacture?: string;
  remarques?: string;
}

export type UpdateStockEntreePayload = Partial<CreateStockEntreePayload>;
