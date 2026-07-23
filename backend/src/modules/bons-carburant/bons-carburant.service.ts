import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateBonCarburantDto } from './dto/create-bon-carburant.dto';
import { UpdateBonCarburantDto } from './dto/update-bon-carburant.dto';
import { QueryBonCarburantDto } from './dto/query-bon-carburant.dto';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface BonCarburantView {
  idBon: number;
  immatriculation: string;
  nomConducteur: string | null;
  nomStation: string | null;
  litres: number;
  prixParLitre: number;
  montantTotal: number;
  dateCarburant: string;
  vehicule?: CompactVehiculeSummary | null;
}

export interface BonCarburantStats {
  totalCount: number;
  totalLitres: number;
  totalMontant: number;
  prixMoyenLitre: number;
}

export function toBonCarburantView(bon: any): BonCarburantView {
  const litres = bon.litres !== undefined && bon.litres !== null ? Number(bon.litres) : 0;
  const prixParLitre =
    bon.prixParLitre !== undefined && bon.prixParLitre !== null ? Number(bon.prixParLitre) : 0;
  const montantTotal =
    bon.montantTotal !== undefined && bon.montantTotal !== null
      ? Number(bon.montantTotal)
      : litres * prixParLitre;

  return {
    idBon: bon.idBon,
    immatriculation: bon.immatriculation,
    nomConducteur: bon.nomConducteur ?? null,
    nomStation: bon.nomStation ?? null,
    litres,
    prixParLitre,
    montantTotal,
    dateCarburant: bon.dateCarburant
      ? new Date(bon.dateCarburant).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    vehicule: bon.vehicule
      ? {
          immatriculation: bon.vehicule.immatriculation,
          marque: bon.vehicule.marque ?? null,
          modele: bon.vehicule.modele ?? null,
          typeVehicule: bon.vehicule.typeVehicule,
          statut: bon.vehicule.statut,
        }
      : null,
  };
}

@Injectable()
export class BonsCarburantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBonCarburantDto): Promise<BonCarburantView> {
    const immatriculation = dto.immatriculation.trim().toUpperCase();
    const nomConducteur = dto.nomConducteur ? dto.nomConducteur.trim() : null;
    const nomStation = dto.nomStation ? dto.nomStation.trim() : null;

    if (!Number.isFinite(dto.litres) || dto.litres <= 0) {
      throw new BadRequestException(
        'La quantité de carburant en litres doit être un nombre positif',
      );
    }

    if (!Number.isFinite(dto.prixParLitre) || dto.prixParLitre <= 0) {
      throw new BadRequestException('Le prix par litre doit être un nombre positif');
    }

    // Verify vehicle existence
    const vehiculeExists = await this.prisma.vehicule.findUnique({
      where: { immatriculation },
    });
    if (!vehiculeExists) {
      throw new NotFoundException(
        `Le véhicule avec l'immatriculation "${immatriculation}" est introuvable`,
      );
    }

    const created = await this.prisma.bonCarburant.create({
      data: {
        immatriculation,
        nomConducteur,
        nomStation,
        litres: dto.litres,
        prixParLitre: dto.prixParLitre,
        dateCarburant: dto.dateCarburant ? new Date(dto.dateCarburant) : new Date(),
      },
      include: {
        vehicule: true,
      },
    });

    return toBonCarburantView(created);
  }

  async findAll(query: QueryBonCarburantDto): Promise<PaginatedResult<BonCarburantView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = [
      'idBon',
      'immatriculation',
      'nomConducteur',
      'nomStation',
      'litres',
      'prixParLitre',
      'montantTotal',
      'dateCarburant',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'idBon';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.BonCarburantWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { immatriculation: { contains: s, mode: 'insensitive' } },
        { nomConducteur: { contains: s, mode: 'insensitive' } },
        { nomStation: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.immatriculation) {
      where.immatriculation = { equals: query.immatriculation.trim(), mode: 'insensitive' };
    }

    if (query.nomConducteur) {
      where.nomConducteur = { contains: query.nomConducteur.trim(), mode: 'insensitive' };
    }

    if (query.nomStation) {
      where.nomStation = { contains: query.nomStation.trim(), mode: 'insensitive' };
    }

    if (query.dateFrom || query.dateTo) {
      where.dateCarburant = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bonCarburant.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicule: true,
        },
      }),
      this.prisma.bonCarburant.count({ where }),
    ]);

    return {
      data: data.map(toBonCarburantView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<BonCarburantStats> {
    const all = await this.prisma.bonCarburant.findMany({
      select: {
        litres: true,
        prixParLitre: true,
        montantTotal: true,
      },
    });

    const totalCount = all.length;
    let totalLitres = 0;
    let totalMontant = 0;

    for (const item of all) {
      const l = Number(item.litres);
      const p = Number(item.prixParLitre);
      const m =
        item.montantTotal !== null && item.montantTotal !== undefined
          ? Number(item.montantTotal)
          : l * p;
      totalLitres += l;
      totalMontant += m;
    }

    const prixMoyenLitre = totalLitres > 0 ? totalMontant / totalLitres : 0;

    return {
      totalCount,
      totalLitres: Math.round(totalLitres * 100) / 100,
      totalMontant: Math.round(totalMontant * 100) / 100,
      prixMoyenLitre: Math.round(prixMoyenLitre * 1000) / 1000,
    };
  }

  async findOne(idBon: number): Promise<BonCarburantView> {
    const bon = await this.prisma.bonCarburant.findUnique({
      where: { idBon },
      include: {
        vehicule: true,
      },
    });

    if (!bon) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    return toBonCarburantView(bon);
  }

  async update(idBon: number, dto: UpdateBonCarburantDto): Promise<BonCarburantView> {
    const existing = await this.prisma.bonCarburant.findUnique({ where: { idBon } });
    if (!existing) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    let immatriculation = existing.immatriculation;
    if (dto.immatriculation) {
      immatriculation = dto.immatriculation.trim().toUpperCase();
      const vehiculeExists = await this.prisma.vehicule.findUnique({
        where: { immatriculation },
      });
      if (!vehiculeExists) {
        throw new NotFoundException(
          `Le véhicule avec l'immatriculation "${immatriculation}" est introuvable`,
        );
      }
    }

    if (dto.litres !== undefined && (!Number.isFinite(dto.litres) || dto.litres <= 0)) {
      throw new BadRequestException(
        'La quantité de carburant en litres doit être un nombre positif',
      );
    }

    if (
      dto.prixParLitre !== undefined &&
      (!Number.isFinite(dto.prixParLitre) || dto.prixParLitre <= 0)
    ) {
      throw new BadRequestException('Le prix par litre doit être un nombre positif');
    }

    const updated = await this.prisma.bonCarburant.update({
      where: { idBon },
      data: {
        ...(dto.immatriculation ? { immatriculation } : {}),
        ...(dto.nomConducteur !== undefined
          ? { nomConducteur: dto.nomConducteur ? dto.nomConducteur.trim() : null }
          : {}),
        ...(dto.nomStation !== undefined
          ? { nomStation: dto.nomStation ? dto.nomStation.trim() : null }
          : {}),
        ...(dto.litres !== undefined ? { litres: dto.litres } : {}),
        ...(dto.prixParLitre !== undefined ? { prixParLitre: dto.prixParLitre } : {}),
        ...(dto.dateCarburant !== undefined
          ? { dateCarburant: dto.dateCarburant ? new Date(dto.dateCarburant) : new Date() }
          : {}),
      },
      include: {
        vehicule: true,
      },
    });

    return toBonCarburantView(updated);
  }

  async remove(idBon: number): Promise<{ idBon: number }> {
    const existing = await this.prisma.bonCarburant.findUnique({ where: { idBon } });
    if (!existing) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    await this.prisma.bonCarburant.delete({ where: { idBon } });
    return { idBon };
  }
}
