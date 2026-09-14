import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_PLATFORM_ROUTE_KEY } from '../../platform-admin/decorators/platform-route.decorator';
import { PlatformJwtAuthGuard } from '../../platform-admin/guards/platform-jwt-auth.guard';

/**
 * Guard JWT global (activé à l'étape d'authentification des routes tenant).
 * Respecte le décorateur @Public() pour laisser passer les routes ouvertes.
 * Respecte le décorateur @PlatformRoute() pour déléguer la sécurité aux guards plateforme dédiés.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isPlatformRoute = this.reflector.getAllAndOverride<boolean>(IS_PLATFORM_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPlatformRoute) {
      // Pour éviter qu'une route @PlatformRoute() oublie son PlatformJwtAuthGuard et devienne publique,
      // on vérifie que PlatformJwtAuthGuard est présent dans les métadonnées des guards du handler ou de la classe.
      const handlerGuards = Reflect.getMetadata('__guards__', context.getHandler()) || [];
      const classGuards = Reflect.getMetadata('__guards__', context.getClass()) || [];
      const allGuards = [...handlerGuards, ...classGuards];

      const hasPlatformJwtGuard = allGuards.some(
        (g: any) =>
          g === PlatformJwtAuthGuard ||
          g?.name === 'PlatformJwtAuthGuard' ||
          (typeof g === 'function' && g.name === 'PlatformJwtAuthGuard'),
      );

      if (!hasPlatformJwtGuard) {
        throw new UnauthorizedException('Accès refusé : Garde d’authentification plateforme manquant');
      }

      return true;
    }

    return super.canActivate(context);
  }
}
