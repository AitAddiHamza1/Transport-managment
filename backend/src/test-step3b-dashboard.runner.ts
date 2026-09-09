import {
  PrismaClient,
  ClientStatut,
  VehiculeStatut,
  ConducteurStatut,
  VoyageStatut,
} from '@prisma/client';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { QueryDashboardDto } from './modules/dashboard/dto/query-dashboard.dto';

const prisma = new PrismaClient();
const service = new DashboardService(prisma as any);
const controller = new DashboardController(service);

async function runTests() {
  console.log('=== RUNNING MULTI-TENANT STEP 3B-DASHBOARD TEST SUITE ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passCount++;
      console.log(`[PASS] Test ${passCount + failCount}: ${testName}`);
    } else {
      failCount++;
      console.error(
        `[FAIL] Test ${passCount + failCount}: ${testName} ${detail ? `(${detail})` : ''}`,
      );
    }
  }

  // 1. Setup Test Companies
  const companyA = await prisma.company.create({
    data: { nom: 'Dashboard Test Company A' },
  });
  const companyB = await prisma.company.create({
    data: { nom: 'Dashboard Test Company B' },
  });

  const queryDto: QueryDashboardDto = { preset: 'CE_MOIS' };
  const allPermissions = {
    factures: true,
    paiements_clients: true,
    paiements_fournisseurs: true,
    paiements_employes: true,
    depenses_administratives: true,
    depenses_vehicules: true,
    bons_carburant: true,
    vehicules: true,
    conducteurs: true,
    voyages: true,
    documents_vehicules: true,
    dettes_fournisseurs: true,
  };

  try {
    // 2. Setup CompanySettings
    await prisma.companySettings.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: 'Enterprise A SARL',
        devise: 'MAD',
      },
    });
    await prisma.companySettings.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: 'Enterprise B EUR',
        devise: 'EUR',
      },
    });

    const ts = Date.now();

    // 3. Setup Vehicles & Conducteurs
    const vehA = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `DASH-A-${ts}`,
        marque: 'Volvo',
        statut: VehiculeStatut.EN_VOYAGE,
      },
    });
    const vehB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: `DASH-B-${ts}`,
        marque: 'Scania',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const condA = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        nomConducteur: `Driver A ${ts}`,
        statut: ConducteurStatut.EN_VOYAGE,
      },
    });
    await prisma.conducteur.create({
      data: {
        companyId: companyB.id,
        nomConducteur: `Driver B ${ts}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    // 4. Setup Voyages
    await prisma.voyage.create({
      data: {
        companyId: companyA.id,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        statut: VoyageStatut.LIVRE,
        dateChargement: new Date(),
        tracteur: vehA.immatriculation,
        nomConducteur: condA.nomConducteur,
      },
    });

    // 5. Setup Financial Data A & B
    const clientA = await prisma.client.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: `Client A Transport ${ts}`,
        statut: ClientStatut.ACTIF,
      },
    });

    const factureA = await prisma.facture.create({
      data: {
        companyId: companyA.id,
        numeroFacture: `FAC-DASH-A-${ts}`,
        nomClient: clientA.nomEntreprise,
        sousTotal: 10000,
        tauxTva: 0,
        dateFacture: new Date(),
      },
    });

    await prisma.paiementClient.create({
      data: {
        numeroFacture: factureA.numeroFacture,
        nomClient: clientA.nomEntreprise,
        montantRecu: 6000,
        methodePaiement: 'VIREMENT',
        datePaiement: new Date(),
      },
    });

    const fourA = await prisma.fournisseur.create({
      data: {
        companyId: companyA.id,
        nomFournisseur: `Fournisseur A Fuel ${ts}`,
      },
    });

    const detteA = await prisma.detteFournisseur.create({
      data: {
        companyId: companyA.id,
        numeroDette: `DETTE-DASH-A-${ts}`,
        idFournisseur: fourA.id,
        nomFournisseurSnapshot: fourA.nomFournisseur,
        montantDu: 4000,
        dateDette: new Date(),
        dateEcheance: new Date(Date.now() - 5 * 86400000), // Overdue by 5 days
      },
    });

    await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PAY-FOUR-A-${ts}`,
        idDetteFournisseur: detteA.id,
        montant: 1000,
        modePaiement: 'VIREMENT',
        datePaiement: new Date(),
      },
    });

    const empA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-DASH-A-${ts}`,
        nom: 'Alami',
        prenom: 'Youssef',
        poste: 'Logistique',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
      },
    });

    const paiEmpA = await prisma.paiementEmploye.create({
      data: {
        numeroPaiement: `PAY-EMP-A-${ts}`,
        idEmploye: empA.id,
        periode: '2026-09',
        salaireReference: 5000,
        montantDu: 1500,
      },
    });

    await prisma.versementEmploye.create({
      data: {
        idPaiementEmploye: paiEmpA.id,
        montant: 1500,
        modePaiement: 'VIREMENT',
        dateVersement: new Date(),
      },
    });

    await prisma.depenseAdministrative.create({
      data: {
        companyId: companyA.id,
        categorieDepense: 'Fournitures',
        montant: 500,
        dateDepense: new Date(),
      },
    });

    await prisma.depenseVehicule.create({
      data: {
        immatriculation: vehA.immatriculation,
        categorieDepense: 'Vidange',
        montant: 800,
        dateDepense: new Date(),
      },
    });

    await prisma.bonCarburant.create({
      data: {
        immatriculation: vehA.immatriculation,
        litres: 100,
        prixParLitre: 10,
        dateCarburant: new Date(),
      },
    });

    await prisma.documentVehicule.create({
      data: {
        immatriculation: vehA.immatriculation,
        typeDocument: 'Assurance',
        dateExpiration: new Date(Date.now() - 2 * 86400000), // Expired
      },
    });

    // -------------------------------------------------------------
    // Test 1: Tenant A Overview contains only A data
    // -------------------------------------------------------------
    const overviewA = await controller.getOverview(companyA.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      overviewA.company.name === 'Enterprise A SARL' &&
        overviewA.financial.totalInvoiced === '10000.00' &&
        overviewA.financial.clientReceipts === '6000.00',
      'Tenant A overview returns strictly isolated Company A financial data',
    );

    // -------------------------------------------------------------
    // Test 2: Tenant B Overview contains only B data (empty or separate)
    // -------------------------------------------------------------
    const overviewB = await controller.getOverview(companyB.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      overviewB.company.name === 'Enterprise B EUR' &&
        overviewB.company.currency === 'EUR' &&
        (overviewB.financial.totalInvoiced === '0.00' ||
          overviewB.financial.totalInvoiced === null),
      'Tenant B overview returns strictly isolated Company B settings and zero invoiced total',
    );

    // -------------------------------------------------------------
    // Test 3: Client receipts isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.clientReceipts === '6000.00' &&
        (overviewB.financial.clientReceipts === '0.00' ||
          overviewB.financial.clientReceipts === null),
      'Client receipts are strictly isolated per tenant companyId',
    );

    // -------------------------------------------------------------
    // Test 4: Supplier payments isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.supplierOutflow === '1000.00' &&
        (overviewB.financial.supplierOutflow === '0.00' ||
          overviewB.financial.supplierOutflow === null),
      'Supplier payments (inherited via DetteFournisseur) are isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 5: Employee payments isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.employeeOutflow === '1500.00' &&
        (overviewB.financial.employeeOutflow === '0.00' ||
          overviewB.financial.employeeOutflow === null),
      'Employee payments (inherited via Employe) are isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 6: Administrative expenses isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.adminExpenseOutflow === '500.00' &&
        (overviewB.financial.adminExpenseOutflow === '0.00' ||
          overviewB.financial.adminExpenseOutflow === null),
      'Administrative expenses are isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 7: Vehicle expenses isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.vehicleExpenseOutflow === '800.00' &&
        (overviewB.financial.vehicleExpenseOutflow === '0.00' ||
          overviewB.financial.vehicleExpenseOutflow === null),
      'Vehicle expenses (inherited via Vehicule) are isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 8: Fuel expenses isolation
    // -------------------------------------------------------------
    assert(
      overviewA.financial.fuelOutflow === '1000.00' &&
        (overviewB.financial.fuelOutflow === '0.00' || overviewB.financial.fuelOutflow === null),
      'Fuel expenses (inherited via Vehicule raw SQL) are isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 9: Outstanding invoices isolation
    // -------------------------------------------------------------
    // Invoice 10000 - Paid 6000 = Outstanding 4000
    assert(
      overviewA.financial.outstandingAmount === '4000.00' &&
        (overviewB.financial.outstandingAmount === '0.00' ||
          overviewB.financial.outstandingAmount === null),
      'Outstanding invoices balance is strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 10: Completed trips isolation
    // -------------------------------------------------------------
    assert(
      overviewA.operations.tripsCompleted === 1 &&
        (overviewB.operations.tripsCompleted === 0 || overviewB.operations.tripsCompleted === null),
      'Completed trips count is isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 11: Active vehicles isolation
    // -------------------------------------------------------------
    assert(
      overviewA.operations.activeVehicles === 1 && overviewB.operations.activeVehicles === 1,
      'Active vehicles count is isolated per tenant (1 each)',
    );

    // -------------------------------------------------------------
    // Test 12: Active drivers isolation
    // -------------------------------------------------------------
    assert(
      overviewA.operations.activeDrivers === 1 && overviewB.operations.activeDrivers === 1,
      'Active drivers count is isolated per tenant (1 each)',
    );

    // -------------------------------------------------------------
    // Test 13: Expired/expiring vehicle documents isolation
    // -------------------------------------------------------------
    assert(
      overviewA.risks.expiredDocuments === 1 &&
        (overviewB.risks.expiredDocuments === 0 || overviewB.risks.expiredDocuments === null),
      'Expired vehicle documents count (inherited via Vehicule) is isolated',
    );

    // -------------------------------------------------------------
    // Test 14: Overdue supplier debts isolation
    // -------------------------------------------------------------
    // Debt 4000 - Paid 1000 = Due 3000 (overdue)
    assert(
      overviewA.risks.overdueSupplierDebts === 1 &&
        (overviewB.risks.overdueSupplierDebts === 0 ||
          overviewB.risks.overdueSupplierDebts === null),
      'Overdue supplier debts count (raw SQL) is isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 15: Tenant A charts contain only A data
    // -------------------------------------------------------------
    const chartsA = await controller.getCharts(companyA.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      chartsA.cashFlow.length > 0 &&
        chartsA.tripsByStatus.find((t) => t.status === 'LIVRE')?.count === 1,
      'Tenant A charts contain Company A trip and cash flow data',
    );

    // -------------------------------------------------------------
    // Test 16: Tenant B charts contain only B data
    // -------------------------------------------------------------
    const chartsB = await controller.getCharts(companyB.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      chartsB.tripsByStatus.find((t) => t.status === 'LIVRE')?.count === 0,
      'Tenant B charts have zero trips for Company B',
    );

    // -------------------------------------------------------------
    // Test 17: Expense-by-source charts isolation
    // -------------------------------------------------------------
    const supplierExpA = chartsA.expensesBySource.find(
      (e) => e.source === 'SUPPLIER_PAYMENT',
    )?.amount;
    const supplierExpB = chartsB.expensesBySource.find(
      (e) => e.source === 'SUPPLIER_PAYMENT',
    )?.amount;
    assert(
      supplierExpA === '1000.00' && supplierExpB === '0.00',
      'Expense-by-source chart data is isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 18: Tenant A alerts contain only A alerts
    // -------------------------------------------------------------
    const alertsA = await controller.getAlerts(companyA.id, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      alertsA.some((a) => a.type === 'EXPIRED_DOCUMENT') &&
        alertsA.some((a) => a.type === 'OVERDUE_SUPPLIER_DEBT'),
      'Tenant A alerts contain document and debt expiration alerts for Company A',
    );

    // -------------------------------------------------------------
    // Test 19: Tenant B alerts contain zero A alerts
    // -------------------------------------------------------------
    const alertsB = await controller.getAlerts(companyB.id, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      alertsB.length === 0,
      'Tenant B alerts return empty array when Company B has no expiring items',
    );

    // -------------------------------------------------------------
    // Test 20: Recent activity for A contains Company A events
    // -------------------------------------------------------------
    const recentA = await controller.getRecentActivity(companyA.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      recentA.length > 0 &&
        recentA.some((item) => item.type === 'INVOICE_CREATED') &&
        recentA.some((item) => item.type === 'CLIENT_PAYMENT_RECEIVED'),
      'Recent activity for Tenant A contains Company A invoices and payments',
    );

    // -------------------------------------------------------------
    // Test 21: Recent activity for B contains no Company A events
    // -------------------------------------------------------------
    const recentB = await controller.getRecentActivity(companyB.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      recentB.length === 0,
      'Recent activity for Tenant B is empty and contains zero Company A events',
    );

    // -------------------------------------------------------------
    // Test 22: CompanySettings name/currency belong to current tenant
    // -------------------------------------------------------------
    assert(
      overviewA.company.name === 'Enterprise A SARL' &&
        overviewA.company.currency === 'MAD' &&
        overviewB.company.name === 'Enterprise B EUR' &&
        overviewB.company.currency === 'EUR',
      'CompanySettings company name and currency match current tenant companyId',
    );

    // -------------------------------------------------------------
    // Test 23: ADMIN_GENERAL remains restricted to its own companyId
    // -------------------------------------------------------------
    const adminOverviewA = await controller.getOverview(companyA.id, queryDto, {
      user: { roleName: 'ADMIN_GENERAL' },
    } as any);
    const adminOverviewB = await controller.getOverview(companyB.id, queryDto, {
      user: { roleName: 'ADMIN_GENERAL' },
    } as any);
    assert(
      adminOverviewA.financial.totalInvoiced === '10000.00' &&
        (adminOverviewB.financial.totalInvoiced === '0.00' ||
          adminOverviewB.financial.totalInvoiced === null),
      'ADMIN_GENERAL context remains strictly confined to assigned companyId',
    );

    // -------------------------------------------------------------
    // Test 24: Empty tenant returns zero values and isPeriodEmpty=true
    // -------------------------------------------------------------
    const companyEmpty = await prisma.company.create({
      data: { nom: 'Empty Company Test' },
    });
    const overviewEmpty = await controller.getOverview(companyEmpty.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      overviewEmpty.isPeriodEmpty === true && overviewEmpty.financial.totalInvoiced === '0.00',
      'Empty tenant returns zero financial values and isPeriodEmpty=true',
    );

    // -------------------------------------------------------------
    // Test 25: Forged companyId in query DTO cannot change tenant scope
    // -------------------------------------------------------------
    const forgedQuery: any = { preset: 'CE_MOIS', companyId: companyA.id };
    const forgedOverviewB = await controller.getOverview(companyB.id, forgedQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      forgedOverviewB.company.name === 'Enterprise B EUR' &&
        (forgedOverviewB.financial.totalInvoiced === '0.00' ||
          forgedOverviewB.financial.totalInvoiced === null),
      'Forged companyId in query DTO ignored, CurrentUser companyId enforced',
    );

    // -------------------------------------------------------------
    // Test 26: No cross-tenant data appears when only another tenant has records
    // -------------------------------------------------------------
    assert(
      overviewB.operations.tripsCompleted === 0 || overviewB.operations.tripsCompleted === null,
      'No cross-tenant data leaks to Tenant B when only Tenant A has completed trips',
    );

    // -------------------------------------------------------------
    // Test 27: Recent activity UNION ALL cannot leak another tenant
    // -------------------------------------------------------------
    const unionLeakCheckB = await controller.getRecentActivity(companyB.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      unionLeakCheckB.every((act) => !act.title.includes(factureA.numeroFacture)),
      'Recent activity UNION ALL raw SQL does not leak Tenant A invoices to Tenant B',
    );

    // -------------------------------------------------------------
    // Test 28: Outstanding amount raw SQL cannot mix invoice/payment tenants
    // -------------------------------------------------------------
    const clientB = await prisma.client.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: `Client B Transport ${ts}`,
        statut: ClientStatut.ACTIF,
      },
    });

    const factureB = await prisma.facture.create({
      data: {
        companyId: companyB.id,
        numeroFacture: `FAC-DASH-B-${ts}`,
        nomClient: clientB.nomEntreprise,
        sousTotal: 5000,
        tauxTva: 0,
        dateFacture: new Date(),
      },
    });

    await prisma.paiementClient.create({
      data: {
        numeroFacture: factureB.numeroFacture,
        nomClient: clientB.nomEntreprise,
        montantRecu: 5000,
        methodePaiement: 'VIREMENT',
        datePaiement: new Date(),
      },
    });

    const reCheckOutstandingA = await controller.getOverview(companyA.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      reCheckOutstandingA.financial.outstandingAmount === '4000.00',
      'Outstanding amount raw SQL ignores payments created under another companyId',
    );

    // -------------------------------------------------------------
    // Test 29: Fuel SQL cannot mix vehicle tenants
    // -------------------------------------------------------------
    // Create fuel record for vehB under Company B
    await prisma.bonCarburant.create({
      data: {
        immatriculation: vehB.immatriculation,
        litres: 50,
        prixParLitre: 10,
        dateCarburant: new Date(),
      },
    });
    const reCheckFuelA = await controller.getOverview(companyA.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    const reCheckFuelB = await controller.getOverview(companyB.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      reCheckFuelA.financial.fuelOutflow === '1000.00' &&
        reCheckFuelB.financial.fuelOutflow === '500.00',
      'Fuel raw SQL query isolates fuel expenses by vehicle tenant companyId',
    );

    // -------------------------------------------------------------
    // Test 30: CompanySettings cannot return another company's settings
    // -------------------------------------------------------------
    const emptySettingsOverview = await controller.getOverview(companyEmpty.id, queryDto, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      emptySettingsOverview.company.name === 'Transport & Logistique' &&
        emptySettingsOverview.company.currency === 'MAD',
      'CompanySettings fallback uses system default when company has no settings row',
    );

    // Cleanup Test Data
    await prisma.documentVehicule.deleteMany({
      where: { immatriculation: { in: [vehA.immatriculation, vehB.immatriculation] } },
    });
    await prisma.bonCarburant.deleteMany({
      where: { immatriculation: { in: [vehA.immatriculation, vehB.immatriculation] } },
    });
    await prisma.depenseVehicule.deleteMany({
      where: { immatriculation: { in: [vehA.immatriculation, vehB.immatriculation] } },
    });
    await prisma.depenseAdministrative.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.versementEmploye.deleteMany({
      where: { paiementEmploye: { idEmploye: empA.id } },
    });
    await prisma.paiementEmploye.deleteMany({ where: { idEmploye: empA.id } });
    await prisma.employe.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.paiementFournisseur.deleteMany({ where: { idDetteFournisseur: detteA.id } });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.fournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.paiementClient.deleteMany({ where: { numeroFacture: factureA.numeroFacture } });
    await prisma.facture.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.client.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.voyage.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.conducteur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.companySettings.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
  } catch (err) {
    console.error('UNHANDLED TEST RUNNER ERROR:', err);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n==================================================`);
  console.log(
    `TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} TESTS`,
  );
  console.log(`==================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
