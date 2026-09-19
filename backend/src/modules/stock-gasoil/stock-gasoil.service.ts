import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TypeMouvementGasoil } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/paginated-result';
import { CreateStockEntreeDto } from './dto/create-stock-entree.dto';
import { UpdateStockEntreeDto } from './dto/update-stock-entree.dto';
import { QueryStockGasoilDto, PeriodPresetStock } from './dto/query-stock-gasoil.dto';

export interface StockGasoilMovementView {
  idMouvement: number;
  companyId: number;
  typeMouvement: TypeMouvementGasoil;
  dateMouvement: string;
  quantiteLitres: string;
  prixUnitaire: string | null;
  montantTotal: string | null;
  idBonCarburant: number | null;
  numeroBon: string | null;
  immatriculation: string | null;
  nomConducteur: string | null;
  nomFournisseur: string | null;
  referenceFacture: string | null;
  remarques: string | null;
  stockApresMouvement: string;
  creeLe: string;
}

export interface StockGasoilStats {
  stockActuelLitres: string;
  seuilAlerteLitres: string;
  statutAlerte: string;
  isLowStock: boolean;
  pmpActuel: string | null;
  totalEntreesLitres: string;
  totalSortiesLitres: string;
  nombreMouvements: number;
}

@Injectable()
export class StockGasoilService {
  private readonly logger = new Logger(StockGasoilService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to parse date preset into start and end Date objects for period queries
   */
  private parsePeriodPreset(
    preset?: PeriodPresetStock,
    dateFrom?: string,
    dateTo?: string,
  ): { start?: Date; end?: Date } {
    const now = new Date();
    if (preset === PeriodPresetStock.AUJOURDHUI) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPresetStock.CE_MOIS) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPresetStock.CE_TRIMESTRE) {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPresetStock.CETTE_ANNEE) {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    return {
      start: dateFrom ? new Date(dateFrom) : undefined,
      end: dateTo ? new Date(dateTo) : undefined,
    };
  }

  /**
   * Acquires row-level pessimistic lock for tenant company to prevent race conditions during stock mutations.
   */
  public async lockCompanyRow(tx: Prisma.TransactionClient, companyId: number): Promise<void> {
    await tx.$executeRawUnsafe(
      'SELECT id FROM companies WHERE id = $1 FOR UPDATE',
      companyId,
    );
  }

  /**
   * Returns current company gasoil threshold from CompanySettings (default 500.00 L)
   */
  public async getCompanyAlertThreshold(companyId: number, txClient?: Prisma.TransactionClient): Promise<Prisma.Decimal> {
    const client = txClient || this.prisma;
    const settings = await client.companySettings.findUnique({
      where: { companyId },
      select: { seuilAlerteStockGasoil: true },
    });
    return settings?.seuilAlerteStockGasoil
      ? new Prisma.Decimal(settings.seuilAlerteStockGasoil)
      : new Prisma.Decimal(500.00);
  }

  /**
   * Authoritative net stock calculation for target company: SUM(ENTREE) - SUM(SORTIE)
   */
  public async getAuthoritativeStock(
    companyId: number,
    txClient?: Prisma.TransactionClient,
    excludeBonId?: number,
  ): Promise<{ availableLitres: Prisma.Decimal; totalEntreesLitres: Prisma.Decimal; totalSortiesLitres: Prisma.Decimal }> {
    const client = txClient || this.prisma;

    const whereClause: Prisma.StockGasoilMouvementWhereInput = {
      companyId,
      ...(excludeBonId
        ? {
            OR: [
              { idBonCarburant: null },
              { idBonCarburant: { not: excludeBonId } },
            ],
          }
        : {}),
    };

    const aggregations = await client.stockGasoilMouvement.groupBy({
      by: ['typeMouvement'],
      where: whereClause,
      _sum: {
        quantiteLitres: true,
      },
    });

    let totalEntreesLitres = new Prisma.Decimal(0);
    let totalSortiesLitres = new Prisma.Decimal(0);

    for (const agg of aggregations) {
      if (agg.typeMouvement === TypeMouvementGasoil.ENTREE && agg._sum.quantiteLitres) {
        totalEntreesLitres = new Prisma.Decimal(agg._sum.quantiteLitres);
      } else if (agg.typeMouvement === TypeMouvementGasoil.SORTIE && agg._sum.quantiteLitres) {
        totalSortiesLitres = new Prisma.Decimal(agg._sum.quantiteLitres);
      }
    }

    const availableLitres = totalEntreesLitres.sub(totalSortiesLitres);
    return {
      availableLitres: availableLitres.isNegative() ? new Prisma.Decimal(0) : availableLitres,
      totalEntreesLitres,
      totalSortiesLitres,
    };
  }

  /**
   * Authoritative Moving Weighted Average Cost (Prix Moyen Pondéré - PMP) calculation:
   * Re-evaluates chronological stock movements (ENTRÉE + SORTIE):
   * - ENTRÉE: newPMP = (currentStockQuantity * currentPMP + newEntryQuantity * newEntryPrice) / newTotalQuantity
   * - SORTIE: reduces stock quantity but preserves currentPMP unchanged.
   */
  public async getAuthoritativePMP(
    companyId: number,
    txClient?: Prisma.TransactionClient,
  ): Promise<Prisma.Decimal | null> {
    const client = txClient || this.prisma;

    const movements = await client.stockGasoilMouvement.findMany({
      where: { companyId },
      orderBy: [{ dateMouvement: 'asc' }, { id: 'asc' }],
      select: {
        typeMouvement: true,
        quantiteLitres: true,
        prixUnitaire: true,
        montantTotal: true,
      },
    });

    if (movements.length === 0) return null;

    let runningStock = new Prisma.Decimal(0);
    let runningPMP: Prisma.Decimal | null = null;

    for (const m of movements) {
      const q = new Prisma.Decimal(m.quantiteLitres);

      if (m.typeMouvement === TypeMouvementGasoil.ENTREE) {
        let price = m.prixUnitaire ? new Prisma.Decimal(m.prixUnitaire) : null;
        if (!price && m.montantTotal) {
          price = new Prisma.Decimal(m.montantTotal).div(q);
        }

        if (price) {
          if (runningStock.lessThanOrEqualTo(0) || runningPMP === null) {
            runningPMP = price;
            runningStock = q;
          } else {
            const currentValue = runningStock.mul(runningPMP);
            const newValue = q.mul(price);
            runningStock = runningStock.add(q);
            runningPMP = currentValue.add(newValue).div(runningStock);
          }
        } else {
          runningStock = runningStock.add(q);
        }
      } else if (m.typeMouvement === TypeMouvementGasoil.SORTIE) {
        runningStock = runningStock.sub(q);
        if (runningStock.isNegative()) {
          runningStock = new Prisma.Decimal(0);
        }
        // SORTIE decreases stock quantity but does NOT change PMP
      }
    }

    return runningPMP;
  }

  /**
   * State-machine based Low Stock Alert System.
   * State transitions:
   * - NORMAL: Stock > threshold (Resets alert state)
   * - LOW: 0 < Stock <= threshold (Triggers 1 low-stock notification upon transition)
   * - ZERO: Stock == 0 (Triggers 1 empty-stock notification upon transition)
   * Deduplicated via company alert state machine in CompanySettings.
   */
  public async checkAndTriggerLowStockAlert(
    companyId: number,
    currentStock: Prisma.Decimal,
    threshold: Prisma.Decimal,
  ): Promise<void> {
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: { statutAlerteStockGasoil: true },
    });

    const currentState = settings?.statutAlerteStockGasoil || 'NORMAL';
    let newState = currentState;

    if (currentStock.greaterThan(threshold)) {
      newState = 'NORMAL';
    } else if (currentStock.equals(0)) {
      newState = 'ZERO';
    } else {
      newState = 'LOW';
    }

    if (newState !== currentState) {
      await this.prisma.companySettings.update({
        where: { companyId },
        data: { statutAlerteStockGasoil: newState },
      });

      if (newState === 'LOW' || newState === 'ZERO') {
        const isZero = newState === 'ZERO';
        const timestampStr = Date.now().toString();
        const dedupKey = `STOCK_GASOIL_LOW:${companyId}:${newState}:${timestampStr}`;
        const titre = isZero ? 'Stock gasoil épuisé' : 'Stock gasoil faible';
        const message = isZero
          ? 'Stock gasoil épuisé : aucun litre disponible.'
          : `Stock gasoil faible : ${currentStock.toFixed(2)} L disponibles, seuil d'alerte : ${threshold.toFixed(2)} L.`;

        try {
          const recipients = await this.notificationsService.getEligibleRecipientsForCompany(
            companyId,
            'stock_gasoil',
          );

          if (recipients.length > 0) {
            await this.notificationsService.createNotification(companyId, {
              type: 'STOCK_GASOIL_LOW',
              titre,
              message,
              priorite: isZero ? 'URGENT' : 'HIGH',
              entityType: 'STOCK_GASOIL',
              targetRoute: '/stock-gasoil',
              dedupKey,
              recipientUserIds: recipients,
            });
          }
        } catch (err: any) {
          this.logger.error(`Erreur lors de la création d'alerte stock gasoil: ${err.message}`);
        }
      }
    }
  }

  /**
   * Creates an ENTRÉE de stock transactionally.
   */
  async createEntree(
    companyId: number,
    dto: CreateStockEntreeDto,
    userId?: number,
  ): Promise<StockGasoilMovementView> {
    const quantiteLitres = new Prisma.Decimal(dto.quantiteLitres);
    const prixUnitaire = new Prisma.Decimal(dto.prixUnitaire);
    const montantTotal = quantiteLitres.mul(prixUnitaire);
    const dateMouvement = dto.dateMouvement ? new Date(dto.dateMouvement) : new Date();

    const createdId = await this.prisma.$transaction(async (tx) => {
      // 1. Lock company row for update concurrency safety
      await this.lockCompanyRow(tx, companyId);

      // 2. Insert ENTRÉE movement
      const movement = await tx.stockGasoilMouvement.create({
        data: {
          companyId,
          typeMouvement: TypeMouvementGasoil.ENTREE,
          dateMouvement,
          quantiteLitres,
          prixUnitaire,
          montantTotal,
          nomFournisseur: dto.nomFournisseur ? dto.nomFournisseur.trim() : null,
          referenceFacture: dto.referenceFacture ? dto.referenceFacture.trim() : null,
          remarques: dto.remarques ? dto.remarques.trim() : null,
          creeParId: userId ?? null,
        },
      });

      return movement.id;
    });

    // Check alert state machine post-transaction
    const { availableLitres } = await this.getAuthoritativeStock(companyId);
    const threshold = await this.getCompanyAlertThreshold(companyId);
    await this.checkAndTriggerLowStockAlert(companyId, availableLitres, threshold);

    return this.findOne(createdId, companyId);
  }

  /**
   * Updates an existing ENTRÉE de stock transactionally.
   */
  async updateEntree(
    idMouvement: number,
    companyId: number,
    dto: UpdateStockEntreeDto,
  ): Promise<StockGasoilMovementView> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockCompanyRow(tx, companyId);

      const existing = await tx.stockGasoilMouvement.findFirst({
        where: { id: idMouvement, companyId, typeMouvement: TypeMouvementGasoil.ENTREE },
      });

      if (!existing) {
        throw new NotFoundException(`Entrée de stock #${idMouvement} introuvable`);
      }

      const newLitres = dto.quantiteLitres !== undefined ? new Prisma.Decimal(dto.quantiteLitres) : new Prisma.Decimal(existing.quantiteLitres);
      const newPrix = dto.prixUnitaire !== undefined ? new Prisma.Decimal(dto.prixUnitaire) : (existing.prixUnitaire ? new Prisma.Decimal(existing.prixUnitaire) : null);
      const newMontant = newLitres && newPrix ? newLitres.mul(newPrix) : existing.montantTotal;

      // Verify that decreasing entry quantity does not result in negative stock balance
      if (dto.quantiteLitres !== undefined) {
        const { availableLitres } = await this.getAuthoritativeStock(companyId, tx);
        const oldLitres = new Prisma.Decimal(existing.quantiteLitres);
        const hypotheticalStock = availableLitres.sub(oldLitres).add(newLitres);

        if (hypotheticalStock.isNegative()) {
          throw new ConflictException(
            `Modification refusée : la réduction de quantité produirait un stock négatif (Stock virtuel après modification: ${hypotheticalStock.toFixed(2)} L)`,
          );
        }
      }

      await tx.stockGasoilMouvement.update({
        where: { id: idMouvement },
        data: {
          ...(dto.dateMouvement ? { dateMouvement: new Date(dto.dateMouvement) } : {}),
          ...(dto.quantiteLitres !== undefined ? { quantiteLitres: newLitres } : {}),
          ...(dto.prixUnitaire !== undefined ? { prixUnitaire: newPrix } : {}),
          montantTotal: newMontant,
          ...(dto.nomFournisseur !== undefined ? { nomFournisseur: dto.nomFournisseur ? dto.nomFournisseur.trim() : null } : {}),
          ...(dto.referenceFacture !== undefined ? { referenceFacture: dto.referenceFacture ? dto.referenceFacture.trim() : null } : {}),
          ...(dto.remarques !== undefined ? { remarques: dto.remarques ? dto.remarques.trim() : null } : {}),
        },
      });
    });

    const { availableLitres } = await this.getAuthoritativeStock(companyId);
    const threshold = await this.getCompanyAlertThreshold(companyId);
    await this.checkAndTriggerLowStockAlert(companyId, availableLitres, threshold);

    return this.findOne(idMouvement, companyId);
  }

  /**
   * Deletes an existing ENTRÉE de stock safely.
   */
  async removeEntree(idMouvement: number, companyId: number): Promise<{ idMouvement: number }> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockCompanyRow(tx, companyId);

      const existing = await tx.stockGasoilMouvement.findFirst({
        where: { id: idMouvement, companyId, typeMouvement: TypeMouvementGasoil.ENTREE },
      });

      if (!existing) {
        throw new NotFoundException(`Entrée de stock #${idMouvement} introuvable`);
      }

      const { availableLitres } = await this.getAuthoritativeStock(companyId, tx);
      const entryLitres = new Prisma.Decimal(existing.quantiteLitres);
      const remainingStock = availableLitres.sub(entryLitres);

      if (remainingStock.isNegative()) {
        throw new ConflictException(
          `Suppression impossible : des consommations dépendent de cette entrée (Stock restant calculé : ${remainingStock.toFixed(2)} L)`,
        );
      }

      await tx.stockGasoilMouvement.delete({ where: { id: idMouvement } });
    });

    const { availableLitres } = await this.getAuthoritativeStock(companyId);
    const threshold = await this.getCompanyAlertThreshold(companyId);
    await this.checkAndTriggerLowStockAlert(companyId, availableLitres, threshold);

    return { idMouvement };
  }

  /**
   * Retrieves paginated stock movements with window-function running balance `stockApresMouvement`.
   */
  async findAll(
    query: QueryStockGasoilDto,
    companyId: number,
  ): Promise<PaginatedResult<StockGasoilMovementView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const period = this.parsePeriodPreset(query.preset, query.dateFrom, query.dateTo);

    const sqlWhereClauses: string[] = ['m.company_id = $1'];
    const sqlParams: any[] = [companyId];

    if (query.search && query.search.trim().length > 0) {
      sqlParams.push(`%${query.search.trim()}%`);
      const pIdx = sqlParams.length;
      sqlWhereClauses.push(`(
        m.immatriculation ILIKE $${pIdx} OR
        m.nom_conducteur ILIKE $${pIdx} OR
        m.nom_fournisseur ILIKE $${pIdx} OR
        m.reference_facture ILIKE $${pIdx} OR
        b.numero_bon ILIKE $${pIdx}
      )`);
    }

    if (query.typeMouvement) {
      sqlParams.push(query.typeMouvement);
      sqlWhereClauses.push(`m.type_mouvement = $${sqlParams.length}`);
    }

    if (query.immatriculation && query.immatriculation.trim() !== 'ALL') {
      sqlParams.push(query.immatriculation.trim());
      sqlWhereClauses.push(`m.immatriculation ILIKE $${sqlParams.length}`);
    }

    if (period.start) {
      sqlParams.push(period.start);
      sqlWhereClauses.push(`m.date_mouvement >= $${sqlParams.length}`);
    }

    if (period.end) {
      sqlParams.push(period.end);
      sqlWhereClauses.push(`m.date_mouvement <= $${sqlParams.length}`);
    }

    const whereClauseSql = sqlWhereClauses.join(' AND ');

    const sortColumnMap: Record<string, string> = {
      idMouvement: 'm.id_mouvement',
      dateMouvement: 'm.date_mouvement',
      typeMouvement: 'm.type_mouvement',
      quantiteLitres: 'm.quantite_litres',
      prixUnitaire: 'm.prix_unitaire',
      montantTotal: 'm.montant_total',
    };

    const sortCol = sortColumnMap[query.sortBy ?? ''] || 'm.date_mouvement';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const fullQuery = `
      WITH running_movements AS (
        SELECT 
          m.id_mouvement,
          m.company_id,
          m.type_mouvement,
          m.date_mouvement,
          m.quantite_litres,
          m.prix_unitaire,
          m.montant_total,
          m.id_bon_carburant,
          b.numero_bon,
          m.immatriculation,
          m.nom_conducteur,
          m.nom_fournisseur,
          m.reference_facture,
          m.remarques,
          m.cree_le,
          SUM(
            CASE WHEN m.type_mouvement = 'ENTREE' THEN m.quantite_litres ELSE -m.quantite_litres END
          ) OVER (
            PARTITION BY m.company_id
            ORDER BY m.date_mouvement ASC, m.id_mouvement ASC
          ) AS stock_apres_mouvement
        FROM stock_gasoil_mouvements m
        LEFT JOIN bons_carburant b ON b.id_bon = m.id_bon_carburant
        WHERE m.company_id = $1
      )
      SELECT rm.*
      FROM running_movements rm
      LEFT JOIN stock_gasoil_mouvements m ON m.id_mouvement = rm.id_mouvement
      LEFT JOIN bons_carburant b ON b.id_bon = rm.id_bon_carburant
      WHERE ${whereClauseSql}
      ORDER BY ${sortCol} ${sortOrder}, rm.id_mouvement ${sortOrder}
    `;

    const allRows: any[] = await this.prisma.$queryRawUnsafe(fullQuery, ...sqlParams);
    const total = allRows.length;

    const startIndex = (page - 1) * limit;
    const pagedRows = allRows.slice(startIndex, startIndex + limit);

    const data: StockGasoilMovementView[] = pagedRows.map((r) => ({
      idMouvement: Number(r.id_mouvement),
      companyId: Number(r.company_id),
      typeMouvement: r.type_mouvement as TypeMouvementGasoil,
      dateMouvement: r.date_mouvement ? new Date(r.date_mouvement).toISOString().split('T')[0] : '',
      quantiteLitres: Number(r.quantite_litres).toFixed(2),
      prixUnitaire: r.prix_unitaire !== null && r.prix_unitaire !== undefined ? Number(r.prix_unitaire).toFixed(3) : null,
      montantTotal: r.montant_total !== null && r.montant_total !== undefined ? Number(r.montant_total).toFixed(2) : null,
      idBonCarburant: r.id_bon_carburant ? Number(r.id_bon_carburant) : null,
      numeroBon: r.numero_bon ?? null,
      immatriculation: r.immatriculation ?? null,
      nomConducteur: r.nom_conducteur ?? null,
      nomFournisseur: r.nom_fournisseur ?? null,
      referenceFacture: r.reference_facture ?? null,
      remarques: r.remarques ?? null,
      stockApresMouvement: Number(r.stock_apres_mouvement || 0).toFixed(2),
      creeLe: r.cree_le ? new Date(r.cree_le).toISOString() : new Date().toISOString(),
    }));

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Retrieves single stock movement by ID.
   */
  async findOne(idMouvement: number, companyId: number): Promise<StockGasoilMovementView> {
    const list = await this.findAll({ limit: 100000 }, companyId);
    const target = list.data.find((m) => m.idMouvement === idMouvement);

    if (!target) {
      throw new NotFoundException(`Mouvement de stock #${idMouvement} introuvable`);
    }

    return target;
  }

  /**
   * Computes stock statistics and KPIs.
   */
  async findStats(query: QueryStockGasoilDto, companyId: number): Promise<StockGasoilStats> {
    const { availableLitres } = await this.getAuthoritativeStock(companyId);
    const seuilAlerte = await this.getCompanyAlertThreshold(companyId);
    const pmpDecimal = await this.getAuthoritativePMP(companyId);

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: { statutAlerteStockGasoil: true },
    });

    const list = await this.findAll(query, companyId);

    let periodEntrees = new Prisma.Decimal(0);
    let periodSorties = new Prisma.Decimal(0);

    for (const item of list.data) {
      const q = new Prisma.Decimal(item.quantiteLitres);
      if (item.typeMouvement === TypeMouvementGasoil.ENTREE) {
        periodEntrees = periodEntrees.add(q);
      } else {
        periodSorties = periodSorties.add(q);
      }
    }

    return {
      stockActuelLitres: availableLitres.toFixed(2),
      seuilAlerteLitres: seuilAlerte.toFixed(2),
      statutAlerte: settings?.statutAlerteStockGasoil || 'NORMAL',
      isLowStock: availableLitres.lessThanOrEqualTo(seuilAlerte),
      pmpActuel: pmpDecimal ? pmpDecimal.toFixed(3) : null,
      totalEntreesLitres: periodEntrees.toFixed(2),
      totalSortiesLitres: periodSorties.toFixed(2),
      nombreMouvements: list.meta.total,
    };
  }
}
