export type EmployeStatut =
  | 'ACTIF'
  | 'SUSPENDU'
  | 'DEMISSIONNAIRE'
  | 'LICENCIE'
  | 'RETRAITE'
  | 'INACTIF';

export type ContratType =
  | 'CDI'
  | 'CDD'
  | 'STAGE'
  | 'TEMPORAIRE'
  | 'FREELANCE';

export type PaiementModeEmploye =
  | 'VIREMENT'
  | 'ESPECES'
  | 'CHEQUE';

export interface Employe {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  cin: string | null;
  dateNaissance: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  poste: string;
  departement: string | null;
  dateEmbauche: string;
  typeContrat: ContratType;
  statut: EmployeStatut;
  dateSortie: string | null;
  motifSortie: string | null;
  salaireBase: number | null;
  modePaiement: PaiementModeEmploye | null;
  nomBanque: string | null;
  rib: string | null;
  hasPhoto: boolean;
  photoFilename: string | null;
  photoOriginalName: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
  observations: string | null;
  creeLe: string;
  misAJourLe: string;
}

export interface DocumentEmploye {
  id: number;
  idEmploye: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateEmission: string | null;
  dateExpiration: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  statut: 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';
  notes: string | null;
  creeLe: string;
  misAJourLe: string;
}

export interface EmployesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: EmployeStatut;
  departement?: string;
  typeContrat?: ContratType;
  modePaiement?: PaiementModeEmploye;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployesPaginatedResponse {
  data: Employe[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EmployeStats {
  total: number;
  actifs: number;
  suspendus: number;
  sortis: number;
}

export interface CreateEmployeFormData {
  nom: string;
  prenom: string;
  cin?: string;
  dateNaissance?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  poste: string;
  departement?: string;
  dateEmbauche: string;
  typeContrat: ContratType;
  statut?: EmployeStatut;
  dateSortie?: string;
  motifSortie?: string;
  salaireBase?: number | null;
  modePaiement?: PaiementModeEmploye | null;
  nomBanque?: string;
  rib?: string;
  observations?: string;
}

export interface UpdateEmployeFormData extends Partial<CreateEmployeFormData> {}
