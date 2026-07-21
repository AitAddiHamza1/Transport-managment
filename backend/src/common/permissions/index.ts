/**
 * Point d'entrée unique du module common/permissions.
 * Re-exporte les types, le référentiel et l'évaluateur pur sans ambiguïté.
 */
export * from './permissions';
export type { ModuleKey, PermissionRequirement, PermissionMode, PermissionMetadata } from './types';
export * from './evaluator';
