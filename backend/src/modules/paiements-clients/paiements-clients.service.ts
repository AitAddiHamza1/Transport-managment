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
import { ForexService } from '../forex/forex.service';

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
  devise: string;
  tauxChange?: number | null;
  montantConvertiMad?: number | null;
  sourceTaux?: string | null;
  estTauxManuel?: boolean;
  dateTauxUtilise?: string | null;
  facture?: CompactFactureForPaiement | null;
  creance?: CompactCreanceForPaiement | null;
  lettreDeChange?: {
    numero: string;
    dateEcheance: string;
    montant: number;
    beneficiaire: string;
    cause: string;
    tireNom: string;
    tireAdresse: string;
  } | null;
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
    devise: paiement.devise || 'MAD',
    tauxChange:
      paiement.tauxChange !== null && paiement.tauxChange !== undefined
        ? Number(paiement.tauxChange)
        : null,
    montantConvertiMad:
      paiement.montantConvertiMad !== null && paiement.montantConvertiMad !== undefined
        ? Number(paiement.montantConvertiMad)
        : null,
    sourceTaux: paiement.sourceTaux || null,
    estTauxManuel: Boolean(paiement.estTauxManuel),
    dateTauxUtilise: paiement.dateTauxUtilise
      ? new Date(paiement.dateTauxUtilise).toISOString().split('T')[0]
      : null,
    facture: compactFacture,
    creance: compactCreance,
    lettreDeChange: paiement.lettreDeChange
      ? {
          numero: paiement.lettreDeChange.numero,
          dateEcheance: new Date(paiement.lettreDeChange.dateEcheance).toISOString().split('T')[0],
          montant: Number(paiement.lettreDeChange.montant),
          beneficiaire: paiement.lettreDeChange.beneficiaire,
          cause: paiement.lettreDeChange.cause,
          tireNom: paiement.lettreDeChange.tireNom,
          tireAdresse: paiement.lettreDeChange.tireAdresse,
        }
      : null,
  };
}

@Injectable()
export class PaiementsClientsService {
  private readonly effectiveForexService: ForexService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly creancesService: CreancesClientsService,
    forexService?: ForexService,
  ) {
    this.effectiveForexService = forexService || new ForexService();
  }

  /**
   * Registers a new customer payment with concurrency-safe row-level locking (SELECT FOR UPDATE)
   * and exact Prisma.Decimal overpayment validation + Phase 7F Forex conversion.
   */
  /**
   * Registers a new customer payment with concurrency-safe row-level locking (SELECT FOR UPDATE)
   * and exact Prisma.Decimal overpayment validation + Phase 7F Forex conversion.
   */
  async create(
    companyIdOrDto: number | CreatePaiementClientDto,
    maybeDto?: CreatePaiementClientDto,
  ): Promise<PaiementClientView> {
    let companyId: number | undefined;
    let dto: CreatePaiementClientDto;
    if (typeof companyIdOrDto === 'number') {
      companyId = companyIdOrDto;
      dto = maybeDto!;
    } else {
      dto = companyIdOrDto;
    }

    if (!Number.isFinite(dto.montantRecu) || dto.montantRecu <= 0) {
      throw new BadRequestException('Le montant reçu doit être supérieur à 0');
    }

    const numeroFacture = dto.numeroFacture.trim().toUpperCase();
    const requestedDecimal = new Prisma.Decimal(dto.montantRecu);

    // 1. Fetch Facture to verify existence, tenant ownership, soft-delete state, and currency integrity
    const facture = await this.prisma.facture.findUnique({
      where: { numeroFacture },
    });

    if (!facture || (companyId && facture.companyId !== companyId)) {
      throw new NotFoundException(`La facture "${numeroFacture}" est introuvable`);
    }

    if (facture.supprimeLe) {
      throw new BadRequestException(
        `La facture "${numeroFacture}" est annulée et ne peut plus recevoir de règlements`,
      );
    }

    const invoiceCurrency = facture.devise || 'MAD';

    // Enforce Phase 6E currency match
    if (dto.devise && dto.devise !== invoiceCurrency) {
      throw new BadRequestException(
        `La devise du règlement (${dto.devise}) doit correspondre à la devise de la facture (${invoiceCurrency})`,
      );
    }

    // 2. Determine Phase 7F Forex Conversion Parameters
    let tauxChangeDecimal: Prisma.Decimal | null = null;
    let montantConvertiMadDecimal: Prisma.Decimal | null = null;
    let sourceTauxData: string | null = null;
    let estTauxManuelData = false;
    let dateTauxUtiliseData: Date | null = null;

    if (invoiceCurrency === 'EUR') {
      const isManualRate = dto.tauxChange !== undefined && dto.tauxChange !== null;

      if (isManualRate) {
        if (dto.tauxChange! <= 0) {
          throw new BadRequestException('Le taux de change doit être supérieur à 0');
        }
        tauxChangeDecimal = new Prisma.Decimal(dto.tauxChange!);
        sourceTauxData = 'MANUEL';
        estTauxManuelData = true;
        dateTauxUtiliseData = null;
      } else {
        const datePaiementStr = dto.datePaiement
          ? new Date(dto.datePaiement).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const rateResult = await this.effectiveForexService.getEurToMadRate(datePaiementStr);
        tauxChangeDecimal = rateResult.rate;
        sourceTauxData = rateResult.source;
        estTauxManuelData = false;
        dateTauxUtiliseData = new Date(rateResult.date);
      }

      // Exact Decimal-safe multiplication and 2-decimal HALF_UP rounding
      montantConvertiMadDecimal = requestedDecimal
        .mul(tauxChangeDecimal!)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Perform Row-Level Locking (SELECT ... FOR UPDATE) on mapped table creances_clients
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
          devise: invoiceCurrency,
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

      // Overpayment validation using invoice currency
      if (currentSolde.lessThanOrEqualTo(0) || creanceRow.statut_paiement === 'PAYE') {
        throw new ConflictException(
          `La créance pour la facture "${numeroFacture}" est déjà intégralement réglée`,
        );
      }

      if (requestedDecimal.greaterThan(currentSolde)) {
        throw new ConflictException(
          `Le montant du règlement (${requestedDecimal.toFixed(2)} ${invoiceCurrency}) dépasse le solde restant de la créance (${currentSolde.toFixed(2)} ${invoiceCurrency})`,
        );
      }

      const newMontantRecu = currentMontantRecu.add(requestedDecimal);
      const newSolde = currentMontantFacture.sub(newMontantRecu);

      let newStatut: CreanceStatut = CreanceStatut.PARTIEL;
      if (newSolde.lessThanOrEqualTo(0) || requestedDecimal.equals(currentSolde)) {
        newStatut = CreanceStatut.PAYE;
      }

      const datePaiement = dto.datePaiement ? new Date(dto.datePaiement) : new Date();
      const nomClient = dto.nomClient ? dto.nomClient.trim() : facture.nomClient;

      // Insert immutable PaiementClient record with Phase 7F Forex fields
      const createdPaiement = await tx.paiementClient.create({
        data: {
          numeroFacture,
          nomClient,
          datePaiement,
          montantRecu: requestedDecimal,
          methodePaiement: dto.methodePaiement,
          devise: invoiceCurrency,
          tauxChange: tauxChangeDecimal,
          montantConvertiMad: montantConvertiMadDecimal,
          sourceTaux: sourceTauxData,
          estTauxManuel: estTauxManuelData,
          dateTauxUtilise: dateTauxUtiliseData,
          lettreDeChange:
            dto.methodePaiement === 'EFFET'
              ? {
                  create: {
                    numero: dto.lettreNumero!,
                    dateEcheance: new Date(dto.lettreDateEcheance!),
                    montant: new Prisma.Decimal(dto.lettreMontant!),
                    beneficiaire: dto.lettreBeneficiaire!,
                    cause: dto.lettreCause!,
                    tireNom: dto.lettreTireNom!,
                    tireAdresse: dto.lettreTireAdresse!,
                  },
                }
              : undefined,
        },
        include: {
          lettreDeChange: true,
        },
      });

      // Update CreanceClient summary record
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
  async findAll(
    companyIdOrQuery?: number | QueryPaiementClientDto,
    maybeQuery?: QueryPaiementClientDto,
  ): Promise<PaginatedResult<PaiementClientView>> {
    let companyId: number | undefined;
    let query: QueryPaiementClientDto;
    if (typeof companyIdOrQuery === 'number') {
      companyId = companyIdOrQuery;
      query = maybeQuery ?? {};
    } else {
      query = companyIdOrQuery ?? {};
    }

    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = ['id', 'numeroFacture', 'nomClient', 'datePaiement', 'montantRecu'];
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

    const where: Prisma.PaiementClientWhereInput = {
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
          lettreDeChange: true,
        },
      }),
      this.prisma.paiementClient.count({ where }),
    ]);

    const numFactures = data.map((p) => p.numeroFacture);
    const factures = numFactures.length
      ? await this.prisma.facture.findMany({
          where: { numeroFacture: { in: numFactures } },
          include: { creance: true },
        })
      : [];
    const factureMap = new Map(factures.map((f) => [f.numeroFacture, f]));

    return {
      data: data.map((p) => {
        const f = factureMap.get(p.numeroFacture);
        return toPaiementView(p, f?.creance, f);
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Strictly read-only single payment lookup.
   */
  async findOne(id: number, companyId?: number): Promise<PaiementClientView> {
    const paiement = await this.prisma.paiementClient.findUnique({
      where: { id },
      include: {
        lettreDeChange: true,
      },
    });

    if (!paiement) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    const facture = await this.prisma.facture.findFirst({
      where: {
        numeroFacture: paiement.numeroFacture,
        supprimeLe: null,
      },
      include: { creance: true },
    });

    if (!facture || (companyId && facture.companyId !== companyId)) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    return toPaiementView(paiement, facture.creance, facture);
  }

  /**
   * Strictly read-only payment statistics calculation.
   */
  async findStats(
    companyIdOrQuery?: number | QueryPaiementClientDto,
    maybeQuery?: QueryPaiementClientDto,
  ): Promise<PaiementClientStats & { devise?: string }> {
    let companyId: number | undefined;
    let query: QueryPaiementClientDto | undefined;
    if (typeof companyIdOrQuery === 'number') {
      companyId = companyIdOrQuery;
      query = maybeQuery;
    } else {
      query = companyIdOrQuery;
    }

    let companyInvoiceNumbers: string[] | undefined;
    if (companyId) {
      const companyInvoices = await this.prisma.facture.findMany({
        where: { companyId, supprimeLe: null },
        select: { numeroFacture: true },
      });
      companyInvoiceNumbers = companyInvoices.map((f) => f.numeroFacture);
    }

    const where: Prisma.PaiementClientWhereInput = {
      ...(companyInvoiceNumbers
        ? { numeroFacture: { in: companyInvoiceNumbers } }
        : { facture: { supprimeLe: null } }),
    };

    if (query?.devise) {
      where.devise = query.devise.trim().toUpperCase();
    }

    const paiements = await this.prisma.paiementClient.findMany({
      where,
    });

    // Check if mixed currencies exist
    const devisesInActive = new Set(paiements.map((p) => p.devise || 'MAD'));
    const isMixed = devisesInActive.size > 1;

    let totalDecimal = new Prisma.Decimal(0);
    const methodesCount: Record<string, number> = {};

    for (const p of paiements) {
      const montant = new Prisma.Decimal(p.montantRecu ?? 0);
      if (!isMixed) {
        totalDecimal = totalDecimal.add(montant);
      }

      const m = String(p.methodePaiement);
      methodesCount[m] = (methodesCount[m] || 0) + 1;
    }

    return {
      totalPaiements: paiements.length,
      montantTotalRecu: Math.round(totalDecimal.toNumber() * 100) / 100,
      methodesCount,
      devise: isMixed ? 'MIXED' : query?.devise || Array.from(devisesInActive)[0] || 'MAD',
    };
  }
}
