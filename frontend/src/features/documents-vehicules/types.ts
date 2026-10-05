export type VehicleDocumentType =
  | 'CARTE_GRISE'
  | 'VISITE_TECHNIQUE'
  | 'VIGNETTE'
  | 'ASSURANCE'
  | 'EXTINCTEUR'
  | 'AGREMENT'
  | 'CERTIFICAT_ONSSA'
  | 'ATP'
  | 'CHRONOTACHYGRAPHE'
  | 'TRYIPTIQUE'
  | 'AUTRE'
  | 'AUTORISATION_TRANSPORT'
  | 'LICENCE'
  | 'CERTIFICAT_IMMATRICULATION'
  | 'CONTRAT_LEASING'
  | 'DOCUMENT_DOUANIER';

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
  typeDocument: string;
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
  typeDocument: string;
  numeroDocument?: string;
  organismeEmetteur?: string;
  dateEmission?: string;
  dateExpiration?: string;
  notes?: string;
}

export interface UpdateDocumentVehiculeInput {
  typeDocument?: string;
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

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CARTE_GRISE: 'Carte grise',
  VISITE_TECHNIQUE: 'Visite Technique',
  VIGNETTE: 'Vignette',
  ASSURANCE: 'Assurance',
  EXTINCTEUR: 'Extincteur',
  AGREMENT: 'agrément',
  CERTIFICAT_ONSSA: 'CERTIFICAT ONSSA',
  ATP: 'ATP',
  CHRONOTACHYGRAPHE: 'chronotachygraphe',
  TRYIPTIQUE: 'Tryiptique',
  AUTRE: 'Autre document',
  // Backward compatibility fallback labels for existing database records:
  AUTORISATION_TRANSPORT: 'Autorisation de transport',
  LICENCE: 'Licence de transport',
  CERTIFICAT_IMMATRICULATION: "Certificat d'immatriculation",
  CONTRAT_LEASING: 'Contrat de leasing',
  DOCUMENT_DOUANIER: 'Document douanier',
};
