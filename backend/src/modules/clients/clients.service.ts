import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ClientStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { QueryClientDto } from './dto/query-client.dto';

export interface ClientView {
  id: number;
  nomEntreprise: string;
  ice: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  delaiPaiementJours: number;
  limiteCredit: number;
  statut: ClientStatut;
}

export interface ClientStats {
  total: number;
  actifs: number;
  inactifs: number;
  bloques: number;
}

export function toClientView(client: any): ClientView {
  return {
    id: client.id,
    nomEntreprise: client.nomEntreprise,
    ice: client.ice ?? null,
    telephone: client.telephone ?? null,
    email: client.email ?? null,
    adresse: client.adresse ?? null,
    delaiPaiementJours: client.delaiPaiementJours,
    limiteCredit:
      client.limiteCredit !== undefined && client.limiteCredit !== null
        ? Number(client.limiteCredit)
        : 0,
    statut: client.statut,
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto): Promise<ClientView> {
    const nomEntreprise = dto.nomEntreprise.trim();
    const ice = dto.ice ? dto.ice.trim().toUpperCase() : null;
    const telephone = dto.telephone ? dto.telephone.trim() : null;
    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    const adresse = dto.adresse ? dto.adresse.trim() : null;

    if (ice) {
      const existingIce = await this.prisma.client.findUnique({ where: { ice } });
      if (existingIce) {
        throw new ConflictException(`Un client avec l'ICE "${ice}" existe déjà`);
      }
    }

    try {
      const created = await this.prisma.client.create({
        data: {
          nomEntreprise,
          ice,
          telephone,
          email,
          adresse,
          delaiPaiementJours: dto.delaiPaiementJours ?? 30,
          limiteCredit: dto.limiteCredit ?? 0,
          statut: dto.statut ?? ClientStatut.ACTIF,
        },
      });
      return toClientView(created);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async findAll(query: QueryClientDto): Promise<PaginatedResult<ClientView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.ClientWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { nomEntreprise: { contains: s, mode: 'insensitive' } },
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
      this.prisma.client.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map(toClientView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<ClientStats> {
    const [total, actifs, inactifs, bloques] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { statut: ClientStatut.ACTIF } }),
      this.prisma.client.count({ where: { statut: ClientStatut.INACTIF } }),
      this.prisma.client.count({ where: { statut: ClientStatut.BLOQUE } }),
    ]);

    return { total, actifs, inactifs, bloques };
  }

  async findOne(id: number): Promise<ClientView> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client #${id} introuvable`);
    }

    return toClientView(client);
  }

  async update(id: number, dto: UpdateClientDto): Promise<ClientView> {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Client #${id} introuvable`);
    }

    const updatedIce =
      dto.ice !== undefined ? (dto.ice ? dto.ice.trim().toUpperCase() : null) : undefined;

    if (updatedIce && updatedIce !== existing.ice) {
      const conflict = await this.prisma.client.findUnique({ where: { ice: updatedIce } });
      if (conflict) {
        throw new ConflictException(`Un client avec l'ICE "${updatedIce}" existe déjà`);
      }
    }

    try {
      const updated = await this.prisma.client.update({
        where: { id },
        data: {
          ...(dto.nomEntreprise ? { nomEntreprise: dto.nomEntreprise.trim() } : {}),
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
          ...(dto.delaiPaiementJours !== undefined
            ? { delaiPaiementJours: dto.delaiPaiementJours }
            : {}),
          ...(dto.limiteCredit !== undefined ? { limiteCredit: dto.limiteCredit } : {}),
          ...(dto.statut ? { statut: dto.statut } : {}),
        },
      });
      return toClientView(updated);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateClientStatusDto): Promise<ClientView> {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Client #${id} introuvable`);
    }

    if (existing.statut === dto.statut) {
      return toClientView(existing);
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { statut: dto.statut },
    });

    return toClientView(updated);
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Client #${id} introuvable`);
    }

    // Relation checks by company name (historical text match in Voyage & Facture)
    const [voyagesCount, facturesCount] = await Promise.all([
      this.prisma.voyage.count({
        where: { nomClient: existing.nomEntreprise },
      }),
      this.prisma.facture.count({
        where: { nomClient: existing.nomEntreprise },
      }),
    ]);

    if (voyagesCount > 0) {
      throw new ConflictException(
        `Ce client est associé à ${voyagesCount} voyage(s) dans l'historique et ne peut pas être supprimé`,
      );
    }

    if (facturesCount > 0) {
      throw new ConflictException(
        `Ce client est associé à ${facturesCount} facture(s) et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.client.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce client est associé à des enregistrements dépendants et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  private handlePrismaErrors(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Un client avec des identifiants similaires (ICE) existe déjà');
    }
  }
}
