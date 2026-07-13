import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokensDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

type UserWithRole = {
  id: number;
  nom: string;
  email: string;
  motDePasse: string;
  statut: string;
  role: { nom: string };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  /** Inscription publique d'un utilisateur avec le rôle GESTIONNAIRE. */
  async register(dto: RegisterDto) {
    const role = await this.prisma.role.findUnique({
      where: { nom: 'GESTIONNAIRE' },
    });
    if (!role) {
      throw new InternalServerErrorException('Le rôle GESTIONNAIRE est introuvable');
    }

    return this.usersService.create({
      nom: dto.nom,
      email: dto.email,
      motDePasse: dto.password,
      idRole: role.id,
    });
  }

  /** Vérifie les identifiants et retourne l'utilisateur (avec rôle). */
  async validateUser(email: string, password: string): Promise<UserWithRole> {
    const user = (await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })) as UserWithRole | null;

    // Message générique : ne pas révéler si l'email existe.
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }
    const passwordOk = await bcrypt.compare(password, user.motDePasse);
    if (!passwordOk) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return user;
  }

  /** Connexion : met à jour la dernière connexion et émet les tokens. */
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.validateUser(dto.email, dto.password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { derniereConnexion: new Date() },
    });
    return this.buildTokens(user);
  }

  /** Réémet des tokens à partir d'un refresh token valide. */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    })) as UserWithRole | null;

    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif');
    }
    return this.buildTokens(user);
  }

  /** Profil de l'utilisateur authentifié (sans mot de passe). */
  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const { motDePasse, ...safe } = user;
    return safe;
  }

  /** Génère les tokens access + refresh. */
  private async buildTokens(user: UserWithRole): Promise<AuthTokensDto> {
    const payload = { sub: user.id, email: user.email, role: user.role.nom };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn', '15m'),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role.nom },
    };
  }
}
