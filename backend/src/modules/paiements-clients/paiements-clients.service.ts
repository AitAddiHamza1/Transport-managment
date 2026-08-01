import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, CreanceStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreatePaiementClientDto } from './dto/create-paiement-client.dto';
import { QueryPaiementClientDto } from './dto/query-paiement-client.dto';
import { CreancesClientsService } from '../creances-clients/creances-clients.service';

export interface CompactFactureForPaiement {
  id: number;
  numeroFacture: string;
  nomClient: string;
  sousTotal: number;
  montantTva: number;
  montantTotal: number;
  statut: string;
}

export interface CompactCreanceForPaiement {
  id: number;
  montantFacture: number;
  montantRecu: number;
  solde: number;
  statutPaiement: string;
}

export interface PaiementClientView {
  id: number;
  numeroFacture: string;
  nomClient: string;
  datePaiement: string;
  montantRecu: number;
  methodePaiement: string;
  facture?: CompactFactureForPaiement | null;
  creance?: CompactCreanceForPaiement | null;
}

export interface PaiementClientStats {
  totalPaiements: number;
  montantTotalRecu: number;
  methodesCount: Record<string, number>;
}

export function toPaiementView(paiement: any, creance?: any, facture?: any): PaiementClientView {
  const datePaiementStr = paiement.datePaiement
    ? new Date(paiement.datePaiement).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  let compactFacture: CompactFactureForPaiement | null = null;
  const f = facture || paiement.facture;
  if (f) {
    let statusStr = 'EMISE';
    if (f.supprimeLe) statusStr = 'ANNULEE';
    else if (creance?.statutPaiement === 'PAYE' || f.creance?.statutPaiement === 'PAYE')
      statusStr = 'PAYEE';
    else if (creance?.statutPaiement === 'PARTIEL' || f.creance?.statutPaiement === 'PARTIEL')
      statusStr = 'PARTIELLEMENT_PAYEE';

    compactFacture = {
      id: f.id,
      numeroFacture: f.numeroFacture,
      nomClient: f.nomClient,
      sousTotal: Number(f.sousTotal ?? 0),
      montantTva: Number(f.montantTva ?? 0),
      montantTotal: Number(f.montantTotal ?? 0),
      statut: statusStr,
    };
  }

  let compactCreance: CompactCreanceForPaiement | null = null;
  const c = creance || f?.creance;
  if (c) {
    const mf = Number(c.montantFacture ?? 0);
    const mr = Number(c.montantRecu ?? 0);
    compactCreance = {
      id: c.id,
      montantFacture: mf,
      montantRecu: mr,
      solde: c.solde !== undefined && c.solde !== null ? Number(c.solde) : Math.max(0, mf - mr),
      statutPaiement: String(c.statutPaiement),
    };
  }

  return {
    id: paiement.id,
    numeroFacture: paiement.numeroFacture,
    nomClient: paiement.nomClient,
    datePaiement: datePaiementStr,
    montantRecu: Number(paiement.montantRecu ?? 0),
    methodePaiement: String(paiement.methodePaiement),
    facture: compactFacture,
    creance: compactCreance,
  };
}

@Injectable()
export class PaiementsClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creancesService: CreancesClientsService,
  ) {}

  /**
   * Registers a new customer payment with concurrency-safe row-level locking (SELECT FOR UPDATE)
   * and exact Prisma.Decimal overpayment validation.
   */
  async create(dto: CreatePaiementClientDto): Promise<PaiementClientView> {
    if (!Number.isFinite(dto.montantRecu) || dto.montantRecu <= 0) {
      throw new BadRequestException('Le montant reçu doit être supérieur à 0');
    }

    const numeroFacture = dto.numeroFacture.trim().toUpperCase();
    const requestedDecimal = new Prisma.Decimal(dto.montantRecu);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch Facture to verify existence and soft-delete state
      const facture = await tx.facture.findUnique({
        where: { numeroFacture },
      });

      if (!facture) {
        throw new NotFoundException(`La facture "${numeroFacture}" est introuvable`);
      }

      if (facture.supprimeLe) {
        throw new BadRequestException(
          `La facture "${numeroFacture}" est annulée et ne peut plus recevoir de règlements`,
        );
      }

      // 2. Perform Row-Level Locking (SELECT ... FOR UPDATE) on mapped table creances_clients
      let lockedRows: any[] = await tx.$queryRaw`
        SELECT id, numero_facture, montant_facture, montant_recu, solde, statut_paiement
        FROM creances_clients
        WHERE numero_facture = ${numeroFacture}
        FOR UPDATE;
      `;

      // If no CreanceClient row exists yet, create it from invoice and lock it
      if (!lockedRows || lockedRows.length === 0) {
        const sousTotalNum = Number(facture.sousTotal);
        const tauxTvaNum = Number(facture.tauxTva);
        const montantTva = Math.round(sousTotalNum * (tauxTvaNum / 100) * 100) / 100;
        const montantTotal =
          facture.montantTotal !== null && facture.montantTotal !== undefined
            ? Number(facture.montantTotal)
            : sousTotalNum + montantTva;

        await this.creancesService.createFromInvoice(tx, {
          numeroFacture,
          nomClient: facture.nomClient,
          dateFacture: facture.dateFacture,
          joursEcheance: facture.joursEcheance,
          montantTotal,
          dateEcheance: facture.dateEcheance,
        });

        lockedRows = await tx.$queryRaw`
          SELECT id, numero_facture, montant_facture, montant_recu, solde, statut_paiement
          FROM creances_clients
          WHERE numero_facture = ${numeroFacture}
          FOR UPDATE;
        `;
      }

      const creanceRow = lockedRows[0];
      const currentMontantFacture = new Prisma.Decimal(creanceRow.montant_facture);
      const currentMontantRecu = new Prisma.Decimal(creanceRow.montant_recu);
      const currentSolde = currentMontantFacture.sub(currentMontantRecu);

      // 3. Exact Prisma.Decimal validation
      if (currentSolde.lessThanOrEqualTo(0) || creanceRow.statut_paiement === 'PAYE') {
        throw new ConflictException(
          `La créance pour la facture "${numeroFacture}" est déjà intégralement réglée`,
        );
      }

      if (requestedDecimal.greaterThan(currentSolde)) {
        throw new ConflictException(
          `Le montant du règlement (${requestedDecimal.toFixed(2)} MAD) dépasse le solde restant de la créance (${currentSolde.toFixed(2)} MAD)`,
        );
      }

      // 4. Calculate new financials using Prisma.Decimal
      const newMontantRecu = currentMontantRecu.add(requestedDecimal);
      const newSolde = currentMontantFacture.sub(newMontantRecu);

      let newStatut: CreanceStatut = CreanceStatut.PARTIEL;
      if (newSolde.lessThanOrEqualTo(0) || requestedDecimal.equals(currentSolde)) {
        newStatut = CreanceStatut.PAYE;
      }

      const datePaiement = dto.datePaiement ? new Date(dto.datePaiement) : new Date();
      const nomClient = dto.nomClient ? dto.nomClient.trim() : facture.nomClient;

      // 5. Insert immutable PaiementClient record
      const createdPaiement = await tx.paiementClient.create({
        data: {
          numeroFacture,
          nomClient,
          datePaiement,
          montantRecu: requestedDecimal,
          methodePaiement: dto.methodePaiement,
        },
      });

      // 6. Update CreanceClient summary record
      const updatedCreance = await tx.creanceClient.update({
        where: { id: Number(creanceRow.id) },
        data: {
          montantRecu: newMontantRecu,
          statutPaiement: newStatut,
        },
      });

      return {
        paiement: createdPaiement,
        creance: updatedCreance,
        facture,
      };
    });

    return toPaiementView(result.paiement, result.creance, result.facture);
  }

  /**
   * Strictly read-only paginated payments list query.
   */
  async findAll(query: QueryPaiementClientDto): Promise<PaginatedResult<PaiementClientView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = ['id', 'numeroFacture', 'nomClient', 'datePaiement', 'montantRecu'];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'id';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.PaiementClientWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroFacture: { contains: s, mode: 'insensitive' } },
        { nomClient: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.nomClient) {
      where.nomClient = { contains: query.nomClient.trim(), mode: 'insensitive' };
    }

    if (query.numeroFacture) {
      where.numeroFacture = { contains: query.numeroFacture.trim(), mode: 'insensitive' };
    }

    if (query.methodePaiement) {
      where.methodePaiement = query.methodePaiement;
    }

    if (query.dateFrom || query.dateTo) {
      where.datePaiement = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.paiementClient.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          facture: {
            include: { creance: true },
          },
        },
      }),
      this.prisma.paiementClient.count({ where }),
    ]);

    return {
      data: data.map((p) => toPaiementView(p, p.facture?.creance, p.facture)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Strictly read-only single payment lookup.
   */
  async findOne(id: number): Promise<PaiementClientView> {
    const paiement = await this.prisma.paiementClient.findUnique({
      where: { id },
      include: {
        facture: {
          include: { creance: true },
        },
      },
    });

    if (!paiement) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    return toPaiementView(paiement, paiement.facture?.creance, paiement.facture);
  }

  /**
   * Strictly read-only payment statistics calculation.
   */
  async findStats(): Promise<PaiementClientStats> {
    const paiements = await this.prisma.paiementClient.findMany({
      where: {
        facture: {
          supprimeLe: null,
        },
      },
    });

    let totalDecimal = new Prisma.Decimal(0);
    const methodesCount: Record<string, number> = {};

    for (const p of paiements) {
      const montant = new Prisma.Decimal(p.montantRecu ?? 0);
      totalDecimal = totalDecimal.add(montant);

      const m = String(p.methodePaiement);
      methodesCount[m] = (methodesCount[m] || 0) + 1;
    }

    return {
      totalPaiements: paiements.length,
      montantTotalRecu: Math.round(totalDecimal.toNumber() * 100) / 100,
      methodesCount,
    };
  }
}
