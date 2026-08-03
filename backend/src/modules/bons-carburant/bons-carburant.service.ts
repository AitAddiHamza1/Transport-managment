import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateBonCarburantDto } from './dto/create-bon-carburant.dto';
import { UpdateBonCarburantDto } from './dto/update-bon-carburant.dto';
import { QueryBonCarburantDto, PeriodPreset } from './dto/query-bon-carburant.dto';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

export interface BonCarburantView {
  idBon: number;
  numeroBon: string | null;
  dateCarburant: string;
  immatriculation: string;
  vehicule?: CompactVehiculeSummary | null;
  driverName: string | null;
  nomStation: string | null;
  kilometrage: number | null;
  litres: string;
  prixParLitre: string;
  montantTotal: string;
  distance: number | null;
  consommationL100: string | null;
  coutKm: string | null;
  status: 'STOCK_INITIAL' | 'CALCULE' | 'NON_CALCULABLE';
}

export interface BonCarburantStats {
  litresTotal: string;
  consommationMoyenneL100: string | null;
  coutTotal: string;
  coutMoyenKm: string | null;
  distanceTotale: number;
  calculableRecords: number;
  totalRecords: number;
}

@Injectable()
export class BonsCarburantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safe BigInt conversion to Number with MAX_SAFE_INTEGER validation
   */
  private safeBigIntToNumber(val: bigint | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (val > BigInt(Number.MAX_SAFE_INTEGER) || val < BigInt(-Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Odometer value ${val} exceeds safe JavaScript number range`);
    }
    return Number(val);
  }

  /**
   * Normalizes voucher number (trim + uppercase)
   */
  private normalizeNumeroBon(raw?: string | null): string | null {
    if (!raw) return null;
    const trimmed = raw.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Helper to parse date preset into start and end Date objects
   */
  private parsePeriodPreset(
    preset?: PeriodPreset,
    dateFrom?: string,
    dateTo?: string,
  ): { start?: Date; end?: Date } {
    const now = new Date();
    if (preset === PeriodPreset.AUJOURDHUI) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPreset.CE_MOIS) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPreset.CE_TRIMESTRE) {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    if (preset === PeriodPreset.CETTE_ANNEE) {
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
   * Validates odometer monotonicity relative to preceding and following records for the same vehicle
   */
  private async validateOdometerMonotonicity(params: {
    immatriculation: string;
    dateCarburant: Date;
    kilometrage: number | null | undefined;
    excludeIdBon?: number;
  }): Promise<void> {
    const { immatriculation, dateCarburant, kilometrage, excludeIdBon } = params;
    if (kilometrage === undefined || kilometrage === null) return;

    // Find preceding record for same vehicle
    const previousRecord = await this.prisma.bonCarburant.findFirst({
      where: {
        immatriculation: { equals: immatriculation, mode: 'insensitive' },
        ...(excludeIdBon ? { idBon: { not: excludeIdBon } } : {}),
        OR: [
          { dateCarburant: { lt: dateCarburant } },
          {
            dateCarburant: { equals: dateCarburant },
            ...(excludeIdBon ? { idBon: { lt: excludeIdBon } } : {}),
          },
        ],
      },
      orderBy: [{ dateCarburant: 'desc' }, { idBon: 'desc' }],
    });

    if (previousRecord && previousRecord.kilometrage !== null) {
      const prevKm = this.safeBigIntToNumber(previousRecord.kilometrage);
      if (prevKm !== null && kilometrage <= prevKm) {
        throw new ConflictException(
          `Le kilométrage (${kilometrage} km) doit être strictement supérieur au kilométrage précédent du véhicule (${prevKm} km).`,
        );
      }
    }

    // Find following record for same vehicle
    const nextRecord = await this.prisma.bonCarburant.findFirst({
      where: {
        immatriculation: { equals: immatriculation, mode: 'insensitive' },
        ...(excludeIdBon ? { idBon: { not: excludeIdBon } } : {}),
        OR: [
          { dateCarburant: { gt: dateCarburant } },
          {
            dateCarburant: { equals: dateCarburant },
            ...(excludeIdBon ? { idBon: { gt: excludeIdBon } } : {}),
          },
        ],
      },
      orderBy: [{ dateCarburant: 'asc' }, { idBon: 'asc' }],
    });

    if (nextRecord && nextRecord.kilometrage !== null) {
      const nextKm = this.safeBigIntToNumber(nextRecord.kilometrage);
      if (nextKm !== null && kilometrage >= nextKm) {
        throw new ConflictException(
          `Le kilométrage (${kilometrage} km) doit être strictement inférieur au kilométrage du bon suivant du véhicule (${nextKm} km).`,
        );
      }
    }
  }

  /**
   * Executes the shared SQL CTE derivation query for list, stats, detail, and Excel export
   */
  private async executeSharedDerivationQuery(query: QueryBonCarburantDto): Promise<any[]> {
    const period = this.parsePeriodPreset(query.preset, query.dateFrom, query.dateTo);

    const sqlWhereClauses: string[] = ['1=1'];
    const sqlParams: any[] = [];

    if (query.search && query.search.trim().length > 0) {
      const s = `%${query.search.trim()}%`;
      sqlParams.push(s);
      const pIdx = sqlParams.length;
      sqlWhereClauses.push(`(
        fd.numero_bon ILIKE $${pIdx} OR
        fd.immatriculation ILIKE $${pIdx} OR
        fd.marque ILIKE $${pIdx} OR
        fd.modele ILIKE $${pIdx} OR
        fd.nom_conducteur ILIKE $${pIdx} OR
        fd.nom_station ILIKE $${pIdx}
      )`);
    }

    if (query.immatriculation && query.immatriculation.trim() !== 'ALL') {
      sqlParams.push(query.immatriculation.trim());
      sqlWhereClauses.push(`fd.immatriculation ILIKE $${sqlParams.length}`);
    }

    if (query.nomConducteur && query.nomConducteur.trim().length > 0) {
      sqlParams.push(`%${query.nomConducteur.trim()}%`);
      sqlWhereClauses.push(`fd.nom_conducteur ILIKE $${sqlParams.length}`);
    }

    if (query.nomStation && query.nomStation.trim().length > 0) {
      sqlParams.push(`%${query.nomStation.trim()}%`);
      sqlWhereClauses.push(`fd.nom_station ILIKE $${sqlParams.length}`);
    }

    if (period.start) {
      sqlParams.push(period.start);
      sqlWhereClauses.push(`fd.date_carburant >= $${sqlParams.length}`);
    }

    if (period.end) {
      sqlParams.push(period.end);
      sqlWhereClauses.push(`fd.date_carburant <= $${sqlParams.length}`);
    }

    if (query.statut) {
      sqlParams.push(query.statut);
      sqlWhereClauses.push(`fd.derived_status = $${sqlParams.length}`);
    }

    const whereClauseSql = sqlWhereClauses.join(' AND ');

    // Sort order mapping
    const allowedSortFields: Record<string, string> = {
      idBon: 'fd.id_bon',
      numeroBon: 'fd.numero_bon',
      dateCarburant: 'fd.date_carburant',
      immatriculation: 'fd.immatriculation',
      driverName: 'fd.nom_conducteur',
      kilometrage: 'fd.kilometrage',
      litres: 'fd.litres',
      prixParLitre: 'fd.prix_par_litre',
      montantTotal: 'fd.montant_total',
      distance: 'fd.distance',
      consommationL100: 'fd.consommation_l100',
      coutKm: 'fd.cout_km',
      status: 'fd.derived_status',
    };

    const sortColumn = allowedSortFields[query.sortBy ?? ''] || 'fd.date_carburant';
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const fullQuery = `
      WITH fuel_partitioned AS (
        SELECT 
          b.id_bon,
          b.numero_bon,
          b.immatriculation,
          v.marque,
          v.modele,
          b.nom_conducteur,
          b.nom_station,
          b.litres,
          b.prix_par_litre,
          b.montant_total,
          b.date_carburant,
          b.kilometrage,
          LAG(b.kilometrage) OVER (
            PARTITION BY b.immatriculation
            ORDER BY b.date_carburant ASC, b.id_bon ASC
          ) AS prev_kilometrage,
          LAG(b.id_bon) OVER (
            PARTITION BY b.immatriculation
            ORDER BY b.date_carburant ASC, b.id_bon ASC
          ) AS prev_id_bon
        FROM bons_carburant b
        LEFT JOIN vehicules v ON v.immatriculation = b.immatriculation
      ),
      fuel_derived AS (
        SELECT
          fp.*,
          CASE 
            WHEN fp.kilometrage IS NOT NULL AND fp.prev_kilometrage IS NOT NULL
            THEN (fp.kilometrage - fp.prev_kilometrage)
            ELSE NULL
          END AS distance,
          CASE
            WHEN fp.kilometrage IS NULL THEN 'NON_CALCULABLE'
            WHEN fp.prev_id_bon IS NULL THEN 'STOCK_INITIAL'
            WHEN fp.prev_kilometrage IS NULL THEN 'NON_CALCULABLE'
            WHEN (fp.kilometrage - fp.prev_kilometrage) <= 0 THEN 'NON_CALCULABLE'
            ELSE 'CALCULE'
          END AS derived_status
        FROM fuel_partitioned fp
      )
      SELECT 
        fd.*,
        CASE WHEN fd.derived_status = 'CALCULE' THEN ROUND((fd.litres / fd.distance * 100)::numeric, 2) ELSE NULL END AS consommation_l100,
        CASE WHEN fd.derived_status = 'CALCULE' THEN ROUND((fd.montant_total / fd.distance)::numeric, 2) ELSE NULL END AS cout_km
      FROM fuel_derived fd
      WHERE ${whereClauseSql}
      ORDER BY ${sortColumn} ${sortOrder}, fd.id_bon ${sortOrder}
    `;

    return this.prisma.$queryRawUnsafe(fullQuery, ...sqlParams);
  }

  /**
   * Map raw SQL row to BonCarburantView contract
   */
  private mapRawRowToView(row: any): BonCarburantView {
    const litresNum = row.litres !== null && row.litres !== undefined ? Number(row.litres) : 0;
    const prixNum =
      row.prix_par_litre !== null && row.prix_par_litre !== undefined
        ? Number(row.prix_par_litre)
        : 0;
    const montantNum =
      row.montant_total !== null && row.montant_total !== undefined
        ? Number(row.montant_total)
        : litresNum * prixNum;

    const km = this.safeBigIntToNumber(row.kilometrage);
    const dist = row.distance !== null && row.distance !== undefined ? Number(row.distance) : null;

    return {
      idBon: Number(row.id_bon),
      numeroBon: row.numero_bon ?? null,
      dateCarburant: row.date_carburant
        ? new Date(row.date_carburant).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      immatriculation: row.immatriculation,
      vehicule: {
        immatriculation: row.immatriculation,
        marque: row.marque ?? null,
        modele: row.modele ?? null,
      },
      driverName: row.nom_conducteur ?? null,
      nomStation: row.nom_station ?? null,
      kilometrage: km,
      litres: litresNum.toFixed(2),
      prixParLitre: prixNum.toFixed(3),
      montantTotal: montantNum.toFixed(2),
      distance: dist,
      consommationL100:
        row.derived_status === 'CALCULE' &&
        row.consommation_l100 !== null &&
        row.consommation_l100 !== undefined
          ? Number(row.consommation_l100).toFixed(2)
          : null,
      coutKm:
        row.derived_status === 'CALCULE' && row.cout_km !== null && row.cout_km !== undefined
          ? Number(row.cout_km).toFixed(2)
          : null,
      status: row.derived_status as 'STOCK_INITIAL' | 'CALCULE' | 'NON_CALCULABLE',
    };
  }

  // -------------------------------------------------------------------
  // CRUD & Stats Methods
  // -------------------------------------------------------------------

  async create(dto: CreateBonCarburantDto): Promise<BonCarburantView> {
    const immatriculation = dto.immatriculation.trim().toUpperCase();
    const normalizedNumeroBon = this.normalizeNumeroBon(dto.numeroBon);
    const nomConducteur = dto.nomConducteur ? dto.nomConducteur.trim() : null;
    const nomStation = dto.nomStation ? dto.nomStation.trim() : null;
    const dateCarburant = dto.dateCarburant ? new Date(dto.dateCarburant) : new Date();

    if (!normalizedNumeroBon) {
      throw new BadRequestException('Le numéro du bon de carburant est obligatoire');
    }

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

    // Verify numeroBon uniqueness
    const duplicate = await this.prisma.bonCarburant.findFirst({
      where: { numeroBon: { equals: normalizedNumeroBon, mode: 'insensitive' } },
    });
    if (duplicate) {
      throw new ConflictException('Un bon de carburant portant ce numéro existe déjà.');
    }

    // Odometer monotonicity validation
    await this.validateOdometerMonotonicity({
      immatriculation,
      dateCarburant,
      kilometrage: dto.kilometrage,
    });

    const created = await this.prisma.bonCarburant.create({
      data: {
        numeroBon: normalizedNumeroBon,
        immatriculation,
        nomConducteur,
        nomStation,
        kilometrage:
          dto.kilometrage !== undefined && dto.kilometrage !== null
            ? BigInt(dto.kilometrage)
            : null,
        litres: dto.litres,
        prixParLitre: dto.prixParLitre,
        dateCarburant,
      },
    });

    return this.findOne(created.idBon);
  }

  async findAll(query: QueryBonCarburantDto): Promise<PaginatedResult<BonCarburantView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allDerivedRows = await this.executeSharedDerivationQuery(query);
    const total = allDerivedRows.length;

    const startIndex = (page - 1) * limit;
    const pagedRows = allDerivedRows.slice(startIndex, startIndex + limit);

    return {
      data: pagedRows.map((r) => this.mapRawRowToView(r)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(query: QueryBonCarburantDto): Promise<BonCarburantStats> {
    const allRows = await this.executeSharedDerivationQuery(query);

    let totalLitres = 0;
    let totalMontant = 0;

    let calculableLitres = 0;
    let calculableMontant = 0;
    let calculableDistance = 0;
    let calculableCount = 0;

    for (const r of allRows) {
      const l = Number(r.litres || 0);
      const p = Number(r.prix_par_litre || 0);
      const m =
        r.montant_total !== null && r.montant_total !== undefined ? Number(r.montant_total) : l * p;
      totalLitres += l;
      totalMontant += m;

      if (
        r.derived_status === 'CALCULE' &&
        r.distance !== null &&
        r.distance !== undefined &&
        Number(r.distance) > 0
      ) {
        calculableLitres += l;
        calculableMontant += m;
        calculableDistance += Number(r.distance);
        calculableCount++;
      }
    }

    const avgL100 = calculableDistance > 0 ? (calculableLitres / calculableDistance) * 100 : null;
    const avgCostKm = calculableDistance > 0 ? calculableMontant / calculableDistance : null;

    return {
      litresTotal: totalLitres.toFixed(2),
      consommationMoyenneL100: avgL100 !== null ? avgL100.toFixed(2) : null,
      coutTotal: totalMontant.toFixed(2),
      coutMoyenKm: avgCostKm !== null ? avgCostKm.toFixed(2) : null,
      distanceTotale: calculableDistance,
      calculableRecords: calculableCount,
      totalRecords: allRows.length,
    };
  }

  async findOne(idBon: number): Promise<BonCarburantView> {
    const allRows = await this.executeSharedDerivationQuery({ limit: 100000 });
    const target = allRows.find((r) => Number(r.id_bon) === idBon);

    if (!target) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    return this.mapRawRowToView(target);
  }

  async update(idBon: number, dto: UpdateBonCarburantDto): Promise<BonCarburantView> {
    const existing = await this.prisma.bonCarburant.findUnique({ where: { idBon } });
    if (!existing) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    const immatriculation = dto.immatriculation
      ? dto.immatriculation.trim().toUpperCase()
      : existing.immatriculation;

    if (dto.immatriculation) {
      const vehiculeExists = await this.prisma.vehicule.findUnique({ where: { immatriculation } });
      if (!vehiculeExists) {
        throw new NotFoundException(
          `Le véhicule avec l'immatriculation "${immatriculation}" est introuvable`,
        );
      }
    }

    let normalizedNumeroBon = existing.numeroBon;
    if (dto.numeroBon !== undefined) {
      normalizedNumeroBon = this.normalizeNumeroBon(dto.numeroBon);
      if (!normalizedNumeroBon) {
        throw new BadRequestException('Le numéro du bon de carburant est obligatoire');
      }

      const duplicate = await this.prisma.bonCarburant.findFirst({
        where: {
          numeroBon: { equals: normalizedNumeroBon, mode: 'insensitive' },
          idBon: { not: idBon },
        },
      });
      if (duplicate) {
        throw new ConflictException('Un bon de carburant portant ce numéro existe déjà.');
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

    const dateCarburant =
      dto.dateCarburant !== undefined
        ? dto.dateCarburant
          ? new Date(dto.dateCarburant)
          : new Date()
        : existing.dateCarburant;

    const kilometrage =
      dto.kilometrage !== undefined
        ? dto.kilometrage
        : this.safeBigIntToNumber(existing.kilometrage);

    // Odometer monotonicity validation
    await this.validateOdometerMonotonicity({
      immatriculation,
      dateCarburant,
      kilometrage,
      excludeIdBon: idBon,
    });

    await this.prisma.bonCarburant.update({
      where: { idBon },
      data: {
        ...(dto.numeroBon !== undefined ? { numeroBon: normalizedNumeroBon } : {}),
        ...(dto.immatriculation ? { immatriculation } : {}),
        ...(dto.nomConducteur !== undefined
          ? { nomConducteur: dto.nomConducteur ? dto.nomConducteur.trim() : null }
          : {}),
        ...(dto.nomStation !== undefined
          ? { nomStation: dto.nomStation ? dto.nomStation.trim() : null }
          : {}),
        ...(dto.kilometrage !== undefined
          ? { kilometrage: dto.kilometrage !== null ? BigInt(dto.kilometrage) : null }
          : {}),
        ...(dto.litres !== undefined ? { litres: dto.litres } : {}),
        ...(dto.prixParLitre !== undefined ? { prixParLitre: dto.prixParLitre } : {}),
        ...(dto.dateCarburant !== undefined ? { dateCarburant } : {}),
      },
    });

    return this.findOne(idBon);
  }

  async remove(idBon: number): Promise<{ idBon: number }> {
    const existing = await this.prisma.bonCarburant.findUnique({ where: { idBon } });
    if (!existing) {
      throw new NotFoundException(`Bon de carburant #${idBon} introuvable`);
    }

    await this.prisma.bonCarburant.delete({ where: { idBon } });
    return { idBon };
  }

  /**
   * Generates Excel workbook buffer for Consommation gasoil export
   */
  async generateExcel(query: QueryBonCarburantDto): Promise<Buffer> {
    const allRows = await this.executeSharedDerivationQuery(query);
    const views = allRows.map((r) => this.mapRawRowToView(r));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Transport ERP System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Consommation Gasoil', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    // Title Row
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RAPPORT DE CONSOMMATION GASOIL ET BONS DE CARBURANT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Column Headers
    const headers = [
      'Date',
      'N° Bon',
      'Véhicule',
      'Chauffeur',
      'Kilométrage',
      'Litres (L)',
      'Prix/L (MAD)',
      'Montant (MAD)',
      'Distance (km)',
      'L/100km',
      'Coût/km (MAD)',
      'Statut',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Formula Sanitization Helper
    const sanitizeText = (val: string | null | undefined): string => {
      if (!val) return '—';
      const s = String(val).trim();
      if (/^[=+@-]/.test(s)) {
        return `'${s}`;
      }
      return s;
    };

    // Populate Data Rows
    for (const v of views) {
      const statusLabel =
        v.status === 'STOCK_INITIAL'
          ? 'Stock initial'
          : v.status === 'CALCULE'
            ? 'Calculé'
            : 'Non calculable';

      const row = worksheet.addRow([
        v.dateCarburant,
        sanitizeText(v.numeroBon),
        sanitizeText(v.immatriculation),
        sanitizeText(v.driverName),
        v.kilometrage !== null ? v.kilometrage : '—',
        Number(v.litres),
        Number(v.prixParLitre),
        Number(v.montantTotal),
        v.distance !== null ? v.distance : '—',
        v.consommationL100 !== null ? Number(v.consommationL100) : '—',
        v.coutKm !== null ? Number(v.coutKm) : '—',
        statusLabel,
      ]);

      row.height = 20;

      // Alignments & Number Formatting
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'left' };
      row.getCell(3).alignment = { horizontal: 'left' };
      row.getCell(4).alignment = { horizontal: 'left' };

      row.getCell(5).alignment = { horizontal: 'right' };
      if (v.kilometrage !== null) row.getCell(5).numFmt = '#,##0';

      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(6).numFmt = '#,##0.00 "L"';

      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(7).numFmt = '#,##0.000 "MAD"';

      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(8).numFmt = '#,##0.00 "MAD"';

      row.getCell(9).alignment = { horizontal: 'right' };
      if (v.distance !== null) row.getCell(9).numFmt = '#,##0 "km"';

      row.getCell(10).alignment = { horizontal: 'right' };
      if (v.consommationL100 !== null) row.getCell(10).numFmt = '#,##0.00';

      row.getCell(11).alignment = { horizontal: 'right' };
      if (v.coutKm !== null) row.getCell(11).numFmt = '#,##0.00';

      row.getCell(12).alignment = { horizontal: 'center' };
    }

    // Set Column Widths
    worksheet.columns = [
      { width: 14 }, // Date
      { width: 16 }, // N° Bon
      { width: 16 }, // Véhicule
      { width: 22 }, // Chauffeur
      { width: 16 }, // Kilométrage
      { width: 14 }, // Litres
      { width: 16 }, // Prix/L
      { width: 18 }, // Montant
      { width: 16 }, // Distance
      { width: 14 }, // L/100km
      { width: 16 }, // Coût/km
      { width: 16 }, // Statut
    ];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
