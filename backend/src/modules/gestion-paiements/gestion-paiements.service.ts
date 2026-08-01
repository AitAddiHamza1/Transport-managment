import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryGestionPaiementsDto,
  GestionPaiementsSourceType,
} from './dto/query-gestion-paiements.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { isSuperAdmin } from '../../common/permissions/permissions';

export interface FinancialMovementView {
  movementId: string;
  sourceType: GestionPaiementsSourceType;
  sourceId: number;
  direction: 'IN' | 'OUT';
  date: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  reference: string;
  externalReference: string | null;
  party: {
    type: 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE' | 'ADMINISTRATIVE_CATEGORY';
    id: number | null;
    name: string;
  };
  relatedDocument: {
    type: 'INVOICE' | 'SUPPLIER_DEBT' | 'EMPLOYEE_PAYROLL' | 'ADMINISTRATIVE_EXPENSE';
    id: number | null;
    number: string;
  } | null;
  status: 'ACTIVE' | 'CANCELLED';
  isCancelled: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  sourceRoute: string;
}

export interface GestionPaiementsStats {
  totalIn: string;
  totalOut: string;
  netBalance: string;
  totalCount: number;
  activeCount: number;
  cancelledCount: number;
  bySourceType: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

@Injectable()
export class GestionPaiementsService {
  constructor(private readonly prisma: PrismaService) {}

  private canAccessModule(
    userPermissions: Record<string, any> | undefined | null,
    moduleKey: string,
    userRole?: string,
    isAdminGeneral?: boolean,
  ): boolean {
    if (isAdminGeneral || (userRole && isSuperAdmin(userRole))) return true;
    if (!userPermissions || typeof userPermissions !== 'object') return true;

    // Check wildcard permission
    if (userPermissions['*']) {
      const star = userPermissions['*'];
      if (typeof star === 'object' && star !== null && !Array.isArray(star)) {
        if (star.voir === true || star['*'] === true) return true;
      } else if (Array.isArray(star)) {
        if (star.includes('*') || star.includes('voir')) return true;
      }
    }

    const modPerm = userPermissions[moduleKey];
    if (!modPerm) return false;

    if (typeof modPerm === 'object' && modPerm !== null) {
      if (Array.isArray(modPerm)) {
        return modPerm.includes('*') || modPerm.includes('voir');
      }
      return modPerm.voir === true || modPerm['*'] === true;
    }
    return false;
  }

  private getCompanyCurrency(settings: any): string {
    return settings?.devise || 'MAD';
  }

  private buildUnionQuery(
    query: QueryGestionPaiementsDto,
    userPermissions?: Record<string, any> | null,
    userRole?: string,
    isAdminGeneral?: boolean,
  ): { sql: string; params: any[]; hasSources: boolean } {
    const subQueries: string[] = [];
    const params: any[] = [];

    const allowClient =
      this.canAccessModule(userPermissions, 'paiements_clients', userRole, isAdminGeneral) &&
      (!query.sourceType || query.sourceType === 'CLIENT_PAYMENT') &&
      (!query.direction || query.direction === 'IN') &&
      (!query.partyType || query.partyType === 'CLIENT');

    const allowSupplier =
      this.canAccessModule(userPermissions, 'paiements_fournisseurs', userRole, isAdminGeneral) &&
      (!query.sourceType || query.sourceType === 'SUPPLIER_PAYMENT') &&
      (!query.direction || query.direction === 'OUT') &&
      (!query.partyType || query.partyType === 'SUPPLIER');

    const allowEmployee =
      this.canAccessModule(userPermissions, 'paiements_employes', userRole, isAdminGeneral) &&
      (!query.sourceType || query.sourceType === 'EMPLOYEE_PAYMENT') &&
      (!query.direction || query.direction === 'OUT') &&
      (!query.partyType || query.partyType === 'EMPLOYEE');

    const allowAdminExp =
      this.canAccessModule(userPermissions, 'depenses_administratives', userRole, isAdminGeneral) &&
      (!query.sourceType || query.sourceType === 'ADMINISTRATIVE_EXPENSE') &&
      (!query.direction || query.direction === 'OUT') &&
      (!query.partyType || query.partyType === 'ADMINISTRATIVE_CATEGORY');

    // 1. CLIENT_PAYMENT
    if (allowClient) {
      subQueries.push(`
        SELECT
          'CLIENT_PAYMENT'::text                       AS source_type,
          pc.id::bigint                                AS source_id,
          ('CLIENT_PAYMENT:' || pc.id::text)::text     AS movement_id,
          'IN'::text                                   AS direction,
          pc.date_paiement::date                       AS movement_date,
          pc.montant_recu::numeric(14,2)               AS amount,
          pc.methode_paiement::text                    AS payment_method,
          pc.numero_facture::text                      AS reference,
          NULL::text                                   AS external_reference,
          'CLIENT'::text                               AS party_type,
          NULL::bigint                                 AS party_id,
          pc.nom_client::text                          AS party_name,
          'INVOICE'::text                              AS document_type,
          NULL::bigint                                 AS document_id,
          pc.numero_facture::text                      AS document_number,
          'ACTIVE'::text                               AS status,
          false::boolean                               AS is_cancelled,
          NULL::timestamptz                            AS cancelled_at,
          NULL::text                                   AS cancellation_reason,
          '/paiements-clients'::text                   AS source_route,
          (pc.numero_facture || ' ' || pc.nom_client)::text AS search_text
        FROM paiements_clients pc
      `);
    }

    // 2. SUPPLIER_PAYMENT
    if (allowSupplier) {
      subQueries.push(`
        SELECT
          'SUPPLIER_PAYMENT'::text                     AS source_type,
          pf.id::bigint                                AS source_id,
          ('SUPPLIER_PAYMENT:' || pf.id::text)::text   AS movement_id,
          'OUT'::text                                  AS direction,
          pf.date_paiement::date                       AS movement_date,
          pf.montant::numeric(14,2)                    AS amount,
          pf.mode_paiement::text                       AS payment_method,
          COALESCE(pf.numero_paiement, ('PF-' || pf.id::text))::text AS reference,
          pf.reference_externe::text                   AS external_reference,
          'SUPPLIER'::text                             AS party_type,
          df.id_fournisseur::bigint                    AS party_id,
          COALESCE(df.nom_fournisseur_snapshot, 'Fournisseur')::text AS party_name,
          'SUPPLIER_DEBT'::text                        AS document_type,
          df.id::bigint                                AS document_id,
          COALESCE(df.numero_dette, '')::text          AS document_number,
          (CASE WHEN pf.est_annule THEN 'CANCELLED' ELSE 'ACTIVE' END)::text AS status,
          COALESCE(pf.est_annule, false)::boolean      AS is_cancelled,
          pf.date_annulation::timestamptz              AS cancelled_at,
          pf.motif_annulation::text                    AS cancellation_reason,
          '/paiements-fournisseurs'::text              AS source_route,
          (COALESCE(pf.numero_paiement, '') || ' ' || COALESCE(df.nom_fournisseur_snapshot, '') || ' ' || COALESCE(df.numero_dette, '') || ' ' || COALESCE(pf.reference_externe, ''))::text AS search_text
        FROM paiements_fournisseurs pf
        LEFT JOIN dettes_fournisseurs df ON pf.id_dette_fournisseur = df.id
      `);
    }

    // 3. EMPLOYEE_PAYMENT
    if (allowEmployee) {
      subQueries.push(`
        SELECT
          'EMPLOYEE_PAYMENT'::text                     AS source_type,
          ve.id::bigint                                AS source_id,
          ('EMPLOYEE_PAYMENT:' || ve.id::text)::text   AS movement_id,
          'OUT'::text                                  AS direction,
          ve.date_versement::date                      AS movement_date,
          ve.montant::numeric(14,2)                    AS amount,
          ve.mode_paiement::text                       AS payment_method,
          COALESCE(pe.numero_paiement, ('PE-' || ve.id::text))::text AS reference,
          ve.reference_externe::text                   AS external_reference,
          'EMPLOYEE'::text                             AS party_type,
          e.id::bigint                                 AS party_id,
          (e.nom || ' ' || e.prenom)::text             AS party_name,
          'EMPLOYEE_PAYROLL'::text                     AS document_type,
          pe.id::bigint                                AS document_id,
          COALESCE(pe.numero_paiement, '')::text       AS document_number,
          (CASE WHEN ve.est_annule THEN 'CANCELLED' ELSE 'ACTIVE' END)::text AS status,
          COALESCE(ve.est_annule, false)::boolean      AS is_cancelled,
          ve.date_annulation::timestamptz              AS cancelled_at,
          ve.motif_annulation::text                    AS cancellation_reason,
          '/paiements-employes'::text                  AS source_route,
          (COALESCE(pe.numero_paiement, '') || ' ' || e.nom || ' ' || e.prenom || ' ' || COALESCE(ve.reference_externe, ''))::text AS search_text
        FROM versements_employes ve
        JOIN paiements_employes pe ON ve.id_paiement_employe = pe.id
        JOIN employes e ON pe.id_employe = e.id
      `);
    }

    // 4. ADMINISTRATIVE_EXPENSE
    if (allowAdminExp) {
      subQueries.push(`
        SELECT
          'ADMINISTRATIVE_EXPENSE'::text               AS source_type,
          da.id_depense::bigint                        AS source_id,
          ('ADMINISTRATIVE_EXPENSE:' || da.id_depense::text)::text AS movement_id,
          'OUT'::text                                  AS direction,
          da.date_depense::date                        AS movement_date,
          da.montant::numeric(14,2)                    AS amount,
          'VIREMENT'::text                             AS payment_method,
          ('DA-' || da.id_depense::text)::text         AS reference,
          NULL::text                                   AS external_reference,
          'ADMINISTRATIVE_CATEGORY'::text              AS party_type,
          NULL::bigint                                 AS party_id,
          da.categorie_depense::text                   AS party_name,
          'ADMINISTRATIVE_EXPENSE'::text               AS document_type,
          da.id_depense::bigint                        AS document_id,
          ('DA-' || da.id_depense::text)::text         AS document_number,
          'ACTIVE'::text                               AS status,
          false::boolean                               AS is_cancelled,
          NULL::timestamptz                            AS cancelled_at,
          NULL::text                                   AS cancellation_reason,
          '/charges-administratives'::text             AS source_route,
          (da.categorie_depense || ' ' || COALESCE(da.description, ''))::text AS search_text
        FROM depenses_administratives da
        WHERE da.supprime_le IS NULL
      `);
    }

    if (subQueries.length === 0) {
      return { sql: '', params: [], hasSources: false };
    }

    const unionSql = subQueries.join(' UNION ALL ');
    const outerConditions: string[] = [];

    // Filter status (default to ACTIVE unless explicitly requested otherwise or undefined)
    if (query.status === 'ACTIVE') {
      outerConditions.push(`is_cancelled = false`);
    } else if (query.status === 'CANCELLED') {
      outerConditions.push(`is_cancelled = true`);
    }

    // Filter payment method
    if (query.paymentMethod) {
      params.push(query.paymentMethod);
      outerConditions.push(`payment_method = $${params.length}`);
    }

    // Filter dateDebut
    if (query.dateDebut) {
      params.push(query.dateDebut);
      outerConditions.push(`movement_date >= $${params.length}::date`);
    }

    // Filter dateFin
    if (query.dateFin) {
      params.push(query.dateFin);
      outerConditions.push(`movement_date <= $${params.length}::date`);
    }

    // Filter amountMin
    if (query.amountMin !== undefined && query.amountMin !== null) {
      params.push(query.amountMin);
      outerConditions.push(`amount >= $${params.length}`);
    }

    // Filter amountMax
    if (query.amountMax !== undefined && query.amountMax !== null) {
      params.push(query.amountMax);
      outerConditions.push(`amount <= $${params.length}`);
    }

    // Search filter
    if (query.search) {
      params.push(`%${query.search}%`);
      outerConditions.push(`search_text ILIKE $${params.length}`);
    }

    let finalSql = `SELECT * FROM (${unionSql}) movements`;
    if (outerConditions.length > 0) {
      finalSql += ` WHERE ` + outerConditions.join(' AND ');
    }

    return { sql: finalSql, params, hasSources: true };
  }

  private mapRowToView(row: any, currency: string): FinancialMovementView {
    const numAmount = parseFloat(row.amount);
    const formattedAmount = !isNaN(numAmount) ? numAmount.toFixed(2) : '0.00';

    const sourceId =
      typeof row.source_id === 'bigint' ? Number(row.source_id) : Number(row.source_id || 0);
    const partyId =
      row.party_id !== null && row.party_id !== undefined ? Number(row.party_id) : null;
    const documentId =
      row.document_id !== null && row.document_id !== undefined ? Number(row.document_id) : null;

    return {
      movementId: String(row.movement_id),
      sourceType: row.source_type,
      sourceId,
      direction: row.direction,
      date:
        typeof row.movement_date === 'string'
          ? row.movement_date.split('T')[0]
          : new Date(row.movement_date).toISOString().split('T')[0],
      amount: formattedAmount,
      currency,
      paymentMethod: row.payment_method || 'AUTRE',
      reference: String(row.reference || `REF-${sourceId}`),
      externalReference: row.external_reference ? String(row.external_reference) : null,
      party: {
        type: row.party_type,
        id: partyId,
        name: String(row.party_name || 'N/A'),
      },
      relatedDocument: row.document_type
        ? {
            type: row.document_type,
            id: documentId,
            number: String(row.document_number || ''),
          }
        : null,
      status: row.is_cancelled ? 'CANCELLED' : 'ACTIVE',
      isCancelled: Boolean(row.is_cancelled),
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
      cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : null,
      sourceRoute: String(row.source_route),
    };
  }

  async findAll(
    query: QueryGestionPaiementsDto,
    userPermissions?: Record<string, any> | null,
    userRole?: string,
    isAdminGeneral?: boolean,
  ): Promise<PaginatedResult<FinancialMovementView>> {
    const settings = await this.prisma.companySettings.findFirst({
      where: { singletonKey: 'DEFAULT' },
    });
    const currency = this.getCompanyCurrency(settings);

    const { sql, params, hasSources } = this.buildUnionQuery(
      query,
      userPermissions,
      userRole,
      isAdminGeneral,
    );

    const page = query.page || 1;
    const limit = query.limit || 10;

    if (!hasSources) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Count Total Query
    const countSql = `SELECT COUNT(*)::integer AS total FROM (${sql}) AS filtered_movements`;
    const countRes: any[] = await this.prisma.$queryRawUnsafe(countSql, ...params);
    const total = countRes[0]?.total ? Number(countRes[0].total) : 0;

    // Allowed sort fields
    const sortFieldMap: Record<string, string> = {
      date: 'movement_date',
      amount: 'amount',
      sourceType: 'source_type',
      reference: 'reference',
    };
    const orderByCol = sortFieldMap[query.sortBy || 'date'] || 'movement_date';
    const orderDir = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const offset = (page - 1) * limit;

    const dataSql = `${sql} ORDER BY ${orderByCol} ${orderDir}, source_id DESC LIMIT ${limit} OFFSET ${offset}`;
    const rows: any[] = await this.prisma.$queryRawUnsafe(dataSql, ...params);

    const data = rows.map((row) => this.mapRowToView(row, currency));
    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findStats(
    query: QueryGestionPaiementsDto,
    userPermissions?: Record<string, any> | null,
    userRole?: string,
    isAdminGeneral?: boolean,
  ): Promise<GestionPaiementsStats> {
    const { sql, params, hasSources } = this.buildUnionQuery(
      query,
      userPermissions,
      userRole,
      isAdminGeneral,
    );

    if (!hasSources) {
      return {
        totalIn: '0.00',
        totalOut: '0.00',
        netBalance: '0.00',
        totalCount: 0,
        activeCount: 0,
        cancelledCount: 0,
        bySourceType: {},
        byPaymentMethod: {},
      };
    }

    const statsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN direction = 'IN' AND is_cancelled = false THEN amount ELSE 0 END), 0) AS total_in,
        COALESCE(SUM(CASE WHEN direction = 'OUT' AND is_cancelled = false THEN amount ELSE 0 END), 0) AS total_out,
        COUNT(*)::integer AS total_count,
        COUNT(CASE WHEN is_cancelled = false THEN 1 END)::integer AS active_count,
        COUNT(CASE WHEN is_cancelled = true THEN 1 END)::integer AS cancelled_count
      FROM (${sql}) AS all_movements
    `;

    const res: any[] = await this.prisma.$queryRawUnsafe(statsSql, ...params);
    const row = res[0] || {};

    const totalInNum = parseFloat(row.total_in || 0);
    const totalOutNum = parseFloat(row.total_out || 0);
    const netBalanceNum = totalInNum - totalOutNum;

    // Breakdown queries
    const bySourceSql = `
      SELECT source_type, COUNT(*)::integer AS cnt
      FROM (${sql}) AS m
      GROUP BY source_type
    `;
    const sourceRows: any[] = await this.prisma.$queryRawUnsafe(bySourceSql, ...params);
    const bySourceType: Record<string, number> = {};
    for (const r of sourceRows) {
      bySourceType[r.source_type] = Number(r.cnt);
    }

    const byMethodSql = `
      SELECT payment_method, COUNT(*)::integer AS cnt
      FROM (${sql}) AS m
      GROUP BY payment_method
    `;
    const methodRows: any[] = await this.prisma.$queryRawUnsafe(byMethodSql, ...params);
    const byPaymentMethod: Record<string, number> = {};
    for (const r of methodRows) {
      byPaymentMethod[r.payment_method] = Number(r.cnt);
    }

    return {
      totalIn: totalInNum.toFixed(2),
      totalOut: totalOutNum.toFixed(2),
      netBalance: netBalanceNum.toFixed(2),
      totalCount: Number(row.total_count || 0),
      activeCount: Number(row.active_count || 0),
      cancelledCount: Number(row.cancelled_count || 0),
      bySourceType,
      byPaymentMethod,
    };
  }

  async findOne(
    sourceType: GestionPaiementsSourceType,
    sourceId: number,
    userPermissions?: Record<string, any> | null,
    userRole?: string,
    isAdminGeneral?: boolean,
  ): Promise<FinancialMovementView> {
    const list = await this.findAll(
      { sourceType, page: 1, limit: 100, status: undefined },
      userPermissions,
      userRole,
      isAdminGeneral,
    );
    const match = list.data.find((item) => item.sourceId === sourceId);
    if (!match) {
      throw new NotFoundException(
        `Financial movement ${sourceType}:${sourceId} not found or access restricted`,
      );
    }
    return match;
  }
}
