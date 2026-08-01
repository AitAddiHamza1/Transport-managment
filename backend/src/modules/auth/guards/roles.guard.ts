import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { isSuperAdmin } from '../../../common/permissions/permissions';
import type { AuthenticatedUser } from '../types/auth-user.type';

/**
 * Guard de contrôle d'accès par rôle (RBAC).
 * À utiliser conjointement avec @Roles(...) une fois l'authentification active.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }
    if (user.isAdminGeneral || isSuperAdmin(user.role)) {
      return true;
    }
    return requiredRoles.includes(user.role);
  }
}
