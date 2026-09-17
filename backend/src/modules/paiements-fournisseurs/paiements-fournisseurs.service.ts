import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreatePaiementFournisseurDto } from './dto/create-paiement-fournisseur.dto';
import { CancelPaiementFournisseurDto } from './dto/cancel-paiement-fournisseur.dto';
import { QueryPaiementFournisseurDto } from './dto/query-paiement-fournisseur.dto';
import {
  DettesFournisseursService,
  DetteFournisseurView,
} from '../dettes-fournisseurs/dettes-fournisseurs.service';
import { extractAndValidateChequeData } from '../cheques/cheques-validation.helper';

export interface PaiementFournisseurGlobalView {
  id: number;
  numeroPaiement: string;
  idDetteFournisseur: number;
  numeroDette: string;
  referenceFactureFournisseur: string | null;
  idFournisseur: number;
  nomFournisseurSnapshot: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  referenceExterne: string | null;
  notes: string | null;
  estAnnule: boolean;
  dateAnnulation: string | null;
  motifAnnulation: string | null;
  annuleParId: number | null;
  creeParId: number | null;
  creeLe: string;
  lettreDeChange?: {
    id?: number;
    numero: string;
    dateEcheance: string;
    montant: number;
    beneficiaire: string;
    cause: string;
    tireNom: string;
    tireAdresse: string;
  } | null;
  cheque?: {
    id: number;
    numero: string;
    serie: string | null;
    dateCheque: string;
    banque: string;
    agence: string | null;
    beneficiaire: string;
    ville: string | null;
  } | null;
}

export interface PaiementFournisseurStats {
  totalPayePeriod: number;
  paymentsCount: number;
  activeMethodsCount: number;
  cancelledCount: number;
}

@Injectable()
export class PaiementsFournisseursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dettesService: DettesFournisseursService,
  ) {}

  public toGlobalView(p: any): PaiementFournisseurGlobalView {
    return {
      id: p.id,
      numeroPaiement: p.numeroPaiement,
      idDetteFournisseur: p.idDetteFournisseur,
      numeroDette: p.detteFournisseur?.numeroDette || '',
      referenceFactureFournisseur: p.detteFournisseur?.referenceFactureFournisseur ?? null,
      idFournisseur: p.detteFournisseur?.idFournisseur || 0,
      nomFournisseurSnapshot: p.detteFournisseur?.nomFournisseurSnapshot || '',
      montant: Number(p.montant),
      datePaiement: p.datePaiement ? new Date(p.datePaiement).toISOString().substring(0, 10) : '',
      modePaiement: p.modePaiement,
      referenceExterne: p.referenceExterne ?? null,
      notes: p.notes ?? null,
      estAnnule: p.estAnnule,
      dateAnnulation: p.dateAnnulation ? p.dateAnnulation.toISOString() : null,
      motifAnnulation: p.motifAnnulation ?? null,
      annuleParId: p.annuleParId ?? null,
      creeParId: p.creeParId ?? null,
      creeLe: p.creeLe ? p.creeLe.toISOString() : new Date().toISOString(),
      lettreDeChange: p.lettreDeChange
        ? {
            id: p.lettreDeChange.id,
            numero: p.lettreDeChange.numero,
            dateEcheance: new Date(p.lettreDeChange.dateEcheance).toISOString().split('T')[0],
            montant: Number(p.lettreDeChange.montant),
            beneficiaire: p.lettreDeChange.beneficiaire,
            cause: p.lettreDeChange.cause,
            tireNom: p.lettreDeChange.tireNom,
            tireAdresse: p.lettreDeChange.tireAdresse,
          }
        : null,
      cheque: p.cheque
        ? {
            id: p.cheque.id,
            numero: p.cheque.numero,
            serie: p.cheque.serie ?? null,
            dateCheque: new Date(p.cheque.dateCheque).toISOString().split('T')[0],
            banque: p.cheque.banque,
            agence: p.cheque.agence ?? null,
            beneficiaire: p.cheque.beneficiaire,
            ville: p.cheque.ville ?? null,
          }
        : null,
    };
  }

  private async generateNumeroPaiement(
    tx: Prisma.TransactionClient,
    companyId: number,
    year: number,
  ): Promise<string> {
    const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
      INSERT INTO paiement_fournisseur_sequences (company_id, annee, dernier_numero)
      VALUES (${companyId}, ${year}, 1)
      ON CONFLICT (company_id, annee) DO UPDATE
      SET dernier_numero = paiement_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const seq = res[0].dernier_numero;
    return `PF-${year}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Create a versement against a debt with row locking and tenant isolation.
   */
  async createVersement(
    idDetteFournisseur: number,
    dto: CreatePaiementFournisseurDto,
    companyId: number,
    currentUserId?: number,
  ): Promise<DetteFournisseurView> {
    const payDate = dto.datePaiement ? new Date(dto.datePaiement) : new Date();
    const year = payDate.getFullYear();

    await this.prisma.$transaction(async (tx) => {
      // Row lock on DetteFournisseur to prevent concurrent overpayments and verify tenant ownership
      const lockedDebt: Array<any> = await tx.$queryRaw`
        SELECT id, company_id, montant_du, date_echeance, supprime_le
        FROM dettes_fournisseurs
        WHERE id = ${idDetteFournisseur} AND company_id = ${companyId}
        FOR UPDATE;
      `;

      if (
        !lockedDebt ||
        lockedDebt.length === 0 ||
        lockedDebt[0].supprime_le !== null ||
        Number(lockedDebt[0].company_id) !== companyId
      ) {
        throw new NotFoundException(`Dette fournisseur #${idDetteFournisseur} introuvable`);
      }

      // Fetch active payments within transaction
      const activePayments = await tx.paiementFournisseur.findMany({
        where: { idDetteFournisseur, estAnnule: false },
        select: { montant: true, estAnnule: true },
      });

      const fin = this.dettesService.evaluateFinancials(
        lockedDebt[0].montant_du,
        lockedDebt[0].date_echeance,
        activePayments,
      );

      if (fin.soldeRestant <= 0) {
        throw new ConflictException('Cette dette est déjà entièrement réglée');
      }

      if (dto.montant > fin.soldeRestant) {
        throw new BadRequestException(
          `Le montant du versement (${dto.montant}) dépasse le solde restant (${fin.soldeRestant})`,
        );
      }

      const chequeData = extractAndValidateChequeData(dto.modePaiement, dto);

      const numeroPaiement = await this.generateNumeroPaiement(tx, companyId, year);

      await tx.paiementFournisseur.create({
        data: {
          numeroPaiement,
          idDetteFournisseur,
          montant: new Prisma.Decimal(dto.montant),
          datePaiement: payDate,
          modePaiement: dto.modePaiement,
          referenceExterne: dto.referenceExterne ? dto.referenceExterne.trim() : null,
          notes: dto.notes ? dto.notes.trim() : null,
          creeParId: currentUserId ?? null,
          lettreDeChange:
            dto.modePaiement === 'EFFET'
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
          cheque: chequeData ? { create: chequeData } : undefined,
        },
      });
    });

    return this.dettesService.findOne(idDetteFournisseur, companyId);
  }

  /**
   * Cancel a versement with cancellation metadata & automatic debt balance restoration.
   */
  async cancelVersement(
    idDetteFournisseur: number,
    versementId: number,
    dto: CancelPaiementFournisseurDto,
    companyId: number,
    currentUserId?: number,
  ): Promise<DetteFournisseurView> {
    const payment = await this.prisma.paiementFournisseur.findFirst({
      where: {
        id: versementId,
        idDetteFournisseur,
        detteFournisseur: {
          companyId,
          supprimeLe: null,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Versement #${versementId} introuvable pour la dette #${idDetteFournisseur}`,
      );
    }

    if (payment.estAnnule) {
      throw new ConflictException(`Le versement #${payment.numeroPaiement} est déjà annulé`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Row lock on DetteFournisseur with companyId
      const lockedDebt: Array<any> = await tx.$queryRaw`
        SELECT id FROM dettes_fournisseurs WHERE id = ${idDetteFournisseur} AND company_id = ${companyId} FOR UPDATE;
      `;

      if (!lockedDebt || lockedDebt.length === 0) {
        throw new NotFoundException(`Dette fournisseur #${idDetteFournisseur} introuvable`);
      }

      await tx.paiementFournisseur.update({
        where: { id: versementId },
        data: {
          estAnnule: true,
          dateAnnulation: new Date(),
          motifAnnulation: dto.motifAnnulation.trim(),
          annuleParId: currentUserId ?? null,
        },
      });
    });

    return this.dettesService.findOne(idDetteFournisseur, companyId);
  }

  /**
   * List versements for a specific debt.
   */
  async findByDebtId(
    idDetteFournisseur: number,
    companyId: number,
  ): Promise<PaiementFournisseurGlobalView[]> {
    // Verify debt ownership first (throws 404 if debt not found or cross-tenant)
    await this.dettesService.findOne(idDetteFournisseur, companyId);

    const payments = await this.prisma.paiementFournisseur.findMany({
      where: {
        idDetteFournisseur,
        detteFournisseur: {
          companyId,
          supprimeLe: null,
        },
      },
      include: {
        detteFournisseur: true,
        lettreDeChange: true,
        cheque: true,
      },
      orderBy: { creeLe: 'desc' },
    });

    return payments.map((p) => this.toGlobalView(p));
  }

  /**
   * Global payment history list across all suppliers for /paiements-fournisseurs.
   */
  async findAllGlobal(
    companyId: number,
    query: QueryPaiementFournisseurDto,
  ): Promise<PaginatedResult<PaiementFournisseurGlobalView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.PaiementFournisseurWhereInput = {
      detteFournisseur: {
        companyId,
        supprimeLe: null,
      },
    };

    if (query.idFournisseur) {
      where.detteFournisseur = {
        ...(where.detteFournisseur as any),
        companyId,
        supprimeLe: null,
        idFournisseur: query.idFournisseur,
      };
    }

    if (query.idDetteFournisseur) {
      where.idDetteFournisseur = query.idDetteFournisseur;
    }

    if (query.modePaiement) {
      where.modePaiement = query.modePaiement;
    }

    if (query.estAnnule !== undefined) {
      where.estAnnule = query.estAnnule;
    }

    if (query.startDate || query.endDate) {
      where.datePaiement = {};
      if (query.startDate) where.datePaiement.gte = new Date(query.startDate);
      if (query.endDate) where.datePaiement.lte = new Date(query.endDate);
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroPaiement: { contains: s, mode: 'insensitive' } },
        { referenceExterne: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { detteFournisseur: { numeroDette: { contains: s, mode: 'insensitive' } } },
        { detteFournisseur: { referenceFactureFournisseur: { contains: s, mode: 'insensitive' } } },
        { detteFournisseur: { nomFournisseurSnapshot: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.paiementFournisseur.findMany({
        where,
        include: {
          detteFournisseur: true,
          lettreDeChange: true,
          cheque: true,
        },
        orderBy: { creeLe: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paiementFournisseur.count({ where }),
    ]);

    return {
      data: data.map((p) => this.toGlobalView(p)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Global payment statistics across all suppliers.
   */
  async findGlobalStats(
    companyId: number,
    query: QueryPaiementFournisseurDto,
  ): Promise<PaiementFournisseurStats> {
    const where: Prisma.PaiementFournisseurWhereInput = {
      detteFournisseur: {
        companyId,
        supprimeLe: null,
      },
    };

    if (query.idFournisseur) {
      where.detteFournisseur = {
        ...(where.detteFournisseur as any),
        companyId,
        supprimeLe: null,
        idFournisseur: query.idFournisseur,
      };
    }

    if (query.startDate || query.endDate) {
      where.datePaiement = {};
      if (query.startDate) where.datePaiement.gte = new Date(query.startDate);
      if (query.endDate) where.datePaiement.lte = new Date(query.endDate);
    }

    const payments = await this.prisma.paiementFournisseur.findMany({
      where,
      select: {
        montant: true,
        modePaiement: true,
        estAnnule: true,
      },
    });

    let totalPayePeriod = 0;
    let paymentsCount = 0;
    let cancelledCount = 0;
    const activeModesSet = new Set<string>();

    for (const p of payments) {
      if (p.estAnnule) {
        cancelledCount++;
      } else {
        paymentsCount++;
        totalPayePeriod += Number(p.montant);
        activeModesSet.add(p.modePaiement);
      }
    }

    return {
      totalPayePeriod: Math.round(totalPayePeriod * 100) / 100,
      paymentsCount,
      activeMethodsCount: activeModesSet.size,
      cancelledCount,
    };
  }
}
