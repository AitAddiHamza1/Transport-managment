import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardPreset, QueryDashboardDto } from './dto/query-dashboard.dto';

export interface DashboardOverviewResponse {
  period: {
    preset: DashboardPreset;
    dateDebut: string;
    dateFin: string;
  };
  company: {
    name: string;
    currency: string;
  };
  isPeriodEmpty: boolean;
  metadata: {
    isPartial: boolean;
    excludedSources: string[];
  };
  visibility: Record<string, boolean>;
  financial: {
    totalInvoiced: string | null;
    clientReceipts: string | null;
    supplierOutflow: string | null;
    employeeOutflow: string | null;
    adminExpenseOutflow: string | null;
    vehicleExpenseOutflow: string | null;
    fuelOutflow: string | null;
    totalOutflow: string | null;
    netCashFlow: string | null;
    outstandingAmount: string | null;
  };
  operations: {
    tripsCompleted: number | null;
    activeVehicles: number | null;
    activeDrivers: number | null;
  };
  risks: {
    expiredDocuments: number | null;
    expiringDocuments: number | null;
    overdueSupplierDebts: number | null;
  };
}

export interface DashboardChartsResponse {
  cashFlow: Array<{
    period: string; // "YYYY-MM"
    in: string;
    out: string;
    net: string;
  }>;
  tripsByStatus: Array<{
    status: string;
    count: number;
    label: string;
  }>;
  expensesBySource: Array<{
    source: string; // "SUPPLIER_PAYMENT" | "EMPLOYEE_PAYMENT" | "ADMINISTRATIVE_EXPENSE" | "VEHICLE_EXPENSE" | "FUEL"
    amount: string;
    label: string;
  }>;
  documentsByStatus: Array<{
    status: 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';
    count: number;
    label: string;
  }>;
}

export interface DashboardAlertItem {
  id: string;
  type: 'EXPIRED_DOCUMENT' | 'EXPIRING_DOCUMENT' | 'OVERDUE_SUPPLIER_DEBT';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  count: number;
  targetRoute: string;
}

export interface DashboardRecentActivityItem {
  activityId: string;
  type:
    | 'INVOICE_CREATED'
    | 'CLIENT_PAYMENT_RECEIVED'
    | 'SUPPLIER_PAYMENT_RECORDED'
    | 'EMPLOYEE_PAYMENT_RECORDED'
    | 'ADMIN_EXPENSE_CREATED'
    | 'TRIP_COMPLETED'
    | 'DOCUMENT_ADDED';
  date: string;
  title: string;
  description: string;
  amount: string | null;
  iconKey:
    | 'invoice'
    | 'client_payment'
    | 'supplier_payment'
    | 'employee_payment'
    | 'admin_expense'
    | 'trip'
    | 'document';
  tone: 'info' | 'success' | 'warning' | 'error' | 'primary';
  sourceRoute: string;
  timestampPrecision: 'DATETIME' | 'DATE';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private resolvePeriod(query: QueryDashboardDto): {
    dateDebut: string;
    dateFin: string;
    preset: DashboardPreset;
  } {
    const preset = query.preset || 'CE_MOIS';
    const now = new Date();

    if (preset === 'PERSONNALISE' && query.dateDebut && query.dateFin) {
      return { preset, dateDebut: query.dateDebut, dateFin: query.dateFin };
    }

    if (preset === 'AUJOURDHUI') {
      const todayStr = now.toISOString().split('T')[0];
      return { preset, dateDebut: todayStr, dateFin: todayStr };
    }

    if (preset === 'CE_TRIMESTRE') {
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(Date.UTC(year, quarterStartMonth, 1));
      const end = new Date(Date.UTC(year, quarterStartMonth + 3, 0));
      return {
        preset,
        dateDebut: start.toISOString().split('T')[0],
        dateFin: end.toISOString().split('T')[0],
      };
    }

    if (preset === 'CETTE_ANNEE') {
      const year = now.getUTCFullYear();
      return {
        preset,
        dateDebut: `${year}-01-01`,
        dateFin: `${year}-12-31`,
      };
    }

    // Default: CE_MOIS
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    return {
      preset: 'CE_MOIS',
      dateDebut: start.toISOString().split('T')[0],
      dateFin: end.toISOString().split('T')[0],
    };
  }

  private checkPerm(userPermissions: any, isSuperAdmin: boolean, moduleKey: string): boolean {
    if (isSuperAdmin) return true;
    if (!userPermissions || typeof userPermissions !== 'object') return false;
    const modPerm = userPermissions[moduleKey];
    if (typeof modPerm === 'boolean') return modPerm;
    if (Array.isArray(modPerm)) return modPerm.includes('voir');
    if (modPerm && typeof modPerm === 'object') return Boolean(modPerm.voir);
    return false;
  }

  async getOverview(
    query: QueryDashboardDto,
    userPermissions: any,
    isSuperAdmin: boolean,
  ): Promise<DashboardOverviewResponse> {
    const { dateDebut, dateFin, preset } = this.resolvePeriod(query);
    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);
    dFin.setUTCHours(23, 59, 59, 999);

    // Fetch company settings
    const companySettings = await this.prisma.companySettings.findFirst({
      where: { singletonKey: 'COMPANY_SETTINGS_SINGLETON' },
    });
    const companyName =
      companySettings?.nomEntreprise || companySettings?.nomLegal || 'Transport & Logistique';
    const currency = companySettings?.devise || 'MAD';

    // Check visibility permissions
    const visibility = {
      factures: this.checkPerm(userPermissions, isSuperAdmin, 'factures'),
      paiementsClients: this.checkPerm(userPermissions, isSuperAdmin, 'paiements_clients'),
      paiementsFournisseurs: this.checkPerm(
        userPermissions,
        isSuperAdmin,
        'paiements_fournisseurs',
      ),
      paiementsEmployes: this.checkPerm(userPermissions, isSuperAdmin, 'paiements_employes'),
      depensesAdministratives: this.checkPerm(
        userPermissions,
        isSuperAdmin,
        'depenses_administratives',
      ),
      depensesVehicules: this.checkPerm(userPermissions, isSuperAdmin, 'depenses_vehicules'),
      bonsCarburant: this.checkPerm(userPermissions, isSuperAdmin, 'bons_carburant'),
      vehicules: this.checkPerm(userPermissions, isSuperAdmin, 'vehicules'),
      conducteurs: this.checkPerm(userPermissions, isSuperAdmin, 'conducteurs'),
      voyages: this.checkPerm(userPermissions, isSuperAdmin, 'voyages'),
      documentsVehicules: this.checkPerm(userPermissions, isSuperAdmin, 'documents_vehicules'),
      dettesFournisseurs: this.checkPerm(userPermissions, isSuperAdmin, 'dettes_fournisseurs'),
    };

    const excludedSources: string[] = [];
    if (!visibility.factures) excludedSources.push('FACTURES');
    if (!visibility.paiementsClients) excludedSources.push('PAIEMENTS_CLIENTS');
    if (!visibility.paiementsFournisseurs) excludedSources.push('PAIEMENTS_FOURNISSEURS');
    if (!visibility.paiementsEmployes) excludedSources.push('PAIEMENTS_EMPLOYES');
    if (!visibility.depensesAdministratives) excludedSources.push('DEPENSES_ADMINISTRATIVES');
    if (!visibility.depensesVehicules) excludedSources.push('DEPENSES_VEHICULES');
    if (!visibility.bonsCarburant) excludedSources.push('BONS_CARBURANT');
    if (!visibility.vehicules) excludedSources.push('VEHICULES');
    if (!visibility.conducteurs) excludedSources.push('CONDUCTEURS');
    if (!visibility.voyages) excludedSources.push('VOYAGES');
    if (!visibility.documentsVehicules) excludedSources.push('DOCUMENTS_VEHICULES');
    if (!visibility.dettesFournisseurs) excludedSources.push('DETTES_FOURNISSEURS');

    const isPartial = excludedSources.length > 0;

    // 1. Financial Period Aggregates
    let totalInvoicedNum: number | null = null;
    let clientReceiptsNum: number | null = null;
    let supplierOutflowNum: number | null = null;
    let employeeOutflowNum: number | null = null;
    let adminExpenseOutflowNum: number | null = null;
    let vehicleExpenseOutflowNum: number | null = null;
    let fuelOutflowNum: number | null = null;

    if (visibility.factures) {
      const agg = await this.prisma.facture.aggregate({
        _sum: { montantTotal: true },
        where: { supprimeLe: null, dateFacture: { gte: dDebut, lte: dFin } },
      });
      totalInvoicedNum = agg._sum.montantTotal ? Number(agg._sum.montantTotal) : 0;
    }

    if (visibility.paiementsClients) {
      const agg = await this.prisma.paiementClient.aggregate({
        _sum: { montantRecu: true },
        where: { datePaiement: { gte: dDebut, lte: dFin } },
      });
      clientReceiptsNum = agg._sum.montantRecu ? Number(agg._sum.montantRecu) : 0;
    }

    if (visibility.paiementsFournisseurs) {
      const agg = await this.prisma.paiementFournisseur.aggregate({
        _sum: { montant: true },
        where: { estAnnule: false, datePaiement: { gte: dDebut, lte: dFin } },
      });
      supplierOutflowNum = agg._sum.montant ? Number(agg._sum.montant) : 0;
    }

    if (visibility.paiementsEmployes) {
      const agg = await this.prisma.versementEmploye.aggregate({
        _sum: { montant: true },
        where: { estAnnule: false, dateVersement: { gte: dDebut, lte: dFin } },
      });
      employeeOutflowNum = agg._sum.montant ? Number(agg._sum.montant) : 0;
    }

    if (visibility.depensesAdministratives) {
      const agg = await this.prisma.depenseAdministrative.aggregate({
        _sum: { montant: true },
        where: { supprimeLe: null, dateDepense: { gte: dDebut, lte: dFin } },
      });
      adminExpenseOutflowNum = agg._sum.montant ? Number(agg._sum.montant) : 0;
    }

    if (visibility.depensesVehicules) {
      const agg = await this.prisma.depenseVehicule.aggregate({
        _sum: { montant: true },
        where: { dateDepense: { gte: dDebut, lte: dFin } },
      });
      vehicleExpenseOutflowNum = agg._sum.montant ? Number(agg._sum.montant) : 0;
    }

    if (visibility.bonsCarburant) {
      const fuelRaw: any[] = await this.prisma.$queryRawUnsafe(
        `
        SELECT COALESCE(SUM(COALESCE(montant_total, litres * prix_par_litre)), 0)::numeric AS total
        FROM bons_carburant
        WHERE date_carburant >= $1::date AND date_carburant <= $2::date
      `,
        dDebut,
        dFin,
      );
      fuelOutflowNum = fuelRaw[0]?.total ? Number(fuelRaw[0].total) : 0;
    }

    // Calculate Total Outflow & Net Cash Flow over visible sources
    const outflowSources = [
      supplierOutflowNum,
      employeeOutflowNum,
      adminExpenseOutflowNum,
      vehicleExpenseOutflowNum,
      fuelOutflowNum,
    ].filter((v) => v !== null) as number[];

    const totalOutflowNum =
      outflowSources.length > 0 ? outflowSources.reduce((a, b) => a + b, 0) : null;
    const netCashFlowNum =
      clientReceiptsNum !== null && totalOutflowNum !== null
        ? clientReceiptsNum - totalOutflowNum
        : null;

    // 2. Outstanding Balance (Decision A / Per-invoice aggregate)
    let outstandingAmountNum: number | null = null;
    if (visibility.factures && visibility.paiementsClients) {
      const outRes: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(GREATEST(f.montant_total - COALESCE(p.total_recu, 0), 0)), 0)::numeric AS outstanding
        FROM factures f
        LEFT JOIN (
          SELECT numero_facture, SUM(montant_recu) AS total_recu
          FROM paiements_clients
          GROUP BY numero_facture
        ) p ON f.numero_facture = p.numero_facture
        WHERE f.supprime_le IS NULL
      `);
      outstandingAmountNum = outRes[0]?.outstanding ? Number(outRes[0].outstanding) : 0;
    }

    // 3. Operations Metrics
    let tripsCompleted: number | null = null;
    let activeVehicles: number | null = null;
    let activeDrivers: number | null = null;

    if (visibility.voyages) {
      tripsCompleted = await this.prisma.voyage.count({
        where: {
          statut: { in: ['LIVRE', 'FACTURE'] },
          OR: [{ dateChargement: { gte: dDebut, lte: dFin } }, { dateChargement: null }],
        },
      });
    }

    if (visibility.vehicules) {
      activeVehicles = await this.prisma.vehicule.count({
        where: { statut: { in: ['DISPONIBLE', 'EN_VOYAGE'] } },
      });
    }

    if (visibility.conducteurs) {
      activeDrivers = await this.prisma.conducteur.count({
        where: { statut: { in: ['DISPONIBLE', 'EN_VOYAGE'] } },
      });
    }

    // 4. Risks & Alerts Counts
    let expiredDocuments: number | null = null;
    let expiringDocuments: number | null = null;
    let overdueSupplierDebts: number | null = null;

    if (visibility.documentsVehicules) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const allActiveDocs = await this.prisma.documentVehicule.findMany({
        where: { supprimeLe: null, dateExpiration: { not: null } },
        select: { dateExpiration: true },
      });

      let expCount = 0;
      let soonCount = 0;

      for (const d of allActiveDocs) {
        if (!d.dateExpiration) continue;
        const exp = new Date(d.dateExpiration);
        exp.setUTCHours(0, 0, 0, 0);
        const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) expCount++;
        else if (diffDays <= 30) soonCount++;
      }

      expiredDocuments = expCount;
      expiringDocuments = soonCount;
    }

    if (visibility.dettesFournisseurs) {
      const overdueDebtsRes: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS cnt
        FROM dettes_fournisseurs d
        LEFT JOIN (
          SELECT id_dette_fournisseur, SUM(montant) AS total_paye
          FROM paiements_fournisseurs
          WHERE est_annule = false
          GROUP BY id_dette_fournisseur
        ) p ON d.id = p.id_dette_fournisseur
        WHERE d.date_echeance < CURRENT_DATE
          AND (d.montant_du - COALESCE(p.total_paye, 0)) > 0
          AND d.supprime_le IS NULL
      `);
      overdueSupplierDebts = overdueDebtsRes[0]?.cnt ?? 0;
    }

    // Check if period is completely empty
    const isPeriodEmpty =
      (totalInvoicedNum ?? 0) === 0 &&
      (clientReceiptsNum ?? 0) === 0 &&
      (totalOutflowNum ?? 0) === 0 &&
      (tripsCompleted ?? 0) === 0;

    return {
      period: { preset, dateDebut, dateFin },
      company: { name: companyName, currency },
      isPeriodEmpty,
      metadata: { isPartial, excludedSources },
      visibility,
      financial: {
        totalInvoiced: totalInvoicedNum !== null ? totalInvoicedNum.toFixed(2) : null,
        clientReceipts: clientReceiptsNum !== null ? clientReceiptsNum.toFixed(2) : null,
        supplierOutflow: supplierOutflowNum !== null ? supplierOutflowNum.toFixed(2) : null,
        employeeOutflow: employeeOutflowNum !== null ? employeeOutflowNum.toFixed(2) : null,
        adminExpenseOutflow:
          adminExpenseOutflowNum !== null ? adminExpenseOutflowNum.toFixed(2) : null,
        vehicleExpenseOutflow:
          vehicleExpenseOutflowNum !== null ? vehicleExpenseOutflowNum.toFixed(2) : null,
        fuelOutflow: fuelOutflowNum !== null ? fuelOutflowNum.toFixed(2) : null,
        totalOutflow: totalOutflowNum !== null ? totalOutflowNum.toFixed(2) : null,
        netCashFlow: netCashFlowNum !== null ? netCashFlowNum.toFixed(2) : null,
        outstandingAmount: outstandingAmountNum !== null ? outstandingAmountNum.toFixed(2) : null,
      },
      operations: {
        tripsCompleted,
        activeVehicles,
        activeDrivers,
      },
      risks: {
        expiredDocuments,
        expiringDocuments,
        overdueSupplierDebts,
      },
    };
  }

  async getCharts(
    query: QueryDashboardDto,
    userPermissions: any,
    isSuperAdmin: boolean,
  ): Promise<DashboardChartsResponse> {
    const numMonths = Math.min(Math.max(query.months || 6, 1), 24);

    const canSeeReceipts = this.checkPerm(userPermissions, isSuperAdmin, 'paiements_clients');
    const canSeeSupplierOutflow = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'paiements_fournisseurs',
    );
    const canSeeEmployeeOutflow = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'paiements_employes',
    );
    const canSeeAdminExpense = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'depenses_administratives',
    );
    const canSeeVehicleExpense = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'depenses_vehicules',
    );
    const canSeeFuel = this.checkPerm(userPermissions, isSuperAdmin, 'bons_carburant');
    const canSeeVoyages = this.checkPerm(userPermissions, isSuperAdmin, 'voyages');
    const canSeeDocVeh = this.checkPerm(userPermissions, isSuperAdmin, 'documents_vehicules');

    // 1. Monthly Cash Flow Trend
    const cashFlow: DashboardChartsResponse['cashFlow'] = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const yearMonth = d.toISOString().slice(0, 7); // "YYYY-MM"
      const startStr = `${yearMonth}-01`;
      const endObj = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      const endStr = endObj.toISOString().slice(0, 10);

      let inNum = 0;
      if (canSeeReceipts) {
        const agg = await this.prisma.paiementClient.aggregate({
          _sum: { montantRecu: true },
          where: { datePaiement: { gte: new Date(startStr), lte: new Date(endStr) } },
        });
        inNum = agg._sum.montantRecu ? Number(agg._sum.montantRecu) : 0;
      }

      let outNum = 0;
      if (canSeeSupplierOutflow) {
        const agg = await this.prisma.paiementFournisseur.aggregate({
          _sum: { montant: true },
          where: {
            estAnnule: false,
            datePaiement: { gte: new Date(startStr), lte: new Date(endStr) },
          },
        });
        outNum += agg._sum.montant ? Number(agg._sum.montant) : 0;
      }
      if (canSeeEmployeeOutflow) {
        const agg = await this.prisma.versementEmploye.aggregate({
          _sum: { montant: true },
          where: {
            estAnnule: false,
            dateVersement: { gte: new Date(startStr), lte: new Date(endStr) },
          },
        });
        outNum += agg._sum.montant ? Number(agg._sum.montant) : 0;
      }
      if (canSeeAdminExpense) {
        const agg = await this.prisma.depenseAdministrative.aggregate({
          _sum: { montant: true },
          where: {
            supprimeLe: null,
            dateDepense: { gte: new Date(startStr), lte: new Date(endStr) },
          },
        });
        outNum += agg._sum.montant ? Number(agg._sum.montant) : 0;
      }
      if (canSeeVehicleExpense) {
        const agg = await this.prisma.depenseVehicule.aggregate({
          _sum: { montant: true },
          where: { dateDepense: { gte: new Date(startStr), lte: new Date(endStr) } },
        });
        outNum += agg._sum.montant ? Number(agg._sum.montant) : 0;
      }
      if (canSeeFuel) {
        const fuelRaw: any[] = await this.prisma.$queryRawUnsafe(
          `
          SELECT COALESCE(SUM(COALESCE(montant_total, litres * prix_par_litre)), 0)::numeric AS total
          FROM bons_carburant
          WHERE date_carburant >= $1::date AND date_carburant <= $2::date
        `,
          new Date(startStr),
          new Date(endStr),
        );
        outNum += fuelRaw[0]?.total ? Number(fuelRaw[0].total) : 0;
      }

      const netNum = inNum - outNum;
      cashFlow.push({
        period: yearMonth,
        in: inNum.toFixed(2),
        out: outNum.toFixed(2),
        net: netNum.toFixed(2),
      });
    }

    // 2. Trips by Status
    const tripsByStatus: DashboardChartsResponse['tripsByStatus'] = [];
    if (canSeeVoyages) {
      const tripStatuses = ['PLANIFIE', 'EN_COURS', 'LIVRE', 'FACTURE', 'ANNULE'];
      const statusLabels: Record<string, string> = {
        PLANIFIE: 'Planifié',
        EN_COURS: 'En cours',
        LIVRE: 'Livré',
        FACTURE: 'Facturé',
        ANNULE: 'Annulé',
      };

      for (const st of tripStatuses) {
        const count = await this.prisma.voyage.count({
          where: { statut: st as any },
        });
        tripsByStatus.push({ status: st, count, label: statusLabels[st] || st });
      }
    }

    // 3. Outflow Expenses by Source
    const expensesBySource: DashboardChartsResponse['expensesBySource'] = [];
    const { dateDebut, dateFin } = this.resolvePeriod(query);
    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);
    dFin.setUTCHours(23, 59, 59, 999);

    if (canSeeSupplierOutflow) {
      const agg = await this.prisma.paiementFournisseur.aggregate({
        _sum: { montant: true },
        where: { estAnnule: false, datePaiement: { gte: dDebut, lte: dFin } },
      });
      const amt = agg._sum.montant ? Number(agg._sum.montant) : 0;
      expensesBySource.push({
        source: 'SUPPLIER_PAYMENT',
        amount: amt.toFixed(2),
        label: 'Paiements fournisseurs',
      });
    }

    if (canSeeEmployeeOutflow) {
      const agg = await this.prisma.versementEmploye.aggregate({
        _sum: { montant: true },
        where: { estAnnule: false, dateVersement: { gte: dDebut, lte: dFin } },
      });
      const amt = agg._sum.montant ? Number(agg._sum.montant) : 0;
      expensesBySource.push({
        source: 'EMPLOYEE_PAYMENT',
        amount: amt.toFixed(2),
        label: 'Versements employés',
      });
    }

    if (canSeeAdminExpense) {
      const agg = await this.prisma.depenseAdministrative.aggregate({
        _sum: { montant: true },
        where: { supprimeLe: null, dateDepense: { gte: dDebut, lte: dFin } },
      });
      const amt = agg._sum.montant ? Number(agg._sum.montant) : 0;
      expensesBySource.push({
        source: 'ADMINISTRATIVE_EXPENSE',
        amount: amt.toFixed(2),
        label: 'Dépenses administratives',
      });
    }

    if (canSeeVehicleExpense) {
      const agg = await this.prisma.depenseVehicule.aggregate({
        _sum: { montant: true },
        where: { dateDepense: { gte: dDebut, lte: dFin } },
      });
      const amt = agg._sum.montant ? Number(agg._sum.montant) : 0;
      expensesBySource.push({
        source: 'VEHICLE_EXPENSE',
        amount: amt.toFixed(2),
        label: 'Dépenses véhicules',
      });
    }

    if (canSeeFuel) {
      const fuelRaw: any[] = await this.prisma.$queryRawUnsafe(
        `
        SELECT COALESCE(SUM(COALESCE(montant_total, litres * prix_par_litre)), 0)::numeric AS total
        FROM bons_carburant
        WHERE date_carburant >= $1::date AND date_carburant <= $2::date
      `,
        dDebut,
        dFin,
      );
      const amt = fuelRaw[0]?.total ? Number(fuelRaw[0].total) : 0;
      expensesBySource.push({ source: 'FUEL', amount: amt.toFixed(2), label: 'Bons carburant' });
    }

    // 4. Vehicle Document Health
    const documentsByStatus: DashboardChartsResponse['documentsByStatus'] = [];
    if (canSeeDocVeh) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const allActiveDocs = await this.prisma.documentVehicule.findMany({
        where: { supprimeLe: null },
        select: { dateExpiration: true },
      });

      let valides = 0;
      let bientot = 0;
      let expires = 0;

      for (const d of allActiveDocs) {
        if (!d.dateExpiration) {
          valides++;
          continue;
        }
        const exp = new Date(d.dateExpiration);
        exp.setUTCHours(0, 0, 0, 0);
        const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) expires++;
        else if (diffDays <= 30) bientot++;
        else valides++;
      }

      documentsByStatus.push({ status: 'VALIDE', count: valides, label: 'Valides' });
      documentsByStatus.push({
        status: 'BIENTOT_EXPIRE',
        count: bientot,
        label: 'Expiration proche',
      });
      documentsByStatus.push({ status: 'EXPIRE', count: expires, label: 'Expirés' });
    }

    return {
      cashFlow,
      tripsByStatus,
      expensesBySource,
      documentsByStatus,
    };
  }

  async getAlerts(userPermissions: any, isSuperAdmin: boolean): Promise<DashboardAlertItem[]> {
    const alerts: DashboardAlertItem[] = [];

    const canSeeDocVeh = this.checkPerm(userPermissions, isSuperAdmin, 'documents_vehicules');
    const canSeeDettes = this.checkPerm(userPermissions, isSuperAdmin, 'dettes_fournisseurs');

    if (canSeeDocVeh) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const allDocs = await this.prisma.documentVehicule.findMany({
        where: { supprimeLe: null, dateExpiration: { not: null } },
        select: { dateExpiration: true },
      });

      let expCount = 0;
      let soonCount = 0;

      for (const d of allDocs) {
        if (!d.dateExpiration) continue;
        const exp = new Date(d.dateExpiration);
        exp.setUTCHours(0, 0, 0, 0);
        const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) expCount++;
        else if (diffDays <= 30) soonCount++;
      }

      if (expCount > 0) {
        alerts.push({
          id: 'ALERT_DOC_EXPIRED',
          type: 'EXPIRED_DOCUMENT',
          severity: 'error',
          title: `${expCount} document(s) véhicule expiré(s)`,
          description:
            'Des cartes grises, assurances ou visites techniques sont arrivées à échéance.',
          count: expCount,
          targetRoute: '/vehicules/documents?statut=EXPIRE',
        });
      }

      if (soonCount > 0) {
        alerts.push({
          id: 'ALERT_DOC_SOON',
          type: 'EXPIRING_DOCUMENT',
          severity: 'warning',
          title: `${soonCount} document(s) véhicule expirent sous 30 jours`,
          description: 'Anticipez le renouvellement des pièces réglementaires de la flotte.',
          count: soonCount,
          targetRoute: '/vehicules/documents?statut=BIENTOT_EXPIRE',
        });
      }
    }

    if (canSeeDettes) {
      const overdueDebtsRes: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::integer AS cnt
        FROM dettes_fournisseurs d
        LEFT JOIN (
          SELECT id_dette_fournisseur, SUM(montant) AS total_paye
          FROM paiements_fournisseurs
          WHERE est_annule = false
          GROUP BY id_dette_fournisseur
        ) p ON d.id = p.id_dette_fournisseur
        WHERE d.date_echeance < CURRENT_DATE
          AND (d.montant_du - COALESCE(p.total_paye, 0)) > 0
          AND d.supprime_le IS NULL
      `);
      const overdueCount = overdueDebtsRes[0]?.cnt ?? 0;

      if (overdueCount > 0) {
        alerts.push({
          id: 'ALERT_DEBT_OVERDUE',
          type: 'OVERDUE_SUPPLIER_DEBT',
          severity: 'error',
          title: `${overdueCount} dette(s) fournisseur(s) en retard`,
          description:
            'Certaines échéances fournisseurs sont dépassées et nécessitent un paiement.',
          count: overdueCount,
          targetRoute: '/dettes-fournisseurs?echeance=EN_RETARD',
        });
      }
    }

    return alerts;
  }

  async getRecentActivity(
    query: QueryDashboardDto,
    userPermissions: any,
    isSuperAdmin: boolean,
  ): Promise<DashboardRecentActivityItem[]> {
    const { dateDebut, dateFin } = this.resolvePeriod(query);
    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);
    dFin.setUTCHours(23, 59, 59, 999);

    const canSeeFactures = this.checkPerm(userPermissions, isSuperAdmin, 'factures');
    const canSeePaiementsClients = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'paiements_clients',
    );
    const canSeePaiementsFournisseurs = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'paiements_fournisseurs',
    );
    const canSeePaiementsEmployes = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'paiements_employes',
    );
    const canSeeDepensesAdmin = this.checkPerm(
      userPermissions,
      isSuperAdmin,
      'depenses_administratives',
    );
    const canSeeVoyages = this.checkPerm(userPermissions, isSuperAdmin, 'voyages');
    const canSeeDocVeh = this.checkPerm(userPermissions, isSuperAdmin, 'documents_vehicules');

    const queries: string[] = [];

    if (canSeeFactures) {
      queries.push(`
        SELECT 
          ('INVOICE:' || id::text) AS "activityId",
          'INVOICE_CREATED' AS "type",
          cree_le::text AS "date",
          ('Facture ' || numero_facture) AS "title",
          ('Client: ' || COALESCE(nom_client, 'Tiers non renseigné')) AS "description",
          montant_total::numeric::text AS "amount",
          'invoice' AS "iconKey",
          'info' AS "tone",
          '/factures' AS "sourceRoute",
          'DATETIME' AS "timestampPrecision",
          cree_le::timestamp AS "event_timestamp",
          1 AS "source_type",
          id AS "source_id"
        FROM factures
        WHERE supprime_le IS NULL
          AND date_facture >= $1::date AND date_facture <= $2::date
      `);
    }

    if (canSeePaiementsClients) {
      queries.push(`
        SELECT 
          ('CLIENT_PAYMENT:' || id::text) AS "activityId",
          'CLIENT_PAYMENT_RECEIVED' AS "type",
          (date_paiement::text || 'T12:00:00.000Z') AS "date",
          ('Paiement client reçu') AS "title",
          ('Client: ' || COALESCE(nom_client, 'Tiers non renseigné') || CASE WHEN numero_facture IS NOT NULL THEN ' — Facture: ' || numero_facture ELSE '' END) AS "description",
          montant_recu::numeric::text AS "amount",
          'client_payment' AS "iconKey",
          'success' AS "tone",
          '/paiements-clients' AS "sourceRoute",
          'DATE' AS "timestampPrecision",
          date_paiement::timestamp AS "event_timestamp",
          2 AS "source_type",
          id AS "source_id"
        FROM paiements_clients
        WHERE date_paiement >= $1::date AND date_paiement <= $2::date
      `);
    }

    if (canSeePaiementsFournisseurs) {
      queries.push(`
        SELECT 
          ('SUPPLIER_PAYMENT:' || id::text) AS "activityId",
          'SUPPLIER_PAYMENT_RECORDED' AS "type",
          (date_paiement::text || 'T12:00:00.000Z') AS "date",
          ('Paiement fournisseur enregistré') AS "title",
          ('Fournisseur: ' || COALESCE(nom_fournisseur, 'Tiers non renseigné') || CASE WHEN numero_paiement IS NOT NULL THEN ' — Réf: ' || numero_paiement ELSE '' END) AS "description",
          montant::numeric::text AS "amount",
          'supplier_payment' AS "iconKey",
          'warning' AS "tone",
          '/paiements-fournisseurs' AS "sourceRoute",
          'DATE' AS "timestampPrecision",
          date_paiement::timestamp AS "event_timestamp",
          3 AS "source_type",
          id AS "source_id"
        FROM paiements_fournisseurs
        WHERE est_annule = false
          AND date_paiement >= $1::date AND date_paiement <= $2::date
      `);
    }

    if (canSeePaiementsEmployes) {
      queries.push(`
        SELECT 
          ('EMPLOYEE_PAYMENT:' || id::text) AS "activityId",
          'EMPLOYEE_PAYMENT_RECORDED' AS "type",
          (date_versement::text || 'T12:00:00.000Z') AS "date",
          ('Versement employé enregistré') AS "title",
          ('Versement de ' || montant::numeric::text || ' MAD') AS "description",
          montant::numeric::text AS "amount",
          'employee_payment' AS "iconKey",
          'warning' AS "tone",
          '/paiements-employes' AS "sourceRoute",
          'DATE' AS "timestampPrecision",
          date_versement::timestamp AS "event_timestamp",
          4 AS "source_type",
          id AS "source_id"
        FROM versements_employes
        WHERE est_annule = false
          AND date_versement >= $1::date AND date_versement <= $2::date
      `);
    }

    if (canSeeDepensesAdmin) {
      queries.push(`
        SELECT 
          ('ADMIN_EXPENSE:' || id_depense::text) AS "activityId",
          'ADMIN_EXPENSE_CREATED' AS "type",
          cree_le::text AS "date",
          ('Dépense adm. : ' || categorie_depense) AS "title",
          COALESCE(description, categorie_depense, 'Dépense administrative') AS "description",
          montant::numeric::text AS "amount",
          'admin_expense' AS "iconKey",
          'warning' AS "tone",
          '/charges-administratives' AS "sourceRoute",
          'DATETIME' AS "timestampPrecision",
          cree_le::timestamp AS "event_timestamp",
          5 AS "source_type",
          id_depense AS "source_id"
        FROM depenses_administratives
        WHERE supprime_le IS NULL
          AND date_depense >= $1::date AND date_depense <= $2::date
      `);
    }

    if (canSeeVoyages) {
      queries.push(`
        SELECT 
          ('TRIP:' || id_voyage::text) AS "activityId",
          'TRIP_COMPLETED' AS "type",
          (COALESCE(date_chargement, CURRENT_DATE)::text || 'T12:00:00.000Z') AS "date",
          ('Voyage clôturé') AS "title",
          ('Tracteur: ' || COALESCE(tracteur, '-') || ' — Statut: ' || statut::text) AS "description",
          NULL AS "amount",
          'trip' AS "iconKey",
          'primary' AS "tone",
          '/voyages' AS "sourceRoute",
          'DATE' AS "timestampPrecision",
          COALESCE(date_chargement, CURRENT_DATE)::timestamp AS "event_timestamp",
          6 AS "source_type",
          id_voyage AS "source_id"
        FROM voyages
        WHERE statut IN ('LIVRE', 'FACTURE')
          AND COALESCE(date_chargement, CURRENT_DATE) >= $1::date AND COALESCE(date_chargement, CURRENT_DATE) <= $2::date
      `);
    }

    if (canSeeDocVeh) {
      queries.push(`
        SELECT 
          ('DOCUMENT:' || id_document::text) AS "activityId",
          'DOCUMENT_ADDED' AS "type",
          cree_le::text AS "date",
          ('Document véhicule enregistré') AS "title",
          ('Type: ' || type_document || ' — Immat: ' || COALESCE(immatriculation, '-')) AS "description",
          NULL AS "amount",
          'document' AS "iconKey",
          'info' AS "tone",
          '/vehicules/documents' AS "sourceRoute",
          'DATETIME' AS "timestampPrecision",
          cree_le::timestamp AS "event_timestamp",
          7 AS "source_type",
          id_document AS "source_id"
        FROM documents_vehicules
        WHERE supprime_le IS NULL
          AND cree_le >= $1::timestamptz AND cree_le <= $2::timestamptz
      `);
    }

    if (queries.length === 0) {
      return [];
    }

    const unionSql = `
      ${queries.join(' UNION ALL ')}
      ORDER BY event_timestamp DESC, source_type ASC, source_id DESC
      LIMIT 20
    `;

    const rawResult: any[] = await this.prisma.$queryRawUnsafe(unionSql, dDebut, dFin);

    return rawResult.map((item) => ({
      activityId: String(item.activityId),
      type: item.type,
      date: new Date(item.date).toISOString(),
      title: String(item.title).replace(/null/g, ''),
      description: String(item.description).replace(/null/g, '').trim() || 'Opération enregistrée',
      amount:
        item.amount !== null && item.amount !== undefined ? Number(item.amount).toFixed(2) : null,
      iconKey: item.iconKey,
      tone: item.tone,
      sourceRoute: String(item.sourceRoute),
      timestampPrecision: item.timestampPrecision,
    }));
  }
}
