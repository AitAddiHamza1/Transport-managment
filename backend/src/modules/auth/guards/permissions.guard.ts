import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';
import { ALLOW_MUST_CHANGE_PASSWORD_KEY } from '../decorators/allow-must-change-password.decorator';
import { IS_PLATFORM_ROUTE_KEY } from '../../platform-admin/decorators/platform-route.decorator';
import { canAny, canAll } from '../../../common/permissions';
import type { PermissionMetadata } from '../../../common/permissions';
import type { AuthenticatedUser } from '../types/auth-user.type';

/**
 * Guard de contrôle d'accès granulaire par permission (module × action).
 *
 * Exécuté après JwtAuthGuard et RolesGuard.
 * Respecte le décorateur @Public() et le contournement Administrateur Général.
 *
 * Ordre de priorité des métadonnées (Reflector.getAllAndOverride) :
 * Les métadonnées au niveau de la méthode prévalent sur celles au niveau du contrôleur (classe).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformRoute = this.reflector.getAllAndOverride<boolean>(IS_PLATFORM_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPlatformRoute) {
      return true;
    }

    // 1. Vérification si la route est marquée @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Session non authentifiée');
    }

    // 3. Contrôle strict de changement de mot de passe obligatoire
    if (user.mustChangePassword) {
      const allowMustChangePassword = this.reflector.getAllAndOverride<boolean>(
        ALLOW_MUST_CHANGE_PASSWORD_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!allowMustChangePassword) {
        throw new ForbiddenException(
          'Changement de mot de passe obligatoire. Veuillez changer votre mot de passe pour continuer.',
        );
      }
    }

    // 4. Récupération des métadonnées de permission (méthode > classe)
    const metadata = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucune métadonnée de permission n'est définie, la route authentifiée est autorisée.
    if (!metadata) {
      return true;
    }

    // 4. Validation fail-closed des métadonnées
    if (
      !metadata.requirements ||
      !Array.isArray(metadata.requirements) ||
      metadata.requirements.length === 0
    ) {
      throw new ForbiddenException(
        'Vous ne disposez pas des autorisations nécessaires pour effectuer cette action.',
      );
    }

    // 5. Évaluation via l'évaluateur pur
    const allowed =
      metadata.mode === 'any'
        ? canAny(user.permissions, Boolean(user.isAdminGeneral), metadata.requirements)
        : canAll(user.permissions, Boolean(user.isAdminGeneral), metadata.requirements);

    if (!allowed) {
      throw new ForbiddenException(
        'Vous ne disposez pas des autorisations nécessaires pour effectuer cette action.',
      );
    }

    return true;
  }
}
