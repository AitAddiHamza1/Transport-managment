import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { computeEffectivePermissions } from '../../../common/permissions/permissions';
import type { AuthenticatedUser } from '../types/auth-user.type';

/** Contenu du token JWT (payload signé). */
export interface JwtPayload {
  sub: number; // id utilisateur
  email: string;
  role: string;
}

export type { AuthenticatedUser };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') as string,
    });
  }

  /** Valide le token : l'utilisateur doit exister et être ACTIF. Enrichit request.user avec permissions. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Session invalide');
    }
    const roleName = user.role.nom;
    const isAdminGeneral = roleName === 'ADMIN_GENERAL' || roleName === 'ADMIN';
    const permissions = computeEffectivePermissions(roleName, user.permissions);

    return {
      sub: user.id,
      email: user.email,
      role: roleName,
      nom: user.nom,
      isAdminGeneral,
      permissions,
    };
  }
}
