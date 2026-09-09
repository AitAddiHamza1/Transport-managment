import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedPlatformAdmin, PlatformJwtPayload } from '../types/platform-user.type';

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.platformAccessSecret'),
    });
  }

  async validate(payload: PlatformJwtPayload): Promise<AuthenticatedPlatformAdmin> {
    if (!payload || payload.type !== 'PLATFORM_ADMIN' || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Token invalide : pas un jeton d’administration plateforme');
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || admin.statut !== 'ACTIF') {
      throw new UnauthorizedException('Session administrateur plateforme invalide ou compte inactif');
    }

    return {
      sub: admin.id,
      email: admin.email,
      nom: admin.nom,
      statut: admin.statut,
      mustChangePassword: admin.mustChangePassword,
      type: 'PLATFORM_ADMIN',
    };
  }
}
