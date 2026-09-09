import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { EmployesService } from './modules/employes/employes.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ContratType, EmployeStatut, PaiementModeEmploye } from '@prisma/client';

async function runEmployesInvariantSuite() {
  console.log('\n====================================================');
  console.log('=== MODULE RH — EMPLOYÉS INVARIANT TEST SUITE ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(EmployesService);

  try {
    // -------------------------------------------------------------
    // 1. Employee Creation & Server-Generated Matricule
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Employee Creation & Server-Generated Matricule...');
    const emp1 = await service.create({
      nom: ' BENANI ',
      prenom: ' Karim ',
      cin: ' AB123456 ',
      poste: ' Responsable Logistique ',
      dateEmbauche: '2025-01-15',
      typeContrat: ContratType.CDI,
      salaireBase: 12500.5,
      modePaiement: PaiementModeEmploye.VIREMENT,
      nomBanque: ' Attijariwafa Bank ',
      rib: ' 245780000123456789012345 ',
    });

    if (!emp1.matricule || !emp1.matricule.startsWith('EMP-')) {
      throw new Error(`Invalid matricule generated, got: ${emp1.matricule}`);
    }
    if (emp1.nom !== 'BENANI' || emp1.prenom !== 'Karim' || emp1.cin !== 'AB123456') {
      throw new Error(`Fields were not properly trimmed/normalized: ${JSON.stringify(emp1)}`);
    }
    if (emp1.salaireBase !== 12500.5) {
      throw new Error(
        `Exact Decimal salaieBase mismatch, expected 12500.50, got ${emp1.salaireBase}`,
      );
    }
    console.log(
      `  ✓ PASSED: Created employee #${emp1.id} with matricule "${emp1.matricule}" and normalized CIN "${emp1.cin}"`,
    );

    // -------------------------------------------------------------
    // 2. Rejection of Negative Salary & Silent Default 0 Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Negative Salary Rejection & Nullable Reference Salary...');
    let negativeSalaryRejected = false;
    try {
      await service.create({
        nom: 'Alami',
        prenom: 'Youssef',
        poste: 'Comptable',
        dateEmbauche: '2025-02-01',
        typeContrat: ContratType.CDD,
        salaireBase: -500,
      });
    } catch {
      negativeSalaryRejected = true;
    }
    if (!negativeSalaryRejected) {
      throw new Error('Creating employee with negative salary should fail validation');
    }

    // Verify nullable salary (without silent default 0)
    const empNoSalary = await service.create({
      nom: 'Tazi',
      prenom: 'Omar',
      poste: 'Mécanicien',
      dateEmbauche: '2025-03-01',
      typeContrat: ContratType.CDD,
    });
    if (empNoSalary.salaireBase !== null) {
      throw new Error(
        `Unprovided salaireBase should default to null, got: ${empNoSalary.salaireBase}`,
      );
    }
    console.log(
      '  ✓ PASSED: Negative salary rejected, omitted salary preserved as null (no silent 0 default)',
    );

    // -------------------------------------------------------------
    // 3. Conditional VIREMENT Bank & RIB Validation
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Conditional VIREMENT Bank & RIB Validation...');
    let missingBankRejected = false;
    try {
      await service.create({
        nom: 'Drissi',
        prenom: 'Amine',
        poste: 'Agent',
        dateEmbauche: '2025-04-01',
        typeContrat: ContratType.STAGE,
        modePaiement: PaiementModeEmploye.VIREMENT,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('VIREMENT')) {
        missingBankRejected = true;
      }
    }
    if (!missingBankRejected) {
      throw new Error('Mode VIREMENT without bank/RIB should throw BadRequestException');
    }
    console.log('  ✓ PASSED: VIREMENT payment mode strictly requires nomBanque and rib');

    // -------------------------------------------------------------
    // 4. Duplicate Active CIN Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Duplicate Active CIN Rejection...');
    let duplicateCinRejected = false;
    try {
      await service.create({
        nom: 'Duplicate',
        prenom: 'Test',
        cin: 'ab123456', // lowercase version of AB123456
        poste: 'Assistant',
        dateEmbauche: '2025-05-01',
        typeContrat: ContratType.CDI,
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        duplicateCinRejected = true;
      }
    }
    if (!duplicateCinRejected) {
      throw new Error('Duplicate active CIN should throw ConflictException (409)');
    }
    console.log('  ✓ PASSED: Normalized duplicate active CIN rejected with ConflictException');

    // -------------------------------------------------------------
    // 5. Departure Status & dateSortie Consistency Rules
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Departure Status & dateSortie Consistency Rules...');
    let missingDateSortieRejected = false;
    try {
      await service.create({
        nom: 'El Fassi',
        prenom: 'Hassan',
        poste: 'Chauffeur Intérim',
        dateEmbauche: '2024-01-01',
        typeContrat: ContratType.TEMPORAIRE,
        statut: EmployeStatut.DEMISSIONNAIRE,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('date de sortie')) {
        missingDateSortieRejected = true;
      }
    }
    if (!missingDateSortieRejected) {
      throw new Error(
        'Departure status DEMISSIONNAIRE without dateSortie should throw BadRequestException',
      );
    }

    let invalidDateSortieRejected = false;
    try {
      await service.create({
        nom: 'El Fassi',
        prenom: 'Hassan',
        poste: 'Chauffeur Intérim',
        dateEmbauche: '2024-06-01',
        dateSortie: '2024-01-01', // Before hiring date
        typeContrat: ContratType.TEMPORAIRE,
        statut: EmployeStatut.DEMISSIONNAIRE,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('embauche')) {
        invalidDateSortieRejected = true;
      }
    }
    if (!invalidDateSortieRejected) {
      throw new Error('dateSortie before dateEmbauche should throw BadRequestException');
    }
    console.log('  ✓ PASSED: Departure statuses strictly enforce dateSortie >= dateEmbauche');

    // -------------------------------------------------------------
    // 6. Concurrency-Safe Atomic Sequence Generation
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Concurrency-Safe Atomic Sequence Generation...');
    const concurrentCount = 5;
    const concurrentPromises = Array.from({ length: concurrentCount }).map((_, i) =>
      service.create({
        nom: `Concurrent_${i}`,
        prenom: `User_${i}`,
        poste: 'Opérateur',
        dateEmbauche: '2025-06-01',
        typeContrat: ContratType.CDI,
      }),
    );
    const concurrentResults = await Promise.all(concurrentPromises);
    const generatedMatricules = concurrentResults.map((r) => r.matricule);
    const uniqueMatricules = new Set(generatedMatricules);
    if (uniqueMatricules.size !== concurrentCount) {
      throw new Error(
        `Duplicate matricules generated during concurrent creation: ${generatedMatricules}`,
      );
    }
    console.log(
      `  ✓ PASSED: Generated ${concurrentCount} unique consecutive matricules concurrently: ${generatedMatricules.join(', ')}`,
    );

    // -------------------------------------------------------------
    // 7. Soft Delete & CIN Reuse Policy
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Soft Delete & CIN Reuse Policy...');
    await service.softDelete(emp1.id);
    let findDeletedFailed = false;
    try {
      await service.findOne(emp1.id);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        findDeletedFailed = true;
      }
    }
    if (!findDeletedFailed) {
      throw new Error('findOne() should throw NotFoundException for soft-deleted employee');
    }

    // Verify CIN reuse after soft delete via PostgreSQL partial unique index
    const empReuseCin = await service.create({
      nom: 'BENANI',
      prenom: 'Karim (Re-hired)',
      cin: 'AB123456', // Same CIN as soft-deleted emp1
      poste: 'Directeur Logistique',
      dateEmbauche: '2026-01-01',
      typeContrat: ContratType.CDI,
    });
    console.log(
      `  ✓ PASSED: Soft-deleted employee #${emp1.id} hidden; CIN "${emp1.cin}" successfully reused for active employee #${empReuseCin.id}`,
    );

    // -------------------------------------------------------------
    // 8. Stats Aggregation
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Stats Aggregation...');
    const stats = await service.getStats();
    if (
      typeof stats.total !== 'number' ||
      typeof stats.actifs !== 'number' ||
      typeof stats.sortis !== 'number'
    ) {
      throw new Error(`Invalid stats structure: ${JSON.stringify(stats)}`);
    }
    console.log(
      `  ✓ PASSED: Stats aggregated cleanly: total=${stats.total}, actifs=${stats.actifs}, suspendus=${stats.suspendus}, sortis=${stats.sortis}`,
    );

    // -------------------------------------------------------------
    // 9. Teardown
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up disposable test fixtures ---');
    const createdIds = [
      emp1.id,
      empNoSalary.id,
      empReuseCin.id,
      ...concurrentResults.map((r) => r.id),
    ];
    await prisma.employe.deleteMany({
      where: { id: { in: createdIds } },
    });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL MODULE RH — EMPLOYÉS INVARIANT TESTS PASSED CLEANLY!\n');
  } catch (error: any) {
    console.error('\n❌ INVARIANT SUITE FAILED:', error.message, error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runEmployesInvariantSuite();
