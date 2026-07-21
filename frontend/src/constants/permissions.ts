/**
 * Référentiel des permissions (miroir du backend common/permissions/permissions.ts).
 */

export const PERMISSION_ACTIONS = [
  'voir',
  'ajouter',
  'modifier',
  'supprimer',
  'exporter',
  'imprimer',
  'valider',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  voir: 'Voir',
  ajouter: 'Ajouter',
  modifier: 'Modifier',
  supprimer: 'Supprimer',
  exporter: 'Exporter',
  imprimer: 'Imprimer',
  valider: 'Valider',
};

export interface ModulePermission {
  voir: boolean;
  ajouter: boolean;
  modifier: boolean;
  supprimer: boolean;
  exporter: boolean;
  imprimer: boolean;
  valider: boolean;
}

export type PermissionsMatrix = Record<string, ModulePermission>;

export interface ModuleDef {
  key: string;
  label: string;
  valider: boolean;
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Tableau de bord', valider: false },
  { key: 'utilisateurs', label: 'Utilisateurs', valider: false },
  { key: 'clients', label: 'Clients', valider: false },
  { key: 'conducteurs', label: 'Conducteurs', valider: false },
  { key: 'vehicules', label: 'Véhicules', valider: false },
  { key: 'documents_vehicules', label: 'Documents véhicules', valider: true },
  { key: 'documents_conducteurs', label: 'Documents conducteurs', valider: true },
  { key: 'voyages', label: 'Voyages', valider: true },
  { key: 'bons_carburant', label: 'Bons carburant', valider: true },
  { key: 'depenses_vehicules', label: 'Dépenses véhicules', valider: true },
  { key: 'depenses_administratives', label: 'Dépenses administratives', valider: true },
  { key: 'factures', label: 'Factures', valider: true },
  { key: 'creances_clients', label: 'Créances clients', valider: true },
  { key: 'paiements_clients', label: 'Paiements clients', valider: true },
  { key: 'fournisseurs', label: 'Fournisseurs', valider: false },
  { key: 'dettes_fournisseurs', label: 'Dettes fournisseurs', valider: true },
  { key: 'paiements_fournisseurs', label: 'Paiements fournisseurs', valider: true },
  { key: 'gestion_paiements', label: 'Gestion des paiements', valider: true },
];

/** Profils (rôles) et leurs libellés affichés. */
export const PROFILE_LABELS: Record<string, string> = {
  ADMIN_GENERAL: 'Administrateur Général',
  ADMINISTRATEUR: 'Administrateur',
  EXPLOITANT: 'Exploitant',
  COMPTABLE: 'Comptable',
  CHAUFFEUR: 'Chauffeur',
  PERSONNALISE: 'Personnalisé',
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
};

export const PROFILE_PERSONNALISE = 'PERSONNALISE';

export function emptyModulePermission(): ModulePermission {
  return {
    voir: false,
    ajouter: false,
    modifier: false,
    supprimer: false,
    exporter: false,
    imprimer: false,
    valider: false,
  };
}

export function emptyMatrix(): PermissionsMatrix {
  const matrix: PermissionsMatrix = {};
  for (const mod of MODULES) matrix[mod.key] = emptyModulePermission();
  return matrix;
}

export function fullModulePermission(valider: boolean): ModulePermission {
  return {
    voir: true,
    ajouter: true,
    modifier: true,
    supprimer: true,
    exporter: true,
    imprimer: true,
    valider,
  };
}

export function fullMatrix(): PermissionsMatrix {
  const matrix: PermissionsMatrix = {};
  for (const mod of MODULES) matrix[mod.key] = fullModulePermission(mod.valider);
  return matrix;
}
