import { PrismaClient, CreanceStatut, PaiementMethode } from '@prisma/client';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { FacturesService } from './modules/factures/factures.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

const prisma = new PrismaClient();
const creancesService = new CreancesClientsService(prisma as any);
const paiementsService = new PaiementsClientsService(prisma as any, creancesService);
const facturesService = new FacturesService(prisma as any, creancesService);

async function runTests() {
  console.log('====================================================');
  console.log('  INTERNAL INVARIANT TEST RUNNER — PHASE 15');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  const testInvoiceNum = `FAC-P15-TEST-${Date.now()}`;
  let createdFactureId: number | null = null;

  try {
    // 1. Facture Creation Auto-Creance Test
    console.log('[Test 1] Invoice Creation Auto-Creates CreanceClient');
    const invoiceView = await facturesService.create({
      numeroFacture: testInvoiceNum,
      nomClient: 'Client Phase 15 Invariants Ltd',
      sousTotal: 1000,
      tauxTva: 0,
      joursEcheance: 30,
    });
    createdFactureId = invoiceView.id;
    assert(Boolean(invoiceView.id), 'Invoice created successfully');
    assert(invoiceView.montantTotal === 1000, 'Invoice montantTotal equals 1000 MAD');

    const creanceRecord = await prisma.creanceClient.findUnique({
      where: { numeroFacture: testInvoiceNum },
    });
    assert(Boolean(creanceRecord), 'CreanceClient auto-created in database');
    assert(
      Number(creanceRecord?.montantFacture) === 1000,
      'Creance montantFacture equals 1000 MAD',
    );
    assert(Number(creanceRecord?.montantRecu) === 0, 'Creance initial montantRecu is 0');
    assert(
      creanceRecord?.statutPaiement === CreanceStatut.NON_PAYE,
      'Initial statutPaiement is NON_PAYE',
    );

    // 2. Read Endpoints Side-Effect Free Test
    console.log('\n[Test 2] Read Endpoints Have Zero Side-Effects');
    const initialCreanceCount = await prisma.creanceClient.count();
    const initialPaiementCount = await prisma.paiementClient.count();

    await creancesService.findAll({ limit: 10 });
    await creancesService.findStats();
    await creancesService.findOne(creanceRecord!.id);
    await paiementsService.findAll({ limit: 10 });
    await paiementsService.findStats();

    const afterCreanceCount = await prisma.creanceClient.count();
    const afterPaiementCount = await prisma.paiementClient.count();

    assert(
      initialCreanceCount === afterCreanceCount,
      'GET endpoints did not alter creance row count',
    );
    assert(
      initialPaiementCount === afterPaiementCount,
      'GET endpoints did not alter paiement row count',
    );

    // 3. Exact Prisma.Decimal Boundary Tests
    console.log('\n[Test 3] Exact Decimal Boundary Validation');

    // 3a. Overpayment 1000.01 on 1000.00 remaining -> Reject with 409 Conflict
    let overpayError: any = null;
    try {
      await paiementsService.create({
        numeroFacture: testInvoiceNum,
        montantRecu: 1000.01,
        methodePaiement: PaiementMethode.VIREMENT,
      });
    } catch (err) {
      overpayError = err;
    }
    assert(
      overpayError instanceof ConflictException,
      'Overpayment 1000.01 on 1000.00 balance rejected with 409 ConflictException',
    );

    // 3b. Partial payment 700.00 on 1000.00 -> Success & PARTIEL
    const partialPayment = await paiementsService.create({
      numeroFacture: testInvoiceNum,
      montantRecu: 700,
      methodePaiement: PaiementMethode.VIREMENT,
    });
    assert(partialPayment.montantRecu === 700, 'Partial payment of 700 MAD registered');
    assert(partialPayment.creance?.solde === 300, 'Creance remaining solde updated to 300 MAD');
    assert(
      partialPayment.creance?.statutPaiement === 'PARTIEL',
      'Creance status updated to PARTIEL',
    );

    // Verify Facture view status dynamically reflects PARTIELLEMENT_PAYEE
    const updatedFactureView = await facturesService.findOne(createdFactureId);
    assert(
      updatedFactureView.statut === 'PARTIELLEMENT_PAYEE',
      'Invoice view status updated to PARTIELLEMENT_PAYEE',
    );

    // 3c. Exact final payment 300.00 on 300.00 -> Success & PAYE
    const finalPayment = await paiementsService.create({
      numeroFacture: testInvoiceNum,
      montantRecu: 300,
      methodePaiement: PaiementMethode.CHEQUE,
    });
    assert(finalPayment.montantRecu === 300, 'Final payment of 300 MAD registered');
    assert(finalPayment.creance?.solde === 0, 'Creance remaining solde updated to 0 MAD');
    assert(finalPayment.creance?.statutPaiement === 'PAYE', 'Creance status updated to PAYE');

    const fullyPaidFactureView = await facturesService.findOne(createdFactureId);
    assert(fullyPaidFactureView.statut === 'PAYEE', 'Invoice view status updated to PAYEE');

    // 3d. Payment against already fully paid invoice -> Reject 409
    let paidAgainError: any = null;
    try {
      await paiementsService.create({
        numeroFacture: testInvoiceNum,
        montantRecu: 10,
        methodePaiement: PaiementMethode.ESPECES,
      });
    } catch (err) {
      paidAgainError = err;
    }
    assert(
      paidAgainError instanceof ConflictException,
      'Payment against fully paid invoice rejected with 409 ConflictException',
    );

    // 4. Concurrency Protection Test (SELECT FOR UPDATE)
    console.log('\n[Test 4] Concurrency Overpayment Protection (SELECT FOR UPDATE)');
    const concInvoiceNum = `FAC-P15-CONC-${Date.now()}`;
    const concInvoiceView = await facturesService.create({
      numeroFacture: concInvoiceNum,
      nomClient: 'Concurrency Client Inc',
      sousTotal: 1000,
      tauxTva: 0,
    });

    // Fire two simultaneous payments of 700 MAD each against 1000 MAD balance
    const results = await Promise.allSettled([
      paiementsService.create({
        numeroFacture: concInvoiceNum,
        montantRecu: 700,
        methodePaiement: PaiementMethode.VIREMENT,
      }),
      paiementsService.create({
        numeroFacture: concInvoiceNum,
        montantRecu: 700,
        methodePaiement: PaiementMethode.VIREMENT,
      }),
    ]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    assert(fulfilledCount === 1, 'Exactly 1 concurrent payment succeeded');
    assert(rejectedCount === 1, 'Exactly 1 concurrent payment was rejected');

    const concCreance = await prisma.creanceClient.findUnique({
      where: { numeroFacture: concInvoiceNum },
    });
    assert(
      Number(concCreance?.montantRecu) === 700,
      'Total received amount is exactly 700 MAD (never exceeded 1000 MAD)',
    );
    assert(Number(concCreance?.solde) === 300, 'Remaining balance is exactly 300 MAD');

    // Cleanup concurrency test invoice
    await prisma.paiementClient.deleteMany({ where: { numeroFacture: concInvoiceNum } });
    await prisma.creanceClient.deleteMany({ where: { numeroFacture: concInvoiceNum } });
    await prisma.facture.delete({ where: { id: concInvoiceView.id } });

    // 5. Cancelled/Soft-Deleted Invoice Test
    console.log('\n[Test 5] Rejection of Payments on Soft-Deleted Invoices');
    const delInvoiceNum = `FAC-P15-DEL-${Date.now()}`;
    const delInvoice = await facturesService.create({
      numeroFacture: delInvoiceNum,
      nomClient: 'Deleted Client',
      sousTotal: 500,
    });
    await facturesService.remove(delInvoice.id); // Soft delete invoice

    let softDelError: any = null;
    try {
      await paiementsService.create({
        numeroFacture: delInvoiceNum,
        montantRecu: 100,
        methodePaiement: PaiementMethode.ESPECES,
      });
    } catch (err) {
      softDelError = err;
    }
    assert(
      softDelError instanceof BadRequestException,
      'Payment against soft-deleted invoice rejected with BadRequestException',
    );

    // Cleanup soft-deleted test invoice
    await prisma.creanceClient.deleteMany({ where: { numeroFacture: delInvoiceNum } });
    await prisma.facture.delete({ where: { id: delInvoice.id } });
  } catch (err) {
    console.error('Fatal error during Phase 15 runner:', err);
    failed++;
  } finally {
    // Cleanup main test invoice
    if (testInvoiceNum) {
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: testInvoiceNum } });
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: testInvoiceNum } });
      if (createdFactureId) {
        await prisma.facture.delete({ where: { id: createdFactureId } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
