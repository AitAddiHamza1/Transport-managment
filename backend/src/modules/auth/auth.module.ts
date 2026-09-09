import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Module d'authentification — JWT complet.
 * Guards enregistrés GLOBALEMENT dans l'ordre d'exécution :
 * 1. JwtAuthGuard — Authentifie la requête (gère @Public())
 * 2. RolesGuard — Applique le contrôle par rôle @Roles(...) si présent
 * 3. PermissionsGuard — Applique le contrôle granulaire @RequirePermission(...) si présent
 *
 * Note : UsersModule n'est plus importé ici. L'inscription publique a été supprimée.
 * La création d'utilisateurs passe exclusivement par POST /api/users (UsersController).
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiresIn', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
