import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PrismaService } from './prisma/prisma.service';
import { NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * TRANSiVO — Targeted Regression Runner for SUSP-DF-01 Hardening
 * 
 * Tests the 9 mandatory requirements:
 * 1. findOne(id, companyId) authorized for same tenant.
 * 2. findOne(id, autreCompanyId) throws NotFoundException.
 * 3. update(id, companyId, dto) authorized for owner tenant.
 * 4. update(id, autreCompanyId, dto) throws NotFoundException, no mutation.
 * 5. remove(id, autreCompanyId) throws NotFoundException, no deletion.
 * 6. companyId absent or invalid (undefined, 0, negative, non-integer): fails explicitly with UnauthorizedException.
 * 7. Old permissive polymorphic call (e.g. update(id, dto)) blocked at runtime with UnauthorizedException.
 * 8. Final mutation conditions in updateMany() strictly enforce companyId and supprimeLe: null.
 * 9. Business invariants (financial immutability on debt with payments, deletion prevention) preserved.
 */

async function runSuspDf01HardeningTests() {
  console.log('================================================================');
  console.log('=== SUSP-DF-01 HARDENING TARGETED REGRESSION TEST SUITE      ===');
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

  // Simulated in-memory database
  const mockDb = {
    dettes: [
      {
        id: 1,
        companyId: 101,
        numeroDette: 'DET-101-001',
        referenceFactureFournisseur: 'FAC-A-100',
        idFournisseur: 10,
        nomFournisseurSnapshot: 'Fournisseur A',
        categorie: 'TRANSPORT',
        dateDette: new Date('2026-05-01'),
        delaiPaiementJours: 30,
        dateEcheance: new Date('2026-05-31'),
        montantDu: new Prisma.Decimal('5000.00'),
        remarques: 'Dette initiale A',
        creeParId: 1,
        creeLe: new Date(),
        misAJourLe: new Date(),
        supprimeLe: null,
        paiements: [],
      },
      {
        id: 2,
        companyId: 101,
        numeroDette: 'DET-101-002',
        referenceFactureFournisseur: 'FAC-A-200',
        idFournisseur: 10,
        nomFournisseurSnapshot: 'Fournisseur A',
        categorie: 'ENTRETIEN',
        dateDette: new Date('2026-05-02'),
        delaiPaiementJours: 30,
        dateEcheance: new Date('2026-06-01'),
        montantDu: new Prisma.Decimal('3000.00'),
        remarques: 'Dette avec paiement A',
        creeParId: 1,
        creeLe: new Date(),
        misAJourLe: new Date(),
        supprimeLe: null,
        paiements: [
          {
            id: 101,
            numeroPaiement: 'PF-101-01',
            idDetteFournisseur: 2,
            montant: new Prisma.Decimal('1000.00'),
            datePaiement: new Date('2026-05-10'),
            modePaiement: 'VIREMENT',
            estAnnule: false,
          },
        ],
      },
      {
        id: 3,
        companyId: 202, // Foreign company
        numeroDette: 'DET-202-001',
        referenceFactureFournisseur: 'FAC-B-100',
        idFournisseur: 20,
        nomFournisseurSnapshot: 'Fournisseur B',
        categorie: 'CARBURANT',
        dateDette: new Date('2026-05-03'),
        delaiPaiementJours: 30,
        dateEcheance: new Date('2026-06-02'),
        montantDu: new Prisma.Decimal('7500.00'),
        remarques: 'Dette Entreprise B',
        creeParId: 2,
        creeLe: new Date(),
        misAJourLe: new Date(),
        supprimeLe: null,
        paiements: [],
      },
    ],
    fournisseurs: [
      { id: 10, companyId: 101, nomFournisseur: 'Fournisseur A' },
      { id: 20, companyId: 202, nomFournisseur: 'Fournisseur B' },
    ],
  };

  let lastUpdateManyArgs: any = null;

  const mockPrisma: any = {
    detteFournisseur: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.dettes.find((d) => {
            if (where.id !== undefined && d.id !== where.id) return false;
            if (where.companyId !== undefined && d.companyId !== where.companyId) return false;
            if (where.supprimeLe === null && d.supprimeLe !== null) return false;
            if (where.referenceFactureFournisseur && d.referenceFactureFournisseur !== where.referenceFactureFournisseur) return false;
            if (where.NOT?.id && d.id === where.NOT.id) return false;
            return true;
          }) || null
        );
      },
      updateMany: async (args: any) => {
        lastUpdateManyArgs = args;
        const matches = mockDb.dettes.filter((d) => {
          if (args.where.id !== undefined && d.id !== args.where.id) return false;
          if (args.where.companyId !== undefined && d.companyId !== args.where.companyId) return false;
          if (args.where.supprimeLe === null && d.supprimeLe !== null) return false;
          return true;
        });
        for (const m of matches) {
          Object.assign(m, args.data);
          m.misAJourLe = new Date();
        }
        return { count: matches.length };
      },
    },
    fournisseur: {
      findFirst: async ({ where }: any) => {
        return (
          mockDb.fournisseurs.find((f) => {
            if (where.id !== undefined && f.id !== where.id) return false;
            if (where.companyId !== undefined && f.companyId !== where.companyId) return false;
            return true;
          }) || null
        );
      },
    },
  };

  const service = new DettesFournisseursService(mockPrisma as PrismaService);

  // --------------------------------------------------------------------------
  // TEST 1: findOne(id, companyId) authorized for same tenant
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Testing findOne(id, companyId) authorized for same tenant...');
  const debt1 = await service.findOne(1, 101);
  assert(debt1.id === 1, 'Debt 1 successfully returned for owner tenant 101');
  assert(debt1.numeroDette === 'DET-101-001', 'Debt number matches');

  // --------------------------------------------------------------------------
  // TEST 2: findOne(id, autreCompanyId) throws NotFoundException
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing findOne(id, autreCompanyId) rejects cross-tenant access...');
  try {
    await service.findOne(1, 202);
    assert(false, 'Should have thrown NotFoundException');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant findOne correctly rejected with NotFoundException');
    assert(err.message.includes('introuvable'), 'Error message is generic not found');
  }

  // --------------------------------------------------------------------------
  // TEST 3: update(id, companyId, dto) authorized for owner tenant
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing update(id, companyId, dto) authorized for owner tenant...');
  const updated1 = await service.update(1, 101, { remarques: 'Remarque mise a jour' });
  assert(updated1.remarques === 'Remarque mise a jour', 'Debt 1 updated with new remarques');
  assert(lastUpdateManyArgs.where.companyId === 101, 'updateMany() WHERE clause includes companyId: 101');
  assert(lastUpdateManyArgs.where.supprimeLe === null, 'updateMany() WHERE clause includes supprimeLe: null');

  // --------------------------------------------------------------------------
  // TEST 4: update(id, autreCompanyId, dto) does not modify foreign debt
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing update(id, autreCompanyId, dto) rejects cross-tenant modification...');
  const originalDebt3 = { ...mockDb.dettes.find((d) => d.id === 3)! };
  try {
    await service.update(3, 101, { remarques: 'HACKED_BY_COMPANY_A' });
    assert(false, 'Should have thrown NotFoundException');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant update correctly rejected with NotFoundException');
    const currentDebt3 = mockDb.dettes.find((d) => d.id === 3)!;
    assert(currentDebt3.remarques === originalDebt3.remarques, 'Foreign debt remarques remain untouched');
  }

  // --------------------------------------------------------------------------
  // TEST 5: remove(id, autreCompanyId) does not delete foreign debt
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing remove(id, autreCompanyId) rejects cross-tenant deletion...');
  try {
    await service.remove(3, 101);
    assert(false, 'Should have thrown NotFoundException');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant remove correctly rejected with NotFoundException');
    const debt3After = mockDb.dettes.find((d) => d.id === 3)!;
    assert(debt3After.supprimeLe === null, 'Foreign debt 3 supprimeLe remains null (not deleted)');
  }

  // --------------------------------------------------------------------------
  // TEST 6: companyId absent or invalid throws UnauthorizedException
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing companyId runtime validation (fail-closed)...');

  const invalidCompanyIds = [undefined, null, 0, -1, -99, NaN, 3.14, '101' as any];

  for (const invalidId of invalidCompanyIds) {
    // findOne
    try {
      await service.findOne(1, invalidId as any);
      assert(false, `findOne should have rejected companyId: ${invalidId}`);
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
        `findOne cleanly rejected companyId=${invalidId} with UnauthorizedException`,
      );
    }

    // update
    try {
      await service.update(1, invalidId as any, { remarques: 'fail' });
      assert(false, `update should have rejected companyId: ${invalidId}`);
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
        `update cleanly rejected companyId=${invalidId} with UnauthorizedException`,
      );
    }

    // remove
    try {
      await service.remove(1, invalidId as any);
      assert(false, `remove should have rejected companyId: ${invalidId}`);
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Identifiant entreprise requis'),
        `remove cleanly rejected companyId=${invalidId} with UnauthorizedException`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7: Old permissive signature (update(id, dto)) blocked at runtime
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Testing that old signature update(id, dto) is rejected at runtime...');
  try {
    await (service as any).update(1, { remarques: 'old signature attempt' });
    assert(false, 'Old signature update(id, dto) should have failed at runtime');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException,
      'Old polymorphic call blocked at runtime with UnauthorizedException',
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: Mutation conditions in updateMany() strictly enforce tenant filter
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Verifying updateMany() mutation includes companyId and supprimeLe: null...');
  await service.remove(1, 101);
  assert(lastUpdateManyArgs.where.id === 1, 'remove() updateMany where.id is 1');
  assert(lastUpdateManyArgs.where.companyId === 101, 'remove() updateMany where.companyId is 101');
  assert(lastUpdateManyArgs.where.supprimeLe === null, 'remove() updateMany where.supprimeLe is null');
  assert(lastUpdateManyArgs.data.supprimeLe instanceof Date, 'remove() sets supprimeLe to Date');

  // --------------------------------------------------------------------------
  // TEST 9: Existing business invariants preserved
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Verifying immutability invariants on debts with payments...');

  // 9.1 Cannot modify financial fields of debt 2 (which has payments)
  try {
    await service.update(2, 101, { montantDu: 9999.0 });
    assert(false, 'Should reject modifying montantDu on debt with payments');
  } catch (err: any) {
    assert(err instanceof ConflictException, 'Financial mutation correctly rejected with ConflictException');
  }

  // 9.2 Cannot delete debt 2 (which has payments)
  try {
    await service.remove(2, 101);
    assert(false, 'Should reject deleting debt with payments');
  } catch (err: any) {
    assert(err instanceof ConflictException, 'Deletion of debt with payments rejected with ConflictException');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!             ===`);
  console.log('================================================================');
}

runSuspDf01HardeningTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  });
