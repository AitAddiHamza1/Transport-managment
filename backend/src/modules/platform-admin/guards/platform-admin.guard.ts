import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PLATFORM_MUST_CHANGE_PASSWORD_KEY } from '../decorators/allow-platform-must-change-password.decorator';
import type { AuthenticatedPlatformAdmin } from '../types/platform-user.type';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedPlatformAdmin }>();
    const user = request.user;

    if (!user || user.type !== 'PLATFORM_ADMIN') {
      throw new UnauthorizedException('Accès réservé aux administrateurs plateforme');
    }

    if (user.mustChangePassword) {
      const allowMustChangePassword = this.reflector.getAllAndOverride<boolean>(
        ALLOW_PLATFORM_MUST_CHANGE_PASSWORD_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!allowMustChangePassword) {
        throw new ForbiddenException(
          'Changement de mot de passe obligatoire. Veuillez changer votre mot de passe pour continuer.',
        );
      }
    }

    return true;
  }
}
