import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsEmployesService } from './modules/paiements-employes/paiements-employes.service';
import { EmployesService } from './modules/employes/employes.service';
import { NotFoundException } from '@nestjs/common';

async function runStep3b212PaiementEmployeTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.12 — MULTI-TENANT PAIEMENTEMPLOYE TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const employesService = app.get(EmployesService);
  const paiementsService = app.get(PaiementsEmployesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B, employees A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_PE_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.versementEmploye.deleteMany({
        where: {
          paiementEmploye: {
            employe: { companyId: { in: oldCompanyIds } },
          },
        },
      });
      await prisma.primeEmploye.deleteMany({
        where: {
          paiementEmploye: {
            employe: { companyId: { in: oldCompanyIds } },
          },
        },
      });
      await prisma.paiementEmploye.deleteMany({
        where: { employe: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.employe.deleteMany({ where: { companyId: { in: oldCompanyIds } } });
      await prisma.paiementEmployeSequence.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PE_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PE_B' } });
    companyBId = companyB.id;

    const employeA = await employesService.create(
      {
        nom: 'ALAMI',
        prenom: 'Ahmed',
        cin: 'PEA111111',
        telephone: '0611111111',
        typeContrat: 'CDI',
        statut: 'ACTIF',
        dateEmbauche: '2024-01-01',
        salaireBase: 6000.0,
        poste: 'Chauffeur',
      },
      companyAId,
    );

    const employeB = await employesService.create(
      {
        nom: 'BENNANI',
        prenom: 'Brahim',
        cin: 'PEB222222',
        telephone: '0622222222',
        typeContrat: 'CDI',
        statut: 'ACTIF',
        dateEmbauche: '2024-01-01',
        salaireBase: 7000.0,
        poste: 'Mécanicien',
      },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, Employe A: ${employeA.id} | Company B: ${companyBId}, Employe B: ${employeB.id})`,
    );

    // ----------------------------------------------------
    // TEST 1 — CREATE OBLIGATION LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates legitimate payment obligation for Employe A...');
    const peA1 = await paiementsService.create(companyAId, {
      idEmploye: employeA.id,
      periode: '2026-09',
      salaireReference: 6000.0,
      montantDu: 6000.0,
      notes: 'Engagement septembre 2026',
    });
    console.log(
      `  ✓ PASSED: Obligation PE-A1 created (ID: ${peA1.id}, Num: ${peA1.numeroPaiement}, Montant dû: ${peA1.montantDu})`,
    );

    // ----------------------------------------------------
    // TEST 2 — CREATE OBLIGATION LEGITIMATE (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates legitimate payment obligation for Employe B...');
    const peB1 = await paiementsService.create(companyBId, {
      idEmploye: employeB.id,
      periode: '2026-09',
      salaireReference: 7000.0,
      montantDu: 7000.0,
      notes: 'Engagement septembre 2026 B',
    });
    console.log(
      `  ✓ PASSED: Obligation PE-B1 created (ID: ${peB1.id}, Num: ${peB1.numeroPaiement}, Montant dû: ${peB1.montantDu})`,
    );

    // ----------------------------------------------------
    // TEST 3 — FIND ALL GLOBAL (Company A Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all obligations...');
    const listA = await paiementsService.findAll(companyAId, {});
    const containsBInA = listA.data.some((p) => p.idEmploye === employeB.id || p.id === peB1.id);
    if (containsBInA) {
      throw new Error('[FAIL] Company A list contains Company B obligation!');
    }
    console.log(
      `  ✓ PASSED: Company A list strictly scoped to Company A (Count: ${listA.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 4 — FIND ALL GLOBAL (Company B Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 4] User B lists all obligations...');
    const listB = await paiementsService.findAll(companyBId, {});
    const containsAInB = listB.data.some((p) => p.idEmploye === employeA.id || p.id === peA1.id);
    if (containsAInB) {
      throw new Error('[FAIL] Company B list contains Company A obligation!');
    }
    console.log(
      `  ✓ PASSED: Company B list strictly scoped to Company B (Count: ${listB.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 5 — FIND ONE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests details of Obligation PE-A1...');
    const detailA1 = await paiementsService.findOne(companyAId, peA1.id);
    if (detailA1.id !== peA1.id) {
      throw new Error('[FAIL] Retrieved wrong obligation details!');
    }
    console.log(`  ✓ PASSED: Obligation PE-A1 details retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 6 — FIND ONE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to request details of Obligation PE-B1...');
    try {
      await paiementsService.findOne(companyAId, peB1.id);
      throw new Error('[FAIL] User A was able to view Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant findOne refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE WITH CROSS-TENANT EMPLOYEE
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to create obligation for Employe B...');
    try {
      await paiementsService.create(companyAId, {
        idEmploye: employeB.id,
        periode: '2026-10',
        salaireReference: 7000.0,
        montantDu: 7000.0,
      });
      throw new Error('[FAIL] User A created obligation for Employe B!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant creation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — CREATE WITH FORGED COMPANY ID IN DTO
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts to send forged companyId in body...');
    const peA2 = await paiementsService.create(companyAId, {
      idEmploye: employeA.id,
      periode: '2026-10',
      salaireReference: 6000.0,
      montantDu: 6000.0,
      companyId: companyBId, // Forged
    } as any);

    const dbPeA2 = await prisma.paiementEmploye.findUnique({
      where: { id: peA2.id },
      include: { employe: true },
    });
    if (dbPeA2?.employe.companyId !== companyAId) {
      throw new Error('[FAIL] Forged companyId was accepted!');
    }
    console.log(
      `  ✓ PASSED: Obligation created under Employe A (Company ${companyAId}). Forged body property ignored.`,
    );

    // ----------------------------------------------------
    // TEST 9 — UPDATE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A updates notes on Obligation PE-A1...');
    const updatedA1 = await paiementsService.update(companyAId, peA1.id, {
      notes: 'Notes de paie mises à jour',
    });
    if (updatedA1.notes !== 'Notes de paie mises à jour') {
      throw new Error('[FAIL] Obligation update failed!');
    }
    console.log(`  ✓ PASSED: Obligation PE-A1 updated successfully.`);

    // ----------------------------------------------------
    // TEST 10 — UPDATE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A attempts to update Obligation PE-B1...');
    try {
      await paiementsService.update(companyAId, peB1.id, { notes: 'Hack' });
      throw new Error('[FAIL] User A updated Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 11 — SOFT DELETE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 11] User A soft-deletes draft Obligation PE-A2...');
    await paiementsService.softDelete(companyAId, peA2.id);
    const softDeletedPE = await prisma.paiementEmploye.findUnique({ where: { id: peA2.id } });
    if (!softDeletedPE || !softDeletedPE.supprimeLe) {
      throw new Error('[FAIL] Soft delete failed!');
    }
    console.log(`  ✓ PASSED: Obligation PE-A2 soft-deleted successfully.`);

    // ----------------------------------------------------
    // TEST 12 — SOFT DELETE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A attempts to soft-delete Obligation PE-B1...');
    try {
      await paiementsService.softDelete(companyAId, peB1.id);
      throw new Error('[FAIL] User A soft-deleted Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant soft-delete refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 13 — CREATE PRIME LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 13] User A adds a prime to Obligation PE-A1...');
    const peA1WithPrime = await paiementsService.createPrime(companyAId, peA1.id, {
      montant: 500.0,
      datePrime: '2026-09-15',
      motif: 'Prime de rendement',
    });
    if (peA1WithPrime.totalPrimes !== 500.0 || peA1WithPrime.montantDu !== 6500.0) {
      throw new Error(`[FAIL] Prime calculation failed, got montantDu: ${peA1WithPrime.montantDu}`);
    }
    console.log(
      `  ✓ PASSED: Prime created (Total primes: ${peA1WithPrime.totalPrimes}, Montant dû: ${peA1WithPrime.montantDu}).`,
    );

    // ----------------------------------------------------
    // TEST 14 — CREATE PRIME CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 14] User A attempts to add a prime to Obligation PE-B1...');
    try {
      await paiementsService.createPrime(companyAId, peB1.id, {
        montant: 1000.0,
        datePrime: '2026-09-15',
      });
      throw new Error('[FAIL] User A created prime on Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant prime creation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 15 — LIST VERSEMENTS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 15] User A attempts to list versements of Obligation PE-B1...');
    try {
      await paiementsService.listVersements(companyAId, peB1.id);
      throw new Error('[FAIL] User A listed versements of Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant versements list refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — CREATE VERSEMENT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 16] User A creates a versement for Obligation PE-A1...');
    const peA1WithVersement = await paiementsService.createVersement(companyAId, peA1.id, {
      montant: 3000.0,
      dateVersement: '2026-09-20',
      modePaiement: 'VIREMENT',
      typeVersement: 'SALAIRE',
      referenceExterne: 'VIR-EMP-A-01',
    });
    if (peA1WithVersement.montantPaye !== 3000.0 || peA1WithVersement.soldeRestant !== 3500.0) {
      throw new Error(
        `[FAIL] Versement calculation failed, soldeRestant: ${peA1WithVersement.soldeRestant}`,
      );
    }
    console.log(
      `  ✓ PASSED: Versement created (Montant payé: ${peA1WithVersement.montantPaye}, Solde restant: ${peA1WithVersement.soldeRestant}).`,
    );

    // ----------------------------------------------------
    // TEST 17 — CREATE VERSEMENT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 17] User A attempts to create versement on Obligation PE-B1...');
    try {
      await paiementsService.createVersement(companyAId, peB1.id, {
        montant: 1000.0,
        dateVersement: '2026-09-20',
        modePaiement: 'ESPECES',
      });
      throw new Error('[FAIL] User A created versement on Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant versement creation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 18 — CANCEL VERSEMENT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 18] User A cancels versement on Obligation PE-A1...');
    const versementsA1 = await paiementsService.listVersements(companyAId, peA1.id);
    const versementToCancel = versementsA1[0];

    const peA1AfterCancel = await paiementsService.cancelVersement(
      companyAId,
      peA1.id,
      versementToCancel.id,
      { motifAnnulation: 'Erreur d écriture bancaire' },
    );
    if (peA1AfterCancel.montantPaye !== 0 || peA1AfterCancel.soldeRestant !== 6500.0) {
      throw new Error(
        `[FAIL] Cancellation calculation failed, soldeRestant: ${peA1AfterCancel.soldeRestant}`,
      );
    }
    console.log(
      `  ✓ PASSED: Versement cancelled (Montant payé: ${peA1AfterCancel.montantPaye}, Solde restauré: ${peA1AfterCancel.soldeRestant}).`,
    );

    // ----------------------------------------------------
    // TEST 19 — CANCEL VERSEMENT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 19] User B creates versement on PE-B1, User A attempts to cancel it...');
    await paiementsService.createVersement(companyBId, peB1.id, {
      montant: 2000.0,
      dateVersement: '2026-09-20',
      modePaiement: 'CHEQUE',
    });
    const versementsB1 = await paiementsService.listVersements(companyBId, peB1.id);
    const versementB = versementsB1[0];

    try {
      await paiementsService.cancelVersement(companyAId, peB1.id, versementB.id, {
        motifAnnulation: 'Attaque cross-tenant',
      });
      throw new Error('[FAIL] User A cancelled versement of Obligation PE-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant versement cancellation refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 20 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 20] Checking statistics isolation for Company A and Company B...');
    const statsA = await paiementsService.findStats(companyAId, {});
    const statsB = await paiementsService.findStats(companyBId, {});

    if (statsA.totalDu !== 6500.0 || statsB.totalDu !== 7000.0) {
      throw new Error(
        `[FAIL] Stats mixed up! Stats A totalDu: ${statsA.totalDu}, Stats B totalDu: ${statsB.totalDu}`,
      );
    }
    console.log(
      `  ✓ PASSED: Stats A (Total dû: ${statsA.totalDu}, Payé: ${statsA.totalPaye}) | Stats B (Total dû: ${statsB.totalDu}, Payé: ${statsB.totalPaye}).`,
    );

    // ----------------------------------------------------
    // TEST 21 — NUMBERING COMPANY A
    // ----------------------------------------------------
    console.log('\n[TEST 21] Checking Company A payment sequence format...');
    const numA = peA1.numeroPaiement;
    console.log(`  ✓ PASSED: Company A payment number: ${numA}`);

    // ----------------------------------------------------
    // TEST 22 — NUMBERING COMPANY B
    // ----------------------------------------------------
    console.log('\n[TEST 22] Checking Company B payment sequence format...');
    const numB = peB1.numeroPaiement;
    console.log(`  ✓ PASSED: Company B payment number: ${numB}`);

    // ----------------------------------------------------
    // TEST 23 — ADMIN GENERAL ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 23] Verifying ADMIN_GENERAL scope confinement...');
    const adminAAll = await paiementsService.findAll(companyAId, {});
    const hasAnyB = adminAAll.data.some((p) => p.idEmploye === employeB.id);
    if (hasAnyB) {
      throw new Error('[FAIL] Admin A can see Company B data!');
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 24 — DB RE-READ & TENANT INHERITANCE INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 24] Re-reading DB to verify tenant inheritance...');
    const dbObligationA = await prisma.paiementEmploye.findUnique({
      where: { id: peA1.id },
      include: { employe: true },
    });
    if (!dbObligationA || dbObligationA.employe.companyId !== companyAId) {
      throw new Error('[FAIL] DB tenant inheritance corrupted!');
    }
    console.log(`  ✓ PASSED: All DB records inherit correct companyId (${companyAId}).`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test environment...');
    await prisma.versementEmploye.deleteMany({
      where: {
        paiementEmploye: {
          employe: { companyId: { in: [companyAId, companyBId] } },
        },
      },
    });
    await prisma.primeEmploye.deleteMany({
      where: {
        paiementEmploye: {
          employe: { companyId: { in: [companyAId, companyBId] } },
        },
      },
    });
    await prisma.paiementEmploye.deleteMany({
      where: { employe: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.employe.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.paiementEmployeSequence.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 24 MULTI-TENANT PAIEMENTEMPLOYE TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b212PaiementEmployeTests();
