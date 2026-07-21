export type VehiculeStatut = 'DISPONIBLE' | 'EN_VOYAGE' | 'MAINTENANCE' | 'HORS_SERVICE';

export interface VehiculeDocumentSummary {
  idDocument: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateExpiration: string | null;
  statut: string;
}

export interface Vehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string | null;
  typeVehicule: string;
  annee: number | null;
  numeroChassis: string | null;
  capaciteCharge: number | null;
  statut: VehiculeStatut;
  creeLe: string;
  documents?: VehiculeDocumentSummary[];
}

export interface VehiculeStats {
  total: number;
  disponibles: number;
  enVoyage: number;
  maintenance: number;
  horsService: number;
}

export interface CreateVehiculePayload {
  immatriculation: string;
  marque: string;
  modele?: string | null;
  typeVehicule?: string;
  annee?: number | null;
  numeroChassis?: string | null;
  capaciteCharge?: number | null;
  statut?: VehiculeStatut;
}

export interface UpdateVehiculePayload {
  immatriculation?: string;
  marque?: string;
  modele?: string | null;
  typeVehicule?: string;
  annee?: number | null;
  numeroChassis?: string | null;
  capaciteCharge?: number | null;
  statut?: VehiculeStatut;
}

export interface UpdateVehiculeStatusPayload {
  statut: VehiculeStatut;
}

export interface VehiculesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: VehiculeStatut;
  typeVehicule?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
