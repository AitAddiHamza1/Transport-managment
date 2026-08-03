export const ADMINISTRATIVE_EXPENSE_CATEGORIES = [
  'LOYER',
  'EAU',
  'ELECTRICITE',
  'INTERNET_TELEPHONE',
  'FOURNITURES_BUREAU',
  'HONORAIRES',
  'FRAIS_BANCAIRES',
  'ASSURANCE',
  'IMPOTS_TAXES',
  'ABONNEMENTS',
  'ENTRETIEN_BUREAU',
  'AUTRE',
] as const;

export type AdministrativeExpenseCategory = (typeof ADMINISTRATIVE_EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AdministrativeExpenseCategory, string> = {
  LOYER: 'Loyer & charges locatives',
  EAU: 'Eau & assainissement',
  ELECTRICITE: 'Électricité',
  INTERNET_TELEPHONE: 'Internet & Téléphonie',
  FOURNITURES_BUREAU: 'Fournitures de bureau',
  HONORAIRES: 'Honoraires professionnels',
  FRAIS_BANCAIRES: 'Frais bancaires & agios',
  ASSURANCE: 'Assurances générales',
  IMPOTS_TAXES: 'Impôts & taxes',
  ABONNEMENTS: 'Abonnements & services IT',
  ENTRETIEN_BUREAU: 'Entretien & nettoyage',
  AUTRE: 'Autres frais administratifs',
};

export interface CompactAuthorSummary {
  id: number;
  nom: string;
}

export interface ChargeAdministrative {
  idDepense: number;
  categorieDepense: string;
  description: string | null;
  fichierRecu: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptDownloadUrl: string | null;
  montant: string;
  dateDepense: string;
  creeLe: string;
  misAJourLe: string;
  auteur: CompactAuthorSummary | null;
}

export interface ChargeAdministrativeStats {
  totalCount: number;
  montantTotal: string;
  montantMoyen: string;
  withReceiptCount: number;
  withReceiptPercentage: number;
}

export interface CreateChargeAdministrativePayload {
  categorieDepense: string;
  description?: string;
  montant: number;
  dateDepense?: string;
  recu?: File | null;
}

export interface UpdateChargeAdministrativePayload {
  categorieDepense?: string;
  description?: string;
  montant?: number;
  dateDepense?: string;
}

export interface ChargesAdministrativesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categorieDepense?: string;
  dateDebut?: string;
  dateFin?: string;
  hasReceipt?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedChargesAdministrativesResponse {
  data: ChargeAdministrative[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
