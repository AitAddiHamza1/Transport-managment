import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ClientStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { UpdateFournisseurStatusDto } from './dto/update-fournisseur-status.dto';
import { QueryFournisseurDto } from './dto/query-fournisseur.dto';

export interface FournisseurView {
  id: number;
  nomFournisseur: string;
  ice: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  statut: ClientStatut;
  creeLe: Date;
}

export interface FournisseurStats {
  total: number;
  actifs: number;
  inactifs: number;
  bloques: number;
}

export function toFournisseurView(fournisseur: any): FournisseurView {
  return {
    id: fournisseur.id,
    nomFournisseur: fournisseur.nomFournisseur,
    ice: fournisseur.ice ?? null,
    telephone: fournisseur.telephone ?? null,
    email: fournisseur.email ?? null,
    adresse: fournisseur.adresse ?? null,
    statut: fournisseur.statut,
    creeLe: fournisseur.creeLe,
  };
}

@Injectable()
export class FournisseursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFournisseurDto): Promise<FournisseurView> {
    const nomFournisseur = dto.nomFournisseur.trim();
    const ice = dto.ice ? dto.ice.trim().toUpperCase() : null;
    const telephone = dto.telephone ? dto.telephone.trim() : null;
    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    const adresse = dto.adresse ? dto.adresse.trim() : null;

    // Check duplicate nomFournisseur
    const existingName = await this.prisma.fournisseur.findUnique({
      where: { nomFournisseur },
    });
    if (existingName) {
      throw new ConflictException(
        `Un fournisseur avec la raison sociale "${nomFournisseur}" existe déjà`,
      );
    }

    // Check duplicate ICE
    if (ice) {
      const existingIce = await this.prisma.fournisseur.findUnique({ where: { ice } });
      if (existingIce) {
        throw new ConflictException(`Un fournisseur avec l'ICE "${ice}" existe déjà`);
      }
    }

    try {
      const created = await this.prisma.fournisseur.create({
        data: {
          nomFournisseur,
          ice,
          telephone,
          email,
          adresse,
          statut: dto.statut ?? ClientStatut.ACTIF,
        },
      });
      return toFournisseurView(created);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async findAll(query: QueryFournisseurDto): Promise<PaginatedResult<FournisseurView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.FournisseurWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { nomFournisseur: { contains: s, mode: 'insensitive' } },
        { ice: { contains: s, mode: 'insensitive' } },
        { telephone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { adresse: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fournisseur.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fournisseur.count({ where }),
    ]);

    return {
      data: data.map(toFournisseurView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<FournisseurStats> {
    const [total, actifs, inactifs, bloques] = await Promise.all([
      this.prisma.fournisseur.count(),
      this.prisma.fournisseur.count({ where: { statut: ClientStatut.ACTIF } }),
      this.prisma.fournisseur.count({ where: { statut: ClientStatut.INACTIF } }),
      this.prisma.fournisseur.count({ where: { statut: ClientStatut.BLOQUE } }),
    ]);

    return { total, actifs, inactifs, bloques };
  }

  async findOne(id: number): Promise<FournisseurView> {
    const fournisseur = await this.prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur #${id} introuvable`);
    }

    return toFournisseurView(fournisseur);
  }

  async update(id: number, dto: UpdateFournisseurDto): Promise<FournisseurView> {
    const existing = await this.prisma.fournisseur.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Fournisseur #${id} introuvable`);
    }

    const updatedName = dto.nomFournisseur ? dto.nomFournisseur.trim() : undefined;
    if (updatedName && updatedName !== existing.nomFournisseur) {
      const nameConflict = await this.prisma.fournisseur.findUnique({
        where: { nomFournisseur: updatedName },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Un fournisseur avec la raison sociale "${updatedName}" existe déjà`,
        );
      }
    }

    const updatedIce =
      dto.ice !== undefined ? (dto.ice ? dto.ice.trim().toUpperCase() : null) : undefined;
    if (updatedIce && updatedIce !== existing.ice) {
      const iceConflict = await this.prisma.fournisseur.findUnique({ where: { ice: updatedIce } });
      if (iceConflict) {
        throw new ConflictException(`Un fournisseur avec l'ICE "${updatedIce}" existe déjà`);
      }
    }

    try {
      const updated = await this.prisma.fournisseur.update({
        where: { id },
        data: {
          ...(updatedName ? { nomFournisseur: updatedName } : {}),
          ...(updatedIce !== undefined ? { ice: updatedIce } : {}),
          ...(dto.telephone !== undefined
            ? { telephone: dto.telephone ? dto.telephone.trim() : null }
            : {}),
          ...(dto.email !== undefined
            ? { email: dto.email ? dto.email.trim().toLowerCase() : null }
            : {}),
          ...(dto.adresse !== undefined
            ? { adresse: dto.adresse ? dto.adresse.trim() : null }
            : {}),
          ...(dto.statut ? { statut: dto.statut } : {}),
        },
      });
      return toFournisseurView(updated);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateFournisseurStatusDto): Promise<FournisseurView> {
    const existing = await this.prisma.fournisseur.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Fournisseur #${id} introuvable`);
    }

    if (existing.statut === dto.statut) {
      return toFournisseurView(existing);
    }

    const updated = await this.prisma.fournisseur.update({
      where: { id },
      data: { statut: dto.statut },
    });

    return toFournisseurView(updated);
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Fournisseur #${id} introuvable`);
    }

    // Relation checks by supplier name in DetteFournisseur & PaiementFournisseur
    const [dettesCount, paiementsCount] = await Promise.all([
      this.prisma.detteFournisseur.count({
        where: { nomFournisseur: existing.nomFournisseur },
      }),
      this.prisma.paiementFournisseur.count({
        where: { nomFournisseur: existing.nomFournisseur },
      }),
    ]);

    if (dettesCount > 0) {
      throw new ConflictException(
        `Ce fournisseur est associé à ${dettesCount} dette(s) et ne peut pas être supprimé`,
      );
    }

    if (paiementsCount > 0) {
      throw new ConflictException(
        `Ce fournisseur est associé à ${paiementsCount} paiement(s) et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.fournisseur.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce fournisseur est associé à des enregistrements dépendants et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  private handlePrismaErrors(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        'Un fournisseur avec des identifiants similaires (nom ou ICE) existe déjà',
      );
    }
  }
}
