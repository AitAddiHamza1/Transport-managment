import { DashboardService } from './modules/dashboard/dashboard.service';
import { PrismaService } from './prisma/prisma.service';

/**
 * TRANSiVO — Targeted Regression Runner for VULN-DASH-01
 * 
 * Verifies that:
 * 1. The SQL query in DashboardService.getRecentActivity() for CLIENT_PAYMENT
 *    joins paiements_clients and factures strictly on relational keys:
 *    `JOIN factures f ON pc.facture_id = f.id AND pc.company_id = f.company_id`
 *    and filters on `WHERE f.company_id = $1 AND pc.company_id = $1`.
 * 2. The textual join on `pc.numero_facture = f.numero_facture` is completely eliminated.
 * 3. Multi-tenant isolation is strictly preserved even when Company A and Company B
 *    share identical invoice numbers (e.g. 'FAC-2026-001').
 * 4. Company A cannot view Company B's payments or client info in recent activity, and vice versa.
 * 5. Cancellation (`est_annule = false`), date boundaries, sorting, and other activity branches
 *    (invoices, supplier payments, etc.) remain intact.
 */

async function runVulnDash01RegressionTests() {
  console.log('================================================================');
  console.log('=== VULN-DASH-01 TARGETED REGRESSION TEST SUITE              ===');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
    passedTests++;
    console.log(`  ✓ PASSED: ${message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Inspect SQL generation in getRecentActivity()
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying SQL query generation in DashboardService.getRecentActivity()...');

  let capturedSql = '';
  let capturedParams: any[] = [];

  const mockPrisma: any = {
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      capturedSql = sql;
      capturedParams = params;
      return [];
    },
  };

  const dashboardService = new DashboardService(mockPrisma as PrismaService);

  // Call getRecentActivity for Company 101 with permissions for paiements_clients
  await dashboardService.getRecentActivity(
    101,
    {
      preset: 'PERSONNALISE' as any,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
    },
    { paiements_clients: true },
    false,
  );

  // Verify that the old loose join is eliminated
  assert(
    !capturedSql.includes('JOIN factures f ON pc.numero_facture = f.numero_facture'),
    'Old loose join on "pc.numero_facture = f.numero_facture" is completely removed',
  );

  // Verify that the relational join on composite foreign keys is present
  assert(
    capturedSql.includes('JOIN factures f ON pc.facture_id = f.id AND pc.company_id = f.company_id'),
    'Reliable relational join "pc.facture_id = f.id AND pc.company_id = f.company_id" is enforced',
  );

  // Verify explicit company filtering on both aliases
  assert(
    capturedSql.includes('WHERE f.company_id = $1 AND pc.company_id = $1'),
    'Dual tenant filter "WHERE f.company_id = $1 AND pc.company_id = $1" is enforced',
  );

  // Verify cancellation and date range filters are preserved
  assert(
    capturedSql.includes('AND pc.est_annule = false'),
    'Cancellation filter "AND pc.est_annule = false" is preserved',
  );
  assert(
    capturedSql.includes('AND pc.date_paiement >= $2::date AND pc.date_paiement <= $3::date'),
    'Date range filter "AND pc.date_paiement >= $2::date AND pc.date_paiement <= $3::date" is preserved',
  );

  // Verify parameter bindings
  assert(capturedParams[0] === 101, `Parameter $1 binds to companyId 101 (got ${capturedParams[0]})`);
  assert(capturedParams[1] instanceof Date, 'Parameter $2 binds to Date object for dateDebut');
  assert(capturedParams[2] instanceof Date, 'Parameter $3 binds to Date object for dateFin');

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Tenant Isolation Simulation with Duplicate Invoice Numbers
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing multi-tenant recent activity isolation with identical invoice numbers...');

  // Two tenants: Company A (101) and Company B (202)
  // Both have invoice 'FAC-2026-001'
  const simulatedDb = {
    factures: [
      { id: 10, company_id: 101, numero_facture: 'FAC-2026-001', nom_client: 'Client Entreprise A' },
      { id: 20, company_id: 202, numero_facture: 'FAC-2026-001', nom_client: 'Client Entreprise B' },
    ],
    paiements_clients: [
      {
        id: 1001,
        company_id: 101,
        facture_id: 10,
        numero_facture: 'FAC-2026-001',
        nom_client: 'Client Entreprise A',
        montant_recu: '3500.00',
        date_paiement: new Date('2026-06-15'),
        est_annule: false,
      },
      {
        id: 2001,
        company_id: 202,
        facture_id: 20,
        numero_facture: 'FAC-2026-001',
        nom_client: 'Client Entreprise B',
        montant_recu: '7200.00',
        date_paiement: new Date('2026-06-16'),
        est_annule: false,
      },
    ],
  };

  function executeDashboardRelationalJoin(companyId: number, dDebut: Date, dFin: Date) {
    const results: any[] = [];
    for (const pc of simulatedDb.paiements_clients) {
      for (const f of simulatedDb.factures) {
        const matchRelational = pc.facture_id === f.id && pc.company_id === f.company_id;
        const matchWhere =
          f.company_id === companyId &&
          pc.company_id === companyId &&
          !pc.est_annule &&
          pc.date_paiement >= dDebut &&
          pc.date_paiement <= dFin;

        if (matchRelational && matchWhere) {
          results.push({
            activityId: `CLIENT_PAYMENT:${pc.id}`,
            type: 'CLIENT_PAYMENT_RECEIVED',
            date: `${pc.date_paiement.toISOString().split('T')[0]}T12:00:00.000Z`,
            title: 'Paiement client reçu',
            description: `Client: ${pc.nom_client} — Facture: ${pc.numero_facture}`,
            amount: pc.montant_recu,
            iconKey: 'client_payment',
            tone: 'success',
            sourceRoute: '/paiements-clients',
            timestampPrecision: 'DATE',
            event_timestamp: pc.date_paiement,
            source_type: 2,
            source_id: pc.id,
          });
        }
      }
    }
    return results;
  }

  const relationalMockPrisma: any = {
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      const companyId = params[0];
      const dDebut = params[1];
      const dFin = params[2];
      return executeDashboardRelationalJoin(companyId, dDebut, dFin);
    },
  };

  const relationalDashboardService = new DashboardService(relationalMockPrisma as PrismaService);

  // 1. Query for Company A (101)
  const activitiesCompanyA = await relationalDashboardService.getRecentActivity(
    101,
    {
      preset: 'PERSONNALISE' as any,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
    },
    { paiements_clients: true },
    false,
  );

  assert(activitiesCompanyA.length === 1, 'Company A receives exactly 1 activity');
  assert(activitiesCompanyA[0].activityId === 'CLIENT_PAYMENT:1001', 'Company A receives activity for payment 1001');
  assert(activitiesCompanyA[0].description.includes('Client Entreprise A'), 'Company A activity describes Client Entreprise A');
  assert(activitiesCompanyA[0].amount === '3500.00', 'Company A activity amount is 3500.00');
  assert(
    !activitiesCompanyA.some((a) => a.activityId === 'CLIENT_PAYMENT:2001' || a.description.includes('Client Entreprise B')),
    'Company A DOES NOT receive Company B payment (2001) or client information (Client Entreprise B)',
  );

  // 2. Query for Company B (202)
  const activitiesCompanyB = await relationalDashboardService.getRecentActivity(
    202,
    {
      preset: 'PERSONNALISE' as any,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
    },
    { paiements_clients: true },
    false,
  );

  assert(activitiesCompanyB.length === 1, 'Company B receives exactly 1 activity');
  assert(activitiesCompanyB[0].activityId === 'CLIENT_PAYMENT:2001', 'Company B receives activity for payment 2001');
  assert(activitiesCompanyB[0].description.includes('Client Entreprise B'), 'Company B activity describes Client Entreprise B');
  assert(activitiesCompanyB[0].amount === '7200.00', 'Company B activity amount is 7200.00');
  assert(
    !activitiesCompanyB.some((a) => a.activityId === 'CLIENT_PAYMENT:1001' || a.description.includes('Client Entreprise A')),
    'Company B DOES NOT receive Company A payment (1001) or client information (Client Entreprise A)',
  );

  // --------------------------------------------------------------------------
  // TEST 3: Verification with Old Vulnerable Logic to Prove Contrast
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Contrasting with old vulnerable logic...');

  function executeOldVulnerableJoin(companyId: number) {
    const results: any[] = [];
    for (const pc of simulatedDb.paiements_clients) {
      for (const f of simulatedDb.factures) {
        // Vulnerable condition: only numero_facture matched, and only f.company_id filtered!
        const matchVulnerable = pc.numero_facture === f.numero_facture;
        const matchWhere = f.company_id === companyId;
        if (matchVulnerable && matchWhere) {
          results.push({
            pc_id: pc.id,
            nom_client: pc.nom_client,
            f_company_id: f.company_id,
            pc_company_id: pc.company_id,
          });
        }
      }
    }
    return results;
  }

  const vulnerableLeakCompanyA = executeOldVulnerableJoin(101);
  assert(
    vulnerableLeakCompanyA.length === 2,
    `Old logic leaked ${vulnerableLeakCompanyA.length} records to Company A (both Tenant A and Tenant B records)`,
  );
  assert(
    vulnerableLeakCompanyA.some((r) => r.pc_company_id === 202),
    'Old logic confirmed to leak Tenant B data to Tenant A due to duplicate invoice number',
  );

  // --------------------------------------------------------------------------
  // TEST 4: Verification of Cancellation and Date Boundary Filters
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying cancellation and date boundaries filtering...');

  const extendedDb = {
    factures: [
      { id: 31, company_id: 101, numero_facture: 'FAC-ACTIVE-2026' },
      { id: 32, company_id: 101, numero_facture: 'FAC-CANCELLED-2026' },
      { id: 33, company_id: 101, numero_facture: 'FAC-OUT-OF-BOUNDS-2026' },
    ],
    paiements_clients: [
      {
        id: 3001,
        company_id: 101,
        facture_id: 31,
        numero_facture: 'FAC-ACTIVE-2026',
        nom_client: 'Client Actif',
        montant_recu: '1000.00',
        date_paiement: new Date('2026-05-10'),
        est_annule: false,
      },
      {
        id: 3002,
        company_id: 101,
        facture_id: 32,
        numero_facture: 'FAC-CANCELLED-2026',
        nom_client: 'Client Annule',
        montant_recu: '2000.00',
        date_paiement: new Date('2026-05-11'),
        est_annule: true, // Cancelled!
      },
      {
        id: 3003,
        company_id: 101,
        facture_id: 33,
        numero_facture: 'FAC-OUT-OF-BOUNDS-2026',
        nom_client: 'Client Hors Periode',
        montant_recu: '3000.00',
        date_paiement: new Date('2025-12-31'), // Outside 2026
        est_annule: false,
      },
    ],
  };

  const filterMockPrisma: any = {
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      const companyId = params[0];
      const dDebut = params[1];
      const dFin = params[2];
      const results: any[] = [];
      for (const pc of extendedDb.paiements_clients) {
        for (const f of extendedDb.factures) {
          if (
            pc.facture_id === f.id &&
            pc.company_id === f.company_id &&
            f.company_id === companyId &&
            pc.company_id === companyId &&
            !pc.est_annule &&
            pc.date_paiement >= dDebut &&
            pc.date_paiement <= dFin
          ) {
            results.push({
              activityId: `CLIENT_PAYMENT:${pc.id}`,
              type: 'CLIENT_PAYMENT_RECEIVED',
              date: `${pc.date_paiement.toISOString().split('T')[0]}T12:00:00.000Z`,
              title: 'Paiement client reçu',
              description: `Client: ${pc.nom_client}`,
              amount: pc.montant_recu,
              iconKey: 'client_payment',
              tone: 'success',
              sourceRoute: '/paiements-clients',
              timestampPrecision: 'DATE',
              event_timestamp: pc.date_paiement,
              source_type: 2,
              source_id: pc.id,
            });
          }
        }
      }
      return results;
    },
  };

  const filterDashboardService = new DashboardService(filterMockPrisma as PrismaService);

  const filteredActivities = await filterDashboardService.getRecentActivity(
    101,
    {
      preset: 'PERSONNALISE' as any,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
    },
    { paiements_clients: true },
    false,
  );

  assert(filteredActivities.length === 1, 'Only active payment within 2026 date range is returned');
  assert(filteredActivities[0].activityId === 'CLIENT_PAYMENT:3001', 'Payment 3001 is included');
  assert(!filteredActivities.some((a) => a.activityId === 'CLIENT_PAYMENT:3002'), 'Cancelled payment 3002 is excluded');
  assert(!filteredActivities.some((a) => a.activityId === 'CLIENT_PAYMENT:3003'), 'Out of range payment 3003 is excluded');

  // --------------------------------------------------------------------------
  // TEST 5: Verification of Other Activity Branches Preservation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Verifying other activity branches preservation (union queries)...');

  let unionSqlCaptured = '';
  const fullMockPrisma: any = {
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      unionSqlCaptured = sql;
      return [];
    },
  };

  const fullDashboardService = new DashboardService(fullMockPrisma as PrismaService);

  // Call with all permissions to check that all branches are assembled in unionSql
  await fullDashboardService.getRecentActivity(
    101,
    {
      preset: 'PERSONNALISE' as any,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
    },
    {
      factures: true,
      paiements_clients: true,
      paiements_fournisseurs: true,
      paiements_employes: true,
      depenses_administratives: true,
      voyages: true,
      documents_vehicules: true,
    },
    false,
  );

  assert(unionSqlCaptured.includes('INVOICE_CREATED'), 'Branch INVOICE_CREATED is preserved');
  assert(unionSqlCaptured.includes('CLIENT_PAYMENT_RECEIVED'), 'Branch CLIENT_PAYMENT_RECEIVED is preserved');
  assert(unionSqlCaptured.includes('SUPPLIER_PAYMENT_RECORDED'), 'Branch SUPPLIER_PAYMENT_RECORDED is preserved');
  assert(unionSqlCaptured.includes('EMPLOYEE_PAYMENT_RECORDED'), 'Branch EMPLOYEE_PAYMENT_RECORDED is preserved');
  assert(unionSqlCaptured.includes('ADMIN_EXPENSE_CREATED'), 'Branch ADMIN_EXPENSE_CREATED is preserved');
  assert(unionSqlCaptured.includes('TRIP_COMPLETED'), 'Branch TRIP_COMPLETED is preserved');
  assert(unionSqlCaptured.includes('DOCUMENT_ADDED'), 'Branch DOCUMENT_ADDED is preserved');
  assert(unionSqlCaptured.includes('ORDER BY event_timestamp DESC, source_type ASC, source_id DESC'), 'Order by event_timestamp and tie-breakers preserved');
  assert(unionSqlCaptured.includes('LIMIT 20'), 'Limit 20 preserved');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!             ===`);
  console.log('================================================================');
}

runVulnDash01RegressionTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  });
