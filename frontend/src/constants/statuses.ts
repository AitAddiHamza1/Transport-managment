/**
 * Centralized status mapping dictionary for the Transport Management ERP visual identity.
 * Maps confirmed business status string values to French labels and soft visual tints.
 *
 * NOTE: DO NOT INVENT BUSINESS STATUSES. Every entry in this dictionary corresponds
 * directly to a confirmed domain enum or status string in the application.
 */

export interface StatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'default';
  bg?: string;
  text?: string;
}

export const STATUS_MAPPINGS: Record<string, StatusConfig> = {
  // --- CLIENTS (ClientStatut) ---
  ACTIF: {
    label: 'Actif',
    variant: 'success',
    bg: '#ECFDF5',
    text: '#047857',
  },
  INACTIF: {
    label: 'Inactif',
    variant: 'warning',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  BLOQUE: {
    label: 'Bloqué',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },

  // --- CONDUCTEURS (ConducteurStatut) & VÉHICULES (VehiculeStatut) ---
  DISPONIBLE: {
    label: 'Disponible',
    variant: 'success',
    bg: '#ECFDF5',
    text: '#047857',
  },
  EN_VOYAGE: {
    label: 'En voyage',
    variant: 'info',
    bg: '#EFF6FF',
    text: '#1D4ED8',
  },
  INDISPONIBLE: {
    label: 'Indisponible',
    variant: 'warning',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    variant: 'warning',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  HORS_SERVICE: {
    label: 'Hors service',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },

  // --- FACTURES (FactureStatut) ---
  EMISE: {
    label: 'Émise',
    variant: 'info',
    bg: '#EFF6FF',
    text: '#1D4ED8',
  },
  PAYEE: {
    label: 'Payée',
    variant: 'success',
    bg: '#ECFDF5',
    text: '#047857',
  },
  PARTIELLEMENT_PAYEE: {
    label: 'Partiellement payée',
    variant: 'warning',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  EN_RETARD: {
    label: 'En retard',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },
  ANNULEE: {
    label: 'Annulée',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },

  // --- EMPLOYES (EmployeStatut) ---
  SUSPENDU: {
    label: 'Suspendu',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },

  // --- CHEQUES & PAIEMENTS (ChequeStatut) ---
  EN_ATTENTE: {
    label: 'En attente',
    variant: 'warning',
    bg: '#FEF3C7',
    text: '#B45309',
  },
  DEPOSE: {
    label: 'Déposé',
    variant: 'info',
    bg: '#EFF6FF',
    text: '#1D4ED8',
  },
  ENCAISSE: {
    label: 'Encaissé',
    variant: 'success',
    bg: '#ECFDF5',
    text: '#047857',
  },
  REJETE: {
    label: 'Rejeté',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },
  ANNULE: {
    label: 'Annulé',
    variant: 'error',
    bg: '#FEE2E2',
    text: '#B91C1C',
  },
};

/**
 * Safe helper to get status presentation configuration.
 * Falls back to default formatting if status key is unknown.
 */
export function getStatusConfig(statusKey: string): StatusConfig {
  if (STATUS_MAPPINGS[statusKey]) {
    return STATUS_MAPPINGS[statusKey];
  }
  return {
    label: statusKey,
    variant: 'default',
  };
}
