import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { PrismaService } from './prisma/prisma.service';

/**
 * TRANSiVO — Targeted Regression Runner for VULN-GP-01
 * 
 * Verifies that:
 * 1. The SQL query generated for CLIENT_PAYMENT joins paiements_clients and factures
 *    strictly on relational keys (pc.facture_id = f.id AND pc.company_id = f.company_id)
 *    and filters on f.company_id = $1 AND pc.company_id = $1.
 * 2. Textual join on `pc.numero_facture = f.numero_facture` is completely eliminated.
 * 3. Multi-tenant isolation is strictly preserved even when Company A and Company B
 *    share the identical invoice number (e.g., 'FAC-DUPLICATE-2026').
 * 4. Company A cannot view Company B's payment, amounts, or client info, and vice versa.
 * 5. Financial statistics and aggregations remain accurate per company.
 */

async function runVulnGp01RegressionTests() {
  console.log('================================================================');
  console.log('=== VULN-GP-01 TARGETED REGRESSION TEST SUITE                ===');
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
  // TEST 1: Inspect SQL generation for Client Payments
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying SQL query generation in GestionPaiementsService...');

  let capturedSql = '';
  let capturedParams: any[] = [];

  const mockPrisma: any = {
    companySettings: {
      findFirst: async () => ({ devise: 'MAD' }),
    },
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      capturedSql = sql;
      capturedParams = params;
      if (sql.includes('COUNT(*)')) {
        return [{ total: 0 }];
      }
      return [];
    },
  };

  const service = new GestionPaiementsService(mockPrisma as PrismaService);

  // Call findAll for Company 101 with client payment source
  await service.findAll(101, {
    sourceType: 'CLIENT_PAYMENT' as any,
    page: 1,
    limit: 10,
  });

  // Verify that the loose textual join is removed
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
    'Explicit company_id filtering on both aliases "WHERE f.company_id = $1 AND pc.company_id = $1" is enforced',
  );

  // Verify parameter binding
  assert(
    capturedParams[0] === 101,
    `Parameter $1 correctly binds to tenant companyId (expected 101, got ${capturedParams[0]})`,
  );

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Tenant Isolation Simulation with Duplicate Invoice Numbers
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing multi-tenant isolation with identical invoice numbers across tenants...');

  // Database rows simulating two independent tenants:
  // Both have invoice number 'FAC-2026-999'
  // Tenant A: company_id = 101, facture_id = 10, amount = 4500.00, client = "Client Alpha"
  // Tenant B: company_id = 202, facture_id = 20, amount = 8900.00, client = "Client Beta"
  const simulatedDb = {
    factures: [
      { id: 10, company_id: 101, numero_facture: 'FAC-2026-999', nom_client: 'Client Alpha' },
      { id: 20, company_id: 202, numero_facture: 'FAC-2026-999', nom_client: 'Client Beta' },
    ],
    paiements_clients: [
      {
        id: 1001,
        company_id: 101,
        facture_id: 10,
        numero_facture: 'FAC-2026-999',
        nom_client: 'Client Alpha',
        montant_recu: '4500.00',
        date_paiement: new Date('2026-03-01'),
        methode_paiement: 'VIREMENT',
        est_annule: false,
        date_annulation: null,
        motif_annulation: null,
      },
      {
        id: 2001,
        company_id: 202,
        facture_id: 20,
        numero_facture: 'FAC-2026-999',
        nom_client: 'Client Beta',
        montant_recu: '8900.00',
        date_paiement: new Date('2026-03-02'),
        methode_paiement: 'CHEQUE',
        est_annule: false,
        date_annulation: null,
        motif_annulation: null,
      },
    ],
  };

  // Mock executing the actual relational SQL join logic:
  // pc JOIN f ON pc.facture_id = f.id AND pc.company_id = f.company_id
  // WHERE f.company_id = $1 AND pc.company_id = $1
  function executeRelationalJoin(companyId: number) {
    const results: any[] = [];
    for (const pc of simulatedDb.paiements_clients) {
      for (const f of simulatedDb.factures) {
        // Relational condition
        const matchRelational = pc.facture_id === f.id && pc.company_id === f.company_id;
        const matchWhere = f.company_id === companyId && pc.company_id === companyId;
        if (matchRelational && matchWhere) {
          results.push({
            source_type: 'CLIENT_PAYMENT',
            source_id: pc.id,
            movement_id: `CLIENT_PAYMENT:${pc.id}`,
            direction: 'IN',
            movement_date: pc.date_paiement.toISOString().split('T')[0],
            amount: pc.montant_recu,
            payment_method: pc.methode_paiement,
            reference: pc.numero_facture,
            external_reference: null,
            party_type: 'CLIENT',
            party_id: null,
            party_name: pc.nom_client,
            document_type: 'INVOICE',
            document_id: null,
            document_number: pc.numero_facture,
            status: 'ACTIVE',
            is_cancelled: false,
            cancelled_at: null,
            cancellation_reason: null,
            source_route: '/paiements-clients',
            search_text: `${pc.numero_facture} ${pc.nom_client}`,
          });
        }
      }
    }
    return results;
  }

  // Create mock that returns results matching the relational query logic
  const relationalMockPrisma: any = {
    companySettings: {
      findFirst: async () => ({ devise: 'MAD' }),
    },
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      const targetCompanyId = params[0];
      const rows = executeRelationalJoin(targetCompanyId);
      if (sql.includes('COUNT(*)')) {
        return [{ total: rows.length }];
      }
      return rows;
    },
  };

  const relationalService = new GestionPaiementsService(relationalMockPrisma as PrismaService);

  // 1. Consultation by Company A (101)
  const resultCompanyA = await relationalService.findAll(101, {
    sourceType: 'CLIENT_PAYMENT' as any,
  });

  assert(resultCompanyA.data.length === 1, 'Company A receives exactly 1 payment record');
  assert(resultCompanyA.data[0].sourceId === 1001, 'Company A receives payment 1001');
  assert(resultCompanyA.data[0].party.name === 'Client Alpha', 'Company A receives Client Alpha');
  assert(resultCompanyA.data[0].amount === '4500.00', 'Company A payment amount is 4500.00');
  assert(
    !resultCompanyA.data.some((p) => p.sourceId === 2001 || p.party.name === 'Client Beta'),
    'Company A DOES NOT receive Company B payment (2001) or client information (Client Beta)',
  );

  // 2. Consultation by Company B (202)
  const resultCompanyB = await relationalService.findAll(202, {
    sourceType: 'CLIENT_PAYMENT' as any,
  });

  assert(resultCompanyB.data.length === 1, 'Company B receives exactly 1 payment record');
  assert(resultCompanyB.data[0].sourceId === 2001, 'Company B receives payment 2001');
  assert(resultCompanyB.data[0].party.name === 'Client Beta', 'Company B receives Client Beta');
  assert(resultCompanyB.data[0].amount === '8900.00', 'Company B payment amount is 8900.00');
  assert(
    !resultCompanyB.data.some((p) => p.sourceId === 1001 || p.party.name === 'Client Alpha'),
    'Company B DOES NOT receive Company A payment (1001) or client information (Client Alpha)',
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
            source_id: pc.id,
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
  // TEST 4: Verification of findStats calculations
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying findStats metrics calculation...');

  const statsMockPrisma: any = {
    companySettings: {
      findFirst: async () => ({ devise: 'MAD' }),
    },
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      const targetCompanyId = params[0];
      const rows = executeRelationalJoin(targetCompanyId);
      if (sql.includes('SUM(')) {
        let totalIn = 0;
        let totalOut = 0;
        for (const r of rows) {
          if (!r.is_cancelled) {
            if (r.direction === 'IN') totalIn += parseFloat(r.amount);
            if (r.direction === 'OUT') totalOut += parseFloat(r.amount);
          }
        }
        return [
          {
            total_in: totalIn.toString(),
            total_out: totalOut.toString(),
            total_count: rows.length,
            active_count: rows.filter((r) => !r.is_cancelled).length,
            cancelled_count: rows.filter((r) => r.is_cancelled).length,
          },
        ];
      }
      if (sql.includes('GROUP BY source_type')) {
        const counts: Record<string, number> = {};
        for (const r of rows) {
          counts[r.source_type] = (counts[r.source_type] || 0) + 1;
        }
        return Object.entries(counts).map(([source_type, cnt]) => ({ source_type, cnt }));
      }
      if (sql.includes('GROUP BY payment_method')) {
        const counts: Record<string, number> = {};
        for (const r of rows) {
          counts[r.payment_method] = (counts[r.payment_method] || 0) + 1;
        }
        return Object.entries(counts).map(([payment_method, cnt]) => ({ payment_method, cnt }));
      }
      return rows;
    },
  };

  const statsService = new GestionPaiementsService(statsMockPrisma as PrismaService);

  const statsA = await statsService.findStats(101, { sourceType: 'CLIENT_PAYMENT' as any });
  assert(statsA.totalIn === '4500.00', `Company A totalIn is 4500.00 (got ${statsA.totalIn})`);
  assert(statsA.totalCount === 1, `Company A totalCount is 1 (got ${statsA.totalCount})`);
  assert(statsA.bySourceType['CLIENT_PAYMENT'] === 1, 'Company A bySourceType[CLIENT_PAYMENT] is 1');

  const statsB = await statsService.findStats(202, { sourceType: 'CLIENT_PAYMENT' as any });
  assert(statsB.totalIn === '8900.00', `Company B totalIn is 8900.00 (got ${statsB.totalIn})`);
  assert(statsB.totalCount === 1, `Company B totalCount is 1 (got ${statsB.totalCount})`);
  assert(statsB.bySourceType['CLIENT_PAYMENT'] === 1, 'Company B bySourceType[CLIENT_PAYMENT] is 1');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!             ===`);
  console.log('================================================================');
}

runVulnGp01RegressionTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  });
