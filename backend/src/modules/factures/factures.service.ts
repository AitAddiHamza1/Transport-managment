import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateFactureDto } from './dto/create-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import { QueryFactureDto } from './dto/query-facture.dto';
import { generateInvoicePdfBuffer, sanitizeFilename } from './utils/facture-pdf.generator';

export interface CompactVoyageSummary {
  idVoyage: number;
  lieuChargement: string;
  lieuDechargement: string;
  statut: string;
  tracteur: string | null;
}

export interface FactureView {
  id: number;
  numeroFacture: string;
  nomClient: string;
  idVoyage: number | null;
  dateFacture: string;
  joursEcheance: number;
  dateEcheance: string | null;
  devise: string;
  sousTotal: number;
  tauxTva: number;
  montantTva: number;
  montantTotal: number;
  montantEnLettres: string | null;
  cheminPdf: string | null;
  notes: string | null;
  fichierJoint: string | null;
  creePar: number | null;
  statut: string;
  supprimeLe: string | null;
  voyage?: CompactVoyageSummary | null;
}

export interface FactureStats {
  totalFactures: number;
  totalSousTotal: number;
  totalTva: number;
  totalTtc: number;
  emisesCount: number;
  payeesCount: number;
  annuleesCount: number;
}

export function toFactureView(facture: any): FactureView {
  const sousTotal =
    facture.sousTotal !== undefined && facture.sousTotal !== null ? Number(facture.sousTotal) : 0;
  const tauxTva =
    facture.tauxTva !== undefined && facture.tauxTva !== null ? Number(facture.tauxTva) : 20.0;

  const calculatedTva = Math.round(sousTotal * (tauxTva / 100) * 100) / 100;
  const montantTva =
    facture.montantTva !== undefined && facture.montantTva !== null
      ? Number(facture.montantTva)
      : calculatedTva;

  const montantTotal =
    facture.montantTotal !== undefined && facture.montantTotal !== null
      ? Number(facture.montantTotal)
      : sousTotal + montantTva;

  // Determine computed status
  let statut = 'EMISE';
  if (facture.supprimeLe) {
    statut = 'ANNULEE';
  } else if (facture.creance?.statutPaiement === 'PAYE') {
    statut = 'PAYEE';
  } else if (facture.creance?.statutPaiement === 'PARTIEL') {
    statut = 'PARTIELLEMENT_PAYEE';
  } else if (facture.dateEcheance && new Date(facture.dateEcheance) < new Date()) {
    statut = 'EN_RETARD';
  }

  return {
    id: facture.id,
    numeroFacture: facture.numeroFacture,
    nomClient: facture.nomClient,
    idVoyage: facture.idVoyage ?? null,
    dateFacture: facture.dateFacture
      ? new Date(facture.dateFacture).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    joursEcheance: facture.joursEcheance ?? 30,
    dateEcheance: facture.dateEcheance
      ? new Date(facture.dateEcheance).toISOString().split('T')[0]
      : null,
    devise: facture.devise || 'MAD',
    sousTotal,
    tauxTva,
    montantTva,
    montantTotal,
    montantEnLettres: facture.montantEnLettres ?? null,
    cheminPdf: facture.cheminPdf ?? null,
    notes: facture.notes ?? null,
    fichierJoint: facture.fichierJoint ?? null,
    creePar: facture.creePar ?? null,
    statut,
    supprimeLe: facture.supprimeLe ? new Date(facture.supprimeLe).toISOString() : null,
    voyage: facture.voyage
      ? {
          idVoyage: facture.voyage.idVoyage,
          lieuChargement: facture.voyage.lieuChargement,
          lieuDechargement: facture.voyage.lieuDechargement,
          statut: facture.voyage.statut,
          tracteur: facture.voyage.tracteur ?? null,
        }
      : null,
  };
}

@Injectable()
export class FacturesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNumeroFacture(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.facture.count();
    return `FAC-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async create(dto: CreateFactureDto, userId?: number): Promise<FactureView> {
    const nomClient = dto.nomClient.trim();
    if (!nomClient) {
      throw new BadRequestException('Le nom du client est obligatoire');
    }

    if (!Number.isFinite(dto.sousTotal) || dto.sousTotal < 0) {
      throw new BadRequestException('Le sous-total HT ne peut pas être négatif');
    }

    const tauxTva = dto.tauxTva !== undefined ? dto.tauxTva : 20.0;
    if (!Number.isFinite(tauxTva) || tauxTva < 0) {
      throw new BadRequestException('Le taux de TVA ne peut pas être négatif');
    }

    // Verify Voyage relation if idVoyage provided
    if (dto.idVoyage) {
      const voyageExists = await this.prisma.voyage.findUnique({
        where: { idVoyage: dto.idVoyage },
      });
      if (!voyageExists) {
        throw new NotFoundException(`Le voyage #${dto.idVoyage} est introuvable`);
      }
    }

    let numeroFacture = dto.numeroFacture ? dto.numeroFacture.trim().toUpperCase() : '';
    if (!numeroFacture) {
      numeroFacture = await this.generateNumeroFacture();
    }

    // Check duplicate numeroFacture
    const existingNum = await this.prisma.facture.findUnique({
      where: { numeroFacture },
    });
    if (existingNum) {
      throw new ConflictException(`Une facture avec le numéro "${numeroFacture}" existe déjà`);
    }

    try {
      const created = await this.prisma.facture.create({
        data: {
          numeroFacture,
          nomClient,
          idVoyage: dto.idVoyage ?? null,
          dateFacture: dto.dateFacture ? new Date(dto.dateFacture) : new Date(),
          joursEcheance: dto.joursEcheance ?? 30,
          sousTotal: dto.sousTotal,
          tauxTva,
          montantEnLettres: dto.montantEnLettres ? dto.montantEnLettres.trim() : null,
          notes: dto.notes ? dto.notes.trim() : null,
          creePar: userId ?? null,
        },
        include: {
          voyage: true,
          creance: true,
        },
      });

      return toFactureView(created);
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Une facture avec le numéro "${numeroFacture}" existe déjà`);
      }
      throw err;
    }
  }

  async findAll(query: QueryFactureDto): Promise<PaginatedResult<FactureView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = [
      'id',
      'numeroFacture',
      'nomClient',
      'dateFacture',
      'dateEcheance',
      'sousTotal',
      'montantTotal',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'id';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.FactureWhereInput = {
      // By default exclude soft-deleted items unless ANNULEE is requested
      supprimeLe: query.statut === 'ANNULEE' ? { not: null } : null,
    };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroFacture: { contains: s, mode: 'insensitive' } },
        { nomClient: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.nomClient) {
      where.nomClient = { contains: query.nomClient.trim(), mode: 'insensitive' };
    }

    if (query.idVoyage) {
      where.idVoyage = query.idVoyage;
    }

    if (query.dateFrom || query.dateTo) {
      where.dateFacture = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.facture.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          voyage: true,
          creance: true,
        },
      }),
      this.prisma.facture.count({ where }),
    ]);

    return {
      data: data.map(toFactureView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<FactureStats> {
    const [activeFactures, annuleesCount] = await Promise.all([
      this.prisma.facture.findMany({
        where: { supprimeLe: null },
        include: { creance: true },
      }),
      this.prisma.facture.count({
        where: { supprimeLe: { not: null } },
      }),
    ]);

    let totalSousTotal = 0;
    let totalTva = 0;
    let totalTtc = 0;
    let emisesCount = 0;
    let payeesCount = 0;

    for (const item of activeFactures) {
      const view = toFactureView(item);
      totalSousTotal += view.sousTotal;
      totalTva += view.montantTva;
      totalTtc += view.montantTotal;

      if (view.statut === 'PAYEE') {
        payeesCount++;
      } else {
        emisesCount++;
      }
    }

    return {
      totalFactures: activeFactures.length,
      totalSousTotal: Math.round(totalSousTotal * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      totalTtc: Math.round(totalTtc * 100) / 100,
      emisesCount,
      payeesCount,
      annuleesCount,
    };
  }

  async findOne(id: number): Promise<FactureView> {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        voyage: true,
        creance: true,
      },
    });

    if (!facture) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    return toFactureView(facture);
  }

  async update(id: number, dto: UpdateFactureDto): Promise<FactureView> {
    const existing = await this.prisma.facture.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    if (existing.supprimeLe) {
      throw new BadRequestException(`La facture #${id} est annulée et ne peut plus être modifiée`);
    }

    if (dto.idVoyage) {
      const voyageExists = await this.prisma.voyage.findUnique({
        where: { idVoyage: dto.idVoyage },
      });
      if (!voyageExists) {
        throw new NotFoundException(`Le voyage #${dto.idVoyage} est introuvable`);
      }
    }

    if (dto.sousTotal !== undefined && (!Number.isFinite(dto.sousTotal) || dto.sousTotal < 0)) {
      throw new BadRequestException('Le sous-total HT ne peut pas être négatif');
    }

    if (dto.tauxTva !== undefined && (!Number.isFinite(dto.tauxTva) || dto.tauxTva < 0)) {
      throw new BadRequestException('Le taux de TVA ne peut pas être négatif');
    }

    let numeroFacture = existing.numeroFacture;
    if (dto.numeroFacture) {
      numeroFacture = dto.numeroFacture.trim().toUpperCase();
      if (numeroFacture !== existing.numeroFacture) {
        const dup = await this.prisma.facture.findUnique({ where: { numeroFacture } });
        if (dup) {
          throw new ConflictException(`Une facture avec le numéro "${numeroFacture}" existe déjà`);
        }
      }
    }

    try {
      const updated = await this.prisma.facture.update({
        where: { id },
        data: {
          ...(dto.numeroFacture ? { numeroFacture } : {}),
          ...(dto.nomClient ? { nomClient: dto.nomClient.trim() } : {}),
          ...(dto.idVoyage !== undefined ? { idVoyage: dto.idVoyage } : {}),
          ...(dto.dateFacture ? { dateFacture: new Date(dto.dateFacture) } : {}),
          ...(dto.joursEcheance !== undefined ? { joursEcheance: dto.joursEcheance } : {}),
          ...(dto.sousTotal !== undefined ? { sousTotal: dto.sousTotal } : {}),
          ...(dto.tauxTva !== undefined ? { tauxTva: dto.tauxTva } : {}),
          ...(dto.montantEnLettres !== undefined
            ? { montantEnLettres: dto.montantEnLettres ? dto.montantEnLettres.trim() : null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
        },
        include: {
          voyage: true,
          creance: true,
        },
      });

      return toFactureView(updated);
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Une facture avec le numéro "${numeroFacture}" existe déjà`);
      }
      throw err;
    }
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const existing = await this.prisma.facture.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    // Soft delete implementation: set supprimeLe timestamp
    await this.prisma.facture.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { id, message: `Facture #${id} annulée avec succès (Soft delete)` };
  }

  async generatePdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const facture = await this.findOne(id);
    if (facture.supprimeLe) {
      throw new NotFoundException(`Facture #${id} annulée ou introuvable`);
    }

    const client = await this.prisma.client.findFirst({
      where: { nomEntreprise: { equals: facture.nomClient, mode: 'insensitive' } },
    });

    const buffer = await generateInvoicePdfBuffer(facture, client);
    const rawFilename = `Facture-${facture.numeroFacture}.pdf`;
    const filename = sanitizeFilename(rawFilename);

    return { buffer, filename };
  }
}
