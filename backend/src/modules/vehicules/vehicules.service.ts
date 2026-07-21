import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VehiculeStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { UpdateVehiculeStatusDto } from './dto/update-vehicule-status.dto';
import { QueryVehiculeDto } from './dto/query-vehicule.dto';

export interface VehiculeDocumentSummary {
  idDocument: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateExpiration: Date | null;
  statut: string;
}

export interface VehiculeView {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string | null;
  typeVehicule: string;
  annee: number | null;
  numeroChassis: string | null;
  capaciteCharge: number | null;
  statut: VehiculeStatut;
  creeLe: Date;
  documents?: VehiculeDocumentSummary[];
}

export interface VehiculeStats {
  total: number;
  disponibles: number;
  enVoyage: number;
  maintenance: number;
  horsService: number;
}

export function toVehiculeView(vehicule: any): VehiculeView {
  return {
    id: vehicule.id,
    immatriculation: vehicule.immatriculation,
    marque: vehicule.marque,
    modele: vehicule.modele ?? null,
    typeVehicule: vehicule.typeVehicule,
    annee: vehicule.annee ?? null,
    numeroChassis: vehicule.numeroChassis ?? null,
    capaciteCharge:
      vehicule.capaciteCharge !== null && vehicule.capaciteCharge !== undefined
        ? Number(vehicule.capaciteCharge)
        : null,
    statut: vehicule.statut,
    creeLe: vehicule.creeLe,
    documents: vehicule.documents
      ? vehicule.documents.map((doc: any) => ({
          idDocument: doc.idDocument,
          typeDocument: doc.typeDocument,
          numeroDocument: doc.numeroDocument ?? null,
          dateExpiration: doc.dateExpiration ?? null,
          statut: doc.statut,
        }))
      : undefined,
  };
}

@Injectable()
export class VehiculesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehiculeDto): Promise<VehiculeView> {
    const immatriculation = dto.immatriculation.trim().toUpperCase();
    const numeroChassis = dto.numeroChassis ? dto.numeroChassis.trim().toUpperCase() : null;

    // Check duplicate immatriculation
    const existingImmat = await this.prisma.vehicule.findUnique({
      where: { immatriculation },
    });
    if (existingImmat) {
      throw new ConflictException(`L'immatriculation « ${immatriculation} » est déjà utilisée`);
    }

    // Check duplicate chassis if provided
    if (numeroChassis) {
      const existingChassis = await this.prisma.vehicule.findUnique({
        where: { numeroChassis },
      });
      if (existingChassis) {
        throw new ConflictException(`Le numéro de châssis « ${numeroChassis} » est déjà utilisé`);
      }
    }

    try {
      const created = await this.prisma.vehicule.create({
        data: {
          immatriculation,
          marque: dto.marque.trim(),
          modele: dto.modele ? dto.modele.trim() : null,
          typeVehicule: dto.typeVehicule ? dto.typeVehicule.trim().toUpperCase() : 'CAMION',
          annee: dto.annee ?? null,
          numeroChassis,
          capaciteCharge:
            dto.capaciteCharge !== undefined && dto.capaciteCharge !== null
              ? dto.capaciteCharge
              : null,
          statut: dto.statut ?? VehiculeStatut.DISPONIBLE,
        },
      });
      return toVehiculeView(created);
    } catch (error) {
      this.handlePrismaErrors(error, immatriculation, numeroChassis ?? undefined);
      throw error;
    }
  }

  async findAll(query: QueryVehiculeDto): Promise<PaginatedResult<VehiculeView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.VehiculeWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { immatriculation: { contains: s, mode: 'insensitive' } },
        { marque: { contains: s, mode: 'insensitive' } },
        { modele: { contains: s, mode: 'insensitive' } },
        { numeroChassis: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.typeVehicule) {
      where.typeVehicule = { equals: query.typeVehicule.trim(), mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicule.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicule.count({ where }),
    ]);

    return {
      data: data.map(toVehiculeView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<VehiculeStats> {
    const [total, disponibles, enVoyage, maintenance, horsService] = await Promise.all([
      this.prisma.vehicule.count(),
      this.prisma.vehicule.count({ where: { statut: VehiculeStatut.DISPONIBLE } }),
      this.prisma.vehicule.count({ where: { statut: VehiculeStatut.EN_VOYAGE } }),
      this.prisma.vehicule.count({ where: { statut: VehiculeStatut.MAINTENANCE } }),
      this.prisma.vehicule.count({ where: { statut: VehiculeStatut.HORS_SERVICE } }),
    ]);

    return { total, disponibles, enVoyage, maintenance, horsService };
  }

  async findOne(id: number): Promise<VehiculeView> {
    const vehicule = await this.prisma.vehicule.findUnique({
      where: { id },
      include: {
        documents: {
          select: {
            idDocument: true,
            typeDocument: true,
            numeroDocument: true,
            dateExpiration: true,
            statut: true,
          },
          orderBy: { dateExpiration: 'asc' },
        },
      },
    });

    if (!vehicule) {
      throw new NotFoundException(`Véhicule #${id} introuvable`);
    }

    return toVehiculeView(vehicule);
  }

  async update(id: number, dto: UpdateVehiculeDto): Promise<VehiculeView> {
    const existing = await this.prisma.vehicule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Véhicule #${id} introuvable`);
    }

    let immatriculation = existing.immatriculation;
    if (dto.immatriculation) {
      immatriculation = dto.immatriculation.trim().toUpperCase();
      if (immatriculation !== existing.immatriculation) {
        const dupImmat = await this.prisma.vehicule.findUnique({ where: { immatriculation } });
        if (dupImmat) {
          throw new ConflictException(`L'immatriculation « ${immatriculation} » est déjà utilisée`);
        }
      }
    }

    let numeroChassis = existing.numeroChassis;
    if (dto.numeroChassis !== undefined) {
      numeroChassis = dto.numeroChassis ? dto.numeroChassis.trim().toUpperCase() : null;
      if (numeroChassis && numeroChassis !== existing.numeroChassis) {
        const dupChassis = await this.prisma.vehicule.findUnique({ where: { numeroChassis } });
        if (dupChassis) {
          throw new ConflictException(`Le numéro de châssis « ${numeroChassis} » est déjà utilisé`);
        }
      }
    }

    try {
      const updated = await this.prisma.vehicule.update({
        where: { id },
        data: {
          ...(dto.immatriculation ? { immatriculation } : {}),
          ...(dto.marque ? { marque: dto.marque.trim() } : {}),
          ...(dto.modele !== undefined ? { modele: dto.modele ? dto.modele.trim() : null } : {}),
          ...(dto.typeVehicule ? { typeVehicule: dto.typeVehicule.trim().toUpperCase() } : {}),
          ...(dto.annee !== undefined ? { annee: dto.annee } : {}),
          ...(dto.numeroChassis !== undefined ? { numeroChassis } : {}),
          ...(dto.capaciteCharge !== undefined ? { capaciteCharge: dto.capaciteCharge } : {}),
          ...(dto.statut ? { statut: dto.statut } : {}),
        },
      });
      return toVehiculeView(updated);
    } catch (error) {
      this.handlePrismaErrors(error, immatriculation, numeroChassis ?? undefined);
      throw error;
    }
  }

  async updateStatus(id: number, dto: UpdateVehiculeStatusDto): Promise<VehiculeView> {
    const existing = await this.prisma.vehicule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Véhicule #${id} introuvable`);
    }

    if (existing.statut === dto.statut) {
      return toVehiculeView(existing);
    }

    // Check active trips for the vehicle
    const activeTrip = await this.prisma.voyage.findFirst({
      where: {
        statut: 'EN_COURS',
        OR: [{ tracteur: existing.immatriculation }, { remorque: existing.immatriculation }],
      },
    });

    // Rule 1: Cannot manually set EN_VOYAGE if no active trip exists
    if (dto.statut === VehiculeStatut.EN_VOYAGE && !activeTrip) {
      throw new BadRequestException(
        "Le statut EN_VOYAGE ne peut être activé que lorsqu'un voyage est effectivement en cours pour ce véhicule",
      );
    }

    // Rule 2: Cannot manually set DISPONIBLE while an active trip is still in progress
    if (
      existing.statut === VehiculeStatut.EN_VOYAGE &&
      dto.statut === VehiculeStatut.DISPONIBLE &&
      activeTrip
    ) {
      throw new BadRequestException(
        `Ce véhicule est actuellement en voyage actif (#${activeTrip.idVoyage}) et ne peut pas être marqué DISPONIBLE tant que le voyage n'est pas clôturé`,
      );
    }

    const updated = await this.prisma.vehicule.update({
      where: { id },
      data: { statut: dto.statut },
    });

    return toVehiculeView(updated);
  }

  async remove(id: number): Promise<{ id: number }> {
    const existing = await this.prisma.vehicule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bonsCarburant: true,
            depenses: true,
            voyagesTracteur: true,
            voyagesRemorque: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Véhicule #${id} introuvable`);
    }

    if (existing._count.bonsCarburant > 0) {
      throw new ConflictException(
        `Ce véhicule est lié à ${existing._count.bonsCarburant} bon(s) de carburant et ne peut pas être supprimé`,
      );
    }

    if (existing._count.depenses > 0) {
      throw new ConflictException(
        `Ce véhicule est lié à ${existing._count.depenses} dépense(s) et ne peut pas être supprimé`,
      );
    }

    const totalVoyages = existing._count.voyagesTracteur + existing._count.voyagesRemorque;
    if (totalVoyages > 0) {
      throw new ConflictException(
        `Ce véhicule est associé à ${totalVoyages} voyage(s) dans l'historique et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.vehicule.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce véhicule est associé à des enregistrements dépendants et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  private handlePrismaErrors(error: unknown, immatriculation?: string, chassis?: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes('immatriculation')) {
        throw new ConflictException(`L'immatriculation « ${immatriculation} » est déjà utilisée`);
      }
      if (target.includes('numero_chassis') || target.includes('numeroChassis')) {
        throw new ConflictException(`Le numéro de châssis « ${chassis} » est déjà utilisé`);
      }
      throw new ConflictException('Un véhicule avec un identifiant identique existe déjà');
    }
  }
}
