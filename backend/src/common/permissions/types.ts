/**
 * Types pour le système de permissions du backend.
 *
 * ModuleKey et PermissionAction sont dérivés directement du référentiel `permissions.ts`
 * afin de rester synchronisés automatiquement sans duplication de chaînes.
 */
import { MODULES, type PermissionAction } from './permissions';

export type ModuleKey = (typeof MODULES)[number]['key'];
export type { PermissionAction };

export interface PermissionRequirement {
  readonly module: ModuleKey;
  readonly action: PermissionAction;
}

export type PermissionMode = 'all' | 'any';

/**
 * Structure normalisée unique pour les métadonnées de permission.
 * Utilisée aussi bien par `@RequirePermission` (shorthand) que `@RequirePermissions` (multi).
 */
export interface PermissionMetadata {
  readonly requirements: ReadonlyArray<PermissionRequirement>;
  readonly mode: PermissionMode;
}
