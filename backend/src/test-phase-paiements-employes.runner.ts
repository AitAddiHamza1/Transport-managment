import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { EmployesService } from './modules/employes/employes.service';
import { PaiementsEmployesService } from './modules/paiements-employes/paiements-employes.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ContratType, PaiementModeEmploye } from '@prisma/client';

async function runPaiementsEmployesInvariantSuite() {
  console.log('\n=================================================================');
  console.log('=== MODULE RH — PAIEMENTS EMPLOYÉS INVARIANT TEST SUITE (REV 2) ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const employesService = app.get(EmployesService);
  const paiementsService = app.get(PaiementsEmployesService);

  const cleanupIds: { employeIds: number[]; obligationIds: number[] } = {
    employeIds: [],
    obligationIds: [],
  };

  try {
    // Setup test employee
    console.log('[SETUP] Creating test employee fixture...');
    const emp1 = await employesService.create({
      nom: ' EL AMRANI ',
      prenom: ' Mehdi ',
      cin: ' PA987654 ',
      poste: ' Responsable Logistique ',
      dateEmbauche: '2025-01-01',
      typeContrat: ContratType.CDI,
      salaireBase: 15000.0,
      modePaiement: PaiementModeEmploye.VIREMENT,
      nomBanque: ' Attijariwafa Bank ',
      rib: ' 245780000999999999999999 ',
    });
    cleanupIds.employeIds.push(emp1.id);
    console.log(`  ✓ Created test employee #${emp1.id} with matricule ${emp1.matricule}`);

    // -------------------------------------------------------------
    // 1. Obligation Creation & Atomic Sequence (PE-YYYY-XXXX)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Obligation Creation & Server-Generated PE-YYYY-XXXX Number...');
    const ob1 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-07',
      montantDu: 15000.0,
      notes: 'Paiement salaire mensuel',
    });
    cleanupIds.obligationIds.push(ob1.id);

    if (!ob1.numeroPaiement || !ob1.numeroPaiement.startsWith('PE-')) {
      throw new Error(`Invalid payment number format, got: ${ob1.numeroPaiement}`);
    }
    if (ob1.salaireReference !== 15000.0 || ob1.montantDu !== 15000.0) {
      throw new Error(
        `Exact Decimal mismatch, got salaireReference=${ob1.salaireReference}, montantDu=${ob1.montantDu}`,
      );
    }
    if (ob1.statut !== 'EN_ATTENTE' || ob1.montantPaye !== 0 || ob1.soldeRestant !== 15000.0) {
      throw new Error(`Invalid initial derived status/totals: ${JSON.stringify(ob1)}`);
    }
    console.log(
      `  ✓ PASSED: Created obligation #${ob1.id} (${ob1.numeroPaiement}) for ${ob1.periode} with status EN_ATTENTE`,
    );

    // -------------------------------------------------------------
    // 2. Duplicate Active Period Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Duplicate Active Employee-Period Rejection...');
    let duplicateRejected = false;
    try {
      await paiementsService.create({
        idEmploye: emp1.id,
        periode: '2026-07',
        montantDu: 15000.0,
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        duplicateRejected = true;
      }
    }
    if (!duplicateRejected) {
      throw new Error('Duplicate active period should throw ConflictException (409)');
    }
    console.log(
      '  ✓ PASSED: Duplicate active period strictly rejected with ConflictException (409)',
    );

    // -------------------------------------------------------------
    // 3. Salary Snapshot & Mandatory Adjustment Reason
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Salary Snapshot & Mandatory Adjustment Reason...');
    let missingReasonRejected = false;
    try {
      await paiementsService.create({
        idEmploye: emp1.id,
        periode: '2026-08',
        salaireReference: 18000.0, // Different from base 15000
        montantDu: 18000.0,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('ajustement')) {
        missingReasonRejected = true;
      }
    }
    if (!missingReasonRejected) {
      throw new Error(
        'Overriding salaireReference without motifAjustement should throw BadRequestException',
      );
    }

    const ob2 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-08',
      salaireReference: 18000.0,
      montantDu: 18000.0,
      motifAjustement: ' Augmentation exceptionnelle avec prime de fin d’année ',
    });
    cleanupIds.obligationIds.push(ob2.id);
    console.log(
      '  ✓ PASSED: Salary override without motifAjustement rejected; accepted with explicit motifAjustement',
    );

    // -------------------------------------------------------------
    // 4. Atomic Initial Versement Creation
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Atomic Initial Versement Creation...');
    const obInitial = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-09',
      montantDu: 15000.0,
      initialVersement: {
        montant: 5000.0,
        dateVersement: '2026-09-05',
        modePaiement: PaiementModeEmploye.VIREMENT,
        referenceExterne: 'VIR-2026-001',
      },
    });
    cleanupIds.obligationIds.push(obInitial.id);

    if (
      obInitial.montantPaye !== 5000.0 ||
      obInitial.soldeRestant !== 10000.0 ||
      obInitial.statut !== 'PARTIELLEMENT_PAYE'
    ) {
      throw new Error(`Initial versement totals error: ${JSON.stringify(obInitial)}`);
    }
    console.log(
      '  ✓ PASSED: Obligation with initial versement created atomically with status PARTIELLEMENT_PAYE',
    );

    // -------------------------------------------------------------
    // 5. Employment Period Overlap Eligibility
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Employment Period Overlap Eligibility...');
    let priorPeriodRejected = false;
    try {
      await paiementsService.create({
        idEmploye: emp1.id,
        periode: '2024-12', // Before hiring date 2025-01-01
        montantDu: 15000.0,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        priorPeriodRejected = true;
      }
    }
    if (!priorPeriodRejected) {
      throw new Error('Period prior to hiring date should throw BadRequestException');
    }
    console.log('  ✓ PASSED: Period prior to employee hiring date strictly rejected');

    // -------------------------------------------------------------
    // 6. Partial Versements, Full Payment & Overpayment Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Partial Versements, Full Payment & Overpayment Rejection...');
    // Add second versement to obInitial (5000 existing, balance 10000)
    const obUpdated1 = await paiementsService.createVersement(obInitial.id, {
      montant: 8000.0,
      dateVersement: '2026-09-15',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });
    if (
      obUpdated1.montantPaye !== 13000.0 ||
      obUpdated1.soldeRestant !== 2000.0 ||
      obUpdated1.statut !== 'PARTIELLEMENT_PAYE'
    ) {
      throw new Error(`Second versement totals mismatch: ${JSON.stringify(obUpdated1)}`);
    }

    // Attempt overpayment (remaining balance 2000, attempt 3000)
    let overpaymentRejected = false;
    try {
      await paiementsService.createVersement(obInitial.id, {
        montant: 3000.0,
        dateVersement: '2026-09-20',
        modePaiement: PaiementModeEmploye.ESPECES,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        overpaymentRejected = true;
      }
    }
    if (!overpaymentRejected) {
      throw new Error('Versement exceeding remaining balance should throw BadRequestException');
    }

    // Complete exact payment (2000)
    const obUpdated2 = await paiementsService.createVersement(obInitial.id, {
      montant: 2000.0,
      dateVersement: '2026-09-25',
      modePaiement: PaiementModeEmploye.CHEQUE,
    });
    if (
      obUpdated2.montantPaye !== 15000.0 ||
      obUpdated2.soldeRestant !== 0 ||
      obUpdated2.statut !== 'PAYE'
    ) {
      throw new Error(
        `Final versement status mismatch, expected PAYE, got: ${JSON.stringify(obUpdated2)}`,
      );
    }
    console.log(
      '  ✓ PASSED: Partial versements tracked accurately, overpayment rejected, status set to PAYE upon full payment',
    );

    // -------------------------------------------------------------
    // 7. Immutability Rules After Versements Exist
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Financial Immutability Rules After Versements Exist...');
    let editAmountRejected = false;
    try {
      await paiementsService.update(obInitial.id, {
        montantDu: 20000.0,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('financières')) {
        editAmountRejected = true;
      }
    }
    if (!editAmountRejected) {
      throw new Error('Updating montantDu after versements exist should throw BadRequestException');
    }
    console.log(
      '  ✓ PASSED: Modifying financial parameters on an obligation with versements is strictly forbidden',
    );

    // -------------------------------------------------------------
    // 8. Versement Cancellation & Re-Derivation of Totals
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Versement Cancellation & Re-Derivation of Totals...');
    const lastVersementId = obUpdated2.versements[obUpdated2.versements.length - 1].id;
    const obAfterCancel = await paiementsService.cancelVersement(obInitial.id, lastVersementId, {
      motifAnnulation: ' Chèque rejeté par la banque (sans provision) ',
    });

    if (
      obAfterCancel.montantPaye !== 13000.0 ||
      obAfterCancel.soldeRestant !== 2000.0 ||
      obAfterCancel.statut !== 'PARTIELLEMENT_PAYE'
    ) {
      throw new Error(`Post-cancellation recalculation error: ${JSON.stringify(obAfterCancel)}`);
    }

    // Duplicate cancellation check
    let duplicateCancelRejected = false;
    try {
      await paiementsService.cancelVersement(obInitial.id, lastVersementId, {
        motifAnnulation: 'Second attempt',
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        duplicateCancelRejected = true;
      }
    }
    if (!duplicateCancelRejected) {
      throw new Error(
        'Cancelling an already cancelled versement should throw ConflictException (409)',
      );
    }
    console.log(
      '  ✓ PASSED: Versement cancelled cleanly; paid total & status dynamically re-derived; duplicate cancellation rejected',
    );

    // -------------------------------------------------------------
    // 9. Soft-Delete Restrictions for Paid vs Draft Obligations
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Soft-Delete Restrictions...');
    let deletePaidRejected = false;
    try {
      await paiementsService.softDelete(obInitial.id);
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        deletePaidRejected = true;
      }
    }
    if (!deletePaidRejected) {
      throw new Error(
        'Soft-deleting an obligation with versements (active/cancelled) should throw BadRequestException',
      );
    }

    // Draft obligation soft delete
    await paiementsService.softDelete(ob1.id);
    let findDeletedFailed = false;
    try {
      await paiementsService.findOne(ob1.id);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        findDeletedFailed = true;
      }
    }
    if (!findDeletedFailed) {
      throw new Error('findOne() should throw NotFoundException for soft-deleted obligation');
    }
    console.log(
      '  ✓ PASSED: Obligation with versements cannot be deleted; draft obligation soft-deleted cleanly',
    );

    // -------------------------------------------------------------
    // 10. Aggregated Stats
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Aggregated Financial Stats...');
    const stats = await paiementsService.findStats({ idEmploye: emp1.id });
    if (
      typeof stats.totalDu !== 'number' ||
      typeof stats.totalPaye !== 'number' ||
      typeof stats.soldeRestant !== 'number'
    ) {
      throw new Error(`Invalid stats result: ${JSON.stringify(stats)}`);
    }
    console.log(
      `  ✓ PASSED: Stats aggregated: totalDu=${stats.totalDu}, totalPaye=${stats.totalPaye}, soldeRestant=${stats.soldeRestant}`,
    );

    // Teardown
    console.log('\n--- Cleaning up test fixtures ---');
    await prisma.versementEmploye.deleteMany({
      where: { idPaiementEmploye: { in: cleanupIds.obligationIds } },
    });
    await prisma.paiementEmploye.deleteMany({
      where: { id: { in: cleanupIds.obligationIds } },
    });
    await prisma.employe.deleteMany({
      where: { id: { in: cleanupIds.employeIds } },
    });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL MODULE RH — PAIEMENTS EMPLOYÉS INVARIANT TESTS PASSED CLEANLY!\n');
  } catch (error: any) {
    console.error('\n❌ INVARIANT SUITE FAILED:', error.message, error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPaiementsEmployesInvariantSuite();
