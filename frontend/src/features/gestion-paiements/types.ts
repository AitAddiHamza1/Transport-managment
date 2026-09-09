export const GESTION_PAIEMENTS_SOURCE_TYPES = [
  'CLIENT_PAYMENT',
  'SUPPLIER_PAYMENT',
  'EMPLOYEE_PAYMENT',
  'ADMINISTRATIVE_EXPENSE',
] as const;

export type GestionPaiementsSourceType = (typeof GESTION_PAIEMENTS_SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<GestionPaiementsSourceType, string> = {
  CLIENT_PAYMENT: 'Paiement Client',
  SUPPLIER_PAYMENT: 'Paiement Fournisseur',
  EMPLOYEE_PAYMENT: 'Versement Employé',
  ADMINISTRATIVE_EXPENSE: 'Charge Administrative',
};

export const GESTION_PAIEMENTS_DIRECTIONS = ['IN', 'OUT'] as const;
export type GestionPaiementsDirection = (typeof GESTION_PAIEMENTS_DIRECTIONS)[number];

export const GESTION_PAIEMENTS_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type GestionPaiementsStatus = (typeof GESTION_PAIEMENTS_STATUSES)[number];

export const GESTION_PAIEMENTS_METHODS = [
  'ESPECES',
  'VIREMENT',
  'CHEQUE',
  'CARTE',
  'PRELEVEMENT',
  'EFFET',
  'AUTRE',
] as const;

export interface FinancialMovement {
  movementId: string;
  sourceType: GestionPaiementsSourceType;
  sourceId: number;
  direction: 'IN' | 'OUT';
  date: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  reference: string;
  externalReference: string | null;
  party: {
    type: 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE' | 'ADMINISTRATIVE_CATEGORY';
    id: number | null;
    name: string;
  };
  relatedDocument: {
    type: 'INVOICE' | 'SUPPLIER_DEBT' | 'EMPLOYEE_PAYROLL' | 'ADMINISTRATIVE_EXPENSE';
    id: number | null;
    number: string;
  } | null;
  status: 'ACTIVE' | 'CANCELLED';
  isCancelled: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  sourceRoute: string;
}

export interface GestionPaiementsStats {
  totalIn: string;
  totalOut: string;
  netBalance: string;
  totalCount: number;
  activeCount: number;
  cancelledCount: number;
  bySourceType: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

export interface GestionPaiementsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sourceType?: string;
  direction?: string;
  paymentMethod?: string;
  status?: string;
  dateDebut?: string;
  dateFin?: string;
  partyType?: string;
  amountMin?: number;
  amountMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedGestionPaiementsResponse {
  data: FinancialMovement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
