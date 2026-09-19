export type MaintenanceTriggerType = 'KILOMETRAGE' | 'DATE' | 'KILOMETRAGE_OU_DATE';

export type MaintenanceStatus = 'OK' | 'UPCOMING' | 'DUE' | 'OVERDUE';

export interface MaintenanceRule {
  id: number;
  companyId: number;
  code: string;
  nom: string;
  triggerType: MaintenanceTriggerType;
  intervalleKm: number | null;
  intervalleMois: number | null;
  seuilAlerteKm: number | null;
  seuilAlerteJours: number | null;
  description: string | null;
  creeLe: string;
}

export interface CreateMaintenanceRulePayload {
  code: string;
  nom: string;
  triggerType?: MaintenanceTriggerType;
  intervalleKm?: number | null;
  intervalleMois?: number | null;
  seuilAlerteKm?: number | null;
  seuilAlerteJours?: number | null;
  description?: string | null;
}

export interface UpdateMaintenanceRulePayload {
  code?: string;
  nom?: string;
  triggerType?: MaintenanceTriggerType;
  intervalleKm?: number | null;
  intervalleMois?: number | null;
  seuilAlerteKm?: number | null;
  seuilAlerteJours?: number | null;
  description?: string | null;
}

export interface MaintenanceIntervention {
  id: number;
  companyId: number;
  immatriculation: string;
  idRule: number | null;
  ruleCode: string | null;
  ruleNom: string | null;
  libelle: string;
  dateIntervention: string;
  kilometrageRealise: number;
  prochainKmEcheance: number | null;
  prochaineDateEcheance: string | null;
  currentVehicleMileage: number | null;
  remainingKm: number | null;
  remainingDays: number | null;
  statut: MaintenanceStatus;
  idDepenseVehicule: number | null;
  depenseMontant: number | null;
  depenseDate: string | null;
  notes: string | null;
  creeLe: string;
  misAJourLe: string;
}

export interface CreateMaintenanceInterventionPayload {
  immatriculation: string;
  idRule?: number | null;
  libelle: string;
  dateIntervention: string;
  kilometrageRealise: number;
  prochainKmEcheance?: number | null;
  prochaineDateEcheance?: string | null;
  idDepenseVehicule?: number | null;
  notes?: string | null;
}

export interface UpdateMaintenanceInterventionPayload {
  immatriculation?: string;
  idRule?: number | null;
  libelle?: string;
  dateIntervention?: string;
  kilometrageRealise?: number;
  prochainKmEcheance?: number | null;
  prochaineDateEcheance?: string | null;
  idDepenseVehicule?: number | null;
  notes?: string | null;
}

export interface QueryCarnetEntretienParams {
  page?: number;
  limit?: number;
  immatriculation?: string;
  statut?: MaintenanceStatus;
  idRule?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCarnetEntretienResponse {
  data: MaintenanceIntervention[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleSituation {
  immatriculation: string;
  currentMileage: number | null;
  statutGlobal: MaintenanceStatus;
  prochaineEcheanceKm: number | null;
  prochaineEcheanceDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
  interventions: MaintenanceIntervention[];
}
