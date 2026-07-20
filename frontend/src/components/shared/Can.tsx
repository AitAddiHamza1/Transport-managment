/**
 * Can — Declarative permission gate component.
 *
 * Supports two mutually exclusive APIs:
 *
 * Shorthand (single requirement):
 *   <Can module="vehicules" action="voir">...</Can>
 *
 * Multi-requirement:
 *   <Can requirements={[...]} mode="any">...</Can>
 *
 * Providing both APIs simultaneously is a developer error and will trigger
 * a console.error warning in development. TypeScript's discriminated union
 * enforces mutual exclusivity at the type level.
 *
 * While auth is loading, renders `loadingFallback` (default: null) to
 * prevent content flash. When denied, renders `fallback` (default: null).
 * Children are never mounted when access is denied — no CSS-only hiding.
 */
import type { ReactNode } from 'react';
import { usePermission } from '../../features/auth/usePermission';
import type { PermissionAction } from '../../constants/permissions';
import type { PermissionRequirement, PermissionMode } from '../../lib/permissions/types';

// ---------------------------------------------------------------------------
// Discriminated union — exactly one of the two shapes is valid
// ---------------------------------------------------------------------------

interface CanShorthandProps {
  /** Module key for the single-requirement shorthand. */
  module: string;
  /** Action for the single-requirement shorthand (default: 'voir'). */
  action?: PermissionAction;
  requirements?: never;
  mode?: never;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

interface CanMultiProps {
  module?: never;
  action?: never;
  /** Array of requirements to evaluate together using `mode`. */
  requirements: ReadonlyArray<PermissionRequirement>;
  /** 'all' — every requirement must pass. 'any' — at least one must pass. Default: 'all'. */
  mode?: PermissionMode;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export type CanProps = CanShorthandProps | CanMultiProps;

// ---------------------------------------------------------------------------

export function Can(props: CanProps) {
  const { can, canAny, canAll, isLoading } = usePermission();

  // Development-only invariant: both APIs must not be used simultaneously.
  // TypeScript prevents this at compile time; the runtime check is a safety net
  // for JavaScript consumers or type assertion misuse.
  if (import.meta.env.DEV) {
    if (props.module != null && props.requirements != null) {
      console.error(
        '[Can] Invalid usage: provide either (module + action) OR requirements, not both.',
      );
    }
  }

  const { children, fallback = null, loadingFallback = null } = props;

  // While auth is being restored, do not flash protected content.
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Evaluate permission.
  let allowed = false;

  if (props.requirements != null) {
    // Multi-requirement path
    const mode = props.mode ?? 'all';
    allowed = mode === 'any'
      ? canAny(props.requirements)
      : canAll(props.requirements);
  } else {
    // Shorthand path
    allowed = can(props.module, props.action ?? 'voir');
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
