export type VoyageType = 'NATIONAL' | 'INTERNATIONAL' | 'IMPORT' | 'EXPORT';

export type VoyageStatut = 'PLANIFIE' | 'EN_COURS' | 'LIVRE' | 'ANNULE' | 'FACTURE';

export type ModeFacturation = 'AVEC_FACTURE' | 'SANS_FACTURE';

export interface DocumentVoyage {
  id: number;
  idVoyage: number;
  cheminFichier: string;
  nomOriginal: string;
  mimeType: string;
  tailleFichier: number;
  creeLe: string;
}

export interface FraisImmobilisation {
  id: number;
  idVoyage: number;
  prixParJour: number;
  nombreJoursRetard: number;
  montantTotal: number;
  creeLe: string;
  misAJourLe: string;
}

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface CompactClientSummary {
  id: number;
  nomEntreprise: string;
  ice: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  deviseFacturation?: string;
}

import type { TraverseeMaritime } from '../traversees-maritimes/types';

export interface Voyage {
  idVoyage: number;
  idClient: number | null;
  typeVoyage: VoyageType;
  modeFacturation?: ModeFacturation;
  tracteur: string | null;
  remorque: string | null;
  nomConducteur: string | null;
  nomClient: string | null;
  lieuChargement: string;
  lieuDechargement: string;
  dateChargement: string | null;
  numeroCmr: string | null;
  statut: VoyageStatut;
  montantVoyage: number;
  client?: CompactClientSummary | null;
  tracteurVehicule?: CompactVehiculeSummary | null;
  remorqueVehicule?: CompactVehiculeSummary | null;
  devise: string;
  fraisImmobilisation?: FraisImmobilisation | null;
  traverseeMaritime?: TraverseeMaritime | null;
  documents?: DocumentVoyage[];
}

export interface VoyageStats {
  total: number;
  planifies: number;
  enCours: number;
  livres: number;
  annules: number;
  factures: number;
}

export interface CreateVoyagePayload {
  idClient: number;
  typeVoyage?: VoyageType;
  modeFacturation?: ModeFacturation;
  tracteur?: string | null;
  remorque?: string | null;
  nomConducteur?: string | null;
  nomClient?: string | null;
  lieuChargement: string;
  lieuDechargement: string;
  dateChargement?: string | null;
  numeroCmr?: string | null;
  statut?: VoyageStatut;
  montantVoyage?: number;
  devise?: string;
  fraisImmobilisation?: {
    prixParJour: number;
    nombreJoursRetard: number;
  } | null;
  hasTraversee?: boolean;
  traverseeMaritime?: {
    dateTraversee: string;
    bateau: string;
    lieuEmbarquement: 'Tanger Med' | 'Nador' | 'Almeria' | 'Algeciras';
    prix: number;
    devise?: 'MAD' | 'EUR';
  } | null;
}

export interface UpdateVoyagePayload {
  idClient?: number;
  typeVoyage?: VoyageType;
  modeFacturation?: ModeFacturation;
  tracteur?: string | null;
  remorque?: string | null;
  nomConducteur?: string | null;
  nomClient?: string | null;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateChargement?: string | null;
  numeroCmr?: string | null;
  statut?: VoyageStatut;
  montantVoyage?: number;
  devise?: string;
  hasTraversee?: boolean;
  traverseeMaritime?: {
    dateTraversee: string;
    bateau: string;
    lieuEmbarquement: 'Tanger Med' | 'Nador' | 'Almeria' | 'Algeciras';
    prix: number;
    devise?: 'MAD' | 'EUR';
  } | null;
}

export interface UpdateVoyageStatusPayload {
  statut: VoyageStatut;
}

export interface VoyagesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  statut?: VoyageStatut;
  modeFacturation?: ModeFacturation;
  typeVoyage?: VoyageType;
  nomClient?: string;
  tracteur?: string;
  nomConducteur?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
