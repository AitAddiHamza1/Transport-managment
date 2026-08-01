/**
 * PermissionRoute — Route-level permission guard.
 *
 * Assumes the outer ProtectedRoute has already confirmed authentication.
 * This component only checks module × action permissions.
 *
 * Behavior:
 *  - Auth loading → FullScreenLoader (prevents flash of protected content)
 *  - Permission denied → ForbiddenState inline (URL preserved for audit trail)
 *  - Permission granted → renders <Outlet /> (when used as a Route element)
 *                          or children directly (when used as a wrapper)
 *
 * Usage as a Route element (recommended):
 *   <Route
 *     path="/conducteurs"
 *     element={
 *       <PermissionRoute module="conducteurs" action="voir">
 *         <DriversPage />
 *       </PermissionRoute>
 *     }
 *   />
 */
import type { ReactNode } from 'react';
import { FullScreenLoader } from '../shared/feedback/FullScreenLoader';
import { ForbiddenState } from '../shared/ForbiddenState';
import { usePermission } from '../../features/auth/usePermission';
import type { PermissionAction } from '../../constants/permissions';

interface PermissionRouteProps {
  module: string;
  action?: PermissionAction;
  children: ReactNode;
}

export function PermissionRoute({
  module,
  action = 'voir',
  children,
}: PermissionRouteProps) {
  const { can, isLoading } = usePermission();

  if (isLoading) {
    return <FullScreenLoader label="Vérification des accès…" />;
  }

  if (!can(module, action)) {
    return <ForbiddenState />;
  }

  return <>{children}</>;
}
