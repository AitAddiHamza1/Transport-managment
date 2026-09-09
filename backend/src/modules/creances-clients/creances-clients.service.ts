import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CreanceStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { QueryCreanceClientDto } from './dto/query-creance-client.dto';

export interface CompactFactureForCreance {
  id: number;
  numeroFacture: string;
  sousTotal: number;
  montantTva: number;
  montantTotal: number;
  supprimeLe: string | null;
}

export interface CompactPaiementSummary {
  id: number;
  datePaiement: string;
  montantRecu: number;
  methodePaiement: string;
}

export interface CreanceView {
  id: number;
  numeroFacture: string;
  nomClient: string;
  dateEmission: string;
  delaiPaiementJours: number;
  montantFacture: number;
  montantRecu: number;
  solde: number;
  dateEcheance: string | null;
  statutPaiement: string;
  actionRecouvrement: string | null;
  devise: string;
  facture?: CompactFactureForCreance | null;
  paiements?: CompactPaiementSummary[];
}

export interface CreanceStats {
  totalCreances: number;
  totalMontantFacture: number;
  totalMontantRecu: number;
  totalSolde: number;
  nonPayesCount: number;
  partielCount: number;
  payesCount: number;
  enRetardCount: number;
}

export function toCreanceView(creance: any): CreanceView {
  const montantFacture = Number(creance.montantFacture ?? 0);
  const montantRecu = Number(creance.montantRecu ?? 0);
  // Calculate solde from financial fields (or fallback to database solde)
  const solde =
    creance.solde !== undefined && creance.solde !== null
      ? Number(creance.solde)
      : Math.max(0, Math.round((montantFacture - montantRecu) * 100) / 100);

  let statutPaiement = creance.statutPaiement ? String(creance.statutPaiement) : 'NON_PAYE';

  // Dynamic overdue classification if past due date and not fully paid
  if (
    statutPaiement !== 'PAYE' &&
    creance.dateEcheance &&
    new Date(creance.dateEcheance) < new Date()
  ) {
    statutPaiement = 'EN_RETARD';
  }

  const dateEmissionStr = creance.dateEmission
    ? new Date(creance.dateEmission).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const dateEcheanceStr = creance.dateEcheance
    ? new Date(creance.dateEcheance).toISOString().split('T')[0]
    : null;

  let compactFacture: CompactFactureForCreance | null = null;
  if (creance.facture) {
    compactFacture = {
      id: creance.facture.id,
      numeroFacture: creance.facture.numeroFacture,
      sousTotal: Number(creance.facture.sousTotal ?? 0),
      montantTva: Number(creance.facture.montantTva ?? 0),
      montantTotal: Number(creance.facture.montantTotal ?? 0),
      supprimeLe: creance.facture.supprimeLe
        ? new Date(creance.facture.supprimeLe).toISOString()
        : null,
    };
  }

  const paiements: CompactPaiementSummary[] = Array.isArray(creance.facture?.paiements)
    ? creance.facture.paiements.map((p: any) => ({
        id: p.id,
        datePaiement: p.datePaiement
          ? new Date(p.datePaiement).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        montantRecu: Number(p.montantRecu ?? 0),
        methodePaiement: String(p.methodePaiement),
      }))
    : Array.isArray(creance.paiements)
      ? creance.paiements.map((p: any) => ({
          id: p.id,
          datePaiement: p.datePaiement
            ? new Date(p.datePaiement).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          montantRecu: Number(p.montantRecu ?? 0),
          methodePaiement: String(p.methodePaiement),
        }))
      : [];

  return {
    id: creance.id,
    numeroFacture: creance.numeroFacture,
    nomClient: creance.nomClient,
    dateEmission: dateEmissionStr,
    delaiPaiementJours: creance.delaiPaiementJours ?? 30,
    montantFacture,
    montantRecu,
    solde,
    dateEcheance: dateEcheanceStr,
    statutPaiement,
    actionRecouvrement: creance.actionRecouvrement ?? null,
    devise: creance.facture?.devise || creance.devise || 'MAD',
    facture: compactFacture,
    paiements,
  };
}

@Injectable()
export class CreancesClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal transactional helper to create a CreanceClient from an invoice snapshot.
   * Reusable by FacturesService and backfill CLI script.
   */
  async createFromInvoice(
    tx: Prisma.TransactionClient,
    snapshot: {
      numeroFacture: string;
      nomClient: string;
      dateFacture: Date;
      joursEcheance: number;
      montantTotal: Prisma.Decimal | number;
      dateEcheance?: Date | null;
      devise?: string;
    },
  ) {
    const existing = await tx.creanceClient.findUnique({
      where: { numeroFacture: snapshot.numeroFacture },
    });

    if (existing) {
      return existing;
    }

    const montantFacture =
      snapshot.montantTotal instanceof Prisma.Decimal
        ? snapshot.montantTotal
        : new Prisma.Decimal(snapshot.montantTotal);

    let dateEcheance = snapshot.dateEcheance;
    if (!dateEcheance) {
      dateEcheance = new Date(snapshot.dateFacture);
      dateEcheance.setDate(dateEcheance.getDate() + (snapshot.joursEcheance || 30));
    }

    let initialStatut: CreanceStatut = CreanceStatut.NON_PAYE;
    if (dateEcheance < new Date()) {
      initialStatut = CreanceStatut.EN_RETARD;
    }

    return tx.creanceClient.create({
      data: {
        numeroFacture: snapshot.numeroFacture,
        nomClient: snapshot.nomClient,
        dateEmission: snapshot.dateFacture,
        delaiPaiementJours: snapshot.joursEcheance || 30,
        montantFacture,
        montantRecu: new Prisma.Decimal(0),
        dateEcheance,
        statutPaiement: initialStatut,
        devise: snapshot.devise || 'MAD',
      },
    });
  }

  /**
   * Strictly read-only paginated list query.
   */
  async findAll(
    companyId?: number,
    query: QueryCreanceClientDto = {},
  ): Promise<PaginatedResult<CreanceView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = [
      'id',
      'numeroFacture',
      'nomClient',
      'dateEmission',
      'dateEcheance',
      'montantFacture',
      'montantRecu',
      'solde',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'id';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    let companyInvoiceNumbers: string[] | undefined;
    if (companyId) {
      const companyInvoices = await this.prisma.facture.findMany({
        where: { companyId, supprimeLe: null },
        select: { numeroFacture: true },
      });
      companyInvoiceNumbers = companyInvoices.map((f) => f.numeroFacture);
    }

    const where: Prisma.CreanceClientWhereInput = {
      ...(companyInvoiceNumbers
        ? { numeroFacture: { in: companyInvoiceNumbers } }
        : { facture: { supprimeLe: null } }),
    };

    if (query.devise) {
      where.devise = query.devise.trim().toUpperCase();
    }

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

    if (query.statutPaiement) {
      if (query.statutPaiement === CreanceStatut.EN_RETARD) {
        where.AND = [
          {
            statutPaiement: {
              in: [CreanceStatut.NON_PAYE, CreanceStatut.PARTIEL, CreanceStatut.EN_RETARD],
            },
          },
          { dateEcheance: { lt: new Date() } },
        ];
      } else {
        where.statutPaiement = query.statutPaiement;
      }
    }

    if (query.dateFrom || query.dateTo) {
      where.dateEmission = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [creanceRecords, total] = await Promise.all([
      this.prisma.creanceClient.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creanceClient.count({ where }),
    ]);

    const numFactures = creanceRecords.map((c) => c.numeroFacture);
    const factures = numFactures.length
      ? await this.prisma.facture.findMany({
          where: { numeroFacture: { in: numFactures } },
        })
      : [];
    const factureMap = new Map(factures.map((f) => [f.numeroFacture, f]));

    const data = creanceRecords.map((c) => ({
      ...c,
      facture: factureMap.get(c.numeroFacture) || null,
    }));

    return {
      data: data.map(toCreanceView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Strictly read-only single receivable query.
   */
  async findOne(id: number, companyId?: number): Promise<CreanceView> {
    const creance = await this.prisma.creanceClient.findUnique({
      where: { id },
    });

    if (!creance) {
      throw new NotFoundException(`Créance #${id} introuvable`);
    }

    const facture = await this.prisma.facture.findFirst({
      where: {
        numeroFacture: creance.numeroFacture,
        supprimeLe: null,
      },
    });

    if (!facture || (companyId && facture.companyId !== companyId)) {
      throw new NotFoundException(`Créance #${id} introuvable`);
    }

    const paiements = await this.prisma.paiementClient.findMany({
      where: { numeroFacture: creance.numeroFacture },
      orderBy: { datePaiement: 'desc' },
    });

    return toCreanceView({
      ...creance,
      facture: {
        ...facture,
        paiements,
      },
    });
  }

  /**
   * Strictly read-only stats computation.
   */
  async findStats(
    companyId?: number,
    query?: QueryCreanceClientDto,
  ): Promise<CreanceStats & { devise?: string }> {
    let companyInvoiceNumbers: string[] | undefined;
    if (companyId) {
      const companyInvoices = await this.prisma.facture.findMany({
        where: { companyId, supprimeLe: null },
        select: { numeroFacture: true },
      });
      companyInvoiceNumbers = companyInvoices.map((f) => f.numeroFacture);
    }

    const where: Prisma.CreanceClientWhereInput = {
      ...(companyInvoiceNumbers
        ? { numeroFacture: { in: companyInvoiceNumbers } }
        : { facture: { supprimeLe: null } }),
    };

    if (query?.devise) {
      where.devise = query.devise.trim().toUpperCase();
    }

    const creances = await this.prisma.creanceClient.findMany({
      where,
    });

    // Check if there are mixed devises
    const devisesInActive = new Set(creances.map((c) => c.devise || 'MAD'));
    const isMixed = devisesInActive.size > 1;

    let totalMontantFacture = new Prisma.Decimal(0);
    let totalMontantRecu = new Prisma.Decimal(0);
    let totalSolde = new Prisma.Decimal(0);

    let nonPayesCount = 0;
    let partielCount = 0;
    let payesCount = 0;
    let enRetardCount = 0;

    const now = new Date();

    for (const c of creances) {
      const montantFacture = new Prisma.Decimal(c.montantFacture ?? 0);
      const montantRecu = new Prisma.Decimal(c.montantRecu ?? 0);
      const solde = c.solde ? new Prisma.Decimal(c.solde) : montantFacture.sub(montantRecu);

      if (!isMixed) {
        totalMontantFacture = totalMontantFacture.add(montantFacture);
        totalMontantRecu = totalMontantRecu.add(montantRecu);
        totalSolde = totalSolde.add(solde);
      }

      const isOverdue =
        c.statutPaiement !== 'PAYE' && c.dateEcheance && new Date(c.dateEcheance) < now;

      if (c.statutPaiement === 'PAYE') {
        payesCount++;
      } else if (isOverdue) {
        enRetardCount++;
      } else if (c.statutPaiement === 'PARTIEL') {
        partielCount++;
      } else {
        nonPayesCount++;
      }
    }

    return {
      totalCreances: creances.length,
      totalMontantFacture: Math.round(totalMontantFacture.toNumber() * 100) / 100,
      totalMontantRecu: Math.round(totalMontantRecu.toNumber() * 100) / 100,
      totalSolde: Math.round(totalSolde.toNumber() * 100) / 100,
      nonPayesCount,
      partielCount,
      payesCount,
      enRetardCount,
      devise: isMixed ? 'MIXED' : query?.devise || Array.from(devisesInActive)[0] || 'MAD',
    };
  }
}
