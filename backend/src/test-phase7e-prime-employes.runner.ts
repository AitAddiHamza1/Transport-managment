import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { EmployesService } from './modules/employes/employes.service';
import { PaiementsEmployesService } from './modules/paiements-employes/paiements-employes.service';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ContratType, PaiementModeEmploye, VersementEmployeType } from '@prisma/client';

async function runPaiementsEmployesPrimeSuite() {
  console.log('\n=================================================================');
  console.log('=== MODULE RH — PHASE 7E PRIME EMPLOYÉS INVARIANT SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const employesService = app.get(EmployesService);
  const paiementsService = app.get(PaiementsEmployesService);
  const dashboardService = app.get(DashboardService);

  const cleanupIds: { employeIds: number[]; obligationIds: number[] } = {
    employeIds: [],
    obligationIds: [],
  };

  try {
    // Setup test employee sequence & fixture
    console.log('[SETUP] Creating test employee fixture...');
    const maxEmp = await prisma.employe.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const nextSeq = (maxEmp?.id || 0) + 100;
    await prisma.$executeRaw`
      INSERT INTO employe_sequences (prefixe, dernier_numero)
      VALUES ('EMP', ${nextSeq})
      ON CONFLICT (prefixe) DO UPDATE
      SET dernier_numero = GREATEST(employe_sequences.dernier_numero + 1, EXCLUDED.dernier_numero);
    `;
    const emp1 = await employesService.create({
      nom: ' BENALI ',
      prenom: ' Youssef ',
      cin: `AB${Math.floor(100000 + Math.random() * 900000)}`,
      poste: ' Chauffeur Senior ',
      dateEmbauche: '2025-01-01',
      typeContrat: ContratType.CDI,
      salaireBase: 5000.0,
      modePaiement: PaiementModeEmploye.VIREMENT,
      nomBanque: ' Attijariwafa Bank ',
      rib: ' 123456789012345678901234 ',
    });
    cleanupIds.employeIds.push(emp1.id);
    console.log(`  ✓ Created test employee #${emp1.id} with matricule ${emp1.matricule}`);

    // -------------------------------------------------------------
    // TEST 1: Create engagement with Prime = 0
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Create engagement with Prime = 0...');
    const ob1 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-07',
      salaireReference: 5000.0,
      montantDu: 5000.0,
      montantPrime: 0,
    });
    cleanupIds.obligationIds.push(ob1.id);

    if (ob1.salaireReference !== 5000.0 || ob1.totalPrimes !== 0 || ob1.montantDu !== 5000.0) {
      throw new Error(`TEST 1 Failed: Got ${JSON.stringify(ob1)}`);
    }
    console.log(
      `  ✓ PASSED: Obligation #${ob1.id} created with Salary=5000, Primes=0, Total Due=5000`,
    );

    // -------------------------------------------------------------
    // TEST 2: Create engagement with Prime = 500
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Create engagement with Prime = 500...');
    const ob2 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-08',
      salaireReference: 5000.0,
      montantDu: 5500.0,
      montantPrime: 500.0,
      motifPrime: 'Prime de rendement',
    });
    cleanupIds.obligationIds.push(ob2.id);

    if (ob2.salaireReference !== 5000.0 || ob2.totalPrimes !== 500.0 || ob2.montantDu !== 5500.0) {
      throw new Error(`TEST 2 Failed: Got ${JSON.stringify(ob2)}`);
    }
    if (ob2.primes.length !== 1 || ob2.primes[0].montant !== 500.0) {
      throw new Error(`TEST 2 Failed Primes array: ${JSON.stringify(ob2.primes)}`);
    }
    console.log(
      `  ✓ PASSED: Obligation #${ob2.id} created with Salary=5000, Primes=500, Total Due=5500`,
    );

    // -------------------------------------------------------------
    // TEST 3: Modify Salaire de référence & Verify Employe.salaireBase Immutability
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Modify Salaire de référence & verify base salary immutability...');
    const obAdjusted = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-06',
      salaireReference: 5500.0,
      motifAjustement: 'Heures supplémentaires juin',
      montantDu: 5500.0,
    });
    cleanupIds.obligationIds.push(obAdjusted.id);

    const empAfterAdjust = await prisma.employe.findUnique({ where: { id: emp1.id } });
    if (Number(empAfterAdjust?.salaireBase) !== 5000.0) {
      throw new Error(
        `TEST 3 Failed: Employe.salaireBase was modified! Got: ${empAfterAdjust?.salaireBase}`,
      );
    }
    console.log(
      '  ✓ PASSED: Monthly salaireReference set to 5500, Employe.salaireBase remained unchanged at 5000',
    );

    // -------------------------------------------------------------
    // TEST 4: Reference salary differs from base salary without motifAjustement
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Reference salary differs without motifAjustement...');
    let missingMotifRejected = false;
    try {
      await paiementsService.create({
        idEmploye: emp1.id,
        periode: '2026-05',
        salaireReference: 6000.0,
        montantDu: 6000.0,
        // motifAjustement missing
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        missingMotifRejected = true;
      }
    }
    if (!missingMotifRejected) {
      throw new Error(
        'TEST 4 Failed: Differing reference salary without motifAjustement should throw BadRequestException',
      );
    }
    console.log(
      '  ✓ PASSED: Reference salary differing from base salary strictly requires motifAjustement',
    );

    // -------------------------------------------------------------
    // TEST 5: Create engagement with multiple Primes
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Create engagement with multiple Primes...');
    const ob3 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-09',
      salaireReference: 5000.0,
      montantDu: 5500.0,
      montantPrime: 500.0,
      motifPrime: 'Prime 1',
    });
    cleanupIds.obligationIds.push(ob3.id);

    const ob3WithPrime2 = await paiementsService.createPrime(ob3.id, {
      montant: 300.0,
      datePrime: '2026-09-15',
      motif: 'Prime 2',
    });

    if (
      ob3WithPrime2.salaireReference !== 5000.0 ||
      ob3WithPrime2.totalPrimes !== 800.0 ||
      ob3WithPrime2.montantDu !== 5800.0
    ) {
      throw new Error(`TEST 3 Failed: Got ${JSON.stringify(ob3WithPrime2)}`);
    }
    if (ob3WithPrime2.primes.length !== 2) {
      throw new Error(`TEST 3 Failed: Expected 2 primes, got ${ob3WithPrime2.primes.length}`);
    }
    console.log(
      `  ✓ PASSED: Multiple primes aggregated cleanly: Prime 1=500, Prime 2=300 -> Total Primes=800, Total Due=5800`,
    );

    // -------------------------------------------------------------
    // TEST 4: Pay salary completely
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Pay salary completely...');
    const ob4 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-10',
      salaireReference: 5000.0,
      montantDu: 5000.0,
    });
    cleanupIds.obligationIds.push(ob4.id);

    const ob4Paid = await paiementsService.createVersement(ob4.id, {
      montant: 5000.0,
      dateVersement: '2026-10-05',
      modePaiement: PaiementModeEmploye.VIREMENT,
      typeVersement: VersementEmployeType.SALAIRE,
    });

    if (ob4Paid.montantPaye !== 5000.0 || ob4Paid.soldeRestant !== 0 || ob4Paid.statut !== 'PAYE') {
      throw new Error(`TEST 4 Failed: Got ${JSON.stringify(ob4Paid)}`);
    }
    console.log('  ✓ PASSED: Salary paid in full, Solde=0, Statut=PAYE');

    // -------------------------------------------------------------
    // TEST 5: Add Prime after salary was already fully paid
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Add Prime after salary was already fully paid...');
    const ob4WithLatePrime = await paiementsService.createPrime(ob4.id, {
      montant: 500.0,
      datePrime: '2026-10-20',
      motif: 'Bonus de fin de projet',
    });

    if (
      ob4WithLatePrime.montantDu !== 5500.0 ||
      ob4WithLatePrime.montantPaye !== 5000.0 ||
      ob4WithLatePrime.soldeRestant !== 500.0 ||
      ob4WithLatePrime.statut !== 'PARTIELLEMENT_PAYE'
    ) {
      throw new Error(`TEST 5 Failed: Got ${JSON.stringify(ob4WithLatePrime)}`);
    }
    console.log(
      '  ✓ PASSED: Adding Prime after full payment increased Total Due to 5500, Solde Restant to 500, Statut back to PARTIELLEMENT_PAYE',
    );

    // -------------------------------------------------------------
    // TEST 6: Pay Prime
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Pay Prime...');
    const ob4PrimePaid = await paiementsService.createVersement(ob4.id, {
      montant: 500.0,
      dateVersement: '2026-10-25',
      modePaiement: PaiementModeEmploye.VIREMENT,
      typeVersement: VersementEmployeType.PRIME,
    });

    if (
      ob4PrimePaid.montantPaye !== 5500.0 ||
      ob4PrimePaid.soldeRestant !== 0 ||
      ob4PrimePaid.statut !== 'PAYE'
    ) {
      throw new Error(`TEST 6 Failed: Got ${JSON.stringify(ob4PrimePaid)}`);
    }
    console.log('  ✓ PASSED: Prime versement paid, Solde returned to 0, Statut=PAYE');

    // -------------------------------------------------------------
    // TEST 7: Partial payment (Salary=5000, Prime=500, Payment=3000)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Partial payment...');
    const ob7 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-11',
      salaireReference: 5000.0,
      montantDu: 5500.0,
      montantPrime: 500.0,
    });
    cleanupIds.obligationIds.push(ob7.id);

    const ob7Part = await paiementsService.createVersement(ob7.id, {
      montant: 3000.0,
      dateVersement: '2026-11-10',
      modePaiement: PaiementModeEmploye.VIREMENT,
    });

    if (
      ob7Part.montantDu !== 5500.0 ||
      ob7Part.montantPaye !== 3000.0 ||
      ob7Part.soldeRestant !== 2500.0 ||
      ob7Part.statut !== 'PARTIELLEMENT_PAYE'
    ) {
      throw new Error(`TEST 7 Failed: Got ${JSON.stringify(ob7Part)}`);
    }
    console.log('  ✓ PASSED: Partial payment of 3000 on 5500 leaves 2500 remaining balance');

    // -------------------------------------------------------------
    // TEST 8: Overpayment Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Overpayment Rejection...');
    let overpaymentRejected = false;
    try {
      await paiementsService.createVersement(ob7.id, {
        montant: 3000.0, // Remaining balance is 2500
        dateVersement: '2026-11-15',
        modePaiement: PaiementModeEmploye.VIREMENT,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        overpaymentRejected = true;
      }
    }
    if (!overpaymentRejected) {
      throw new Error('Overpayment should be rejected with BadRequestException');
    }
    console.log('  ✓ PASSED: Overpayment attempt (3000 > 2500 remaining) strictly rejected');

    // -------------------------------------------------------------
    // TEST 9: Cancelled Payment Re-derivation
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Cancelled Payment Re-derivation...');
    const versementIdToCancel = ob7Part.versements[0].id;
    const ob7AfterCancel = await paiementsService.cancelVersement(ob7.id, versementIdToCancel, {
      motifAnnulation: 'Erreur de saisie',
    });

    if (
      ob7AfterCancel.montantPaye !== 0 ||
      ob7AfterCancel.soldeRestant !== 5500.0 ||
      ob7AfterCancel.statut !== 'EN_ATTENTE'
    ) {
      throw new Error(`TEST 9 Failed: Got ${JSON.stringify(ob7AfterCancel)}`);
    }
    console.log(
      '  ✓ PASSED: Versement cancelled cleanly; paid total reset to 0, balance to 5500, status to EN_ATTENTE',
    );

    // -------------------------------------------------------------
    // TEST 10: Versement Types Stored Correctly
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Versement Types Classification...');
    const ob10 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: '2026-12',
      salaireReference: 5000.0,
      montantDu: 5500.0,
      montantPrime: 500.0,
    });
    cleanupIds.obligationIds.push(ob10.id);

    await paiementsService.createVersement(ob10.id, {
      montant: 5000.0,
      dateVersement: '2026-12-05',
      modePaiement: PaiementModeEmploye.VIREMENT,
      typeVersement: VersementEmployeType.SALAIRE,
    });
    const v2 = await paiementsService.createVersement(ob10.id, {
      montant: 500.0,
      dateVersement: '2026-12-10',
      modePaiement: PaiementModeEmploye.ESPECES,
      typeVersement: VersementEmployeType.PRIME,
    });

    if (
      v2.versements[0].typeVersement !== 'SALAIRE' ||
      v2.versements[1].typeVersement !== 'PRIME'
    ) {
      throw new Error(`TEST 10 Failed: Types mismatch ${JSON.stringify(v2.versements)}`);
    }
    console.log('  ✓ PASSED: Versement types SALAIRE and PRIME stored and reported cleanly');

    // -------------------------------------------------------------
    // TEST 11: Dashboard Outflow Regression Check
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Dashboard Cash Outflow Regression Check...');
    const testPeriodYearMonth = '2039-01';
    const ob11 = await paiementsService.create({
      idEmploye: emp1.id,
      periode: testPeriodYearMonth,
      salaireReference: 5000.0,
      montantDu: 6000.0,
      montantPrime: 1000.0, // Obligation created, NO VERSEMENT YET
    });
    cleanupIds.obligationIds.push(ob11.id);

    const dashboardBefore = await dashboardService.getOverview(
      { preset: 'PERSONNALISE', dateDebut: '2039-01-01', dateFin: '2039-01-31' },
      {},
      true,
    );

    if (dashboardBefore.financial.employeeOutflow !== '0.00') {
      throw new Error(
        `TEST 11 Failed: Expected employeeOutflow='0.00' for un-disbursed prime, got: ${dashboardBefore.financial.employeeOutflow}`,
      );
    }

    // Now make actual versement
    await paiementsService.createVersement(ob11.id, {
      montant: 1000.0,
      dateVersement: '2039-01-15',
      modePaiement: PaiementModeEmploye.VIREMENT,
      typeVersement: VersementEmployeType.PRIME,
    });

    const dashboardAfter = await dashboardService.getOverview(
      { preset: 'PERSONNALISE', dateDebut: '2039-01-01', dateFin: '2039-01-31' },
      {},
      true,
    );

    if (dashboardAfter.financial.employeeOutflow !== '1000.00') {
      throw new Error(
        `TEST 11 Failed: Expected employeeOutflow='1000.00' after versement, got: ${dashboardAfter.financial.employeeOutflow}`,
      );
    }
    console.log(
      '  ✓ PASSED: Dashboard cash outflow ignores Prime obligation until actual Versement is disbursed',
    );

    // -------------------------------------------------------------
    // TEST 12: Invalid Decimal & Negative Prime Protection
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Negative / Invalid Prime Protection...');
    let invalidPrimeRejected = false;
    try {
      await paiementsService.createPrime(ob11.id, {
        montant: -200.0,
        datePrime: '2027-01-20',
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        invalidPrimeRejected = true;
      }
    }
    if (!invalidPrimeRejected) {
      throw new Error('Negative prime should throw BadRequestException');
    }
    // -------------------------------------------------------------
    // TEST 13: Duplicate Monthly Engagement Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Duplicate Monthly Engagement Rejection...');
    let duplicateRejected = false;
    try {
      await paiementsService.create({
        idEmploye: emp1.id,
        periode: '2026-07', // Period 2026-07 already exists for emp1
        salaireReference: 5000.0,
        montantDu: 5000.0,
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        duplicateRejected = true;
      }
    }
    if (!duplicateRejected) {
      throw new Error(
        'TEST 13 Failed: Creating duplicate engagement for same period should throw ConflictException',
      );
    }
    console.log(
      '  ✓ PASSED: Duplicate monthly engagement for same period strictly rejected with ConflictException (409)',
    );

    // Teardown
    console.log('\n--- Cleaning up test fixtures ---');
    await prisma.versementEmploye.deleteMany({
      where: { idPaiementEmploye: { in: cleanupIds.obligationIds } },
    });
    await prisma.primeEmploye.deleteMany({
      where: { idPaiementEmploye: { in: cleanupIds.obligationIds } },
    });
    await prisma.paiementEmploye.deleteMany({
      where: { id: { in: cleanupIds.obligationIds } },
    });
    await prisma.employe.deleteMany({
      where: { id: { in: cleanupIds.employeIds } },
    });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL MODULE RH — PHASE 7E PRIME EMPLOYÉS INVARIANT TESTS PASSED CLEANLY!\n');
  } catch (error: any) {
    console.error('\n❌ INVARIANT SUITE FAILED:', error.message, error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPaiementsEmployesPrimeSuite();
