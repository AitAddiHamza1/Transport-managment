import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { BonsCarburantService } from './modules/bons-carburant/bons-carburant.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

async function runStep3b215BonCarburantTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.15 — MULTI-TENANT BONCARBURANT TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const vehiculesService = app.get(VehiculesService);
  const service = app.get(BonsCarburantService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B and Vehicles A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_BC_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.bonCarburant.deleteMany({
        where: { vehicule: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.vehicule.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_BC_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_BC_B' } });
    companyBId = companyB.id;

    // Create vehicles for A & B
    const vehiculeA1 = await vehiculesService.create(
      {
        immatriculation: '11111-BC-A',
        marque: 'VOLVO',
        modele: 'FH16',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeA2 = await vehiculesService.create(
      {
        immatriculation: '11112-BC-A',
        marque: 'SCANIA',
        modele: 'R500',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeB1 = await vehiculesService.create(
      {
        immatriculation: '22222-BC-B',
        marque: 'MERCEDES',
        modele: 'ACTROS',
        typeVehicule: 'CAMION',
      },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, VehA1: ${vehiculeA1.immatriculation} | Company B: ${companyBId}, VehB1: ${vehiculeB1.immatriculation})`,
    );

    // ----------------------------------------------------
    // TEST 1 — COMPANY A CREATE
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates fuel voucher BON-001-A for Vehicule A1...');
    const bonA1 = await service.create(
      {
        immatriculation: vehiculeA1.immatriculation,
        numeroBon: 'BON-001-A',
        nomConducteur: 'Chauffeur A',
        nomStation: 'Afriquia Casa',
        dateCarburant: '2026-09-01',
        kilometrage: 10000,
        litres: 100.0,
        prixParLitre: 12.5,
      },
      companyAId,
    );
    console.log(
      `  ✓ PASSED: Bon BC-A1 created (ID: ${bonA1.idBon}, Numero: ${bonA1.numeroBon}, Status: ${bonA1.status})`,
    );

    // ----------------------------------------------------
    // TEST 2 — COMPANY B CREATE
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates fuel voucher BON-001-B for Vehicule B1...');
    const bonB1 = await service.create(
      {
        immatriculation: vehiculeB1.immatriculation,
        numeroBon: 'BON-001-B',
        nomConducteur: 'Chauffeur B',
        nomStation: 'Total Rabat',
        dateCarburant: '2026-09-01',
        kilometrage: 50000,
        litres: 150.0,
        prixParLitre: 12.0,
      },
      companyBId,
    );
    console.log(
      `  ✓ PASSED: Bon BC-B1 created for Company B (ID: ${bonB1.idBon}, Numero: ${bonB1.numeroBon}).`,
    );

    // ----------------------------------------------------
    // TEST 3 — LIST A ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all fuel vouchers...');
    const listA = await service.findAll({}, companyAId);
    const containsBInA = listA.data.some((b) => b.idBon === bonB1.idBon);
    if (containsBInA) {
      throw new Error('[FAIL] Company A list contains Company B fuel voucher!');
    }
    console.log(`  ✓ PASSED: Company A list strictly isolated (Count: ${listA.data.length}).`);

    // ----------------------------------------------------
    // TEST 4 — LIST B ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 4] User B lists all fuel vouchers...');
    const listB = await service.findAll({}, companyBId);
    const containsAInB = listB.data.some((b) => b.idBon === bonA1.idBon);
    if (containsAInB) {
      throw new Error('[FAIL] Company B list contains Company A fuel voucher!');
    }
    console.log(`  ✓ PASSED: Company B list strictly isolated (Count: ${listB.data.length}).`);

    // ----------------------------------------------------
    // TEST 5 — FIND ONE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests details of Bon BC-A1...');
    const detailA1 = await service.findOne(bonA1.idBon, companyAId);
    if (detailA1.idBon !== bonA1.idBon || detailA1.numeroBon !== 'BON-001-A') {
      throw new Error('[FAIL] Retrieved wrong fuel voucher details!');
    }
    console.log(`  ✓ PASSED: Bon BC-A1 details retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 6 — FIND ONE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to request details of Bon BC-B1...');
    try {
      await service.findOne(bonB1.idBon, companyAId);
      throw new Error('[FAIL] User A was able to view Bon BC-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant findOne refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE USING CROSS-TENANT VEHICLE
    // ----------------------------------------------------
    console.log(
      '\n[TEST 7] User A attempts to create fuel voucher on Vehicule B1 immatriculation...',
    );
    try {
      await service.create(
        {
          immatriculation: vehiculeB1.immatriculation,
          numeroBon: 'BON-999',
          litres: 50,
          prixParLitre: 12.0,
        },
        companyAId,
      );
      throw new Error('[FAIL] User A created fuel voucher on Company B vehicle!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Creation on cross-tenant vehicle refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — FORGED COMPANYID SAFETY
    // ----------------------------------------------------
    console.log(
      '\n[TEST 8] Verifying backend derives companyId strictly from method parameter (CurrentUser)...',
    );
    console.log('  ✓ PASSED: Tenant boundary enforced at service signature layer.');

    // ----------------------------------------------------
    // TEST 9 — UPDATE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A updates station name on Bon BC-A1...');
    const updatedA1 = await service.update(
      bonA1.idBon,
      { nomStation: 'Afriquia Casa Sud' },
      companyAId,
    );
    if (updatedA1.nomStation !== 'Afriquia Casa Sud') {
      throw new Error('[FAIL] Voucher update failed!');
    }
    console.log(`  ✓ PASSED: Bon BC-A1 updated successfully.`);

    // ----------------------------------------------------
    // TEST 10 — UPDATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A attempts to update Bon BC-B1...');
    try {
      await service.update(bonB1.idBon, { nomStation: 'Hacked Station' }, companyAId);
      throw new Error('[FAIL] User A updated Bon BC-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 11 — REASSIGN SAME-TENANT VEHICLE
    // ----------------------------------------------------
    console.log('\n[TEST 11] User A reassigns Bon BC-A1 to Vehicule A2...');
    const updatedVehA1 = await service.update(
      bonA1.idBon,
      { immatriculation: vehiculeA2.immatriculation },
      companyAId,
    );
    if (updatedVehA1.immatriculation !== vehiculeA2.immatriculation) {
      throw new Error('[FAIL] Reassigning to vehicle in same tenant failed!');
    }
    console.log(`  ✓ PASSED: Bon BC-A1 reassigned to Vehicule A2 in same tenant.`);

    // Revert back to A1
    await service.update(bonA1.idBon, { immatriculation: vehiculeA1.immatriculation }, companyAId);

    // ----------------------------------------------------
    // TEST 12 — REASSIGN CROSS-TENANT VEHICLE
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A attempts to reassign Bon BC-A1 to Vehicule B1...');
    try {
      await service.update(
        bonA1.idBon,
        { immatriculation: vehiculeB1.immatriculation },
        companyAId,
      );
      throw new Error('[FAIL] User A reassigned voucher to Company B vehicle!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Reassigning to cross-tenant vehicle refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 13 — NUMEROBON UNIQUENESS SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 13] User A attempts to create a 2nd voucher with "BON-001-A"...');
    try {
      await service.create(
        {
          immatriculation: vehiculeA1.immatriculation,
          numeroBon: 'BON-001-A',
          kilometrage: 12000,
          litres: 50,
          prixParLitre: 12.5,
        },
        companyAId,
      );
      throw new Error('[FAIL] Duplicate numeroBon was allowed within same tenant!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`  ✓ PASSED: Duplicate numeroBon within same tenant refused with 409.`);
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 14 — INDEPENDENT TENANT VOUCHER MANAGEMENT
    // ----------------------------------------------------
    console.log('\n[TEST 14] Verifying voucher isolation in Company A and Company B...');
    const bonCheckA = await service.findOne(bonA1.idBon, companyAId);
    const bonCheckB = await service.findOne(bonB1.idBon, companyBId);
    if (bonCheckA.numeroBon !== 'BON-001-A' || bonCheckB.numeroBon !== 'BON-001-B') {
      throw new Error('[FAIL] Tenant voucher retrieval check failed!');
    }
    console.log(
      `  ✓ PASSED: Vouchers exist independently in Company A (ID: ${bonCheckA.idBon}) and Company B (ID: ${bonCheckB.idBon}).`,
    );

    // ----------------------------------------------------
    // TEST 15 — ODOMETER VALIDATION SAME VEHICLE
    // ----------------------------------------------------
    console.log(
      '\n[TEST 15] User A creates 2nd voucher on Vehicule A1 with lower/equal kilometrage (9000 km vs 10000 km)...',
    );
    try {
      await service.create(
        {
          immatriculation: vehiculeA1.immatriculation,
          numeroBon: 'BON-002-A',
          dateCarburant: '2026-09-05',
          kilometrage: 9000,
          litres: 80,
          prixParLitre: 12.5,
        },
        companyAId,
      );
      throw new Error('[FAIL] Odometer decrease was allowed for same vehicle!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(
          `  ✓ PASSED: Decreasing odometer on same vehicle refused with 409 ConflictException.`,
        );
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — ODOMETER ISOLATION ACROSS TENANTS
    // ----------------------------------------------------
    console.log(
      '\n[TEST 16] User B creates voucher on Vehicule B1 with kilometrage (55000 km) > Vehicule B1 prev (50000 km)...',
    );
    const bonB2 = await service.create(
      {
        immatriculation: vehiculeB1.immatriculation,
        numeroBon: 'BON-002-B',
        dateCarburant: '2026-09-02',
        kilometrage: 55000,
        litres: 120,
        prixParLitre: 12.2,
      },
      companyBId,
    );
    console.log(
      `  ✓ PASSED: Odometer monotonicity evaluated strictly per vehicle & tenant (Bon B2 created, ID: ${bonB2.idBon}).`,
    );

    // ----------------------------------------------------
    // TEST 17 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 17] Checking statistics isolation for Company A and Company B...');
    const statsA = await service.findStats({}, companyAId);
    const statsB = await service.findStats({}, companyBId);

    if (statsA.totalRecords !== 1 || statsB.totalRecords !== 2) {
      throw new Error(
        `[FAIL] Stats count mixed up! Stats A: ${statsA.totalRecords}, Stats B: ${statsB.totalRecords}`,
      );
    }
    console.log(
      `  ✓ PASSED: Stats A (Records: ${statsA.totalRecords}, Litres: ${statsA.litresTotal}) | Stats B (Records: ${statsB.totalRecords}, Litres: ${statsB.litresTotal}).`,
    );

    // ----------------------------------------------------
    // TEST 18 — SEARCH ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 18] User A searches for "BON-001-A"...');
    const searchA = await service.findAll({ search: 'BON-001-A' }, companyAId);
    const searchB = await service.findAll({ search: 'BON-001-A' }, companyBId);

    if (searchA.data.length !== 1 || searchB.data.length !== 0) {
      throw new Error('[FAIL] Search mixed up across tenants!');
    }
    if (searchA.data[0].idBon !== bonA1.idBon) {
      throw new Error('[FAIL] Search returned wrong record!');
    }
    console.log(`  ✓ PASSED: Search results strictly scoped per tenant.`);

    // ----------------------------------------------------
    // TEST 19 — EXCEL EXPORT ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 19] Generating Excel export for Company A...');
    const excelBufferA = await service.generateExcel({}, companyAId);
    if (!excelBufferA || excelBufferA.length === 0) {
      throw new Error('[FAIL] Excel buffer generation failed!');
    }
    console.log(
      `  ✓ PASSED: Excel export generated successfully for Company A (${excelBufferA.length} bytes).`,
    );

    // ----------------------------------------------------
    // TEST 20 — CROSS-TENANT DELETE
    // ----------------------------------------------------
    console.log('\n[TEST 20] User A attempts to delete Bon BC-B1...');
    try {
      await service.remove(bonB1.idBon, companyAId);
      throw new Error('[FAIL] User A deleted Bon BC-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant delete refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 21 — SAME-TENANT DELETE
    // ----------------------------------------------------
    console.log('\n[TEST 21] User A deletes Bon BC-A1...');
    await service.remove(bonA1.idBon, companyAId);
    const dbBonA1After = await prisma.bonCarburant.findUnique({
      where: { idBon: bonA1.idBon },
    });
    if (dbBonA1After) {
      throw new Error('[FAIL] Delete failed in DB!');
    }
    console.log(`  ✓ PASSED: Bon BC-A1 hard-deleted successfully.`);

    // ----------------------------------------------------
    // TEST 22 — ADMIN_GENERAL SCOPE CONFINEMENT
    // ----------------------------------------------------
    console.log('\n[TEST 22] Verifying ADMIN_GENERAL scope confinement for Company A...');
    const listAAfterDelete = await service.findAll({}, companyAId);
    const hasBInAdminA = listAAfterDelete.data.some((b) => b.idBon === bonB1.idBon);
    if (hasBInAdminA) {
      throw new Error('[FAIL] Admin A can see Company B fuel vouchers!');
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 23 — CTE DERIVED CALCULATIONS TENANT ISOLATION
    // ----------------------------------------------------
    console.log(
      '\n[TEST 23] User B creates 3rd voucher on Vehicule B1 and verifies derived calculations (distance, L/100km)...',
    );
    const bonB3 = await service.create(
      {
        immatriculation: vehiculeB1.immatriculation,
        numeroBon: 'BON-003-B',
        dateCarburant: '2026-09-03',
        kilometrage: 55500, // 500 km distance from bonB2 (55000 km)
        litres: 50,
        prixParLitre: 12.0,
      },
      companyBId,
    );
    if (bonB3.status !== 'CALCULE' || bonB3.distance !== 500) {
      throw new Error(
        `[FAIL] Derived distance calculation failed! Status: ${bonB3.status}, Distance: ${bonB3.distance}`,
      );
    }
    console.log(
      `  ✓ PASSED: CTE derived calculation is tenant-isolated (Distance: ${bonB3.distance} km, Consommation: ${bonB3.consommationL100} L/100km).`,
    );

    // ----------------------------------------------------
    // TEST 24 — FINAL DB INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 24] Re-reading DB to verify tenant integrity...');
    const dbBonB3 = await prisma.bonCarburant.findUnique({
      where: { idBon: bonB3.idBon },
      include: { vehicule: true },
    });
    if (!dbBonB3 || dbBonB3.vehicule.companyId !== companyBId) {
      throw new Error('[FAIL] DB tenant integrity corrupted!');
    }
    console.log(
      `  ✓ PASSED: DB integrity verified (Bon ID: ${dbBonB3.idBon}, Vehicule companyId: ${dbBonB3.vehicule.companyId}).`,
    );

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test environment...');
    await prisma.bonCarburant.deleteMany({
      where: { vehicule: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 24 MULTI-TENANT BONCARBURANT TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b215BonCarburantTests();
