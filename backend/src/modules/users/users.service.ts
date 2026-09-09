import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
  computeEffectivePermissions,
  MODULES,
  PERMISSION_ACTIONS,
  type PermissionsMatrix,
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

  async create(companyId: number, dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserView> {
    if (!actor) {
      throw new UnauthorizedException('Session non authentifiée');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.idRole,
        OR: [{ companyId: null }, { companyId }],
      },
    });
    if (!role) {
      throw new BadRequestException("Le rôle spécifié n'existe pas ou n'est pas accessible");
    }

    // 1. Validation de l'attribution du rôle ADMIN_GENERAL
    this.assertCanAssignRole(actor, role.nom);

    // 2. Validation de la délégation des permissions
    this.assertPermissionsDelegable(actor, role.nom, dto.permissions);

    const motDePasse = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);
    const data: Prisma.UserUncheckedCreateInput = {
      companyId,
      nom: dto.nom.trim(),
      email: dto.email.trim(),
      telephone: dto.telephone?.trim() || null,
      motDePasse,
      idRole: dto.idRole,
      statut: dto.statut ?? 'ACTIF',
    };

    // Gestion des permissions selon le type de rôle
    const isPredefinedSystemRole =
      isSuperAdmin(role.nom) ||
      (role.nom !== 'PERSONNALISE' &&
        Object.prototype.hasOwnProperty.call(PROFILE_DEFAULTS, role.nom));

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

  async findAll(companyId: number, query: QueryUserDto): Promise<PaginatedResult<UserView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.UserWhereInput = {
      companyId,
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

  async findStats(companyId: number): Promise<UsersStats> {
    const [total, actifs, inactifs, suspendus, roles] = await Promise.all([
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.user.count({ where: { companyId, statut: 'ACTIF' } }),
      this.prisma.user.count({ where: { companyId, statut: 'INACTIF' } }),
      this.prisma.user.count({ where: { companyId, statut: 'SUSPENDU' } }),
      this.prisma.role.findMany({
        where: { OR: [{ companyId: null }, { companyId }] },
        select: { id: true, nom: true },
      }),
    ]);

    const parProfil = await Promise.all(
      roles.map(async (r) => ({
        profil: r.nom,
        count: await this.prisma.user.count({ where: { companyId, idRole: r.id } }),
      })),
    );

    return { total, actifs, inactifs, suspendus, parProfil };
  }

  async findOne(companyId: number, id: number): Promise<UserView> {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException(`Utilisateur #${id} introuvable`);
    }
    return user;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserView> {
    if (!actor) {
      throw new UnauthorizedException('Session non authentifiée');
    }

    const existing = await this.findOne(companyId, id);

    // 1. Auto-protection de l'acteur connecté
    if (actor.sub === id) {
      if (dto.idRole !== undefined && dto.idRole !== existing.idRole) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
      }
      if (dto.permissions !== undefined) {
        throw new BadRequestException('Vous ne pouvez pas modifier vos propres permissions');
      }
      if (dto.statut && dto.statut !== 'ACTIF') {
        throw new BadRequestException(
          'Vous ne pouvez pas désactiver ou suspendre votre propre compte',
        );
      }
    }

    // 2. Protection contre la modification d'un ADMIN_GENERAL par un non-admin
    this.assertCanModifyTarget(actor, existing.role.nom);

    return this.prisma
      .$transaction(
        async (tx) => {
          const isTargetAdminGeneral = isSuperAdmin(existing.role.nom);

          // 3. Résolution du rôle cible (si modifié)
          const targetRole =
            dto.idRole && dto.idRole !== existing.idRole
              ? await tx.role.findFirst({
                  where: { id: dto.idRole, OR: [{ companyId: null }, { companyId }] },
                })
              : existing.role;

          if (!targetRole) {
            throw new BadRequestException("Le rôle spécifié n'existe pas ou n'est pas accessible");
          }

          // 4. Validation du nouveau rôle s'il est modifié
          if (dto.idRole && dto.idRole !== existing.idRole) {
            this.assertCanAssignRole(actor, targetRole.nom);
          }

          // 5. Validation de la délégation des permissions
          this.assertPermissionsDelegable(actor, targetRole.nom, dto.permissions);

          // 6. Protection du dernier Administrateur Général lors d'un changement de rôle ou de statut
          if (isTargetAdminGeneral) {
            if (dto.idRole && dto.idRole !== existing.idRole) {
              const totalAdmins = await tx.user.count({
                where: { companyId, role: { nom: { in: ['ADMIN_GENERAL', 'ADMIN'] } } },
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
                  companyId,
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

          // 7. Réinitialisation du mot de passe par l'administrateur -> force mustChangePassword = true
          if (motDePasse) {
            data.motDePasse = await bcrypt.hash(motDePasse, SALT_ROUNDS);
            if (actor.sub !== id) {
              data.mustChangePassword = true;
            }
          }

          const isPredefinedSystemRole =
            isSuperAdmin(targetRole.nom) ||
            (targetRole.nom !== 'PERSONNALISE' &&
              Object.prototype.hasOwnProperty.call(PROFILE_DEFAULTS, targetRole.nom));

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

  async remove(companyId: number, id: number, actor: AuthenticatedUser): Promise<{ id: number }> {
    if (!actor) {
      throw new UnauthorizedException('Session non authentifiée');
    }

    const existing = await this.findOne(companyId, id);

    // 1. Auto-protection : impossible de se supprimer soi-même
    if (actor.sub === id) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    // 2. Protection contre la suppression d'un ADMIN_GENERAL par un non-admin
    this.assertCanModifyTarget(actor, existing.role.nom);

    return this.prisma.$transaction(
      async (tx) => {
        const isTargetAdminGeneral = isSuperAdmin(existing.role.nom);

        if (isTargetAdminGeneral) {
          const totalAdmins = await tx.user.count({
            where: { companyId, role: { nom: { in: ['ADMIN_GENERAL', 'ADMIN'] } } },
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

  /** Empêche les utilisateurs non-super-admins d'attribuer un rôle super-administrateur. */
  private assertCanAssignRole(actor: AuthenticatedUser, targetRoleName: string): void {
    if (isSuperAdmin(targetRoleName) && !actor.isAdminGeneral) {
      throw new ForbiddenException(
        'Seul un Administrateur Général peut attribuer le rôle Administrateur Général.',
      );
    }
  }

  /** Empêche les utilisateurs non-super-admins de modifier ou supprimer un Administrateur Général. */
  private assertCanModifyTarget(actor: AuthenticatedUser, targetUserRoleName: string): void {
    if (isSuperAdmin(targetUserRoleName) && !actor.isAdminGeneral) {
      throw new ForbiddenException(
        'Seul un Administrateur Général peut modifier ou supprimer un Administrateur Général.',
      );
    }
  }

  /** Valide qu'un utilisateur ne peut pas déléguer de permissions supérieures à ses propres autorisations. */
  private assertPermissionsDelegable(
    actor: AuthenticatedUser,
    targetRoleName: string,
    customPermissions?: PermissionsMatrix,
  ): void {
    if (actor.isAdminGeneral) {
      return; // Les Administrateurs Généraux disposent de tous les droits de délégation.
    }

    const targetPermissions = computeEffectivePermissions(targetRoleName, customPermissions);

    for (const mod of MODULES) {
      const actorMod = actor.permissions[mod.key];
      const targetMod = targetPermissions[mod.key];
      if (!targetMod) continue;

      for (const action of PERMISSION_ACTIONS) {
        if (targetMod[action] === true && (!actorMod || actorMod[action] !== true)) {
          throw new ForbiddenException(
            `Vous ne pouvez pas accorder des autorisations (« ${mod.label} : ${action} ») supérieures à vos propres autorisations.`,
          );
        }
      }
    }
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
