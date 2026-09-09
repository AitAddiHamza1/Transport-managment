/**
 * usePermission — React hook for permission evaluation.
 *
 * Wraps Redux auth state and the pure permission evaluator.
 * Auth concerns (login/logout/user) remain in useAuth.
 *
 * The `can`, `canAny`, and `canAll` functions are stabilised with useCallback
 * so their references only change when the permission data changes (matrix or
 * isAdminGeneral). They do NOT change on unrelated re-renders.
 *
 * Dependency choice: [matrix, isAdminGeneral]
 * These are the exact values the evaluator reads. Using [user] would work too
 * (matrix and isAdminGeneral are derived from user), but it's less precise and
 * could theoretically include user properties (name, email) that are irrelevant
 * to permission evaluation.
 */
import { useCallback } from 'react';
import { useAppSelector } from '../../app/hooks';
import { canCheck, canAny, canAll } from '../../lib/permissions/evaluator';
import type { PermissionRequirement } from '../../lib/permissions/types';
import type { PermissionAction } from '../../constants/permissions';

export function usePermission() {
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);

  const isLoading = status === 'idle' || status === 'loading';
  const isAuthenticated = status === 'authenticated';

  // Extract only the values the evaluator actually uses.
  const matrix = user?.permissions ?? null;
  const isAdminGeneral = Boolean(user?.isAdminGeneral);

  /**
   * Check a single module × action permission.
   * Stable reference — only changes when matrix or isAdminGeneral changes.
   */
  const can = useCallback(
    (module: string, action: PermissionAction = 'voir'): boolean =>
      canCheck(matrix, isAdminGeneral, module, action),
    [matrix, isAdminGeneral],
  );

  /**
   * Check whether ANY of the given requirements are satisfied.
   * Stable reference — only changes when matrix or isAdminGeneral changes.
   */
  const canAnyFn = useCallback(
    (requirements: ReadonlyArray<PermissionRequirement>): boolean =>
      canAny(matrix, isAdminGeneral, requirements),
    [matrix, isAdminGeneral],
  );

  /**
   * Check whether ALL of the given requirements are satisfied.
   * Stable reference — only changes when matrix or isAdminGeneral changes.
   */
  const canAllFn = useCallback(
    (requirements: ReadonlyArray<PermissionRequirement>): boolean =>
      canAll(matrix, isAdminGeneral, requirements),
    [matrix, isAdminGeneral],
  );

  return {
    can,
    canAny: canAnyFn,
    canAll: canAllFn,
    isLoading,
    isAuthenticated,
  };
}
