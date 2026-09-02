import { PrismaClient, PaiementMethode } from '@prisma/client';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { PrismaService } from './prisma/prisma.service';

async function runDettesFournisseursInvariantTests() {
  console.log('====================================================');
  console.log('=== DETTES & PAIEMENTS FOURNISSEURS INVARIANT SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  const dettesService = new DettesFournisseursService(prismaService);
  const paiementsService = new PaiementsFournisseursService(prismaService, dettesService);

  let testSupplierId: number | null = null;
  let testPaymentId: number | null = null;

  try {
    // -------------------------------------------------------------
    // Setup Test Supplier
    // -------------------------------------------------------------
    console.log('[SETUP] Creating test supplier...');
    const supplierName = `TEST_SUPPLIER_${Date.now()}`;
    const supplier = await prisma.fournisseur.create({
      data: {
        nomFournisseur: supplierName,
        ice: `ICE${Date.now()}`.substring(0, 15),
        telephone: '0600000000',
        email: `test_${Date.now()}@supplier.com`,
      },
    });
    testSupplierId = supplier.id;
    console.log(`  ✓ PASSED: Created supplier #${testSupplierId} ("${supplier.nomFournisseur}")\n`);

    // -------------------------------------------------------------
    // TEST 1: Create Debt Without Payment
    // -------------------------------------------------------------
    console.log('[TEST 1] Creating Debt without initial payment...');
    const refFacture = `FAC-${Date.now()}`;
    const debt1 = await dettesService.create({
      idFournisseur: supplier.id,
      referenceFactureFournisseur: refFacture,
      dateDette: '2026-08-31',
      delaiPaiementJours: 30,
      montantDu: 5000,
      remarques: 'Phase 7C debt obligation test',
    });

    if (
      debt1.paiementsCount === 0 &&
      debt1.montantPaye === 0 &&
      debt1.soldeRestant === 5000 &&
      debt1.statutPaiement === 'EN_ATTENTE'
    ) {
      console.log(
        `  ✓ PASSED: Debt #${debt1.id} (${debt1.numeroDette}) created with 0 payments, Solde = 5000 MAD\n`,
      );
    } else {
      throw new Error(
        `FAILED: Expected 0 payments and solde=5000. Got count=${debt1.paiementsCount}, paye=${debt1.montantPaye}, solde=${debt1.soldeRestant}`,
      );
    }

    // -------------------------------------------------------------
    // TEST 2: Automatic Due Date Derivation
    // -------------------------------------------------------------
    console.log(
      '[TEST 2] Testing Automatic Due Date Derivation (dateDette + delaiPaiementJours)...',
    );
    // 2026-08-31 + 30 days => 2026-09-30
    if (debt1.dateEcheance === '2026-09-30') {
      console.log(
        `  ✓ PASSED: Derived dateEcheance "${debt1.dateEcheance}" matches expected "2026-09-30"\n`,
      );
    } else {
      throw new Error(`FAILED: Expected dateEcheance="2026-09-30". Got "${debt1.dateEcheance}"`);
    }

    // -------------------------------------------------------------
    // TEST 3: Rejection of Obsolete Initial Payment Payload
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Rejection of Obsolete initialPaiement Payload...');
    let rejectedAsExpected = false;
    try {
      await dettesService.create({
        idFournisseur: supplier.id,
        referenceFactureFournisseur: `FAC-REJECT-${Date.now()}`,
        dateDette: '2026-08-31',
        delaiPaiementJours: 30,
        montantDu: 1000,
        initialPaiement: {
          montant: 500,
          modePaiement: 'VIREMENT',
        },
      } as any);
    } catch (err: any) {
      if (err.message.includes('initial') || err.status === 400) {
        rejectedAsExpected = true;
      }
    }

    if (rejectedAsExpected) {
      console.log(
        '  ✓ PASSED: Obsolete initialPaiement payload was correctly rejected by backend DTO/service\n',
      );
    } else {
      throw new Error('FAILED: Obsolete initialPaiement payload was not rejected!');
    }

    // -------------------------------------------------------------
    // TEST 4: Payment Registration Post Debt Creation
    // -------------------------------------------------------------
    console.log('[TEST 4] Registering Supplier Payment via createVersement()...');
    const updatedDebtAfterPay1 = await paiementsService.createVersement(debt1.id, {
      montant: 2000,
      modePaiement: PaiementMethode.VIREMENT,
      datePaiement: '2026-09-01',
      referenceExterne: 'VIR-100200',
      notes: 'First installment',
    });

    const activePayments = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: debt1.id, estAnnule: false },
    });
    testPaymentId = activePayments[0]?.id || null;

    if (
      updatedDebtAfterPay1.montantPaye === 2000 &&
      updatedDebtAfterPay1.soldeRestant === 3000 &&
      updatedDebtAfterPay1.statutPaiement === 'PARTIELLEMENT_PAYEE'
    ) {
      console.log(
        `  ✓ PASSED: Registered payment. Montant Payé = ${updatedDebtAfterPay1.montantPaye} MAD, Solde Restant = ${updatedDebtAfterPay1.soldeRestant} MAD (PARTIELLEMENT_PAYEE)\n`,
      );
    } else {
      throw new Error(
        `FAILED: Expected paid=2000, balance=3000. Got paid=${updatedDebtAfterPay1.montantPaye}, balance=${updatedDebtAfterPay1.soldeRestant}`,
      );
    }

    // -------------------------------------------------------------
    // TEST 5: Overpayment Prevention Invariant
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Overpayment Rejection Logic...');
    let overpayRejected = false;
    try {
      await paiementsService.createVersement(debt1.id, {
        montant: 4000, // Remaining balance is 3000
        modePaiement: PaiementMethode.ESPECES,
      });
    } catch (err: any) {
      if (err.message.includes('dépasse le solde restant') || err.status === 400) {
        overpayRejected = true;
      }
    }

    if (overpayRejected) {
      console.log(
        '  ✓ PASSED: Overpayment attempt (4000 MAD > 3000 MAD solde) correctly rejected\n',
      );
    } else {
      throw new Error('FAILED: Overpayment check failed to reject excessive payment!');
    }

    // -------------------------------------------------------------
    // TEST 6: Full Settlement Payment
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Full Settlement Payment...');
    const settledDebt = await paiementsService.createVersement(debt1.id, {
      montant: 3000,
      modePaiement: PaiementMethode.CHEQUE,
      referenceExterne: 'CHQ-556677',
    });

    if (
      settledDebt.montantPaye === 5000 &&
      settledDebt.soldeRestant === 0 &&
      settledDebt.statutPaiement === 'PAYEE'
    ) {
      console.log(
        `  ✓ PASSED: Debt fully settled. Total Paid = ${settledDebt.montantPaye} MAD, Solde = 0 MAD (PAYEE)\n`,
      );
    } else {
      throw new Error(
        `FAILED: Expected paid=5000, balance=0. Got paid=${settledDebt.montantPaye}, balance=${settledDebt.soldeRestant}`,
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Payment Cancellation & Balance Restoration
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Versement Cancellation & Balance Restoration...');
    if (!testPaymentId) throw new Error('Test payment ID missing');

    const debtAfterCancel = await paiementsService.cancelVersement(debt1.id, testPaymentId, {
      motifAnnulation: 'Erreur d encaissement',
    });

    if (
      debtAfterCancel.montantPaye === 3000 &&
      debtAfterCancel.soldeRestant === 2000 &&
      debtAfterCancel.statutPaiement === 'PARTIELLEMENT_PAYEE'
    ) {
      console.log(
        `  ✓ PASSED: Cancelled payment #${testPaymentId}. Restored Solde = ${debtAfterCancel.soldeRestant} MAD (PARTIELLEMENT_PAYEE)\n`,
      );
    } else {
      throw new Error(
        `FAILED: Expected balance=2000 after cancellation. Got paye=${debtAfterCancel.montantPaye}, balance=${debtAfterCancel.soldeRestant}`,
      );
    }

    // -------------------------------------------------------------
    // TEST 8: Phase 7A Lettre de Change Regression Check
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing Lettre de Change Payment Registration Regression...');
    const ldcDebt = await dettesService.create({
      idFournisseur: supplier.id,
      referenceFactureFournisseur: `FAC-LDC-${Date.now()}`,
      dateDette: '2026-08-31',
      delaiPaiementJours: 45,
      montantDu: 15000,
    });

    await paiementsService.createVersement(ldcDebt.id, {
      montant: 15000,
      modePaiement: PaiementMethode.EFFET,
      datePaiement: '2026-08-31',
      referenceExterne: 'LDC-REF-999',
      lettreNumero: `LC-${Date.now()}`,
      lettreDateEcheance: '2026-10-15',
      lettreMontant: 15000,
      lettreBeneficiaire: supplier.nomFournisseur,
      lettreCause: 'Règlement de prestation de transport',
      lettreTireNom: 'Transport ERP SARL',
      lettreTireAdresse: '123 Avenue Zerktouni, Casablanca',
    });

    const ldcPayments = await paiementsService.findByDebtId(ldcDebt.id);
    const ldcPayment = ldcPayments[0];

    if (
      ldcPayment &&
      ldcPayment.modePaiement === 'EFFET' &&
      ldcPayment.lettreDeChange &&
      ldcPayment.lettreDeChange.montant === 15000
    ) {
      console.log(
        `  ✓ PASSED: Lettre de change payment registered successfully with N° "${ldcPayment.lettreDeChange.numero}" & Montant = ${ldcPayment.lettreDeChange.montant} MAD\n`,
      );
    } else {
      throw new Error('FAILED: Lettre de change regression test failed!');
    }

    // Cleanup
    console.log('[CLEANUP] Cleaning test data...');
    await prisma.lettreDeChange.deleteMany({
      where: { paiementFournisseur: { idDetteFournisseur: { in: [debt1.id, ldcDebt.id] } } },
    });
    await prisma.paiementFournisseur.deleteMany({
      where: { idDetteFournisseur: { in: [debt1.id, ldcDebt.id] } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { id: { in: [debt1.id, ldcDebt.id] } },
    });
    await prisma.fournisseur.delete({ where: { id: supplier.id } });

    console.log('====================================================');
    console.log('=== ALL PHASE 7C INVARIANT TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test Runner Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDettesFournisseursInvariantTests();
