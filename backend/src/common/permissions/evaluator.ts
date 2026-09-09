/**
 * Fonctions d'évaluation pures des permissions.
 *
 * Ces fonctions n'ont aucune dépendance NestJS ni Prisma. Elles fonctionnent de manière
 * purement synchrone et appliquent le principe de sécurité « Fail-Closed » : en cas d'absence
 * de données, d'objet malformé ou de tableau d'exigences vide, l'accès est refusé (false).
 */
import type { PermissionsMatrix, PermissionAction } from './permissions';
import type { PermissionRequirement } from './types';

/**
 * Vérifie si une permission module × action spécifique est accordée.
 *
 * @param matrix - Matrice de permissions de l'utilisateur (peut être null/undefined).
 * @param isAdminGeneral - Si true, contourne toutes les vérifications et retourne true.
 * @param module - Clé du module à vérifier.
 * @param action - Action à vérifier (défaut : 'voir').
 */
export function canCheck(
  matrix: PermissionsMatrix | null | undefined,
  isAdminGeneral: boolean,
  module: string,
  action: PermissionAction = 'voir',
): boolean {
  if (isAdminGeneral) return true;
  if (!matrix || typeof matrix !== 'object') return false;

  const modulePerms = matrix[module];
  if (!modulePerms || typeof modulePerms !== 'object') return false;

  return modulePerms[action] === true;
}

/**
 * Vérifie si AU MOINS UNE des exigences fournies est satisfaite (mode 'any').
 * Un tableau d'exigences vide retourne false (fail-closed).
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
 * Vérifie si TOUTES les exigences fournies sont satisfaites (mode 'all').
 * Un tableau d'exigences vide retourne false (fail-closed).
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
