export type ConducteurDocumentType =
  | 'PASSEPORT'
  | 'VISA'
  | 'PERMIS_DE_CONDUIRE'
  | 'CARTE_DE_SANTE'
  | 'AUTRE';

export type DerivedDocumentStatus = 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';

export interface DocumentConducteur {
  id: number;
  idConducteur: number;
  conducteur: {
    id: number;
    nomConducteur: string;
    telephone: string | null;
    statut: string;
  };
  typeDocument: string;
  numeroDocument: string | null;
  dateEmission: string | null;
  dateExpiration: string | null;
  status: DerivedDocumentStatus;
  daysUntilExpiry: number | null;
  hasExpirationDate: boolean;
  notes: string | null;
  hasFile: boolean;
  fileUrl: string | null;
  downloadUrl: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  creeLe: string;
  misAJourLe: string;
}

export interface DocumentConducteurStats {
  total: number;
  valides: number;
  bientotExpires: number;
  expires: number;
}

export interface CreateDocumentConducteurInput {
  idConducteur: number;
  typeDocument: string;
  numeroDocument?: string;
  dateEmission?: string;
  dateExpiration?: string;
  notes?: string;
}

export interface UpdateDocumentConducteurInput {
  typeDocument?: string;
  numeroDocument?: string;
  dateEmission?: string;
  dateExpiration?: string;
  notes?: string;
}

export interface QueryDocumentConducteurParams {
  page?: number;
  limit?: number;
  search?: string;
  idConducteur?: number;
  typeDocument?: string;
  statut?: DerivedDocumentStatus;
  dateExpirationDebut?: string;
  dateExpirationFin?: string;
  hasFile?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export const CONDUCTEUR_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PASSEPORT: 'Passeport',
  VISA: 'Visa',
  PERMIS_DE_CONDUIRE: 'Permis de conduire',
  CARTE_DE_SANTE: 'Carte de santé',
  AUTRE: 'Autre document',
};
