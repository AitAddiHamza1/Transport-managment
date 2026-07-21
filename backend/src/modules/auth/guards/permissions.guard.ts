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
    // 1. Vérification si la route est marquée @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Récupération des métadonnées de permission (méthode > classe)
    const metadata = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucune métadonnée de permission n'est définie, la route authentifiée est autorisée.
    if (!metadata) {
      return true;
    }

    // 3. Récupération de l'utilisateur authentifié depuis request.user
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Session non authentifiée');
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
