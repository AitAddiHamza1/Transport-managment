import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import {
  emptyMatrix,
  normalizeMatrix,
  PROFILE_DEFAULTS,
  isSuperAdmin,
} from '../../common/permissions/permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';

const SALT_ROUNDS = 10;

/** Champs exposés (le mot de passe n'est jamais renvoyé). */
const userSelect = {
  id: true,
  nom: true,
  email: true,
  telephone: true,
  statut: true,
  permissions: true,
  derniereConnexion: true,
  creeLe: true,
  idRole: true,
  role: { select: { id: true, nom: true } },
} satisfies Prisma.UserSelect;

type UserView = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export interface UsersStats {
  total: number;
  actifs: number;
  inactifs: number;
  suspendus: number;
  parProfil: { profil: string; count: number }[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserView> {
    const role = await this.prisma.role.findUnique({ where: { id: dto.idRole } });
    if (!role) {
      throw new BadRequestException("Le rôle spécifié n'existe pas");
    }

    const motDePasse = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);
    const data: Prisma.UserUncheckedCreateInput = {
      nom: dto.nom.trim(),
      email: dto.email.trim(),
      telephone: dto.telephone?.trim() || null,
      motDePasse,
      idRole: dto.idRole,
      statut: dto.statut ?? 'ACTIF',
    };

    // Gestion des permissions selon le type de rôle
    const isPredefinedSystemRole =
      role.nom !== 'PERSONNALISE' &&
      Object.prototype.hasOwnProperty.call(PROFILE_DEFAULTS, role.nom);

    if (isPredefinedSystemRole) {
      data.permissions = Prisma.DbNull; // Les profils système prédéfinis utilisent leurs valeurs par défaut
    } else {
      // PERSONNALISE ou rôle sur mesure
      data.permissions = dto.permissions
        ? (normalizeMatrix(dto.permissions) as unknown as Prisma.InputJsonValue)
        : (emptyMatrix() as unknown as Prisma.InputJsonValue);
    }

    try {
      return await this.prisma.user.create({ data, select: userSelect });
    } catch (error) {
      this.handleKnownErrors(error, dto.email);
      throw error;
    }
  }

  async findAll(query: QueryUserDto): Promise<PaginatedResult<UserView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.UserWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.idRole ? { idRole: query.idRole } : {}),
      ...(query.search
        ? {
            OR: [
              { nom: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findStats(): Promise<UsersStats> {
    const [total, actifs, inactifs, suspendus, roles] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { statut: 'ACTIF' } }),
      this.prisma.user.count({ where: { statut: 'INACTIF' } }),
      this.prisma.user.count({ where: { statut: 'SUSPENDU' } }),
      this.prisma.role.findMany({ select: { id: true, nom: true } }),
    ]);

    const parProfil = await Promise.all(
      roles.map(async (r) => ({
        profil: r.nom,
        count: await this.prisma.user.count({ where: { idRole: r.id } }),
      })),
    );

    return { total, actifs, inactifs, suspendus, parProfil };
  }

  async findOne(id: number): Promise<UserView> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) {
      throw new NotFoundException(`Utilisateur #${id} introuvable`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto, actor?: AuthenticatedUser): Promise<UserView> {
    const existing = await this.findOne(id);

    // Auto-protection de l'acteur connecté
    if (actor && actor.sub === id) {
      // Aucun utilisateur ne peut modifier son propre rôle
      if (dto.idRole !== undefined && dto.idRole !== existing.idRole) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
      }
      // Aucun utilisateur ne peut modifier ses propres permissions
      if (dto.permissions !== undefined) {
        throw new BadRequestException('Vous ne pouvez pas modifier vos propres permissions');
      }
      if (dto.statut && dto.statut !== 'ACTIF') {
        throw new BadRequestException(
          'Vous ne pouvez pas désactiver ou suspendre votre propre compte',
        );
      }
    }

    return this.prisma
      .$transaction(
        async (tx) => {
          const isTargetAdminGeneral = isSuperAdmin(existing.role.nom);

          // Protection du dernier Administrateur Général lors d'un changement de rôle ou de statut
          if (isTargetAdminGeneral) {
            if (dto.idRole && dto.idRole !== existing.idRole) {
              const totalAdmins = await tx.user.count({
                where: { role: { nom: { in: ['ADMIN_GENERAL', 'ADMIN'] } } },
              });
              if (totalAdmins <= 1) {
                throw new ConflictException(
                  'Impossible de modifier le rôle du dernier Administrateur Général',
                );
              }
            }

            if (dto.statut && dto.statut !== 'ACTIF' && existing.statut === 'ACTIF') {
              const activeAdmins = await tx.user.count({
                where: {
                  role: { nom: { in: ['ADMIN_GENERAL', 'ADMIN'] } },
                  statut: 'ACTIF',
                },
              });
              if (activeAdmins <= 1) {
                throw new ConflictException(
                  'Impossible de désactiver le dernier Administrateur Général actif',
                );
              }
            }
          }

          const { motDePasse, permissions, ...rest } = dto;
          const data: Prisma.UserUncheckedUpdateInput = {
            ...(rest.nom ? { nom: rest.nom.trim() } : {}),
            ...(rest.email ? { email: rest.email.trim() } : {}),
            ...(rest.telephone !== undefined ? { telephone: rest.telephone?.trim() || null } : {}),
            ...(rest.idRole ? { idRole: rest.idRole } : {}),
            ...(rest.statut ? { statut: rest.statut } : {}),
          };

          if (motDePasse) {
            data.motDePasse = await bcrypt.hash(motDePasse, SALT_ROUNDS);
          }

          // Résolution du rôle cible (si modifié ou existant)
          const targetRole =
            dto.idRole && dto.idRole !== existing.idRole
              ? await tx.role.findUnique({ where: { id: dto.idRole } })
              : existing.role;

          if (!targetRole) {
            throw new BadRequestException("Le rôle spécifié n'existe pas");
          }

          const isPredefinedSystemRole =
            targetRole.nom !== 'PERSONNALISE' &&
            Object.prototype.hasOwnProperty.call(PROFILE_DEFAULTS, targetRole.nom);

          if (isPredefinedSystemRole) {
            data.permissions = Prisma.DbNull; // Réinitialise et ignore les permissions personnalisées sur rôle système
          } else if (permissions !== undefined) {
            data.permissions = normalizeMatrix(permissions) as unknown as Prisma.InputJsonValue;
          }

          return tx.user.update({ where: { id }, data, select: userSelect });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )
      .catch((error) => {
        this.handleKnownErrors(error, dto.email);
        throw error;
      });
  }

  async remove(id: number, actor?: AuthenticatedUser): Promise<{ id: number }> {
    const existing = await this.findOne(id);

    // Auto-protection : impossible de se supprimer soi-même
    if (actor && actor.sub === id) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const isTargetAdminGeneral = isSuperAdmin(existing.role.nom);

        if (isTargetAdminGeneral) {
          const totalAdmins = await tx.user.count({
            where: { role: { nom: { in: ['ADMIN_GENERAL', 'ADMIN'] } } },
          });
          if (totalAdmins <= 1) {
            throw new ConflictException(
              'Impossible de supprimer le dernier Administrateur Général',
            );
          }
        }

        await tx.user.delete({ where: { id } });
        return { id };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /** Traduit les erreurs Prisma connues en exceptions HTTP explicites. */
  private handleKnownErrors(error: unknown, email?: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(`L'e-mail « ${email?.trim()} » est déjà utilisé`);
      }
      if (error.code === 'P2003') {
        throw new BadRequestException("Le rôle spécifié n'existe pas");
      }
    }
  }
}
