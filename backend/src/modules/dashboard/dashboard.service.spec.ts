import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

// Mock function helper matching Jest conventions
function createMockFn(impl?: Function) {
  const fn: any = function (...args: any[]) {
    fn.mock.calls.push(args);
    if (impl) return impl(...args);
  };
  fn.mock = { calls: [] };
  fn.mockImplementation = (newImpl: Function) => createMockFn(newImpl);
  fn.mockResolvedValue = (val: any) => createMockFn(async () => val);
  return fn;
}

// Support both Jest environment and standalone ts-node execution
const testRunner = globalThis as unknown as {
  describe?: (name: string, fn: () => void) => void;
  it?: (name: string, fn: () => void | Promise<void>) => void;
};

let describeBlock = typeof testRunner.describe === 'function' ? testRunner.describe : ((name: string, fn: () => void) => {
  console.log(`\n=== ${name} ===`);
  fn();
}) as any;

let itBlock = typeof testRunner.it === 'function' ? testRunner.it : ((name: string, fn: () => void | Promise<void>) => {
  return (async () => {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  })();
}) as any;

function expectVal(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but received ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b} but received ${a}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null but received ${actual}`);
      }
    },
  };
}

describeBlock('DashboardService - Phase 3 Voyage Date Filtering', () => {
  // In-memory dataset for isolated testing
  const mockVoyages: any[] = [
    // 1. Inside May 2026 range (Company 1)
    { idVoyage: 1, companyId: 1, statut: 'LIVRE', dateChargement: new Date('2026-05-10') },
    { idVoyage: 2, companyId: 1, statut: 'FACTURE', dateChargement: new Date('2026-05-25') },

    // 2. Outside May 2026 range (Company 1)
    { idVoyage: 3, companyId: 1, statut: 'LIVRE', dateChargement: new Date('2026-04-28') },
    { idVoyage: 4, companyId: 1, statut: 'FACTURE', dateChargement: new Date('2026-06-02') },

    // 3. dateChargement is NULL (Company 1)
    { idVoyage: 5, companyId: 1, statut: 'LIVRE', dateChargement: null },
    { idVoyage: 6, companyId: 1, statut: 'FACTURE', dateChargement: null },

    // 4. Other statuses inside May 2026 (Company 1) - must be excluded by status filter
    { idVoyage: 7, companyId: 1, statut: 'PLANIFIE', dateChargement: new Date('2026-05-15') },
    { idVoyage: 8, companyId: 1, statut: 'EN_COURS', dateChargement: new Date('2026-05-15') },
    { idVoyage: 9, companyId: 1, statut: 'ANNULE', dateChargement: new Date('2026-05-15') },

    // 5. Tenant isolation (Company 2) inside May 2026
    { idVoyage: 10, companyId: 2, statut: 'LIVRE', dateChargement: new Date('2026-05-15') },
    { idVoyage: 11, companyId: 2, statut: 'FACTURE', dateChargement: new Date('2026-05-20') },
  ];

  let lastVoyageWhere: any = null;

  const mockPrisma: any = {
    companySettings: {
      findFirst: createMockFn(async () => ({
        nomEntreprise: 'TRANSiVO Logistics SARL',
        devise: 'MAD',
      })),
    },
    facture: {
      aggregate: createMockFn(async () => ({ _sum: { montantTotal: null } })),
    },
    paiementClient: {
      aggregate: createMockFn(async () => ({ _sum: { montantRecu: null } })),
    },
    paiementFournisseur: {
      aggregate: createMockFn(async () => ({ _sum: { montant: null } })),
    },
    versementEmploye: {
      aggregate: createMockFn(async () => ({ _sum: { montant: null } })),
    },
    depenseAdministrative: {
      aggregate: createMockFn(async () => ({ _sum: { montant: null } })),
    },
    depenseVehicule: {
      aggregate: createMockFn(async () => ({ _sum: { montant: null } })),
    },
    $queryRawUnsafe: createMockFn(async () => []),
    vehicule: {
      count: createMockFn(async () => 5),
    },
    conducteur: {
      count: createMockFn(async () => 4),
    },
    documentVehicule: {
      findMany: createMockFn(async () => []),
    },
    voyage: {
      count: createMockFn(async ({ where }: any) => {
        lastVoyageWhere = where;
        return mockVoyages.filter((v) => {
          if (where.companyId !== undefined && v.companyId !== where.companyId) return false;
          if (where.statut?.in && !where.statut.in.includes(v.statut)) return false;
          if (where.dateChargement) {
            if (!v.dateChargement) return false;
            const vTime = new Date(v.dateChargement).getTime();
            if (where.dateChargement.gte && vTime < new Date(where.dateChargement.gte).getTime()) return false;
            if (where.dateChargement.lte && vTime > new Date(where.dateChargement.lte).getTime()) return false;
          }
          return true;
        }).length;
      }),
    },
  };

  const dashboardService = new DashboardService(mockPrisma as any);

  const fullPermissions = {
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

  // -------------------------------------------------------------------------
  // Test 1: Delivered/invoiced voyage inside the selected range is included
  // -------------------------------------------------------------------------
  itBlock('1. A delivered/invoiced voyage with a loading date inside the selected range is included', async () => {
    const query: QueryDashboardDto = {
      preset: 'PERSONNALISE',
      dateDebut: '2026-05-01',
      dateFin: '2026-05-31',
    };

    const overview = await dashboardService.getOverview(1, query, fullPermissions, true);

    // Voyages 1 (LIVRE, 2026-05-10) and 2 (FACTURE, 2026-05-25) are included => count = 2
    expectVal(overview.operations.tripsCompleted).toBe(2);
    // Verify Prisma query where clause
    expectVal(lastVoyageWhere.companyId).toBe(1);
    expectVal(lastVoyageWhere.statut).toEqual({ in: ['LIVRE', 'FACTURE'] });
    expectVal(lastVoyageWhere.dateChargement !== undefined).toBe(true);
    expectVal(lastVoyageWhere.OR).toBe(undefined);
  });

  // -------------------------------------------------------------------------
  // Test 2: Voyage outside the selected range is excluded
  // -------------------------------------------------------------------------
  itBlock('2. A voyage with a loading date outside the selected range is excluded', async () => {
    // Range only covering mid-May: 2026-05-12 to 2026-05-20
    // Voyage 1 is 2026-05-10 (outside), Voyage 2 is 2026-05-25 (outside)
    const query: QueryDashboardDto = {
      preset: 'PERSONNALISE',
      dateDebut: '2026-05-12',
      dateFin: '2026-05-20',
    };

    const overview = await dashboardService.getOverview(1, query, fullPermissions, true);
    expectVal(overview.operations.tripsCompleted).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 3: Voyage with dateChargement: null does not pollute every date range
  // -------------------------------------------------------------------------
  itBlock('3. A voyage with dateChargement: null does not pollute every date range', async () => {
    // Querying an arbitrary period where no dated voyages exist: July 2026
    const query: QueryDashboardDto = {
      preset: 'PERSONNALISE',
      dateDebut: '2026-07-01',
      dateFin: '2026-07-31',
    };

    const overview = await dashboardService.getOverview(1, query, fullPermissions, true);

    // Voyages 5 and 6 have dateChargement: null, so they MUST NOT appear in July 2026
    expectVal(overview.operations.tripsCompleted).toBe(0);

    // When all period metrics are 0, isPeriodEmpty must be true (not blocked by null dateChargement)
    expectVal(overview.isPeriodEmpty).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 4: Company isolation and existing status filter remain intact
  // -------------------------------------------------------------------------
  itBlock('4. Company isolation and the existing status filter remain intact', async () => {
    // For Company 2 in May 2026: Voyages 10 and 11 (2 voyages)
    const query: QueryDashboardDto = {
      preset: 'PERSONNALISE',
      dateDebut: '2026-05-01',
      dateFin: '2026-05-31',
    };

    const overviewCo2 = await dashboardService.getOverview(2, query, fullPermissions, true);
    expectVal(overviewCo2.operations.tripsCompleted).toBe(2);

    // For Company 1: PLANIFIE (7), EN_COURS (8), ANNULE (9) in May 2026 must be excluded
    const overviewCo1 = await dashboardService.getOverview(1, query, fullPermissions, true);
    expectVal(overviewCo1.operations.tripsCompleted).toBe(2); // Only LIVRE (1) and FACTURE (2)
  });

  // -------------------------------------------------------------------------
  // Test 5: Adjacent dashboard KPI response fields remain unchanged
  // -------------------------------------------------------------------------
  itBlock('5. Adjacent dashboard KPI response fields remain unchanged', async () => {
    const query: QueryDashboardDto = {
      preset: 'PERSONNALISE',
      dateDebut: '2026-05-01',
      dateFin: '2026-05-31',
    };

    const overview = await dashboardService.getOverview(1, query, fullPermissions, true);

    // Period object
    expectVal(overview.period.preset).toBe('PERSONNALISE');
    expectVal(overview.period.dateDebut).toBe('2026-05-01');
    expectVal(overview.period.dateFin).toBe('2026-05-31');

    // Company object
    expectVal(overview.company.name).toBe('TRANSiVO Logistics SARL');
    expectVal(overview.company.currency).toBe('MAD');

    // Operations snapshots
    expectVal(overview.operations.activeVehicles).toBe(5);
    expectVal(overview.operations.activeDrivers).toBe(4);

    // Visibility and metadata
    expectVal(overview.visibility.voyages).toBe(true);
    expectVal(overview.metadata.isPartial).toBe(false);
    expectVal(overview.metadata.excludedSources.length).toBe(0);

    // Financial response structure
    expectVal(overview.financial.totalInvoiced).toBe('0.00');
    expectVal(overview.financial.clientReceipts).toBe('0.00');
  });
});
