/**
 * Permission types for Phase 4 frontend enforcement.
 *
 * ModuleKey is derived directly from the existing MODULES constant so it stays
 * in sync automatically whenever a module is added or removed from the backend mirror.
 */
import type { PermissionAction } from '../../constants/permissions';
import { MODULES } from '../../constants/permissions';

// Derive the union of valid module key strings from the shared MODULES constant.
// e.g. 'dashboard' | 'utilisateurs' | 'vehicules' | ...
export type ModuleKey = (typeof MODULES)[number]['key'];

export interface PermissionRequirement {
  readonly module: ModuleKey;
  readonly action: PermissionAction;
}

export type PermissionMode = 'all' | 'any';

// Re-export for convenience so callers only need to import from this module.
export type { PermissionAction };
