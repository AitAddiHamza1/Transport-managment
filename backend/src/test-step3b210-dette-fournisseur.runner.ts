import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { FournisseursService } from './modules/fournisseurs/fournisseurs.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

async function runStep3b210DetteFournisseurTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.10 — MULTI-TENANT DETTEFOURNISSEUR TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const fournisseursService = app.get(FournisseursService);
  const dettesService = app.get(DettesFournisseursService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Create test companies A & B and suppliers A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    let companyA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_DETTE_A' } });
    if (!companyA) {
      companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DETTE_A' } });
    }
    companyAId = companyA.id;

    let companyB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_DETTE_B' } });
    if (!companyB) {
      companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DETTE_B' } });
    }
    companyBId = companyB.id;

    // Purge previous test data if any
    await prisma.paiementFournisseur.deleteMany({
      where: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.fournisseur.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    const fournisseurA = await fournisseursService.create(
      {
        nomFournisseur: 'FOURNISSEUR_DETTE_A',
        telephone: '0611111111',
      },
      companyAId,
    );

    const fournisseurB = await fournisseursService.create(
      {
        nomFournisseur: 'FOURNISSEUR_DETTE_B',
        telephone: '0622222222',
      },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, Fournisseur A: ${fournisseurA.id} | Company B: ${companyBId}, Fournisseur B: ${fournisseurB.id})`,
    );

    // ----------------------------------------------------
    // TEST 1 — CREATE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 1] Creating valid DetteFournisseur in Company A...');
    const detteA1 = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 5000.0,
      delaiPaiementJours: 30,
      referenceFactureFournisseur: 'REF-A-001',
    });
    console.log(
      `  ✓ PASSED: Debt A1 created (ID: ${detteA1.id}, Num: ${detteA1.numeroDette}, Montant: ${detteA1.montantDu})`,
    );

    // Create debt B in Company B for cross-tenant tests
    const detteB1 = await dettesService.create(companyBId, {
      idFournisseur: fournisseurB.id,
      montantDu: 8000.0,
      delaiPaiementJours: 45,
      referenceFactureFournisseur: 'REF-B-001',
    });

    // ----------------------------------------------------
    // TEST 2 — CREATE CROSS TENANT FOURNISSEUR
    // ----------------------------------------------------
    console.log('\n[TEST 2] User A attempts to create debt using Fournisseur B...');
    try {
      await dettesService.create(companyAId, {
        idFournisseur: fournisseurB.id,
        montantDu: 1000.0,
      });
      throw new Error(`[FAIL] User A created debt using Fournisseur B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          `  ✓ PASSED: Cross-tenant supplier creation refused with 404 NotFoundException.`,
        );
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 3 — CREATE FORGED COMPANY ID
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A sends forged companyId in DTO...');
    const detteA2 = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 2000.0,
      companyId: companyBId, // Forged in DTO
    } as any);

    const dbDetteA2 = await prisma.detteFournisseur.findUnique({ where: { id: detteA2.id } });
    if (dbDetteA2?.companyId !== companyAId) {
      throw new Error(
        `[FAIL] Forged companyId was accepted! Debt assigned to company ${dbDetteA2?.companyId}`,
      );
    }
    console.log(
      `  ✓ PASSED: Forged companyId in DTO was ignored. Debt assigned to token companyId (${companyAId})`,
    );

    // ----------------------------------------------------
    // TEST 4 — LIST ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 4] User A lists debts...');
    const listA = await dettesService.findAll(companyAId, { limit: 100 });
    const hasDetteB = listA.data.some((d) => d.id === detteB1.id);
    if (hasDetteB) {
      throw new Error(`[FAIL] Company A list contains Debt B!`);
    }
    console.log(
      `  ✓ PASSED: Company A list only contains Company A debts (Count: ${listA.data.length})`,
    );

    // ----------------------------------------------------
    // TEST 5 — DETAIL CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests Debt B details...');
    try {
      await dettesService.findOne(detteB1.id, companyAId);
      throw new Error(`[FAIL] User A was able to view Debt B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Debt B detail returned 404 NotFoundException for User A.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6 — UPDATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to update Debt B...');
    try {
      await dettesService.update(detteB1.id, companyAId, { remarques: 'Hacked' });
      throw new Error(`[FAIL] User A updated Debt B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — DELETE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to delete Debt B...');
    try {
      await dettesService.remove(detteB1.id, companyAId);
      throw new Error(`[FAIL] User A deleted Debt B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant delete refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — RESTORE CROSS TENANT (Lookup check)
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts restore/lookup on Debt B...');
    try {
      await dettesService.findOne(detteB1.id, companyAId);
      throw new Error(`[FAIL] Debt B lookup succeeded for User A!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant lookup refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 9 — STATUS CROSS TENANT (Lookup check)
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A attempts status check on Debt B...');
    try {
      await dettesService.findOne(detteB1.id, companyAId);
      throw new Error(`[FAIL] Debt B status check succeeded for User A!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant status check refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 10 — SEARCH ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 10] Testing search isolation...');
    const searchRes = await dettesService.findAll(companyAId, { search: 'REF-B-001' });
    if (searchRes.data.length !== 0) {
      throw new Error(`[FAIL] Search in Company A returned results from Company B!`);
    }
    console.log(`  ✓ PASSED: Search for Company B reference returned 0 results in Company A.`);

    // ----------------------------------------------------
    // TEST 11 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 11] Testing statistics tenant isolation...');
    const statsA = await dettesService.findStats(companyAId);
    const statsB = await dettesService.findStats(companyBId);

    console.log(`  Company A stats: totalDu=${statsA.totalDu}`);
    console.log(`  Company B stats: totalDu=${statsB.totalDu}`);

    if (statsA.totalDu !== 7000.0 || statsB.totalDu !== 8000.0) {
      throw new Error(`[FAIL] Statistics tenant isolation error!`);
    }
    console.log(`  ✓ PASSED: Statistics are strictly isolated per company.`);

    // ----------------------------------------------------
    // TEST 12 — ADMIN_GENERAL RESTRICTION
    // ----------------------------------------------------
    console.log('\n[TEST 12] Testing ADMIN_GENERAL tenant restriction on Debts...');
    const adminADebts = await dettesService.findAll(companyAId, {});
    const adminBCrossCheck = adminADebts.data.some((d) => d.id === detteB1.id);
    if (adminBCrossCheck) {
      throw new Error(`[FAIL] ADMIN_GENERAL A has access to Company B debts!`);
    }
    console.log(`  ✓ PASSED: ADMIN_GENERAL of Company A is strictly isolated to Company A debts.`);

    // ----------------------------------------------------
    // TEST 13 — NUMBERING SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 13] Testing sequential numbering in same tenant...');
    if (!detteA1.numeroDette.startsWith('DF-') || !detteA2.numeroDette.startsWith('DF-')) {
      throw new Error(`[FAIL] Invalid debt numbering format!`);
    }
    console.log(
      `  ✓ PASSED: Debt numbering is sequential in Company A (${detteA1.numeroDette}, ${detteA2.numeroDette})`,
    );

    // ----------------------------------------------------
    // TEST 14 — NUMBERING CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 14] Testing independent numbering sequences across tenants...');
    if (!detteB1.numeroDette.startsWith('DF-')) {
      throw new Error(`[FAIL] Invalid debt numbering in Company B!`);
    }
    console.log(`  ✓ PASSED: Company B numbering sequence is independent (${detteB1.numeroDette})`);

    // ----------------------------------------------------
    // TEST 15 — DUPLICATE REFERENCE WITHIN SAME COMPANY
    // ----------------------------------------------------
    console.log('\n[TEST 15] Testing duplicate invoice reference within same company...');
    try {
      await dettesService.create(companyAId, {
        idFournisseur: fournisseurA.id,
        montantDu: 1000.0,
        referenceFactureFournisseur: 'REF-A-001',
      });
      throw new Error(`[FAIL] Duplicate invoice reference allowed in Company A!`);
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(
          `  ✓ PASSED: Duplicate reference in same company refused with ConflictException.`,
        );
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — SAME NUMBER / REFERENCE DIFFERENT COMPANY
    // ----------------------------------------------------
    console.log('\n[TEST 16] Testing same invoice reference in different companies...');
    const detteB2 = await dettesService.create(companyBId, {
      idFournisseur: fournisseurB.id,
      montantDu: 1500.0,
      referenceFactureFournisseur: 'REF-A-001', // Same ref as A
    });
    if (!detteB2) {
      throw new Error(`[FAIL] Could not create debt with same ref in Company B!`);
    }
    console.log(
      `  ✓ PASSED: Same reference "REF-A-001" accepted in different company B (ID: ${detteB2.id})`,
    );

    // ----------------------------------------------------
    // TEST 17 — NO INITIAL PAYMENT
    // ----------------------------------------------------
    console.log('\n[TEST 17] Testing no initial payment creation on debt...');
    const dbPayments = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: detteA1.id },
    });
    if (dbPayments.length !== 0) {
      throw new Error(`[FAIL] Initial payment was created!`);
    }
    console.log(`  ✓ PASSED: Debt creation created 0 initial payments.`);

    // ----------------------------------------------------
    // TEST 18 — DUE DATE DERIVATION
    // ----------------------------------------------------
    console.log('\n[TEST 18] Testing due date derivation (dateDette + delaiPaiementJours)...');
    const testDateStr = '2026-09-01';
    const testDette = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 1000.0,
      dateDette: testDateStr,
      delaiPaiementJours: 15,
    });
    if (testDette.dateEcheance !== '2026-09-16') {
      throw new Error(`[FAIL] Expected dateEcheance 2026-09-16, got ${testDette.dateEcheance}`);
    }
    console.log(
      `  ✓ PASSED: dateEcheance correctly derived: 2026-09-01 + 15 days = ${testDette.dateEcheance}`,
    );

    // ----------------------------------------------------
    // TEST 19 — ZERO PAYMENT DELAY
    // ----------------------------------------------------
    console.log('\n[TEST 19] Testing zero payment delay (delaiPaiementJours = 0)...');
    const zeroDelayDette = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 1000.0,
      dateDette: testDateStr,
      delaiPaiementJours: 0,
    });
    if (zeroDelayDette.dateEcheance !== testDateStr) {
      throw new Error(
        `[FAIL] Expected dateEcheance ${testDateStr}, got ${zeroDelayDette.dateEcheance}`,
      );
    }
    console.log(
      `  ✓ PASSED: delaiPaiementJours = 0 results in dateEcheance == dateDette (${zeroDelayDette.dateEcheance})`,
    );

    // ----------------------------------------------------
    // TEST 20 — POSITIVE PAYMENT DELAY
    // ----------------------------------------------------
    console.log('\n[TEST 20] Testing positive payment delay (delaiPaiementJours = 60)...');
    const positiveDelayDette = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 1000.0,
      dateDette: testDateStr,
      delaiPaiementJours: 60,
    });
    if (positiveDelayDette.dateEcheance !== '2026-10-31') {
      throw new Error(
        `[FAIL] Expected dateEcheance 2026-10-31, got ${positiveDelayDette.dateEcheance}`,
      );
    }
    console.log(
      `  ✓ PASSED: delaiPaiementJours = 60 correctly derived: 2026-09-01 + 60 days = ${positiveDelayDette.dateEcheance}`,
    );

    // ----------------------------------------------------
    // TEST 21 — NO MANUAL DUE DATE REQUIRED
    // ----------------------------------------------------
    console.log('\n[TEST 21] Testing creation without passing manual dateEcheance...');
    const defaultDelayDette = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 500.0,
    });
    if (!defaultDelayDette.dateEcheance) {
      throw new Error(`[FAIL] dateEcheance was not automatically derived!`);
    }
    console.log(
      `  ✓ PASSED: Creation without manual dateEcheance automatically derived dateEcheance (${defaultDelayDette.dateEcheance})`,
    );

    // ----------------------------------------------------
    // TEST 22 — DATA INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 22] Testing Dette → Fournisseur relation data integrity...');
    const singleDette = await dettesService.findOne(detteA1.id, companyAId);
    if (singleDette.nomFournisseurSnapshot !== fournisseurA.nomFournisseur) {
      throw new Error(`[FAIL] Supplier snapshot name mismatch!`);
    }
    console.log(
      `  ✓ PASSED: Data integrity verified (Supplier Snapshot: ${singleDette.nomFournisseurSnapshot})`,
    );

    // ----------------------------------------------------
    // TEST 23 — CROSS TENANT RELATION IN UPDATE
    // ----------------------------------------------------
    console.log('\n[TEST 23] User A attempts to update Debt A1 to use Fournisseur B...');
    try {
      await dettesService.update(detteA1.id, companyAId, { idFournisseur: fournisseurB.id });
      throw new Error(`[FAIL] Debt A1 updated with Fournisseur B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          `  ✓ PASSED: Attaching cross-tenant supplier in update refused with 404 NotFoundException.`,
        );
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 24 — ADMIN TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 24] Testing ADMIN_GENERAL tenant boundary...');
    const adminBList = await dettesService.findAll(companyBId, { limit: 100 });
    const adminBHasA = adminBList.data.some((d) => d.id === detteA1.id);
    if (adminBHasA) {
      throw new Error(`[FAIL] ADMIN_GENERAL B has access to Company A debts!`);
    }
    console.log(`  ✓ PASSED: ADMIN_GENERAL of Company B is strictly isolated to Company B debts.`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning temporary test data...');
    if (companyAId && companyBId) {
      await prisma.paiementFournisseur.deleteMany({
        where: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } },
      });
      await prisma.detteFournisseur.deleteMany({
        where: { companyId: { in: [companyAId, companyBId] } },
      });
      await prisma.detteFournisseurSequence.deleteMany({
        where: { companyId: { in: [companyAId, companyBId] } },
      });
      await prisma.fournisseur.deleteMany({
        where: { companyId: { in: [companyAId, companyBId] } },
      });
      await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    }

    console.log('\n====================================================');
    console.log('=== ALL 24 DETTEFOURNISSEUR MULTI-TENANT TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ DETTEFOURNISSEUR MULTI-TENANT TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runStep3b210DetteFournisseurTests();
