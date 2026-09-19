export const LIEUX_EMBARQUEMENT = ['Tanger Med', 'Nador', 'Almeria', 'Algeciras'] as const;
export type LieuEmbarquement = (typeof LIEUX_EMBARQUEMENT)[number];

export interface CompactVehicule {
  immatriculation: string;
  marque: string;
  modele: string | null;
}

export interface CompactConducteur {
  id: number;
  nomConducteur: string;
}

export interface CompactVoyage {
  idVoyage: number;
  numeroCmr: string | null;
  statut: string;
}

export interface TraverseeMaritime {
  id: number;
  companyId: number;
  idVoyage: number | null;
  immatriculation: string;
  idConducteur: number;
  dateTraversee: string;
  bateau: string;
  lieuEmbarquement: LieuEmbarquement;
  prix: number;
  devise: 'MAD';
  estVerifiee: boolean;
  cheminFichier: string | null;
  nomOriginal: string | null;
  mimeType: string | null;
  tailleFichier: number | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  creeLe: string;
  misAJourLe: string;
  vehicule?: CompactVehicule | null;
  conducteur?: CompactConducteur | null;
  voyage?: CompactVoyage | null;
}

export interface TraverseeMaritimeStats {
  total: number;
  avecVoyage: number;
  sansVoyage: number;
  coutTotalMad: number;
}

export interface CreateTraverseePayload {
  idVoyage?: number | null;
  immatriculation: string;
  idConducteur: number;
  dateTraversee: string;
  bateau: string;
  lieuEmbarquement: LieuEmbarquement;
  prix: number;
  devise?: 'MAD';
  estVerifiee?: boolean;
  file?: File;
}

export interface UpdateTraverseePayload {
  idVoyage?: number | null;
  immatriculation?: string;
  idConducteur?: number;
  dateTraversee?: string;
  bateau?: LieuEmbarquement | string;
  lieuEmbarquement?: LieuEmbarquement;
  prix?: number;
  devise?: 'MAD';
  estVerifiee?: boolean;
}

export interface QueryTraverseeParams {
  page?: number;
  limit?: number;
  search?: string;
  immatriculation?: string;
  idConducteur?: number;
  lieuEmbarquement?: LieuEmbarquement;
  associationVoyage?: 'tous' | 'avec_voyage' | 'sans_voyage';
  dateDebut?: string;
  dateFin?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
