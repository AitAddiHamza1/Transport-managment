import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { PrismaService } from './prisma/prisma.service';

/**
 * TRANSiVO — Targeted Regression Runner for VULN-DV-01
 * 
 * Verifies that:
 * 1. DepensesVehiculesService.findAll() enforces tenant isolation at both the
 *    relational level (vehicule.companyId) and the vehicle immatriculation level.
 * 2. When query.immatriculation is provided, the companyImmatriculations restriction
 *    is NEVER overwritten or bypassed.
 * 3. Two companies with vehicles sharing common substrings or patterns (e.g. '12345-A-50'
 *    and '12345-B-50') are strictly isolated:
 *    - Querying with or without immatriculation filter never leaks another company's expenses.
 *    - Querying for another company's vehicle returns 0 records.
 * 4. Pagination, sorting, and search filters remain fully functional.
 * 5. Contrast test proves the old logic leaked records, while the remediated logic protects them.
 */

async function runVulnDv01RegressionTests() {
  console.log('================================================================');
  console.log('=== VULN-DV-01 TARGETED REGRESSION TEST SUITE                ===');
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

  // Multi-tenant database dataset
  const dbData = {
    vehicules: [
      {
        immatriculation: '12345-A-50',
        companyId: 101,
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'CAMION',
        statut: 'DISPONIBLE',
      },
      {
        immatriculation: '99999-A-50',
        companyId: 101,
        marque: 'Scania',
        modele: 'R500',
        typeVehicule: 'CAMION',
        statut: 'DISPONIBLE',
      },
      {
        immatriculation: '12345-B-50',
        companyId: 202,
        marque: 'Mercedes',
        modele: 'Actros',
        typeVehicule: 'CAMION',
        statut: 'DISPONIBLE',
      },
    ],
    depenses: [
      {
        idDepense: 501,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: 'PIECES',
        immatriculation: '12345-A-50',
        description: 'Vidange et filtres Volvo Entreprise A',
        fichierRecu: null,
        montant: '1500.00',
        dateDepense: new Date('2026-04-10'),
      },
      {
        idDepense: 502,
        categorieDepense: 'CARBURANT',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: null,
        immatriculation: '99999-A-50',
        description: 'Plein carburant Scania Entreprise A',
        fichierRecu: null,
        montant: '2500.00',
        dateDepense: new Date('2026-04-11'),
      },
      {
        idDepense: 601,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: 'PNEUS',
        immatriculation: '12345-B-50',
        description: 'Changement pneus Mercedes Entreprise B',
        fichierRecu: null,
        montant: '4800.00',
        dateDepense: new Date('2026-04-12'),
      },
    ],
  };

  // --------------------------------------------------------------------------
  // TEST 1: Inspect Prisma where Clause Construction
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying Prisma where clause structure and tenant preservation...');

  let capturedWhere: any = null;

  const mockPrisma: any = {
    vehicule: {
      findMany: async ({ where }: any) => {
        return dbData.vehicules.filter((v) => v.companyId === where.companyId);
      },
    },
    depenseVehicule: {
      findMany: async ({ where }: any) => {
        capturedWhere = where;
        return [];
      },
      count: async ({ where }: any) => {
        return 0;
      },
    },
    $transaction: async (promises: any[]) => {
      return Promise.all(promises);
    },
  };

  const service = new DepensesVehiculesService(mockPrisma as PrismaService, {} as any);

  // 1.1 Without query.immatriculation
  await service.findAll(101, {});
  assert(capturedWhere !== null, 'Prisma where clause is generated');
  assert(capturedWhere.vehicule?.companyId === 101, 'where.vehicule.companyId is strictly bound to 101');
  assert(
    Array.isArray(capturedWhere.immatriculation?.in) &&
      capturedWhere.immatriculation.in.includes('12345-A-50') &&
      capturedWhere.immatriculation.in.includes('99999-A-50') &&
      !capturedWhere.immatriculation.in.includes('12345-B-50'),
    'where.immatriculation.in contains strictly Company A vehicles',
  );

  // 1.2 With query.immatriculation matching Company A vehicle
  await service.findAll(101, { immatriculation: '12345' });
  assert(
    capturedWhere.vehicule?.companyId === 101,
    'where.vehicule.companyId remains bound to 101 when query.immatriculation is present',
  );
  assert(
    capturedWhere.vehicule?.immatriculation?.contains === '12345',
    'where.vehicule.immatriculation contains is correctly applied',
  );
  assert(
    Array.isArray(capturedWhere.immatriculation?.in),
    'where.immatriculation.in is preserved as array (NOT overwritten by loose contains)',
  );
  assert(
    capturedWhere.immatriculation.in.length === 1 && capturedWhere.immatriculation.in[0] === '12345-A-50',
    'where.immatriculation.in is filtered to only Company A vehicle matching 12345',
  );
  assert(
    !capturedWhere.immatriculation.in.includes('12345-B-50'),
    'Company B vehicle 12345-B-50 is NEVER included in Company A where clause',
  );

  // 1.3 With query.immatriculation targeting Company B vehicle specifically
  await service.findAll(101, { immatriculation: '12345-B-50' });
  assert(
    Array.isArray(capturedWhere.immatriculation?.in) && capturedWhere.immatriculation.in.length === 0,
    'Searching for Company B vehicle from Company A results in empty where.immatriculation.in: []',
  );

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Tenant Data Isolation Simulation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing multi-tenant data isolation with shared vehicle prefix...');

  function executePrismaWhere(where: any) {
    return dbData.depenses.filter((d) => {
      // 1. Relational check: vehicule.companyId
      const v = dbData.vehicules.find((veh) => veh.immatriculation === d.immatriculation);
      if (!v) return false;
      if (where.vehicule?.companyId !== undefined && v.companyId !== where.vehicule.companyId) {
        return false;
      }
      if (
        where.vehicule?.immatriculation?.contains &&
        !v.immatriculation.toLowerCase().includes(where.vehicule.immatriculation.contains.toLowerCase())
      ) {
        return false;
      }

      // 2. Immatriculation in check
      if (where.immatriculation?.in && !where.immatriculation.in.includes(d.immatriculation)) {
        return false;
      }

      // 3. Search check
      if (where.AND && Array.isArray(where.AND)) {
        for (const andItem of where.AND) {
          if (andItem.OR) {
            const matchesOr = andItem.OR.some((cond: any) => {
              if (cond.immatriculation?.contains && d.immatriculation.toLowerCase().includes(cond.immatriculation.contains.toLowerCase())) return true;
              if (cond.description?.contains && d.description.toLowerCase().includes(cond.description.contains.toLowerCase())) return true;
              if (cond.categorieDepense?.contains && d.categorieDepense.toLowerCase().includes(cond.categorieDepense.contains.toLowerCase())) return true;
              return false;
            });
            if (!matchesOr) return false;
          }
        }
      }

      return true;
    });
  }

  const liveMockPrisma: any = {
    vehicule: {
      findMany: async ({ where }: any) => {
        return dbData.vehicules.filter((v) => v.companyId === where.companyId);
      },
    },
    depenseVehicule: {
      findMany: async ({ where, skip, take }: any) => {
        const rows = executePrismaWhere(where);
        return rows.slice(skip || 0, (skip || 0) + (take || 10));
      },
      count: async ({ where }: any) => {
        return executePrismaWhere(where).length;
      },
    },
    $transaction: async (promises: any[]) => {
      return Promise.all(promises);
    },
  };

  const liveService = new DepensesVehiculesService(liveMockPrisma as PrismaService, {} as any);

  // 2.1 Company A without filter
  const resA = await liveService.findAll(101, {});
  assert(resA.data.length === 2, 'Company A gets exactly its 2 expenses');
  assert(resA.data.every((d) => d.immatriculation.includes('-A-50')), 'All Company A expenses belong to Company A vehicles');
  assert(!resA.data.some((d) => d.idDepense === 601), 'Company A does NOT receive Company B expense 601');

  // 2.2 Company A with common prefix filter '12345'
  const resAFiltered = await liveService.findAll(101, { immatriculation: '12345' });
  assert(resAFiltered.data.length === 1, 'Company A gets 1 expense matching 12345');
  assert(resAFiltered.data[0].idDepense === 501, 'Company A receives expense 501');
  assert(resAFiltered.data[0].immatriculation === '12345-A-50', 'Expense belongs to 12345-A-50');
  assert(!resAFiltered.data.some((d) => d.idDepense === 601), 'Company A does NOT receive Company B expense 601 (12345-B-50)');

  // 2.3 Company B with common prefix filter '12345'
  const resBFiltered = await liveService.findAll(202, { immatriculation: '12345' });
  assert(resBFiltered.data.length === 1, 'Company B gets 1 expense matching 12345');
  assert(resBFiltered.data[0].idDepense === 601, 'Company B receives expense 601');
  assert(resBFiltered.data[0].immatriculation === '12345-B-50', 'Expense belongs to 12345-B-50');
  assert(!resBFiltered.data.some((d) => d.idDepense === 501), 'Company B does NOT receive Company A expense 501 (12345-A-50)');

  // 2.4 Company A probing Company B vehicle directly
  const resACrossProbe = await liveService.findAll(101, { immatriculation: '12345-B-50' });
  assert(resACrossProbe.data.length === 0, 'Company A querying 12345-B-50 receives 0 records');
  assert(resACrossProbe.meta.total === 0, 'Meta total is 0');

  // 2.5 Company B probing Company A vehicle directly
  const resBCrossProbe = await liveService.findAll(202, { immatriculation: '12345-A-50' });
  assert(resBCrossProbe.data.length === 0, 'Company B querying 12345-A-50 receives 0 records');
  assert(resBCrossProbe.meta.total === 0, 'Meta total is 0');

  // --------------------------------------------------------------------------
  // TEST 3: Contrast with Old Vulnerable Logic
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Contrasting with old vulnerable logic...');

  // The old vulnerable logic executed:
  // where = { immatriculation: { contains: query.immatriculation, mode: 'insensitive' } }
  // completely discarding companyImmatriculations!
  function executeOldVulnerableWhere(queryImmatriculation: string) {
    return dbData.depenses.filter((d) =>
      d.immatriculation.toLowerCase().includes(queryImmatriculation.toLowerCase()),
    );
  }

  const oldLeak = executeOldVulnerableWhere('12345');
  assert(
    oldLeak.length === 2,
    `Old logic returned ${oldLeak.length} records across multiple companies for '12345'`,
  );
  assert(
    oldLeak.some((d) => d.idDepense === 501) && oldLeak.some((d) => d.idDepense === 601),
    'Old logic confirmed to leak Company B expense 601 alongside Company A expense 501',
  );

  // --------------------------------------------------------------------------
  // TEST 4: Search, Pagination, and findStats Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying search, pagination, and findStats...');

  // 4.1 Search query
  const resSearch = await liveService.findAll(101, { search: 'Vidange' });
  assert(resSearch.data.length === 1 && resSearch.data[0].idDepense === 501, 'Search for "Vidange" returns expense 501');

  // 4.2 Pagination
  const resPage = await liveService.findAll(101, { page: 2, limit: 1 });
  assert(resPage.data.length === 1, 'Page 2 with limit 1 returns 1 item');
  assert(resPage.meta.page === 2, 'Meta page is 2');
  assert(resPage.meta.totalPages === 2, 'Meta totalPages is 2');

  // 4.3 findStats
  const statsMockPrisma: any = {
    vehicule: {
      findMany: async ({ where }: any) => {
        return dbData.vehicules.filter((v) => v.companyId === where.companyId);
      },
    },
    depenseVehicule: {
      findMany: async ({ where }: any) => {
        return executePrismaWhere(where);
      },
    },
  };

  const statsService = new DepensesVehiculesService(statsMockPrisma as PrismaService, {} as any);
  const statsA = await statsService.findStats(101);
  assert(statsA.totalCount === 2, `Company A stats totalCount is 2 (got ${statsA.totalCount})`);
  assert(statsA.totalMontant === 4000, `Company A stats totalMontant is 4000 (1500 + 2500, got ${statsA.totalMontant})`);

  const statsB = await statsService.findStats(202);
  assert(statsB.totalCount === 1, `Company B stats totalCount is 1 (got ${statsB.totalCount})`);
  assert(statsB.totalMontant === 4800, `Company B stats totalMontant is 4800 (got ${statsB.totalMontant})`);

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!             ===`);
  console.log('================================================================');
}

runVulnDv01RegressionTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  });
