/**
 * Référentiel des permissions granulaires (module × action) et profils.
 * Partagé côté backend ; un miroir existe côté frontend (constants/permissions.ts).
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
  /** Le module supporte-t-il l'action « Valider » ? */
  valider: boolean;
}

/** Référentiel complet des modules de l'application. */
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

export const PROFILES = [
  'ADMIN_GENERAL',
  'ADMINISTRATEUR',
  'EXPLOITANT',
  'COMPTABLE',
  'CHAUFFEUR',
  'PERSONNALISE',
  'ADMIN',
  'GESTIONNAIRE',
] as const;

export type ProfileName = (typeof PROFILES)[number];

// ---------------------------------------------------------------------
// Fabriques de matrices
// ---------------------------------------------------------------------
function noneModule(): ModulePermission {
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

function fullModule(valider: boolean): ModulePermission {
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

export function emptyMatrix(): PermissionsMatrix {
  const matrix: PermissionsMatrix = {};
  for (const mod of MODULES) matrix[mod.key] = noneModule();
  return matrix;
}

/** Matrice « tout autorisé » (respecte la disponibilité de « valider »). */
export function fullMatrix(): PermissionsMatrix {
  const matrix: PermissionsMatrix = {};
  for (const mod of MODULES) matrix[mod.key] = fullModule(mod.valider);
  return matrix;
}

/** Complète une matrice partielle avec les modules manquants (à false). */
export function normalizeMatrix(input: unknown): PermissionsMatrix {
  const base = emptyMatrix();
  if (input && typeof input === 'object') {
    const provided = input as Record<string, Partial<ModulePermission>>;
    for (const mod of MODULES) {
      const p = provided[mod.key];
      if (p) {
        base[mod.key] = {
          voir: p.voir === true,
          ajouter: p.ajouter === true,
          modifier: p.modifier === true,
          supprimer: p.supprimer === true,
          exporter: p.exporter === true,
          imprimer: p.imprimer === true,
          valider: mod.valider ? p.valider === true : false,
        };
      }
    }
  }
  return base;
}

// ---------------------------------------------------------------------
// Permissions par défaut des profils prédéfinis
// ---------------------------------------------------------------------
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
  // L'administrateur ne gère PAS les utilisateurs (réservé à l'Admin Général).
  m.utilisateurs = noneModule();
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

export const PROFILE_DEFAULTS: Record<
  Exclude<ProfileName, 'ADMIN_GENERAL' | 'ADMIN'>,
  PermissionsMatrix
> = {
  ADMINISTRATEUR: administrateurDefaults(),
  EXPLOITANT: exploitantDefaults(),
  GESTIONNAIRE: exploitantDefaults(),
  COMPTABLE: comptableDefaults(),
  CHAUFFEUR: chauffeurDefaults(),
  PERSONNALISE: emptyMatrix(),
};

/**
 * Calcule la matrice EFFECTIVE d'un utilisateur.
 * - ADMIN_GENERAL / ADMIN : accès total.
 * - permissions stockées (non nulles) : utilisées telles quelles (profil Personnalisé ou override).
 * - sinon : valeurs par défaut du profil.
 */
export function computeEffectivePermissions(roleName: string, stored: unknown): PermissionsMatrix {
  if (roleName === 'ADMIN_GENERAL' || roleName === 'ADMIN') {
    return fullMatrix();
  }
  if (stored && typeof stored === 'object' && Object.keys(stored as object).length > 0) {
    return normalizeMatrix(stored);
  }
  const defaults = PROFILE_DEFAULTS[roleName as Exclude<ProfileName, 'ADMIN_GENERAL' | 'ADMIN'>];
  return defaults ? defaults : emptyMatrix();
}
