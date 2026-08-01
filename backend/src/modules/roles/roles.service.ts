import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

export const RESERVED_ROLE_NAMES = [
  'ADMIN_GENERAL',
  'ADMINISTRATEUR',
  'EXPLOITANT',
  'COMPTABLE',
  'CHAUFFEUR',
  'PERSONNALISE',
  'ADMIN',
  'GESTIONNAIRE',
  'OPERATEUR',
  'CONDUCTEUR',
];

export interface RoleWithCount {
  id: number;
  nom: string;
  description: string | null;
  userCount: number;
  isSystem: boolean;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto): Promise<RoleWithCount> {
    const trimmed = dto.nom.trim();
    this.validateRoleNameNotReserved(trimmed);

    // Vérification d'unicité insensible à la casse et aux espaces
    const existing = await this.prisma.role.findFirst({
      where: { nom: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`Un rôle nommé « ${trimmed} » existe déjà`);
    }

    try {
      const role = await this.prisma.role.create({
        data: {
          nom: trimmed,
          description: dto.description?.trim() || null,
        },
      });
      return {
        id: role.id,
        nom: role.nom,
        description: role.description,
        userCount: 0,
        isSystem: false,
      };
    } catch (error) {
      this.handleKnownErrors(error, trimmed);
      throw error;
    }
  }

  async findAll(query: QueryRoleDto): Promise<PaginatedResult<RoleWithCount>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.RoleWhereInput = query.search
      ? {
          OR: [
            { nom: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: {
          _count: { select: { users: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.role.count({ where }),
    ]);

    const formattedData: RoleWithCount[] = data.map((role) => {
      const normalizedName = role.nom.trim().toUpperCase();
      return {
        id: role.id,
        nom: role.nom,
        description: role.description,
        userCount: role._count.users,
        isSystem: RESERVED_ROLE_NAMES.includes(normalizedName),
      };
    });

    return { data: formattedData, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: number): Promise<RoleWithCount> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException(`Rôle #${id} introuvable`);
    }
    const normalizedName = role.nom.trim().toUpperCase();
    return {
      id: role.id,
      nom: role.nom,
      description: role.description,
      userCount: role._count.users,
      isSystem: RESERVED_ROLE_NAMES.includes(normalizedName),
    };
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleWithCount> {
    const existing = await this.findOne(id);
    if (existing.isSystem) {
      throw new ForbiddenException('Les rôles système ne peuvent pas être modifiés');
    }
    if (dto.nom) {
      const trimmed = dto.nom.trim();
      this.validateRoleNameNotReserved(trimmed);
      const duplicate = await this.prisma.role.findFirst({
        where: { nom: { equals: trimmed, mode: 'insensitive' }, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException(`Un rôle nommé « ${trimmed} » existe déjà`);
      }
    }
    try {
      const updated = await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.nom ? { nom: dto.nom.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        },
        include: { _count: { select: { users: true } } },
      });
      return {
        id: updated.id,
        nom: updated.nom,
        description: updated.description,
        userCount: updated._count.users,
        isSystem: false,
      };
    } catch (error) {
      this.handleKnownErrors(error, dto.nom);
      throw error;
    }
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.findOne(id);
    if (existing.isSystem) {
      throw new ForbiddenException('Les rôles système ne peuvent pas être supprimés');
    }

    // Explicit user count check before attempting delete
    const userCount = await this.prisma.user.count({ where: { idRole: id } });
    if (userCount > 0) {
      throw new ConflictException(
        `Ce rôle est attribué à ${userCount} utilisateur(s) et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.role.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce rôle est attribué à des utilisateurs et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  /** Valide qu'un nom de rôle ne tente pas d'imiter ou d'usurper un rôle système réservé. */
  private validateRoleNameNotReserved(nom: string): void {
    const normalized = nom.trim().toUpperCase();
    if (RESERVED_ROLE_NAMES.includes(normalized)) {
      throw new BadRequestException(`Le nom de rôle « ${nom.trim()} » est un nom système réservé`);
    }
  }

  /** Traduit les erreurs Prisma connues en exceptions HTTP explicites. */
  private handleKnownErrors(error: unknown, nom?: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(`Un rôle nommé « ${nom?.trim()} » existe déjà`);
    }
  }
}
