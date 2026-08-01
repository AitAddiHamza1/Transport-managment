/**
 * Pure permission evaluation functions.
 *
 * These functions have no React or Redux dependencies and can be used anywhere,
 * including unit tests, hooks, and route guards.
 *
 * All functions fail closed: they return `false` when data is missing,
 * null, undefined, or malformed. Missing permissions never imply access.
 */
import type { PermissionsMatrix, PermissionAction } from '../../constants/permissions';
import type { PermissionRequirement } from './types';

/**
 * Check whether a single module × action permission is granted.
 *
 * @param matrix - The user's full permissions matrix (may be null/undefined during loading).
 * @param isAdminGeneral - When true, bypasses all checks and returns true.
 * @param module - The module key to check (e.g. 'vehicules').
 * @param action - The action to check (default: 'voir').
 */
export function canCheck(
  matrix: PermissionsMatrix | null | undefined,
  isAdminGeneral: boolean,
  module: string,
  action: PermissionAction = 'voir',
): boolean {
  if (isAdminGeneral) return true;
  if (!matrix) return false;

  const modulePerms = matrix[module];
  if (!modulePerms || typeof modulePerms !== 'object') return false;

  return Boolean(modulePerms[action]);
}

/**
 * Check whether ANY of the given requirements are satisfied.
 * Returns true if at least one requirement passes.
 * Returns false for an empty requirements array.
 */
export function canAny(
  matrix: PermissionsMatrix | null | undefined,
  isAdminGeneral: boolean,
  requirements: ReadonlyArray<PermissionRequirement>,
): boolean {
  if (requirements.length === 0) return false;
  if (isAdminGeneral) return true;
  return requirements.some((req) => canCheck(matrix, false, req.module, req.action));
}

/**
 * Check whether ALL of the given requirements are satisfied.
 * Returns true only when every requirement passes.
 * Returns false for an empty requirements array.
 */
export function canAll(
  matrix: PermissionsMatrix | null | undefined,
  isAdminGeneral: boolean,
  requirements: ReadonlyArray<PermissionRequirement>,
): boolean {
  if (requirements.length === 0) return false;
  if (isAdminGeneral) return true;
  return requirements.every((req) => canCheck(matrix, false, req.module, req.action));
}
