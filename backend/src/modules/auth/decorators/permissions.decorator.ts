import { SetMetadata } from '@nestjs/common';
import type {
  ModuleKey,
  PermissionAction,
  PermissionRequirement,
  PermissionMode,
  PermissionMetadata,
} from '../../../common/permissions';

export const PERMISSION_KEY = 'permissions_metadata';

/**
 * Décorateur de permission raccourci pour une seule exigence module × action.
 * Normalise les métadonnées dans la structure unique `PermissionMetadata`.
 *
 * Usage : `@RequirePermission('utilisateurs', 'voir')`
 */
export function RequirePermission(module: ModuleKey, action: PermissionAction = 'voir') {
  const metadata: PermissionMetadata = {
    requirements: [{ module, action }],
    mode: 'all',
  };
  return SetMetadata(PERMISSION_KEY, metadata);
}

/**
 * Décorateur de permission multi-exigences.
 * Normalise les métadonnées dans la structure unique `PermissionMetadata`.
 *
 * Usage : `@RequirePermissions([{ module: 'utilisateurs', action: 'modifier' }], 'any')`
 */
export function RequirePermissions(
  requirements: ReadonlyArray<PermissionRequirement>,
  mode: PermissionMode = 'all',
) {
  const metadata: PermissionMetadata = {
    requirements,
    mode,
  };
  return SetMetadata(PERMISSION_KEY, metadata);
}
