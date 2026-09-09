/**
 * Permission library public API.
 * Import from 'lib/permissions' rather than from individual files.
 */
export type { ModuleKey, PermissionRequirement, PermissionMode, PermissionAction } from './types';
export { canCheck, canAny, canAll } from './evaluator';
