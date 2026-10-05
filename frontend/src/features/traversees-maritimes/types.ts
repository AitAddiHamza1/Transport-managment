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

export interface SectionPresence {
  circuit: boolean;
  bateau: boolean;
  transit: boolean;
}

export interface TraverseeMaritimeMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sectionPresence: SectionPresence;
}

export interface TraverseeMaritime {
  id: number;
  companyId: number;
  idVoyage: number | null;
  immatriculation: string | null;
  idConducteur: number | null;
  dateOperation: string;

  // Section 1 : Circuit Portuaire
  hasCircuitPortuaire: boolean;
  circuitNature?: string | null;
  circuitMontant?: number | null;
  circuitNotes?: string | null;
  circuitEstVerifie: boolean;

  // Section 2 : Bateau
  hasBateau: boolean;
  dateTraversee?: string | null;
  bateau?: string | null;
  lieuEmbarquement?: LieuEmbarquement | null;
  prix?: number | null;
  devise?: string;
  estVerifiee: boolean;
  cheminFichier?: string | null;
  nomOriginal?: string | null;
  mimeType?: string | null;
  tailleFichier?: number | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;

  // Section 3 : Transit Aljaziras
  hasTransitAljaziras: boolean;
  transitTypeService?: string | null;
  transitPrix?: number | null;
  transitNotes?: string | null;
  transitEstVerifie: boolean;

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
  immatriculation?: string | null;
  idConducteur?: number | null;
  dateOperation?: string;

  // Circuit
  hasCircuitPortuaire?: boolean;
  circuitNature?: string | null;
  circuitMontant?: number | null;
  circuitNotes?: string | null;
  circuitEstVerifie?: boolean;

  // Bateau
  hasBateau?: boolean;
  dateTraversee?: string | null;
  bateau?: string | null;
  lieuEmbarquement?: LieuEmbarquement | null;
  prix?: number | null;
  devise?: 'MAD';
  estVerifiee?: boolean;

  // Transit
  hasTransitAljaziras?: boolean;
  transitTypeService?: string | null;
  transitPrix?: number | null;
  transitNotes?: string | null;
  transitEstVerifie?: boolean;

  file?: File;
}

export interface UpdateTraverseePayload {
  idVoyage?: number | null;
  immatriculation?: string | null;
  idConducteur?: number | null;
  dateOperation?: string;

  // Circuit
  hasCircuitPortuaire?: boolean;
  circuitNature?: string | null;
  circuitMontant?: number | null;
  circuitNotes?: string | null;
  circuitEstVerifie?: boolean;

  // Bateau
  hasBateau?: boolean;
  dateTraversee?: string | null;
  bateau?: LieuEmbarquement | string | null;
  lieuEmbarquement?: LieuEmbarquement | null;
  prix?: number | null;
  devise?: 'MAD';
  estVerifiee?: boolean;

  // Transit
  hasTransitAljaziras?: boolean;
  transitTypeService?: string | null;
  transitPrix?: number | null;
  transitNotes?: string | null;
  transitEstVerifie?: boolean;
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
