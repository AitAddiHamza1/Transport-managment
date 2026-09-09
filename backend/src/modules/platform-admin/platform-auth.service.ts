import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformChangePasswordDto } from './dto/platform-change-password.dto';
import type { PlatformJwtPayload, PlatformRefreshPayload } from './types/platform-user.type';

const SALT_ROUNDS = 10;

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validatePlatformAdmin(email: string, password: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (admin.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte administrateur plateforme inactif ou suspendu');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.motDePasse);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return admin;
  }

  async login(dto: PlatformLoginDto) {
    const admin = await this.validatePlatformAdmin(dto.email, dto.password);

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { derniereConnexion: new Date() },
    });

    return this.buildTokensAndCreateSession(admin.id, admin.email, admin.nom, admin.mustChangePassword);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Jeton de rafraîchissement requis');
    }

    let payload: PlatformRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<PlatformRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.platformRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide ou expiré');
    }

    if (!payload || payload.type !== 'PLATFORM_REFRESH' || !payload.jti || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Type de jeton invalide');
    }

    const presentedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const newJti = crypto.randomUUID();

    // 1. Check existing session for reuse detection
    const existingSession = await this.prisma.platformRefreshSession.findUnique({
      where: { jti: payload.jti },
    });

    if (!existingSession) {
      throw new UnauthorizedException('Session de rafraîchissement invalide ou expirée');
    }

    // 2. Reuse Incident Response: Token was already consumed or revoked
    if (existingSession.consumedAt !== null || existingSession.revokedAt !== null) {
      await this.prisma.platformRefreshSession.updateMany({
        where: { platformAdminId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Tentative de réutilisation d’un jeton révoqué. Toutes les sessions ont été réinitialisées par sécurité.',
      );
    }

    // 3. Atomic compare-and-set database operation + replacement creation inside ONE Prisma Transaction
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.platformRefreshSession.updateMany({
        where: {
          jti: payload.jti,
          tokenHash: presentedHash,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          consumedAt: new Date(),
          replacedByJti: newJti,
        },
      });

      if (updateResult.count !== 1) {
        throw new UnauthorizedException('Session de rafraîchissement invalide ou expirée');
      }

      const admin = await tx.platformAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!admin || admin.statut !== 'ACTIF') {
        throw new UnauthorizedException('Compte administrateur plateforme inactif');
      }

      return this.buildTokensAndCreateSession(
        admin.id,
        admin.email,
        admin.nom,
        admin.mustChangePassword,
        newJti,
        tx,
      );
    });
  }

  async me(adminId: number) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur plateforme introuvable');
    }

    return {
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      statut: admin.statut,
      mustChangePassword: admin.mustChangePassword,
      type: 'PLATFORM_ADMIN',
    };
  }

  async changePassword(adminId: number, dto: PlatformChangePasswordDto) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte administrateur plateforme introuvable ou inactif');
    }

    const isCurrentOk = await bcrypt.compare(dto.currentPassword, admin.motDePasse);
    if (!isCurrentOk) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, admin.motDePasse);
    if (isSamePassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent du mot de passe actuel');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.platformAdmin.update({
      where: { id: adminId },
      data: {
        motDePasse: hashedNewPassword,
        mustChangePassword: false,
      },
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  private async buildTokensAndCreateSession(
    adminId: number,
    email: string,
    nom: string,
    mustChangePassword: boolean,
    jtiOverride?: string,
    dbClient?: any,
  ) {
    const db = dbClient || this.prisma;
    const accessPayload: PlatformJwtPayload = {
      sub: adminId,
      email,
      type: 'PLATFORM_ADMIN',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('jwt.platformAccessSecret'),
      expiresIn: this.config.get<string>('jwt.platformAccessExpiresIn', '15m'),
    });

    const jti = jtiOverride || crypto.randomUUID();
    const refreshPayload: PlatformRefreshPayload = {
      sub: adminId,
      jti,
      type: 'PLATFORM_REFRESH',
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('jwt.platformRefreshSecret'),
      expiresIn: this.config.get<string>('jwt.platformRefreshExpiresIn', '7d'),
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh session to database
    await db.platformRefreshSession.create({
      data: {
        platformAdminId: adminId,
        jti,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: adminId,
        email,
        nom,
        mustChangePassword,
        type: 'PLATFORM_ADMIN',
      },
    };
  }
}

