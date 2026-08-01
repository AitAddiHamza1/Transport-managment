import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ConducteurStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateConducteurDto } from './dto/create-conducteur.dto';
import { UpdateConducteurDto } from './dto/update-conducteur.dto';
import { UpdateConducteurStatusDto } from './dto/update-conducteur-status.dto';
import { QueryConducteurDto } from './dto/query-conducteur.dto';

export interface ConducteurDocumentSummary {
  id: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateExpiration: Date | null;
  statut: string;
}

export interface ConducteurView {
  id: number;
  nomConducteur: string;
  telephone: string | null;
  adresse: string | null;
  statut: ConducteurStatut;
  creeLe: Date;
  documents?: ConducteurDocumentSummary[];
}

export interface ConducteurStats {
  total: number;
  disponibles: number;
  enVoyage: number;
  indisponibles: number;
  inactifs: number;
}

export function toConducteurView(conducteur: any): ConducteurView {
  return {
    id: conducteur.id,
    nomConducteur: conducteur.nomConducteur,
    telephone: conducteur.telephone ?? null,
    adresse: conducteur.adresse ?? null,
    statut: conducteur.statut,
    creeLe: conducteur.creeLe,
    documents: conducteur.documents
      ? conducteur.documents.map((doc: any) => ({
          id: doc.id,
          typeDocument: doc.typeDocument,
          numeroDocument: doc.numeroDocument ?? null,
          dateExpiration: doc.dateExpiration ?? null,
          statut: doc.statut,
        }))
      : undefined,
  };
}

@Injectable()
export class ConducteursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConducteurDto): Promise<ConducteurView> {
    const nomConducteur = dto.nomConducteur.trim();
    const telephone = dto.telephone ? dto.telephone.trim() : null;
    const adresse = dto.adresse ? dto.adresse.trim() : null;

    try {
      const created = await this.prisma.conducteur.create({
        data: {
          nomConducteur,
          telephone,
          adresse,
          statut: dto.statut ?? ConducteurStatut.DISPONIBLE,
        },
      });
      return toConducteurView(created);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async findAll(query: QueryConducteurDto): Promise<PaginatedResult<ConducteurView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.ConducteurWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { nomConducteur: { contains: s, mode: 'insensitive' } },
        { telephone: { contains: s, mode: 'insensitive' } },
        { adresse: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.conducteur.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conducteur.count({ where }),
    ]);

    return {
      data: data.map(toConducteurView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<ConducteurStats> {
    const [total, disponibles, enVoyage, indisponibles, inactifs] = await Promise.all([
      this.prisma.conducteur.count(),
      this.prisma.conducteur.count({ where: { statut: ConducteurStatut.DISPONIBLE } }),
      this.prisma.conducteur.count({ where: { statut: ConducteurStatut.EN_VOYAGE } }),
      this.prisma.conducteur.count({ where: { statut: ConducteurStatut.INDISPONIBLE } }),
      this.prisma.conducteur.count({ where: { statut: ConducteurStatut.INACTIF } }),
    ]);

    return { total, disponibles, enVoyage, indisponibles, inactifs };
  }

  async findOne(id: number): Promise<ConducteurView> {
    const conducteur = await this.prisma.conducteur.findUnique({
      where: { id },
      include: {
        documents: {
          select: {
            id: true,
            typeDocument: true,
            numeroDocument: true,
            dateExpiration: true,
            statut: true,
          },
          orderBy: { dateExpiration: 'asc' },
        },
      },
    });

    if (!conducteur) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    return toConducteurView(conducteur);
  }

  async update(id: number, dto: UpdateConducteurDto): Promise<ConducteurView> {
    const existing = await this.prisma.conducteur.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    try {
      const updated = await this.prisma.conducteur.update({
        where: { id },
        data: {
          ...(dto.nomConducteur ? { nomConducteur: dto.nomConducteur.trim() } : {}),
          ...(dto.telephone !== undefined
            ? { telephone: dto.telephone ? dto.telephone.trim() : null }
            : {}),
          ...(dto.adresse !== undefined
            ? { adresse: dto.adresse ? dto.adresse.trim() : null }
            : {}),
          ...(dto.statut ? { statut: dto.statut } : {}),
        },
      });
      return toConducteurView(updated);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateConducteurStatusDto): Promise<ConducteurView> {
    const existing = await this.prisma.conducteur.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    if (existing.statut === dto.statut) {
      return toConducteurView(existing);
    }

    // Check active trips for this driver
    const activeTrip = await this.prisma.voyage.findFirst({
      where: {
        statut: 'EN_COURS',
        nomConducteur: existing.nomConducteur,
      },
    });

    // Rule 1: Cannot manually set EN_VOYAGE
    if (dto.statut === ConducteurStatut.EN_VOYAGE) {
      throw new BadRequestException(
        'Le statut EN_VOYAGE est géré automatiquement par les voyages.',
      );
    }

    // Rule 2: Cannot manually set DISPONIBLE while an active trip is still in progress
    if (
      existing.statut === ConducteurStatut.EN_VOYAGE &&
      dto.statut === ConducteurStatut.DISPONIBLE &&
      activeTrip
    ) {
      throw new BadRequestException(
        `Ce conducteur est actuellement en voyage actif (#${activeTrip.idVoyage}) et ne peut pas être marqué DISPONIBLE tant que le voyage n'est pas clôturé`,
      );
    }

    const updated = await this.prisma.conducteur.update({
      where: { id },
      data: { statut: dto.statut },
    });

    return toConducteurView(updated);
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.conducteur.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    // Relation checks: Voyages and Bons Carburant by driver name
    const [voyagesCount, bonsCount] = await Promise.all([
      this.prisma.voyage.count({
        where: { nomConducteur: existing.nomConducteur },
      }),
      this.prisma.bonCarburant.count({
        where: { nomConducteur: existing.nomConducteur },
      }),
    ]);

    if (voyagesCount > 0) {
      throw new ConflictException(
        `Ce conducteur est associé à ${voyagesCount} voyage(s) dans l'historique et ne peut pas être supprimé`,
      );
    }

    if (bonsCount > 0) {
      throw new ConflictException(
        `Ce conducteur est lié à ${bonsCount} bon(s) de carburant et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.conducteur.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce conducteur est associé à des enregistrements dépendants et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  private handlePrismaErrors(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Un conducteur avec des identifiants similaires existe déjà');
    }
  }
}
