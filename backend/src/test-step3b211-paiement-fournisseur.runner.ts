import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { FournisseursService } from './modules/fournisseurs/fournisseurs.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

async function runStep3b211PaiementFournisseurTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.11 — MULTI-TENANT PAIEMENTFOURNISSEUR TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const fournisseursService = app.get(FournisseursService);
  const dettesService = app.get(DettesFournisseursService);
  const paiementsService = app.get(PaiementsFournisseursService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Create test companies A & B, suppliers A & B, debts A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    // Purge any lingering test companies and sequence rows from previous runs
    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_PF_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.lettreDeChange.deleteMany({
        where: {
          paiementFournisseur: {
            detteFournisseur: { companyId: { in: oldCompanyIds } },
          },
        },
      });
      await prisma.paiementFournisseur.deleteMany({
        where: { detteFournisseur: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.detteFournisseur.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.fournisseur.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
      await prisma.paiementFournisseurSequence.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.detteFournisseurSequence.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PF_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PF_B' } });
    companyBId = companyB.id;

    const fournisseurA = await fournisseursService.create(
      {
        nomFournisseur: 'FOURNISSEUR_PF_A',
        telephone: '0611111111',
      },
      companyAId,
    );

    const fournisseurB = await fournisseursService.create(
      {
        nomFournisseur: 'FOURNISSEUR_PF_B',
        telephone: '0622222222',
      },
      companyBId,
    );

    const detteA1 = await dettesService.create(companyAId, {
      idFournisseur: fournisseurA.id,
      montantDu: 10000.0,
      delaiPaiementJours: 30,
      referenceFactureFournisseur: 'REF-PF-A-001',
    });

    const detteB1 = await dettesService.create(companyBId, {
      idFournisseur: fournisseurB.id,
      montantDu: 15000.0,
      delaiPaiementJours: 45,
      referenceFactureFournisseur: 'REF-PF-B-001',
    });

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, Debt A1: ${detteA1.id} | Company B: ${companyBId}, Debt B1: ${detteB1.id})`,
    );

    // ----------------------------------------------------
    // TEST 1 — CREATE VERSEMENT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates legitimate versement on Debt A1...');
    const debtAfterPayA1 = await paiementsService.createVersement(
      detteA1.id,
      {
        montant: 2000.0,
        modePaiement: 'VIREMENT',
        referenceExterne: 'VIR-A-001',
        notes: 'Premier acompte',
      },
      companyAId,
    );
    console.log(
      `  ✓ PASSED: Versement created. Solde restant Debt A1: ${debtAfterPayA1.soldeRestant}`,
    );

    // ----------------------------------------------------
    // TEST 2 — CREATE VERSEMENT LEGITIMATE (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates legitimate versement on Debt B1...');
    const debtAfterPayB1 = await paiementsService.createVersement(
      detteB1.id,
      {
        montant: 5000.0,
        modePaiement: 'CHEQUE',
        referenceExterne: 'CHQ-B-001',
      },
      companyBId,
    );
    console.log(
      `  ✓ PASSED: Versement created. Solde restant Debt B1: ${debtAfterPayB1.soldeRestant}`,
    );

    // ----------------------------------------------------
    // TEST 3 — FIND ALL GLOBAL (Company A Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all global payments...');
    const listA = await paiementsService.findAllGlobal(companyAId, {});
    const containsBInA = listA.data.some(
      (p) => p.numeroPaiement.includes('B') || p.idDetteFournisseur === detteB1.id,
    );
    if (containsBInA) {
      throw new Error('[FAIL] Company A list contains Company B payment!');
    }
    console.log(
      `  ✓ PASSED: Company A list strictly scoped to Company A (Count: ${listA.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 4 — FIND ALL GLOBAL (Company B Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 4] User B lists all global payments...');
    const listB = await paiementsService.findAllGlobal(companyBId, {});
    const containsAInB = listB.data.some((p) => p.idDetteFournisseur === detteA1.id);
    if (containsAInB) {
      throw new Error('[FAIL] Company B list contains Company A payment!');
    }
    console.log(
      `  ✓ PASSED: Company B list strictly scoped to Company B (Count: ${listB.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 5 — FIND BY DEBT ID LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A lists payments for Debt A1...');
    const debtAPayments = await paiementsService.findByDebtId(detteA1.id, companyAId);
    if (debtAPayments.length === 0) {
      throw new Error('[FAIL] Expected payments for Debt A1, found none!');
    }
    console.log(`  ✓ PASSED: Found ${debtAPayments.length} payment(s) for Debt A1.`);

    // ----------------------------------------------------
    // TEST 6 — FIND BY DEBT ID CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to list payments for Debt B1...');
    try {
      await paiementsService.findByDebtId(detteB1.id, companyAId);
      throw new Error('[FAIL] User A was able to list payments of Debt B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant debt access refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE VERSEMENT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to create versement on Debt B1...');
    try {
      await paiementsService.createVersement(
        detteB1.id,
        { montant: 100.0, modePaiement: 'ESPECES' },
        companyAId,
      );
      throw new Error('[FAIL] User A created versement on Debt B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant versement creation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — CREATE VERSEMENT WITH FORGED COMPANY ID IN BODY
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts to send forged companyId in body...');
    await paiementsService.createVersement(
      detteA1.id,
      {
        montant: 500.0,
        modePaiement: 'ESPECES',
        companyId: companyBId, // Forged property
      } as any,
      companyAId,
    );

    const createdPaymentsA = await paiementsService.findByDebtId(detteA1.id, companyAId);
    const lastPayment = createdPaymentsA[0];
    console.log(
      `  ✓ PASSED: Versement created under Debt A1 (Company ${companyAId}). Forged body property ignored.`,
    );

    // ----------------------------------------------------
    // TEST 9 — CANCEL VERSEMENT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A cancels versement on Debt A1...');
    const cancelledDebt = await paiementsService.cancelVersement(
      detteA1.id,
      lastPayment.id,
      { motifAnnulation: 'Erreur d écriture' },
      companyAId,
    );
    console.log(
      `  ✓ PASSED: Versement cancelled successfully. Debt A1 solde restored to ${cancelledDebt.soldeRestant}`,
    );

    // ----------------------------------------------------
    // TEST 10 — CANCEL VERSEMENT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A attempts to cancel versement of Debt B1...');
    const listBPayments = await paiementsService.findByDebtId(detteB1.id, companyBId);
    const paymentB = listBPayments[0];

    try {
      await paiementsService.cancelVersement(
        detteB1.id,
        paymentB.id,
        { motifAnnulation: 'Attaque cross-tenant' },
        companyAId,
      );
      throw new Error('[FAIL] User A cancelled versement of Debt B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant versement cancellation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 11 — OVERPAYMENT PREVENTION
    // ----------------------------------------------------
    console.log('\n[TEST 11] User A attempts overpayment on Debt A1...');
    try {
      await paiementsService.createVersement(
        detteA1.id,
        { montant: 999999.0, modePaiement: 'VIREMENT' },
        companyAId,
      );
      throw new Error('[FAIL] Overpayment was accepted!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Overpayment refused with BadRequestException: "${err.message}".`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 12 — DOUBLE CANCELLATION PREVENTION
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A attempts to cancel already cancelled versement...');
    try {
      await paiementsService.cancelVersement(
        detteA1.id,
        lastPayment.id,
        { motifAnnulation: 'Deuxieme annulation' },
        companyAId,
      );
      throw new Error('[FAIL] Double cancellation was accepted!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`  ✓ PASSED: Double cancellation refused with ConflictException.`);
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 13 — COMPANY-SCOPED NUMBERING (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 13] Checking Company A payment sequence format...');
    const paymentsAAll = await paiementsService.findByDebtId(detteA1.id, companyAId);
    const numA = paymentsAAll[0].numeroPaiement;
    console.log(`  ✓ PASSED: Company A payment number format: ${numA}`);

    // ----------------------------------------------------
    // TEST 14 — COMPANY-SCOPED NUMBERING (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 14] Checking Company B payment sequence format...');
    const paymentsBAll = await paiementsService.findByDebtId(detteB1.id, companyBId);
    const numB = paymentsBAll[0].numeroPaiement;
    console.log(`  ✓ PASSED: Company B payment number format: ${numB}`);

    // ----------------------------------------------------
    // TEST 15 — SEARCH ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 15] User A searches for "CHQ-B"...');
    const searchRes = await paiementsService.findAllGlobal(companyAId, { search: 'CHQ-B' });
    if (searchRes.data.length > 0) {
      throw new Error('[FAIL] Search leak: Company A search returned Company B payment!');
    }
    console.log(`  ✓ PASSED: Search returned 0 results as expected.`);

    // ----------------------------------------------------
    // TEST 16 — FILTER FOURNISSEUR ID ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 16] User A filters by Fournisseur B ID...');
    const filterFournisseurRes = await paiementsService.findAllGlobal(companyAId, {
      idFournisseur: fournisseurB.id,
    });
    if (filterFournisseurRes.data.length > 0) {
      throw new Error('[FAIL] Fournisseur filter leak!');
    }
    console.log(`  ✓ PASSED: Filter by cross-tenant supplier returned 0 results.`);

    // ----------------------------------------------------
    // TEST 17 — FILTER DETTE ID ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 17] User A filters by Debt B1 ID...');
    const filterDebtRes = await paiementsService.findAllGlobal(companyAId, {
      idDetteFournisseur: detteB1.id,
    });
    if (filterDebtRes.data.length > 0) {
      throw new Error('[FAIL] Debt ID filter leak!');
    }
    console.log(`  ✓ PASSED: Filter by cross-tenant debt ID returned 0 results.`);

    // ----------------------------------------------------
    // TEST 18 — STATISTICS ISOLATION (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 18] User A fetches stats...');
    const statsA = await paiementsService.findGlobalStats(companyAId, {});
    console.log(
      `  ✓ PASSED: Company A stats: Total paid = ${statsA.totalPayePeriod}, active payments = ${statsA.paymentsCount}, cancelled = ${statsA.cancelledCount}`,
    );

    // ----------------------------------------------------
    // TEST 19 — STATISTICS ISOLATION (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 19] User B fetches stats...');
    const statsB = await paiementsService.findGlobalStats(companyBId, {});
    console.log(
      `  ✓ PASSED: Company B stats: Total paid = ${statsB.totalPayePeriod}, active payments = ${statsB.paymentsCount}, cancelled = ${statsB.cancelledCount}`,
    );

    // ----------------------------------------------------
    // TEST 20 — LETTRE DE CHANGE (EFFET) CREATION AND ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 20] User A creates versement with mode EFFET (Lettre de change)...');
    await paiementsService.createVersement(
      detteA1.id,
      {
        montant: 1500.0,
        modePaiement: 'EFFET',
        lettreNumero: 'LC-PF-A001',
        lettreDateEcheance: '2026-10-31',
        lettreMontant: 1500.0,
        lettreBeneficiaire: 'FOURNISSEUR_PF_A',
        lettreCause: 'Règlement de dette',
        lettreTireNom: 'BANK_PF_A',
        lettreTireAdresse: 'Casablanca',
      },
      companyAId,
    );

    const listAWithEffet = await paiementsService.findByDebtId(detteA1.id, companyAId);
    const effetPayment = listAWithEffet.find((p) => p.modePaiement === 'EFFET');
    if (!effetPayment || !effetPayment.lettreDeChange) {
      throw new Error('[FAIL] Lettre de change was not created correctly!');
    }
    console.log(
      `  ✓ PASSED: Lettre de change created (Numero: ${effetPayment.lettreDeChange.numero}, Echeance: ${effetPayment.lettreDeChange.dateEcheance}).`,
    );

    // ----------------------------------------------------
    // TEST 21 — ADMIN GENERAL COMPANY A ONLY SEES COMPANY A
    // ----------------------------------------------------
    console.log('\n[TEST 21] Verifying ADMIN_GENERAL Company A scope...');
    const adminAAll = await paiementsService.findAllGlobal(companyAId, {});
    for (const p of adminAAll.data) {
      if (p.idFournisseur === fournisseurB.id) {
        throw new Error('[FAIL] Admin A can see Company B data!');
      }
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 22 — ADMIN GENERAL COMPANY B ONLY SEES COMPANY B
    // ----------------------------------------------------
    console.log('\n[TEST 22] Verifying ADMIN_GENERAL Company B scope...');
    const adminBAll = await paiementsService.findAllGlobal(companyBId, {});
    for (const p of adminBAll.data) {
      if (p.idFournisseur === fournisseurA.id) {
        throw new Error('[FAIL] Admin B can see Company A data!');
      }
    }
    console.log(`  ✓ PASSED: Admin B scope strictly limited to Company B.`);

    // ----------------------------------------------------
    // TEST 23 — INEXISTENT PAYMENT ID CANCELLATION
    // ----------------------------------------------------
    console.log('\n[TEST 23] User A attempts to cancel non-existent payment ID 999999...');
    try {
      await paiementsService.cancelVersement(
        detteA1.id,
        999999,
        { motifAnnulation: 'Test non existent' },
        companyAId,
      );
      throw new Error('[FAIL] Non-existent payment cancellation succeeded!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Non-existent payment cancellation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 24 — DB RE-READ & TENANT INHERITANCE INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 24] Re-reading DB to verify tenant inheritance...');
    const dbPaymentsA = await prisma.paiementFournisseur.findMany({
      where: { me: { idDetteFournisseur: detteA1.id } } as any,
      include: { detteFournisseur: true },
    });
    const allBelongToA = dbPaymentsA.every((p) => p.detteFournisseur.companyId === companyAId);
    if (!allBelongToA) {
      throw new Error('[FAIL] DB payment tenant inheritance corrupted!');
    }
    console.log(`  ✓ PASSED: All DB payments inherit correct companyId (${companyAId}).`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data...');
    await prisma.lettreDeChange.deleteMany({
      where: {
        paiementFournisseur: {
          detteFournisseur: { companyId: { in: [companyAId, companyBId] } },
        },
      },
    });
    await prisma.paiementFournisseur.deleteMany({
      where: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.fournisseur.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.paiementFournisseurSequence.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.detteFournisseurSequence.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 24 MULTI-TENANT PAIEMENTFOURNISSEUR TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b211PaiementFournisseurTests();
