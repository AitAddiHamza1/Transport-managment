import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { FacturesService } from './modules/factures/factures.service';
import { PrismaService } from './prisma/prisma.service';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * TRANSiVO — Phase 4.8: Targeted Hardening Runner
 * 
 * Tests the remediation of the two latent architectural risks:
 * 1. RISK-LATENT-DF-01: DettesFournisseursService.create()
 *    - Strict non-polymorphic signature: create(companyId: number, dto, currentUserId?)
 *    - Rejects invalid companyId (undefined, null, 0, negative, NaN, float, string) with UnauthorizedException
 *    - Ensures ZERO Prisma calls are performed before rejecting an invalid companyId (fail-closed)
 *    - Rejects cross-tenant supplier with NotFoundException
 *    - Rejects old polymorphic call create(dto) with UnauthorizedException
 *    - Legitimate creation strictly bounds companyId to tenant
 * 
 * 2. RISK-LATENT-FAC-01: FacturesService.createInvoiceInTx()
 *    - Mandatory companyId: number in params
 *    - Rejects invalid companyId with UnauthorizedException
 *    - Ensures ZERO Prisma calls before rejecting an invalid companyId
 *    - Rejects cross-tenant voyage with NotFoundException / ForbiddenException
 *    - Fallback eliminated: never adopts foreign voyage.companyId
 *    - Legitimate creation enforces targetCompanyId = companyId
 *    - FacturesService.create() requires companyId
 */

async function runPhase48HardeningTests() {
  console.log('================================================================');
  console.log('=== TRANSiVO — PHASE 4.8 LATENT RISKS HARDENING TEST SUITE    ===');
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

  // Track Prisma query counts to verify fail-closed behavior before any DB access
  let prismaQueryCount = 0;

  const mockDb = {
    fournisseurs: [
      { id: 10, companyId: 101, nomFournisseur: 'Fournisseur Tenant A' },
      { id: 20, companyId: 202, nomFournisseur: 'Fournisseur Tenant B' },
    ],
    dettes: [] as any[],
    voyages: [
      {
        idVoyage: 1001,
        companyId: 101,
        nomClient: 'Client Tenant A',
        montantVoyage: new Prisma.Decimal('5000.00'),
        devise: 'MAD',
      },
      {
        idVoyage: 2002,
        companyId: 202, // Foreign company
        nomClient: 'Client Tenant B',
        montantVoyage: new Prisma.Decimal('9000.00'),
        devise: 'MAD',
      },
      {
        idVoyage: 3003,
        companyId: 101,
        nomClient: null, // No client name
        montantVoyage: new Prisma.Decimal('3000.00'),
        devise: 'MAD',
      },
    ],
    companySettings: [
      { companyId: 101, tauxTvaParDefaut: new Prisma.Decimal(20.0), delaiPaiementParDefaut: 30 },
      { companyId: 202, tauxTvaParDefaut: new Prisma.Decimal(20.0), delaiPaiementParDefaut: 30 },
    ],
    factures: [] as any[],
    fraisImmobilisation: [] as any[],
  };

  const mockPrisma: any = {
    fournisseur: {
      findFirst: async ({ where }: any) => {
        prismaQueryCount++;
        return (
          mockDb.fournisseurs.find((f) => {
            if (where.id !== undefined && f.id !== where.id) return false;
            if (where.companyId !== undefined && f.companyId !== where.companyId) return false;
            return true;
          }) || null
        );
      },
    },
    detteFournisseur: {
      findFirst: async ({ where }: any) => {
        prismaQueryCount++;
        return (
          mockDb.dettes.find((d) => {
            if (where.id !== undefined && d.id !== where.id) return false;
            if (where.companyId !== undefined && d.companyId !== where.companyId) return false;
            if (where.supprimeLe === null && d.supprimeLe !== null) return false;
            if (where.referenceFactureFournisseur && d.referenceFactureFournisseur !== where.referenceFactureFournisseur) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        prismaQueryCount++;
        const created = { id: mockDb.dettes.length + 1, ...data, supprimeLe: null, paiements: [] };
        mockDb.dettes.push(created);
        return created;
      },
    },
    voyage: {
      findFirst: async ({ where }: any) => {
        prismaQueryCount++;
        return (
          mockDb.voyages.find((v) => {
            if (where.idVoyage !== undefined && v.idVoyage !== where.idVoyage) return false;
            if (where.companyId !== undefined && v.companyId !== where.companyId) return false;
            return true;
          }) || null
        );
      },
      update: async ({ where, data }: any) => {
        prismaQueryCount++;
        const v = mockDb.voyages.find((voy) => voy.idVoyage === where.idVoyage);
        if (v) Object.assign(v, data);
        return v;
      },
    },
    companySettings: {
      findFirst: async ({ where }: any) => {
        prismaQueryCount++;
        return mockDb.companySettings.find((cs) => cs.companyId === where.companyId) || null;
      },
    },
    fraisImmobilisation: {
      findUnique: async ({ where }: any) => {
        prismaQueryCount++;
        return mockDb.fraisImmobilisation.find((fi) => fi.idVoyage === where.idVoyage) || null;
      },
    },
    facture: {
      findFirst: async ({ where }: any) => {
        prismaQueryCount++;
        return mockDb.factures.find((f) => f.id === where.id && (where.companyId === undefined || f.companyId === where.companyId)) || null;
      },
      findMany: async ({ where }: any) => {
        prismaQueryCount++;
        return mockDb.factures.filter((f) => {
          if (where.idVoyage !== undefined && f.idVoyage !== where.idVoyage) return false;
          if (where.companyId !== undefined && f.companyId !== where.companyId) return false;
          if (where.supprimeLe === null && f.supprimeLe !== null) return false;
          return true;
        });
      },
      create: async ({ data }: any) => {
        prismaQueryCount++;
        const created = { id: mockDb.factures.length + 1, ...data, paiements: [] };
        mockDb.factures.push(created);
        return created;
      },
      findUnique: async ({ where }: any) => {
        prismaQueryCount++;
        const f = mockDb.factures.find((fac) => fac.id === where.id);
        if (!f) return null;
        return {
          ...f,
          voyage: mockDb.voyages.find((v) => v.idVoyage === f.idVoyage) || null,
          creance: null,
          paiements: [],
        };
      },
    },
    creanceClient: {
      findUnique: async () => {
        prismaQueryCount++;
        return null;
      },
    },
    $transaction: async (cb: any) => cb(mockPrisma),
    $queryRaw: async () => {
      prismaQueryCount++;
      return [{ dernier_numero: 1 }];
    },
  };

  const dfService = new DettesFournisseursService(mockPrisma as PrismaService);
  const facturesService = new FacturesService(
    mockPrisma as PrismaService,
    {
      createFromInvoice: async () => {},
    } as any,
  );

  // ==========================================================================
  // PART 1: RISK-LATENT-DF-01 HARDENING (DettesFournisseursService.create)
  // ==========================================================================
  console.log('[SECTION 1] Testing DettesFournisseursService.create() Hardening...');

  const invalidCompanyIds = [undefined, null, 0, -1, -50, NaN, 3.14, '101' as any];

  // 1.1 Invalid companyId fails-closed before DB access
  for (const inv of invalidCompanyIds) {
    prismaQueryCount = 0;
    try {
      await dfService.create(inv as any, {
        idFournisseur: 10,
        montantDu: 1000,
      });
      assert(false, `Should have rejected companyId: ${inv}`);
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
        `create() rejected invalid companyId (${inv}) with UnauthorizedException`,
      );
      assert(prismaQueryCount === 0, `ZERO Prisma queries made when companyId is ${inv}`);
    }
  }

  // 1.2 Old polymorphic call create(dto) rejected at runtime
  prismaQueryCount = 0;
  try {
    await (dfService as any).create({
      idFournisseur: 10,
      montantDu: 1000,
    });
    assert(false, 'Old signature create(dto) should have failed at runtime');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException,
      'Old polymorphic call create(dto) blocked at runtime with UnauthorizedException',
    );
    assert(prismaQueryCount === 0, 'ZERO Prisma queries made for old polymorphic call');
  }

  // 1.3 Rejection of cross-tenant supplier
  prismaQueryCount = 0;
  try {
    // Supplier 20 belongs to Company 202, caller is Company 101
    await dfService.create(101, {
      idFournisseur: 20,
      montantDu: 1500,
    });
    assert(false, 'Should have rejected cross-tenant supplier');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant supplier rejected with NotFoundException');
    assert(err.message.includes('introuvable'), 'Error message is generic not found');
  }

  // 1.4 Legitimate debt creation for own tenant
  const createdDebtA = await dfService.create(101, {
    idFournisseur: 10,
    montantDu: 4500,
    referenceFactureFournisseur: 'REF-DF-TEST-A1',
  });
  assert(createdDebtA.montantDu === 4500, 'Legitimate debt created with montantDu 4500');
  const storedDebt = mockDb.dettes.find((d) => d.id === createdDebtA.id);
  assert(storedDebt?.companyId === 101, 'Stored debt companyId is strictly 101');
  assert(storedDebt?.nomFournisseurSnapshot === 'Fournisseur Tenant A', 'Supplier snapshot matches Tenant A');

  // ==========================================================================
  // PART 2: RISK-LATENT-FAC-01 HARDENING (FacturesService.createInvoiceInTx)
  // ==========================================================================
  console.log('\n[SECTION 2] Testing FacturesService.createInvoiceInTx() Hardening...');

  // 2.1 createInvoiceInTx rejects invalid companyId before DB access
  for (const inv of invalidCompanyIds) {
    prismaQueryCount = 0;
    try {
      await facturesService.createInvoiceInTx(mockPrisma, {
        idVoyage: 1001,
        companyId: inv as any,
      });
      assert(false, `createInvoiceInTx should have rejected companyId: ${inv}`);
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise valide requis'),
        `createInvoiceInTx rejected invalid companyId (${inv}) with UnauthorizedException`,
      );
      assert(prismaQueryCount === 0, `ZERO Prisma queries made for createInvoiceInTx when companyId is ${inv}`);
    }
  }

  // 2.2 Rejection of cross-tenant voyage (Voyage 2002 belongs to Company 202; requested with Company 101)
  try {
    await facturesService.createInvoiceInTx(mockPrisma, {
      idVoyage: 2002,
      companyId: 101,
    });
    assert(false, 'createInvoiceInTx should reject cross-tenant voyage');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException || err instanceof ForbiddenException,
      'Cross-tenant voyage rejected with NotFoundException / ForbiddenException',
    );
  }

  // 2.3 Verify fallback removal: cannot adopt foreign voyage.companyId
  try {
    await facturesService.createInvoiceInTx(mockPrisma, {
      idVoyage: 2002,
      companyId: 0 as any,
    });
    assert(false, 'createInvoiceInTx with companyId=0 should never fall back to voyage.companyId');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException,
      'companyId=0 strictly rejected with UnauthorizedException without fallback',
    );
  }

  // 2.4 Legitimate invoice creation in transaction
  const invoiceA = await facturesService.createInvoiceInTx(mockPrisma, {
    idVoyage: 1001,
    companyId: 101,
  });
  assert(Number(invoiceA.sousTotal) === 5000, 'Invoice A created with sousTotal 5000');
  const storedFacture = mockDb.factures.find((f) => f.id === invoiceA.id);
  assert(storedFacture?.companyId === 101, 'Stored facture companyId is strictly 101');

  // 2.5 FacturesService.create() caller validation
  console.log('\n[SECTION 3] Testing FacturesService.create() Caller Validation...');
  try {
    await (facturesService as any).create({ idVoyage: 1001 });
    assert(false, 'create() without companyId should throw UnauthorizedException');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
      'create() without companyId cleanly rejected with UnauthorizedException',
    );
  }

  try {
    await facturesService.create({ idVoyage: 1001 }, 0);
    assert(false, 'create() with companyId=0 should throw UnauthorizedException');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
      'create() with companyId=0 cleanly rejected with UnauthorizedException',
    );
  }

  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests}/${totalTests} PHASE 4.8 HARDENING TESTS PASSED!       ===`);
  console.log('================================================================');
}

runPhase48HardeningTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
