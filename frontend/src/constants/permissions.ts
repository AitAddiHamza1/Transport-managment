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
  { key: 'paiements_fournisseurs', label: 'Règlements fournisseurs', valider: true },
  { key: 'gestion_paiements', label: 'Trésorerie', valider: true },
  { key: 'parametres_entreprise', label: 'Paramètres de l’entreprise', valider: false },
  { key: 'employes', label: 'Employés', valider: false },
  { key: 'paiements_employes', label: 'Paiements employés', valider: false },
  { key: 'traversees_maritimes', label: 'Tanger Med', valider: true },
  { key: 'cheques_lettres_change', label: 'Suivi des chèques/LC', valider: true },
  { key: 'stock_gasoil', label: 'Gestion du stock gasoil', valider: true },
  { key: 'carnet_entretien', label: 'Carnet d’entretien', valider: true },
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

function grant(
  matrix: PermissionsMatrix,
  keys: string[],
  actions: Partial<ModulePermission>,
): void {
  for (const key of keys) {
    const mod = MODULES.find((m) => m.key === key);
    if (!mod) continue;
    matrix[key] = {
      ...matrix[key],
      ...actions,
      valider: mod.valider ? (actions.valider ?? matrix[key].valider) : false,
    };
  }
}

const OPERATIONNEL = [
  'clients',
  'conducteurs',
  'vehicules',
  'documents_vehicules',
  'documents_conducteurs',
  'voyages',
  'bons_carburant',
  'depenses_vehicules',
  'traversees_maritimes',
  'stock_gasoil',
  'carnet_entretien',
];

const FINANCE = [
  'factures',
  'creances_clients',
  'paiements_clients',
  'fournisseurs',
  'dettes_fournisseurs',
  'paiements_fournisseurs',
  'gestion_paiements',
  'depenses_administratives',
  'cheques_lettres_change',
];

const ALL = {
  voir: true,
  ajouter: true,
  modifier: true,
  supprimer: true,
  exporter: true,
  imprimer: true,
  valider: true,
};

function administrateurDefaults(): PermissionsMatrix {
  const m = fullMatrix();
  m.utilisateurs = emptyModulePermission();
  return m;
}

function exploitantDefaults(): PermissionsMatrix {
  const m = emptyMatrix();
  grant(m, ['dashboard'], { voir: true });
  grant(m, OPERATIONNEL, ALL);
  return m;
}

function comptableDefaults(): PermissionsMatrix {
  const m = emptyMatrix();
  grant(m, ['dashboard'], { voir: true });
  grant(m, ['clients'], { voir: true, exporter: true, imprimer: true });
  grant(m, FINANCE, ALL);
  grant(m, ['paiements_employes'], { voir: true, ajouter: true, modifier: true, supprimer: false });
  return m;
}

function chauffeurDefaults(): PermissionsMatrix {
  const m = emptyMatrix();
  grant(m, ['dashboard'], { voir: true });
  grant(m, ['voyages'], { voir: true });
  grant(m, ['documents_conducteurs'], { voir: true });
  grant(m, ['bons_carburant'], { voir: true, ajouter: true });
  grant(m, ['depenses_vehicules'], { voir: true, ajouter: true });
  return m;
}

export const PROFILE_DEFAULTS: Record<string, PermissionsMatrix> = {
  ADMINISTRATEUR: administrateurDefaults(),
  EXPLOITANT: exploitantDefaults(),
  GESTIONNAIRE: exploitantDefaults(),
  COMPTABLE: comptableDefaults(),
  CHAUFFEUR: chauffeurDefaults(),
  PERSONNALISE: emptyMatrix(),
};

/**
 * Retourne la matrice des permissions effectives d'un rôle système prédéfini.
 * Pour ADMIN_GENERAL et ADMIN : retourne fullMatrix().
 * Pour un profil prédéfini (EXPLOITANT, etc.) : retourne ses valeurs par défaut.
 * Pour un profil PERSONNALISE ou rôle sur mesure : retourne emptyMatrix() car
 * leurs permissions sont gérées individuellement par utilisateur (Option B).
 */
export function getRoleEffectivePermissions(roleNom?: string | null): PermissionsMatrix {
  if (!roleNom) return emptyMatrix();
  const normalized = roleNom.trim().toUpperCase();
  if (normalized === 'ADMIN_GENERAL' || normalized === 'ADMIN') {
    return fullMatrix();
  }
  if (normalized in PROFILE_DEFAULTS) {
    return PROFILE_DEFAULTS[normalized];
  }
  return emptyMatrix();
}

