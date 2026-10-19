import type { Vehicule } from '../../features/vehicles/types';
import type { Conducteur } from '../../features/conducteurs/types';

export interface TractorFilterOptions {
  currentImmatriculation?: string | null;
  selectedRemorque?: string | null;
}

export interface TrailerFilterOptions {
  currentImmatriculation?: string | null;
  selectedTracteur?: string | null;
}

export interface DriverFilterOptions {
  currentNomConducteur?: string | null;
}

/**
 * Checks if a vehicle is eligible to be selected as a tractor for a voyage.
 * - Allowed types: TRACTEUR and CAMION.
 * - Ineligible statuses: MAINTENANCE and HORS_SERVICE (unless already assigned to the voyage being edited).
 * - Cannot be identical to the currently selected trailer.
 */
export function isTractorEligible(
  v: Vehicule,
  options?: TractorFilterOptions,
): boolean {
  const type = (v.typeVehicule || '').trim().toUpperCase();
  const isTypeValid = type === 'TRACTEUR' || type === 'CAMION';
  if (!isTypeValid) {
    return false;
  }

  const isCurrentAssigned = Boolean(
    options?.currentImmatriculation &&
      v.immatriculation.trim().toUpperCase() === options.currentImmatriculation.trim().toUpperCase(),
  );

  // Ineligible statuses: MAINTENANCE and HORS_SERVICE are not normally available
  if (!isCurrentAssigned && (v.statut === 'MAINTENANCE' || v.statut === 'HORS_SERVICE')) {
    return false;
  }

  // Cross-selection: cannot be the same as the selected trailer
  if (
    options?.selectedRemorque &&
    v.immatriculation.trim().toUpperCase() === options.selectedRemorque.trim().toUpperCase()
  ) {
    return false;
  }

  return true;
}

/**
 * Checks if a vehicle is eligible to be selected as a trailer for a voyage.
 * - Allowed type: REMORQUE.
 * - Ineligible statuses: MAINTENANCE and HORS_SERVICE (unless already assigned to the voyage being edited).
 * - Cannot be identical to the currently selected tractor.
 */
export function isTrailerEligible(
  v: Vehicule,
  options?: TrailerFilterOptions,
): boolean {
  const type = (v.typeVehicule || '').trim().toUpperCase();
  const isTypeValid = type === 'REMORQUE';
  if (!isTypeValid) {
    return false;
  }

  const isCurrentAssigned = Boolean(
    options?.currentImmatriculation &&
      v.immatriculation.trim().toUpperCase() === options.currentImmatriculation.trim().toUpperCase(),
  );

  // Ineligible statuses: MAINTENANCE and HORS_SERVICE are not normally available
  if (!isCurrentAssigned && (v.statut === 'MAINTENANCE' || v.statut === 'HORS_SERVICE')) {
    return false;
  }

  // Cross-selection: cannot be the same as the selected tractor
  if (
    options?.selectedTracteur &&
    v.immatriculation.trim().toUpperCase() === options.selectedTracteur.trim().toUpperCase()
  ) {
    return false;
  }

  return true;
}

/**
 * Checks if a driver is eligible to be selected for a voyage.
 * - Must be linked to an active employee profile (statut === 'ACTIF').
 * - Must have statut === 'DISPONIBLE' (unless already assigned to the voyage being edited).
 */
export function isDriverEligible(
  c: Conducteur,
  options?: DriverFilterOptions,
): boolean {
  if (!c.employe || c.employe.statut !== 'ACTIF') {
    return false;
  }

  const isCurrentAssigned = Boolean(
    options?.currentNomConducteur &&
      c.nomConducteur.trim().toLowerCase() === options.currentNomConducteur.trim().toLowerCase(),
  );

  if (isCurrentAssigned) {
    return true;
  }

  return c.statut === 'DISPONIBLE';
}

/**
 * Formats vehicle dropdown label with French status indication when EN_VOYAGE.
 */
export function formatVehicleOptionLabel(v: Vehicule): string {
  const statusSuffix = v.statut === 'EN_VOYAGE' ? ' — En voyage' : '';
  return `${v.immatriculation} (${v.marque}${statusSuffix})`;
}

/**
 * Formats driver dropdown label with French status indication when applicable.
 */
export function formatDriverOptionLabel(c: Conducteur, isCurrentAssigned?: boolean): string {
  if (isCurrentAssigned && c.statut === 'EN_VOYAGE') {
    return `${c.nomConducteur} (En voyage — Actuel)`;
  }
  return c.nomConducteur;
}
