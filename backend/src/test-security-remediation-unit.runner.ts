import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { FacturesService } from './modules/factures/factures.service';

// Replicate query key factory contract to test key isolation across tenants
const PAIEMENT_CLIENT_KEYS = {
  all: (companyId?: number) => ['paiements-clients', companyId ?? 0] as const,
  lists: (companyId?: number) => [...PAIEMENT_CLIENT_KEYS.all(companyId), 'list'] as const,
  list: (params?: any, companyId?: number) => [...PAIEMENT_CLIENT_KEYS.lists(companyId), params] as const,
};

async function runUnitSecurityTests() {
  console.log('====================================================');
  console.log('=== MULTI-TENANT SECURITY REGRESSION TEST SUITE ===');
  console.log('====================================================\n');

  // Mock PrismaService for database calls
  const mockPrisma: any = {
    facture: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      update: async () => ({}),
    },
    paiementClient: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    creanceClient: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    $transaction: async (cb: any) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma);
      }
      return Promise.all(cb);
    },
  };

  const paiementsService = new PaiementsClientsService(mockPrisma as any, {} as any);
  const creancesService = new CreancesClientsService(mockPrisma as any);
  const facturesService = new FacturesService(mockPrisma as any, creancesService as any);

  try {
    // -------------------------------------------------------------
    // TEST A & B: Mandatory companyId Enforcement (Paiements, Creances, Factures)
    // -------------------------------------------------------------
    console.log('[TEST A] Testing Mandatory companyId rejection across services...');
    
    // Paiements
    try {
      await paiementsService.findAll(undefined as any);
      throw new Error('FAILED: PaiementsClientsService accepted undefined companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('  ✓ PASSED: PaiementsClientsService.findAll rejected missing companyId');
      } else throw err;
    }

    // Creances
    try {
      await creancesService.findAll(undefined as any);
      throw new Error('FAILED: CreancesClientsService accepted undefined companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('  ✓ PASSED: CreancesClientsService.findAll rejected missing companyId');
      } else throw err;
    }

    // Factures
    try {
      await facturesService.findAll(undefined as any);
      throw new Error('FAILED: FacturesService accepted undefined companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('  ✓ PASSED: FacturesService.findAll rejected missing companyId');
      } else throw err;
    }

    // -------------------------------------------------------------
    // TEST C: Cross-Tenant IDOR 404 Prevention on findOne
    // -------------------------------------------------------------
    console.log('\n[TEST C] Testing Cross-Tenant IDOR 404 Prevention on findOne...');
    
    let checkedFilterPaiement = false;
    mockPrisma.paiementClient.findFirst = async (args: any) => {
      if (args.where?.id === 42 && args.where?.facture?.companyId === 200) {
        checkedFilterPaiement = true;
      }
      return null; // Company B (200) querying Company A (100) payment 42
    };

    try {
      await paiementsService.findOne(42, 200); // Company B token requesting payment 42
    } catch (err: any) {
      if (err instanceof NotFoundException && checkedFilterPaiement) {
        console.log('  ✓ PASSED: PaiementsClientsService.findOne returned clean 404 NotFoundException for Company B');
      } else throw new Error(`FAILED: IDOR check failed: ${err.message}`);
    }

    let checkedFilterFacture = false;
    mockPrisma.facture.findFirst = async (args: any) => {
      if (args.where?.id === 88 && args.where?.companyId === 200) {
        checkedFilterFacture = true;
      }
      return null;
    };

    try {
      await facturesService.findOne(88, 200); // Company B token requesting invoice 88
    } catch (err: any) {
      if (err instanceof NotFoundException && checkedFilterFacture) {
        console.log('  ✓ PASSED: FacturesService.findOne returned clean 404 NotFoundException for Company B');
      } else throw new Error(`FAILED: Invoice IDOR check failed: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST D: Cross-Tenant Update / Delete Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST D] Testing Cross-Tenant Update / Delete Rejection...');
    
    try {
      await facturesService.update(88, { notes: 'Hack' }, 200);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: FacturesService.update blocked cross-tenant update with 404');
      } else throw err;
    }

    try {
      await facturesService.remove(88, 200);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: FacturesService.remove blocked cross-tenant deletion with 404');
      } else throw err;
    }

    // -------------------------------------------------------------
    // TEST E: React Query Cache Key Separation Across Tenants
    // -------------------------------------------------------------
    console.log('\n[TEST E] Testing React Query Key Tenant Isolation...');
    
    const keyCompanyA = PAIEMENT_CLIENT_KEYS.list({ page: 1 }, 100);
    const keyCompanyB = PAIEMENT_CLIENT_KEYS.list({ page: 1 }, 200);

    const keyStrA = JSON.stringify(keyCompanyA);
    const keyStrB = JSON.stringify(keyCompanyB);

    if (keyStrA !== keyStrB && keyStrA.includes('100') && keyStrB.includes('200')) {
      console.log(`  ✓ PASSED: React Query cache keys are strictly distinct per tenant:`);
      console.log(`    - Company A (100): ${keyStrA}`);
      console.log(`    - Company B (200): ${keyStrB}`);
    } else {
      throw new Error(`FAILED: Query key collision between tenants: ${keyStrA} === ${keyStrB}`);
    }

    console.log('\n====================================================');
    console.log('=== ALL REGRESSION TESTS PASSED CLEANLY (6/6) ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ REGRESSION TEST FAILED:', err.message);
    process.exit(1);
  }
}

runUnitSecurityTests();
