import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateDetteFournisseurDto } from './dto/create-dette-fournisseur.dto';
import { UpdateDetteFournisseurDto } from './dto/update-dette-fournisseur.dto';
import { QueryDetteFournisseurDto } from './dto/query-dette-fournisseur.dto';

export type StatutPaiementCalculated = 'EN_ATTENTE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE';

export interface PaiementItemView {
  id: number;
  numeroPaiement: string;
  idDetteFournisseur: number;
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
}

export interface DetteFournisseurView {
  id: number;
  numeroDette: string;
  referenceFactureFournisseur: string | null;
  idFournisseur: number;
  nomFournisseurSnapshot: string;
  categorie: string | null;
  dateDette: string;
  delaiPaiementJours: number;
  dateEcheance: string;
  montantDu: number;
  montantPaye: number;
  soldeRestant: number;
  statutPaiement: StatutPaiementCalculated;
  estEnRetard: boolean;
  joursRetard: number;
  remarques: string | null;
  creeParId: number | null;
  creeLe: string;
  misAJourLe: string;
  paiementsCount: number;
  paiements?: PaiementItemView[];
}

export interface DetteFournisseurStats {
  totalDu: number;
  totalPaye: number;
  soldeRestant: number;
  dettesEnAttenteCount: number;
  dettesPartiellesCount: number;
  dettesSoldeesCount: number;
  dettesEnRetardCount: number;
}

@Injectable()
export class DettesFournisseursService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates dynamic financial status and overdue state from active payments.
   */
  public evaluateFinancials(
    montantDuDecimal: Prisma.Decimal,
    dateEcheanceDate: Date,
    paiements: Array<{ montant: Prisma.Decimal; estAnnule: boolean }>,
  ) {
    const montantDu = Number(montantDuDecimal);

    // Sum active (non-cancelled) payments
    const activePaymentsSum = paiements
      .filter((p) => !p.estAnnule)
      .reduce((sum, p) => sum + Number(p.montant), 0);

    // Round to 2 decimal places to prevent floating point error
    const montantPaye = Math.round(activePaymentsSum * 100) / 100;
    const soldeRestant = Math.max(0, Math.round((montantDu - montantPaye) * 100) / 100);

    let statutPaiement: StatutPaiementCalculated = 'EN_ATTENTE';
    if (montantPaye >= montantDu) {
      statutPaiement = 'PAYEE';
    } else if (montantPaye > 0) {
      statutPaiement = 'PARTIELLEMENT_PAYEE';
    }

    // Overdue evaluation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const echeance = new Date(dateEcheanceDate);
    echeance.setHours(0, 0, 0, 0);

    const estEnRetard = soldeRestant > 0 && today.getTime() > echeance.getTime();
    const joursRetard = estEnRetard
      ? Math.floor((today.getTime() - echeance.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      montantDu,
      montantPaye,
      soldeRestant,
      statutPaiement,
      estEnRetard,
      joursRetard,
    };
  }

  public toDetteView(dette: any): DetteFournisseurView {
    const paiements = dette.paiements || [];
    const fin = this.evaluateFinancials(dette.montantDu, dette.dateEcheance, paiements);

    const paiementsViews: PaiementItemView[] | undefined = dette.paiements
      ? dette.paiements.map((p: any) => ({
          id: p.id,
          numeroPaiement: p.numeroPaiement,
          idDetteFournisseur: p.idDetteFournisseur,
          montant: Number(p.montant),
          datePaiement: p.datePaiement
            ? new Date(p.datePaiement).toISOString().substring(0, 10)
            : '',
          modePaiement: p.modePaiement,
          referenceExterne: p.referenceExterne ?? null,
          notes: p.notes ?? null,
          estAnnule: p.estAnnule,
          dateAnnulation: p.dateAnnulation ? p.dateAnnulation.toISOString() : null,
          motifAnnulation: p.motifAnnulation ?? null,
          annuleParId: p.annuleParId ?? null,
          creeParId: p.creeParId ?? null,
          creeLe: p.creeLe ? p.creeLe.toISOString() : new Date().toISOString(),
        }))
      : undefined;

    return {
      id: dette.id,
      numeroDette: dette.numeroDette,
      referenceFactureFournisseur: dette.referenceFactureFournisseur ?? null,
      idFournisseur: dette.idFournisseur,
      nomFournisseurSnapshot: dette.nomFournisseurSnapshot,
      categorie: dette.categorie ?? null,
      dateDette: dette.dateDette ? new Date(dette.dateDette).toISOString().substring(0, 10) : '',
      delaiPaiementJours: dette.delaiPaiementJours,
      dateEcheance: dette.dateEcheance
        ? new Date(dette.dateEcheance).toISOString().substring(0, 10)
        : '',
      montantDu: fin.montantDu,
      montantPaye: fin.montantPaye,
      soldeRestant: fin.soldeRestant,
      statutPaiement: fin.statutPaiement,
      estEnRetard: fin.estEnRetard,
      joursRetard: fin.joursRetard,
      remarques: dette.remarques ?? null,
      creeParId: dette.creeParId ?? null,
      creeLe: dette.creeLe ? dette.creeLe.toISOString() : new Date().toISOString(),
      misAJourLe: dette.misAJourLe ? dette.misAJourLe.toISOString() : new Date().toISOString(),
      paiementsCount: paiements.length,
      paiements: paiementsViews,
    };
  }

  /**
   * Concurrency-safe number generation for debts (DF-YYYY-XXXXXX).
   */
  private async generateNumeroDette(tx: Prisma.TransactionClient, year: number): Promise<string> {
    const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
      INSERT INTO dette_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const seq = res[0].dernier_numero;
    return `DF-${year}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Concurrency-safe number generation for payments (PF-YYYY-XXXXXX).
   */
  private async generateNumeroPaiement(
    tx: Prisma.TransactionClient,
    year: number,
  ): Promise<string> {
    const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
      INSERT INTO paiement_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = paiement_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const seq = res[0].dernier_numero;
    return `PF-${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(
    dto: CreateDetteFournisseurDto,
    currentUserId?: number,
  ): Promise<DetteFournisseurView> {
    // 1. Verify active supplier
    const fournisseur = await this.prisma.fournisseur.findUnique({
      where: { id: dto.idFournisseur },
    });
    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur #${dto.idFournisseur} introuvable`);
    }

    // 2. Check reference uniqueness per supplier for active debts
    const ref = dto.referenceFactureFournisseur ? dto.referenceFactureFournisseur.trim() : null;
    if (ref) {
      const existingRef = await this.prisma.detteFournisseur.findFirst({
        where: {
          idFournisseur: dto.idFournisseur,
          referenceFactureFournisseur: ref,
          supprimeLe: null,
        },
      });
      if (existingRef) {
        throw new ConflictException(
          `Une dette avec la référence facture "${ref}" existe déjà pour ce fournisseur`,
        );
      }
    }

    const dateDetteDate = dto.dateDette ? new Date(dto.dateDette) : new Date();
    const delaiJours = dto.delaiPaiementJours ?? 30;

    let dateEcheanceDate: Date;
    if (dto.dateEcheance) {
      dateEcheanceDate = new Date(dto.dateEcheance);
    } else {
      dateEcheanceDate = new Date(dateDetteDate);
      dateEcheanceDate.setDate(dateEcheanceDate.getDate() + delaiJours);
    }

    if (dateEcheanceDate < dateDetteDate) {
      throw new BadRequestException(
        'La date d echéance ne peut pas être antérieure à la date de la dette',
      );
    }

    const initialPay = dto.initialPaiement;
    if (initialPay && initialPay.montant > dto.montantDu) {
      throw new BadRequestException(
        `Le versement initial (${initialPay.montant}) ne peut pas dépasser le montant dû (${dto.montantDu})`,
      );
    }

    const year = dateDetteDate.getFullYear();

    // Atomic transaction for debt + optional initial payment
    const createdId = await this.prisma.$transaction(async (tx) => {
      const numeroDette = await this.generateNumeroDette(tx, year);

      const createdDette = await tx.detteFournisseur.create({
        data: {
          numeroDette,
          referenceFactureFournisseur: ref,
          idFournisseur: dto.idFournisseur,
          nomFournisseurSnapshot: fournisseur.nomFournisseur,
          categorie: dto.categorie ? dto.categorie.trim() : null,
          dateDette: dateDetteDate,
          delaiPaiementJours: delaiJours,
          dateEcheance: dateEcheanceDate,
          montantDu: new Prisma.Decimal(dto.montantDu),
          remarques: dto.remarques ? dto.remarques.trim() : null,
          creeParId: currentUserId ?? null,
        },
      });

      if (initialPay) {
        const payDate = initialPay.datePaiement ? new Date(initialPay.datePaiement) : new Date();
        const payYear = payDate.getFullYear();
        const numeroPaiement = await this.generateNumeroPaiement(tx, payYear);

        await tx.paiementFournisseur.create({
          data: {
            numeroPaiement,
            idDetteFournisseur: createdDette.id,
            montant: new Prisma.Decimal(initialPay.montant),
            datePaiement: payDate,
            modePaiement: initialPay.modePaiement,
            referenceExterne: initialPay.referenceExterne
              ? initialPay.referenceExterne.trim()
              : null,
            notes: initialPay.notes ? initialPay.notes.trim() : null,
            creeParId: currentUserId ?? null,
          },
        });
      }

      return createdDette.id;
    });

    return this.findOne(createdId);
  }

  async findAll(query: QueryDetteFournisseurDto): Promise<PaginatedResult<DetteFournisseurView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.DetteFournisseurWhereInput = {
      supprimeLe: null,
    };

    if (query.idFournisseur) {
      where.idFournisseur = query.idFournisseur;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroDette: { contains: s, mode: 'insensitive' } },
        { referenceFactureFournisseur: { contains: s, mode: 'insensitive' } },
        { nomFournisseurSnapshot: { contains: s, mode: 'insensitive' } },
        { categorie: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.dateDette = {};
      if (query.startDate) where.dateDette.gte = new Date(query.startDate);
      if (query.endDate) where.dateDette.lte = new Date(query.endDate);
    }

    if (query.dueDateStart || query.dueDateEnd) {
      where.dateEcheance = {};
      if (query.dueDateStart) where.dateEcheance.gte = new Date(query.dueDateStart);
      if (query.dueDateEnd) where.dateEcheance.lte = new Date(query.dueDateEnd);
    }

    // Fetch all matching records to evaluate dynamic financial status accurately
    const rawData = await this.prisma.detteFournisseur.findMany({
      where,
      include: {
        paiements: {
          select: { montant: true, estAnnule: true },
        },
      },
      orderBy: { creeLe: sortOrder },
    });

    // Convert to views with computed financials
    let views = rawData.map((d) => this.toDetteView(d));

    // Post-filter by calculated statutPaiement / estEnRetard
    if (query.statutPaiement) {
      views = views.filter((v) => v.statutPaiement === query.statutPaiement);
    }

    if (query.estEnRetard !== undefined) {
      views = views.filter((v) => v.estEnRetard === query.estEnRetard);
    }

    const total = views.length;
    const paginatedData = views.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(query: QueryDetteFournisseurDto): Promise<DetteFournisseurStats> {
    const where: Prisma.DetteFournisseurWhereInput = {
      supprimeLe: null,
    };

    if (query.idFournisseur) {
      where.idFournisseur = query.idFournisseur;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroDette: { contains: s, mode: 'insensitive' } },
        { referenceFactureFournisseur: { contains: s, mode: 'insensitive' } },
        { nomFournisseurSnapshot: { contains: s, mode: 'insensitive' } },
      ];
    }

    const rawData = await this.prisma.detteFournisseur.findMany({
      where,
      include: {
        paiements: {
          select: { montant: true, estAnnule: true },
        },
      },
    });

    const views = rawData.map((d) => this.toDetteView(d));

    let totalDu = 0;
    let totalPaye = 0;
    let soldeRestant = 0;
    let dettesEnAttenteCount = 0;
    let dettesPartiellesCount = 0;
    let dettesSoldeesCount = 0;
    let dettesEnRetardCount = 0;

    for (const v of views) {
      totalDu += v.montantDu;
      totalPaye += v.montantPaye;
      soldeRestant += v.soldeRestant;

      if (v.statutPaiement === 'EN_ATTENTE') dettesEnAttenteCount++;
      if (v.statutPaiement === 'PARTIELLEMENT_PAYEE') dettesPartiellesCount++;
      if (v.statutPaiement === 'PAYEE') dettesSoldeesCount++;
      if (v.estEnRetard) dettesEnRetardCount++;
    }

    return {
      totalDu: Math.round(totalDu * 100) / 100,
      totalPaye: Math.round(totalPaye * 100) / 100,
      soldeRestant: Math.round(soldeRestant * 100) / 100,
      dettesEnAttenteCount,
      dettesPartiellesCount,
      dettesSoldeesCount,
      dettesEnRetardCount,
    };
  }

  async findOne(id: number): Promise<DetteFournisseurView> {
    const dette = await this.prisma.detteFournisseur.findFirst({
      where: { id, supprimeLe: null },
      include: {
        paiements: {
          orderBy: { creeLe: 'desc' },
        },
      },
    });

    if (!dette) {
      throw new NotFoundException(`Dette fournisseur #${id} introuvable`);
    }

    return this.toDetteView(dette);
  }

  async update(id: number, dto: UpdateDetteFournisseurDto): Promise<DetteFournisseurView> {
    const dette = await this.prisma.detteFournisseur.findFirst({
      where: { id, supprimeLe: null },
      include: {
        paiements: true,
      },
    });

    if (!dette) {
      throw new NotFoundException(`Dette fournisseur #${id} introuvable`);
    }

    const hasPayments = dette.paiements.length > 0;

    // IMMUTABILITY CONTRACT: If debt has ANY payment (active or cancelled), financial fields cannot be changed
    if (hasPayments) {
      if (
        (dto.idFournisseur !== undefined && dto.idFournisseur !== dette.idFournisseur) ||
        (dto.referenceFactureFournisseur !== undefined &&
          dto.referenceFactureFournisseur !== dette.referenceFactureFournisseur) ||
        (dto.dateDette !== undefined &&
          new Date(dto.dateDette).getTime() !== new Date(dette.dateDette).getTime()) ||
        (dto.delaiPaiementJours !== undefined &&
          dto.delaiPaiementJours !== dette.delaiPaiementJours) ||
        (dto.dateEcheance !== undefined &&
          new Date(dto.dateEcheance).getTime() !== new Date(dette.dateEcheance).getTime()) ||
        (dto.montantDu !== undefined && dto.montantDu !== Number(dette.montantDu))
      ) {
        throw new ConflictException(
          'Les champs financiers d une dette ayant déjà des enregistrements de versement sont immutables et ne peuvent plus être modifiés.',
        );
      }
    }

    const data: Prisma.DetteFournisseurUpdateInput = {};

    if (dto.categorie !== undefined) {
      data.categorie = dto.categorie ? dto.categorie.trim() : null;
    }
    if (dto.remarques !== undefined) {
      data.remarques = dto.remarques ? dto.remarques.trim() : null;
    }

    // Editable financial fields when no payments exist
    if (!hasPayments) {
      if (dto.idFournisseur !== undefined && dto.idFournisseur !== dette.idFournisseur) {
        const fournisseur = await this.prisma.fournisseur.findUnique({
          where: { id: dto.idFournisseur },
        });
        if (!fournisseur) {
          throw new NotFoundException(`Fournisseur #${dto.idFournisseur} introuvable`);
        }
        data.fournisseur = { connect: { id: dto.idFournisseur } };
        data.nomFournisseurSnapshot = fournisseur.nomFournisseur;
      }

      if (dto.referenceFactureFournisseur !== undefined) {
        const ref = dto.referenceFactureFournisseur ? dto.referenceFactureFournisseur.trim() : null;
        if (ref && ref !== dette.referenceFactureFournisseur) {
          const targetSupplierId = dto.idFournisseur ?? dette.idFournisseur;
          const existingRef = await this.prisma.detteFournisseur.findFirst({
            where: {
              idFournisseur: targetSupplierId,
              referenceFactureFournisseur: ref,
              supprimeLe: null,
              NOT: { id },
            },
          });
          if (existingRef) {
            throw new ConflictException(
              `Une dette avec la référence facture "${ref}" existe déjà pour ce fournisseur`,
            );
          }
        }
        data.referenceFactureFournisseur = ref;
      }

      if (dto.dateDette !== undefined) {
        data.dateDette = new Date(dto.dateDette);
      }

      if (dto.delaiPaiementJours !== undefined) {
        data.delaiPaiementJours = dto.delaiPaiementJours;
      }

      if (dto.dateEcheance !== undefined) {
        data.dateEcheance = new Date(dto.dateEcheance);
      }

      if (dto.montantDu !== undefined) {
        data.montantDu = new Prisma.Decimal(dto.montantDu);
      }
    }

    await this.prisma.detteFournisseur.update({
      where: { id },
      data,
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const dette = await this.prisma.detteFournisseur.findFirst({
      where: { id, supprimeLe: null },
      include: {
        paiements: true,
      },
    });

    if (!dette) {
      throw new NotFoundException(`Dette fournisseur #${id} introuvable`);
    }

    // IMMUTABILITY CONTRACT: Cannot delete debt with any payments
    if (dette.paiements.length > 0) {
      throw new ConflictException(
        `La dette #${dette.numeroDette} possède ${dette.paiements.length} enregistrement(s) de versement et ne peut pas être supprimée`,
      );
    }

    await this.prisma.detteFournisseur.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { message: `Dette fournisseur #${dette.numeroDette} supprimée avec succès` };
  }
}
