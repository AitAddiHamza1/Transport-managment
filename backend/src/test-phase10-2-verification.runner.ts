import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { EmployesService } from './modules/employes/employes.service';
import { PaiementsEmployesService } from './modules/paiements-employes/paiements-employes.service';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ContratType, PaiementModeEmploye, VersementEmployeType, Prisma } from '@prisma/client';

async function runPhase10_2Verification() {
  console.log('\n======================================================================');
  console.log('=== PHASE 10.2: PAIEMENTS EMPLOYÉS SAFE DELETION & TREASURY TESTS ===');
  console.log('======================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const employesService = app.get(EmployesService);
  const paiementsService = app.get(PaiementsEmployesService);
  const dashboardService = app.get(DashboardService);
  const gestionPaiementsService = app.get(GestionPaiementsService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
      failed++;
    }
  }

  let companyAId: number;
  let companyBId: number;

  try {
    // ----------------------------------------------------
    // SETUP: Create isolated test companies & employees
    // ----------------------------------------------------
    console.log('[SETUP] Creating isolated test companies and employees...');

    const oldComps = await prisma.company.findMany({
      where: { nom: { in: ['TEST_PHASE10_2_CO_A', 'TEST_PHASE10_2_CO_B'] } },
      select: { id: true },
    });
    const oldCompIds = oldComps.map((c) => c.id);

    if (oldCompIds.length > 0) {
      await prisma.versementEmploye.deleteMany({
        where: { paiementEmploye: { employe: { companyId: { in: oldCompIds } } } },
      });
      await prisma.primeEmploye.deleteMany({
        where: { paiementEmploye: { employe: { companyId: { in: oldCompIds } } } },
      });
      await prisma.paiementEmploye.deleteMany({
        where: { employe: { companyId: { in: oldCompIds } } },
      });
      await prisma.employe.deleteMany({ where: { companyId: { in: oldCompIds } } });
      await prisma.paiementEmployeSequence.deleteMany({
        where: { companyId: { in: oldCompIds } },
      });
      await prisma.employeSequence.deleteMany({
        where: { companyId: { in: oldCompIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompIds } } });
    }

    const coA = await prisma.company.create({ data: { nom: 'TEST_PHASE10_2_CO_A' } });
    const coB = await prisma.company.create({ data: { nom: 'TEST_PHASE10_2_CO_B' } });
    companyAId = coA.id;
    companyBId = coB.id;

    const empA = await employesService.create(
      {
        nom: 'KHALIL',
        prenom: 'Omar',
        cin: 'P102A001',
        telephone: '0610200001',
        typeContrat: ContratType.CDI,
        dateEmbauche: '2024-01-01',
        salaireBase: 10000.0,
        poste: 'Conducteur Poids Lourd',
        modePaiement: PaiementModeEmploye.VIREMENT,
        nomBanque: 'Attijariwafa Bank',
        rib: '123456789012345678901234',
      },
      companyAId,
    );

    const empB = await employesService.create(
      {
        nom: 'TANGI',
        prenom: 'Youssef',
        cin: 'P102B002',
        telephone: '0610200002',
        typeContrat: ContratType.CDI,
        dateEmbauche: '2024-01-01',
        salaireBase: 12000.0,
        poste: 'Mécanicien',
        modePaiement: PaiementModeEmploye.VIREMENT,
        nomBanque: 'Banque Populaire',
        rib: '987654321098765432109876',
      },
      companyBId,
    );

    // Pre-seed Company B sequence offset to avoid collision with global unique constraint
    await prisma.paiementEmployeSequence.create({
      data: {
        companyId: companyBId,
        annee: new Date().getFullYear(),
        dernierNumero: 500,
      },
    });

    console.log(`  ✓ Setup completed: Company A #${companyAId}, Company B #${companyBId}\n`);

    // -------------------------------------------------------------------
    // TEST 1 — Pending obligation with zero payments (EN_ATTENTE)
    // -------------------------------------------------------------------
    console.log('[TEST 1] Pending obligation with zero payments (EN_ATTENTE)...');
    const ob1 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-01',
      montantDu: 10000.0,
      notes: 'Test pending zero payments',
    });
    assert(ob1.statut === 'EN_ATTENTE' && ob1.montantPaye === 0, 'Initial status is EN_ATTENTE with 0 paid');

    const del1 = await paiementsService.softDelete(companyAId, ob1.id, 'Suppression test 1');
    assert(del1.montantRembourseTresorerie === 0, 'Zero amount refunded to treasury for pending obligation');
    assert(del1.versementsAnnules === 0, 'Zero versements cancelled');

    let findDeletedThrew = false;
    try {
      await paiementsService.findOne(companyAId, ob1.id);
    } catch (err: any) {
      if (err instanceof NotFoundException) findDeletedThrew = true;
    }
    assert(findDeletedThrew, 'Deleted obligation throws NotFoundException on findOne');

    const dbOb1 = await prisma.paiementEmploye.findUnique({ where: { id: ob1.id } });
    assert(dbOb1?.supprimeLe !== null, 'Obligation record preserved with supprimeLe timestamp');

    // -------------------------------------------------------------------
    // TEST 2 — Partially paid obligation with one installment
    // -------------------------------------------------------------------
    console.log('\n[TEST 2] Partially paid obligation with one installment...');
    const ob2 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-02',
      montantDu: 10000.0,
      notes: 'Test partial 1 installment',
    });
    await paiementsService.createVersement(companyAId, ob2.id, {
      montant: 4000.0,
      dateVersement: '2026-02-15',
      modePaiement: PaiementModeEmploye.VIREMENT,
      typeVersement: VersementEmployeType.SALAIRE,
      notes: 'Acompte 1',
    });

    const ob2View = await paiementsService.findOne(companyAId, ob2.id);
    assert(ob2View.statut === 'PARTIELLEMENT_PAYE' && ob2View.montantPaye === 4000, 'Obligation is PARTIELLEMENT_PAYE (4000 paid)');

    const del2 = await paiementsService.softDelete(companyAId, ob2.id, 'Annulation avec remboursement');
    assert(del2.montantRembourseTresorerie === 4000, 'Exact disbursed amount (4000) returned to treasury');
    assert(del2.versementsAnnules === 1, '1 versement marked cancelled');

    const dbVersements2 = await prisma.versementEmploye.findMany({ where: { idPaiementEmploye: ob2.id } });
    assert(
      dbVersements2.length === 1 &&
        dbVersements2[0].estAnnule === true &&
        dbVersements2[0].dateAnnulation !== null &&
        dbVersements2[0].motifAnnulation === 'Annulation avec remboursement',
      'Installment record has estAnnule=true, dateAnnulation, and motifAnnulation preserved in audit history',
    );

    // -------------------------------------------------------------------
    // TEST 3 — Partially paid obligation with multiple installments
    // -------------------------------------------------------------------
    console.log('\n[TEST 3] Partially paid obligation with multiple installments...');
    const ob3 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-03',
      montantDu: 10000.0,
      notes: 'Test partial multi installments',
    });
    await paiementsService.createVersement(companyAId, ob3.id, {
      montant: 3000.0,
      dateVersement: '2026-03-10',
      modePaiement: PaiementModeEmploye.VIREMENT,
      notes: 'Tranche 1',
    });
    await paiementsService.createVersement(companyAId, ob3.id, {
      montant: 4500.0,
      dateVersement: '2026-03-20',
      modePaiement: PaiementModeEmploye.ESPECES,
      notes: 'Tranche 2',
    });

    const del3 = await paiementsService.softDelete(companyAId, ob3.id);
    assert(del3.montantRembourseTresorerie === 7500, 'Exact sum of multiple installments (7500) returned to treasury');
    assert(del3.versementsAnnules === 2, 'Both installments cancelled');

    const dbVersements3 = await prisma.versementEmploye.findMany({ where: { idPaiementEmploye: ob3.id } });
    assert(
      dbVersements3.every((v) => v.estAnnule === true),
      'All multiple installments are marked cancelled',
    );

    // -------------------------------------------------------------------
    // TEST 4 — Fully paid obligation (PAYE)
    // -------------------------------------------------------------------
    console.log('\n[TEST 4] Fully paid obligation (PAYE)...');
    const ob4 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-04',
      montantDu: 10000.0,
      notes: 'Test fully paid',
    });
    await paiementsService.createVersement(companyAId, ob4.id, {
      montant: 6000.0,
      dateVersement: '2026-04-10',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });
    await paiementsService.createVersement(companyAId, ob4.id, {
      montant: 4000.0,
      dateVersement: '2026-04-28',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });

    const ob4View = await paiementsService.findOne(companyAId, ob4.id);
    assert(ob4View.statut === 'PAYE' && ob4View.soldeRestant === 0, 'Obligation is fully PAYE with solde 0');

    const del4 = await paiementsService.softDelete(companyAId, ob4.id);
    assert(del4.montantRembourseTresorerie === 10000, 'Full obligation amount (10000) returned to treasury');
    assert(del4.versementsAnnules === 2, 'All 2 installments cancelled');

    // -------------------------------------------------------------------
    // TEST 5 — Cancelled installments must NOT be refunded again
    // -------------------------------------------------------------------
    console.log('\n[TEST 5] Already cancelled installments must not be refunded...');
    const ob5 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-05',
      montantDu: 10000.0,
      notes: 'Test with previously cancelled installment',
    });
    const v5_1 = await paiementsService.createVersement(companyAId, ob5.id, {
      montant: 2000.0,
      dateVersement: '2026-05-05',
      modePaiement: PaiementModeEmploye.ESPECES,
      notes: 'Versement erroné',
    });
    // Manually cancel v5_1
    const v5_1Id = v5_1.versements[0].id;
    await paiementsService.cancelVersement(companyAId, ob5.id, v5_1Id, {
      motifAnnulation: 'Erreur montant saisie',
    });

    // Add second valid versement
    await paiementsService.createVersement(companyAId, ob5.id, {
      montant: 3500.0,
      dateVersement: '2026-05-15',
      modePaiement: PaiementModeEmploye.VIREMENT,
      notes: 'Versement valide',
    });

    const del5 = await paiementsService.softDelete(companyAId, ob5.id);
    assert(del5.montantRembourseTresorerie === 3500, 'Only active versement (3500) refunded; cancelled 2000 was NOT refunded');
    assert(del5.versementsAnnules === 1, 'Only 1 active versement cancelled upon deletion');

    const originalCancelledV = await prisma.versementEmploye.findUnique({ where: { id: v5_1Id } });
    assert(
      originalCancelledV?.motifAnnulation === 'Erreur montant saisie',
      'Original cancellation reason for previous installment was preserved and not overwritten',
    );

    // -------------------------------------------------------------------
    // TEST 6 — Duplicate deletion/reversal attempts
    // -------------------------------------------------------------------
    console.log('\n[TEST 6] Duplicate deletion/reversal attempts...');
    let duplicateRejected = false;
    try {
      await paiementsService.softDelete(companyAId, ob5.id);
    } catch (err: any) {
      if (err instanceof ConflictException) duplicateRejected = true;
    }
    assert(duplicateRejected, 'Second deletion attempt rejected with ConflictException (409)');

    // -------------------------------------------------------------------
    // TEST 7 — Treasury balance restoration verified against Cash Flow Outflows
    // -------------------------------------------------------------------
    console.log('\n[TEST 7] Treasury balance restoration verification...');
    const ob7 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-07',
      montantDu: 5000.0,
      notes: 'Test treasury restoration',
    });

    // Get active versements sum for company A before adding versement
    const sumActiveBefore = await prisma.versementEmploye.aggregate({
      _sum: { montant: true },
      where: {
        estAnnule: false,
        paiementEmploye: { employe: { companyId: companyAId } },
      },
    });
    const baselineOutflows = Number(sumActiveBefore._sum.montant || 0);

    // Add disbursement
    await paiementsService.createVersement(companyAId, ob7.id, {
      montant: 5000.0,
      dateVersement: '2026-07-15',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });

    const sumActiveDuring = await prisma.versementEmploye.aggregate({
      _sum: { montant: true },
      where: {
        estAnnule: false,
        paiementEmploye: { employe: { companyId: companyAId } },
      },
    });
    const duringOutflows = Number(sumActiveDuring._sum.montant || 0);
    assert(duringOutflows === baselineOutflows + 5000, 'Disbursement increased employee cash outflows by 5000');

    // Delete obligation
    await paiementsService.softDelete(companyAId, ob7.id);

    const sumActiveAfter = await prisma.versementEmploye.aggregate({
      _sum: { montant: true },
      where: {
        estAnnule: false,
        paiementEmploye: { employe: { companyId: companyAId } },
      },
    });
    const afterOutflows = Number(sumActiveAfter._sum.montant || 0);
    assert(afterOutflows === baselineOutflows, 'Cash outflows returned exactly to baseline, restoring treasury by 5000');

    // -------------------------------------------------------------------
    // TEST 8 — Transaction rollback on failure
    // -------------------------------------------------------------------
    console.log('\n[TEST 8] Transaction rollback on failure...');
    const ob8 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-08',
      montantDu: 5000.0,
    });
    await paiementsService.createVersement(companyAId, ob8.id, {
      montant: 2000.0,
      dateVersement: '2026-08-10',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });

    let rollbackSucceeded = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: soft delete obligation in tx
        await tx.paiementEmploye.update({
          where: { id: ob8.id },
          data: { supprimeLe: new Date() },
        });
        // Step 2: intentionally throw an error before committing
        throw new Error('Simulated network / DB failure mid-transaction');
      });
    } catch (err: any) {
      if (err.message.includes('Simulated')) {
        rollbackSucceeded = true;
      }
    }
    assert(rollbackSucceeded, 'Simulated failure caught during transaction');

    const dbOb8AfterRollback = await prisma.paiementEmploye.findUnique({ where: { id: ob8.id } });
    assert(dbOb8AfterRollback?.supprimeLe === null, 'Atomic rollback confirmed: obligation remains un-deleted');

    // Clean up ob8 with real softDelete
    await paiementsService.softDelete(companyAId, ob8.id);

    // -------------------------------------------------------------------
    // TEST 9 — Outstanding salary balances and payroll statistics
    // -------------------------------------------------------------------
    console.log('\n[TEST 9] Outstanding salary balances & payroll statistics after cancellation...');
    // Create an obligation for statistics testing
    const ob9 = await paiementsService.create(companyAId, {
      idEmploye: empA.id,
      periode: '2026-09',
      salaireReference: 8000.0,
      montantDu: 8000.0,
      motifAjustement: 'Ajustement salaire test 9',
    });
    await paiementsService.createVersement(companyAId, ob9.id, {
      montant: 3000.0,
      dateVersement: '2026-09-12',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });

    const statsBefore = await paiementsService.findStats(companyAId, { idEmploye: empA.id });
    assert(statsBefore.totalDu >= 8000 && statsBefore.totalPaye >= 3000, 'Stats include active obligation (totalDu & totalPaye)');

    await paiementsService.softDelete(companyAId, ob9.id);

    const statsAfter = await paiementsService.findStats(companyAId, { idEmploye: empA.id });
    assert(
      statsAfter.totalDu === statsBefore.totalDu - 8000,
      `totalDu correctly decreased by 8000 (${statsBefore.totalDu} -> ${statsAfter.totalDu})`,
    );
    assert(
      statsAfter.totalPaye === statsBefore.totalPaye - 3000,
      `totalPaye correctly decreased by 3000 (${statsBefore.totalPaye} -> ${statsAfter.totalPaye})`,
    );
    assert(
      statsAfter.soldeRestant === statsBefore.soldeRestant - 5000,
      `soldeRestant correctly decreased by 5000 (${statsBefore.soldeRestant} -> ${statsAfter.soldeRestant})`,
    );

    // -------------------------------------------------------------------
    // TEST 10 — Permission checks and multi-tenant isolation
    // -------------------------------------------------------------------
    console.log('\n[TEST 10] Multi-tenant isolation and invalid payment states...');
    // Create obligation in Company B
    const obB = await paiementsService.create(companyBId, {
      idEmploye: empB.id,
      periode: '2026-10',
      montantDu: 12000.0,
    });

    // Company A attempts to delete Company B's obligation
    let tenantCrossDeleteFailed = false;
    try {
      await paiementsService.softDelete(companyAId, obB.id);
    } catch (err: any) {
      if (err instanceof NotFoundException) tenantCrossDeleteFailed = true;
    }
    assert(tenantCrossDeleteFailed, 'Company A cannot delete Company B obligation (NotFoundException)');

    // Non-existent ID
    let notFoundFailed = false;
    try {
      await paiementsService.softDelete(companyAId, 9999999);
    } catch (err: any) {
      if (err instanceof NotFoundException) notFoundFailed = true;
    }
    assert(notFoundFailed, 'Deleting non-existent obligation ID throws NotFoundException');

    // Invalid company ID
    let invalidCompanyFailed = false;
    try {
      await paiementsService.softDelete(0, obB.id);
    } catch (err: any) {
      if (err instanceof BadRequestException) invalidCompanyFailed = true;
    }
    assert(invalidCompanyFailed, 'Invalid companyId throws BadRequestException');

    // Clean up obB legitimate delete by Company B
    const delB = await paiementsService.softDelete(companyBId, obB.id);
    assert(delB.message.includes('succès'), 'Company B can legitimately soft-delete its own obligation');

    // Teardown
    console.log('\n--- Cleaning up test fixtures ---');
    await prisma.versementEmploye.deleteMany({
      where: { paiementEmploye: { employe: { companyId: { in: [companyAId, companyBId] } } } },
    });
    await prisma.primeEmploye.deleteMany({
      where: { paiementEmploye: { employe: { companyId: { in: [companyAId, companyBId] } } } },
    });
    await prisma.paiementEmploye.deleteMany({
      where: { employe: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.employe.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.paiementEmployeSequence.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.employeSequence.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });

    console.log('✅ Cleanup completed successfully.');

    console.log('\n======================================================================');
    console.log(`=== RESULTS: ${passed} PASSED | ${failed} FAILED ===`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ VERIFICATION FAILED:', error.message, error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase10_2Verification();
