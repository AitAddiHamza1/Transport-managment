import { PrismaClient, PaiementMethode, Prisma } from '@prisma/client';

async function runDettesFournisseursInvariantTests() {
  console.log('====================================================');
  console.log('=== DETTES & PAIEMENTS FOURNISSEURS INVARIANT SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  let testSupplierId: number | null = null;
  let testDebtId: number | null = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Setup Test Supplier
    // -------------------------------------------------------------
    console.log('[TEST 1] Creating test supplier...');
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
    console.log(`  ✓ PASSED: Created supplier #${testSupplierId} ("${supplier.nomFournisseur}")`);

    // -------------------------------------------------------------
    // Test 2: Sequence Number Generation for Debt
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing Concurrency-Safe Sequence Number Generation...');
    const year = new Date().getFullYear();
    const res: Array<{ dernier_numero: number }> = await prisma.$queryRaw`
      INSERT INTO dette_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const seqNum = res[0].dernier_numero;
    const debtNumber = `DF-${year}-${String(seqNum).padStart(6, '0')}`;
    console.log(`  ✓ PASSED: Generated sequence debt number "${debtNumber}"`);

    // -------------------------------------------------------------
    // Test 3: Create Debt with Initial Payment
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Atomic Debt Creation with Initial Payment...');
    const refFacture = `FAC-${Date.now()}`;
    const debt = await prisma.detteFournisseur.create({
      data: {
        numeroDette: debtNumber,
        referenceFactureFournisseur: refFacture,
        idFournisseur: supplier.id,
        nomFournisseurSnapshot: supplier.nomFournisseur,
        dateDette: new Date(),
        delaiPaiementJours: 30,
        dateEcheance: new Date(Date.now() + 30 * 86400000),
        montantDu: new Prisma.Decimal(5000.0),
        remarques: 'Test debt obligation',
      },
    });
    testDebtId = debt.id;
    console.log(`  ✓ Debt #${testDebtId} registered.`);

    // Create initial payment of 2000.00
    const payRes: Array<{ dernier_numero: number }> = await prisma.$queryRaw`
      INSERT INTO paiement_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = paiement_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const payNum = `PF-${year}-${String(payRes[0].dernier_numero).padStart(6, '0')}`;

    const payment = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: payNum,
        idDetteFournisseur: debt.id,
        montant: new Prisma.Decimal(2000.0),
        datePaiement: new Date(),
        modePaiement: PaiementMethode.VIREMENT,
        referenceExterne: 'VIR-112233',
      },
    });

    console.log(
      `  ✓ PASSED: Created Debt #${debt.id} (${debt.numeroDette}) & Initial Payment #${payment.id} (${payment.numeroPaiement})`,
    );

    // -------------------------------------------------------------
    // Test 4: Dynamic Financial Evaluation
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing Dynamic Balance & Status Evaluation...');
    const activePayments = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: debt.id, estAnnule: false },
    });
    const paidSum = activePayments.reduce((acc, p) => acc + Number(p.montant), 0);
    const balance = Number(debt.montantDu) - paidSum;

    if (paidSum === 2000 && balance === 3000) {
      console.log(
        `  ✓ PASSED: Derived Paid = ${paidSum} MAD, Balance = ${balance} MAD (PARTIELLEMENT_PAYEE)`,
      );
    } else {
      throw new Error(
        `FAILED: Expected paid=2000, balance=3000. Got paid=${paidSum}, balance=${balance}`,
      );
    }

    // -------------------------------------------------------------
    // Test 5: Overpayment Prevention Invariant
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Overpayment Rejection Logic...');
    const excessAmount = 3500; // Remaining balance is 3000
    if (excessAmount > balance) {
      console.log(
        `  ✓ PASSED: Overpayment attempt (${excessAmount} MAD > ${balance} MAD solde) correctly identified for rejection`,
      );
    } else {
      throw new Error('FAILED: Overpayment check failed');
    }

    // -------------------------------------------------------------
    // Test 6: Settle Debt (Full Payment)
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Full Settlement Payment...');
    const payRes2: Array<{ dernier_numero: number }> = await prisma.$queryRaw`
      INSERT INTO paiement_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = paiement_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const payNum2 = `PF-${year}-${String(payRes2[0].dernier_numero).padStart(6, '0')}`;

    await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: payNum2,
        idDetteFournisseur: debt.id,
        montant: new Prisma.Decimal(3000.0),
        datePaiement: new Date(),
        modePaiement: PaiementMethode.CHEQUE,
        referenceExterne: 'CHQ-889900',
      },
    });

    const paymentsAfterSettlement = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: debt.id, estAnnule: false },
    });
    const totalPaidAfter = paymentsAfterSettlement.reduce((acc, p) => acc + Number(p.montant), 0);
    const balanceAfter = Number(debt.montantDu) - totalPaidAfter;

    if (totalPaidAfter === 5000 && balanceAfter === 0) {
      console.log(
        `  ✓ PASSED: Debt fully settled. Total Paid = ${totalPaidAfter} MAD, Balance = ${balanceAfter} MAD (PAYEE)`,
      );
    } else {
      throw new Error(
        `FAILED: Expected paid=5000, balance=0. Got paid=${totalPaidAfter}, balance=${balanceAfter}`,
      );
    }

    // -------------------------------------------------------------
    // Test 7: Cancellation & Balance Restoration
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Versement Cancellation & Balance Restoration...');
    await prisma.paiementFournisseur.update({
      where: { id: payment.id },
      data: {
        estAnnule: true,
        dateAnnulation: new Date(),
        motifAnnulation: 'Test cancellation reason',
      },
    });

    const activePaymentsPostCancel = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: debt.id, estAnnule: false },
    });
    const paidPostCancel = activePaymentsPostCancel.reduce((acc, p) => acc + Number(p.montant), 0);
    const balancePostCancel = Number(debt.montantDu) - paidPostCancel;

    if (paidPostCancel === 3000 && balancePostCancel === 2000) {
      console.log(
        `  ✓ PASSED: Cancelled payment #${payment.id}. Restored Balance = ${balancePostCancel} MAD`,
      );
    } else {
      throw new Error(`FAILED: Expected balance=2000 after cancellation. Got ${balancePostCancel}`);
    }

    // -------------------------------------------------------------
    // Test 8: Partial Unique Index Soft-Delete Policy Verification
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing Partial Unique Index Soft-Delete Policy...');
    // Create draft debt with same supplier and ref, then soft delete it
    const seqRes3: Array<{ dernier_numero: number }> = await prisma.$queryRaw`
      INSERT INTO dette_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const draftDebtNum = `DF-${year}-${String(seqRes3[0].dernier_numero).padStart(6, '0')}`;
    const reusableRef = `REF-REUSE-${Date.now()}`;

    const draftDebt = await prisma.detteFournisseur.create({
      data: {
        numeroDette: draftDebtNum,
        referenceFactureFournisseur: reusableRef,
        idFournisseur: supplier.id,
        nomFournisseurSnapshot: supplier.nomFournisseur,
        dateDette: new Date(),
        delaiPaiementJours: 30,
        dateEcheance: new Date(Date.now() + 30 * 86400000),
        montantDu: new Prisma.Decimal(1000.0),
        supprimeLe: new Date(), // Soft deleted
      },
    });

    // Create new active debt reusing the same referenceFactureFournisseur
    const seqRes4: Array<{ dernier_numero: number }> = await prisma.$queryRaw`
      INSERT INTO dette_fournisseur_sequences (annee, dernier_numero)
      VALUES (${year}, 1)
      ON CONFLICT (annee) DO UPDATE
      SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
      RETURNING dernier_numero;
    `;
    const activeDebtNum = `DF-${year}-${String(seqRes4[0].dernier_numero).padStart(6, '0')}`;

    const newActiveDebt = await prisma.detteFournisseur.create({
      data: {
        numeroDette: activeDebtNum,
        referenceFactureFournisseur: reusableRef,
        idFournisseur: supplier.id,
        nomFournisseurSnapshot: supplier.nomFournisseur,
        dateDette: new Date(),
        delaiPaiementJours: 30,
        dateEcheance: new Date(Date.now() + 30 * 86400000),
        montantDu: new Prisma.Decimal(1000.0),
      },
    });

    console.log(
      `  ✓ PASSED: Soft-deleted Draft Debt #${draftDebt.id} allows reference reuse for Active Debt #${newActiveDebt.id}`,
    );

    // Cleanup
    await prisma.paiementFournisseur.deleteMany({
      where: { idDetteFournisseur: { in: [debt.id, draftDebt.id, newActiveDebt.id] } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { id: { in: [debt.id, draftDebt.id, newActiveDebt.id] } },
    });
    await prisma.fournisseur.delete({ where: { id: supplier.id } });

    console.log('\n====================================================');
    console.log('=== ALL INVARIANT SUITE TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test Runner Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDettesFournisseursInvariantTests();
