export type VehicleDocumentType =
  | 'CARTE_GRISE'
  | 'ASSURANCE'
  | 'VISITE_TECHNIQUE'
  | 'VIGNETTE'
  | 'AUTORISATION_TRANSPORT'
  | 'LICENCE'
  | 'CERTIFICAT_IMMATRICULATION'
  | 'CONTRAT_LEASING'
  | 'DOCUMENT_DOUANIER'
  | 'AUTRE';

export type DerivedDocumentStatus = 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';

export interface DocumentVehicule {
  idDocument: number;
  immatriculation: string;
  vehicle: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string | null;
    typeVehicule: string;
  };
  typeDocument: VehicleDocumentType;
  numeroDocument: string | null;
  organismeEmetteur: string | null;
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

export interface DocumentVehiculeStats {
  total: number;
  valides: number;
  bientotExpires: number;
  expires: number;
}

export interface CreateDocumentVehiculeInput {
  immatriculation: string;
  typeDocument: VehicleDocumentType;
  numeroDocument?: string;
  organismeEmetteur?: string;
  dateEmission?: string;
  dateExpiration?: string;
  notes?: string;
}

export interface UpdateDocumentVehiculeInput {
  typeDocument?: VehicleDocumentType;
  numeroDocument?: string;
  organismeEmetteur?: string;
  dateEmission?: string;
  dateExpiration?: string;
  notes?: string;
}

export interface QueryDocumentVehiculeParams {
  page?: number;
  limit?: number;
  search?: string;
  immatriculation?: string;
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

export const DOCUMENT_TYPE_LABELS: Record<VehicleDocumentType, string> = {
  CARTE_GRISE: 'Carte grise',
  ASSURANCE: 'Assurance',
  VISITE_TECHNIQUE: 'Visite technique',
  VIGNETTE: 'Vignette',
  AUTORISATION_TRANSPORT: 'Autorisation de transport',
  LICENCE: 'Licence de transport',
  CERTIFICAT_IMMATRICULATION: "Certificat d'immatriculation",
  CONTRAT_LEASING: 'Contrat de leasing',
  DOCUMENT_DOUANIER: 'Document douanier',
  AUTRE: 'Autre document',
};
