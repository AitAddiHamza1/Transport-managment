import type { PermissionsMatrix } from '../../../common/permissions/permissions';

/**
 * Utilisateur authentifié rattaché à `request.user` par `JwtStrategy.validate()`.
 * Utilisé de façon centralisée et fortement typée par JwtStrategy, PermissionsGuard, RolesGuard
 * et le décorateur @CurrentUser().
 */
export interface AuthenticatedUser {
  /** ID de l'utilisateur (Prisma User.id) */
  sub: number;
  email: string;
  role: string;
  nom: string;
  /** True si l'utilisateur est un Administrateur Général (ADMIN_GENERAL ou ADMIN) */
  isAdminGeneral: boolean;
  /** Matrice complète des permissions effectives */
  permissions: PermissionsMatrix;
}
