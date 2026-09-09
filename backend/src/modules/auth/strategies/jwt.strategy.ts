import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { computeEffectivePermissions, isSuperAdmin } from '../../../common/permissions/permissions';
import type { AuthenticatedUser } from '../types/auth-user.type';

/** Contenu du token JWT (payload signé). */
export interface JwtPayload {
  sub: number; // id utilisateur
  email: string;
  role: string;
  companyId: number; // id entreprise (tenant)
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

  /** Valide le token : l'utilisateur et son entreprise doivent exister et être ACTIFS. Enrichit request.user. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || typeof payload.companyId !== 'number') {
      throw new UnauthorizedException('Token invalide : identifiant entreprise manquant');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, company: true },
    });
    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Session invalide');
    }
    if (!user.companyId || user.companyId !== payload.companyId) {
      throw new UnauthorizedException('Token invalide : incohérence d’entreprise');
    }
    if (user.company?.statut !== 'ACTIF') {
      throw new UnauthorizedException('Entreprise inactive ou suspendue');
    }
    const roleName = user.role.nom;
    const isAdminGeneral = isSuperAdmin(roleName);
    const permissions = computeEffectivePermissions(roleName, user.permissions);

    return {
      sub: user.id,
      email: user.email,
      role: roleName,
      nom: user.nom,
      companyId: user.companyId,
      mustChangePassword: user.mustChangePassword,
      isAdminGeneral,
      permissions,
    };
  }
}
