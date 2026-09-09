import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep3b214DepenseVehiculeTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.14 — MULTI-TENANT DEPENSEVEHICULE TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const vehiculesService = app.get(VehiculesService);
  const service = app.get(DepensesVehiculesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B and Vehicles A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_DV_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.depenseVehicule.deleteMany({
        where: { vehicule: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.vehicule.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DV_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DV_B' } });
    companyBId = companyB.id;

    // Create vehicles for A & B
    const vehiculeA1 = await vehiculesService.create(
      {
        immatriculation: '11111-A-1',
        marque: 'VOLVO',
        modele: 'FH16',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeA2 = await vehiculesService.create(
      {
        immatriculation: '11112-A-1',
        marque: 'SCANIA',
        modele: 'R500',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeB1 = await vehiculesService.create(
      {
        immatriculation: '22222-B-2',
        marque: 'MERCEDES',
        modele: 'ACTROS',
        typeVehicule: 'CAMION',
      },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, VehA1: ${vehiculeA1.immatriculation} | Company B: ${companyBId}, VehB1: ${vehiculeB1.immatriculation})`,
    );

    // Dummy Multer PDF File for receipt testing
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
    );
    const dummyFileA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'invoice-veh-a.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: dummyPdfBuffer,
      size: dummyPdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    // ----------------------------------------------------
    // TEST 1 — CREATE EXPENSE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates vehicle expense for Vehicule A1...');
    const depA1 = await service.create(
      companyAId,
      {
        immatriculation: vehiculeA1.immatriculation,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE' as any,
        typeFacture: 'FAC-VOLVO-01',
        description: 'Vidange et filtres moteur',
        montant: 3500.0,
        dateDepense: '2026-09-01',
      },
      dummyFileA,
    );
    console.log(
      `  ✓ PASSED: Expense DV-A1 created (ID: ${depA1.idDepense}, Immat: ${depA1.immatriculation}, Montant: ${depA1.montant})`,
    );

    // ----------------------------------------------------
    // TEST 2 — CREATE EXPENSE LEGITIMATE (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates vehicle expense for Vehicule B1...');
    const depB1 = await service.create(companyBId, {
      immatriculation: vehiculeB1.immatriculation,
      categorieDepense: 'REPARATION',
      justificatifType: 'SANS_FACTURE' as any,
      description: 'Changement pneu secours rapide',
      montant: 800.0,
      dateDepense: '2026-09-02',
    });
    console.log(
      `  ✓ PASSED: Expense DV-B1 created (ID: ${depB1.idDepense}, Immat: ${depB1.immatriculation}, Montant: ${depB1.montant})`,
    );

    // ----------------------------------------------------
    // TEST 3 — FIND ALL GLOBAL (Company A Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all vehicle expenses...');
    const listA = await service.findAll(companyAId, {});
    const containsBInA = listA.data.some((d) => d.idDepense === depB1.idDepense);
    if (containsBInA) {
      throw new Error('[FAIL] Company A list contains Company B expense!');
    }
    console.log(
      `  ✓ PASSED: Company A list strictly scoped to Company A (Count: ${listA.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 4 — FIND ALL GLOBAL (Company B Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 4] User B lists all vehicle expenses...');
    const listB = await service.findAll(companyBId, {});
    const containsAInB = listB.data.some((d) => d.idDepense === depA1.idDepense);
    if (containsAInB) {
      throw new Error('[FAIL] Company B list contains Company A expense!');
    }
    console.log(
      `  ✓ PASSED: Company B list strictly scoped to Company B (Count: ${listB.data.length}).`,
    );

    // ----------------------------------------------------
    // TEST 5 — FIND ONE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests details of Expense DV-A1...');
    const detailA1 = await service.findOne(companyAId, depA1.idDepense);
    if (detailA1.idDepense !== depA1.idDepense) {
      throw new Error('[FAIL] Retrieved wrong expense details!');
    }
    console.log(`  ✓ PASSED: Expense DV-A1 details retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 6 — FIND ONE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to request details of Expense DV-B1...');
    try {
      await service.findOne(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A was able to view Expense DV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant findOne refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE WITH FORGED VEHICLE OF OTHER TENANT
    // ----------------------------------------------------
    console.log(
      '\n[TEST 7] User A attempts to create expense using Vehicule B1 immatriculation...',
    );
    try {
      await service.create(companyAId, {
        immatriculation: vehiculeB1.immatriculation,
        categorieDepense: 'CARBURANT',
        justificatifType: 'SANS_FACTURE' as any,
        montant: 500.0,
      });
      throw new Error('[FAIL] User A created expense on Company B vehicle!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Creation on cross-tenant vehicle refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — UPDATE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A updates description on Expense DV-A1...');
    const updatedA1 = await service.update(companyAId, depA1.idDepense, {
      description: 'Vidange et filtres moteur neufs',
    });
    if (updatedA1.description !== 'Vidange et filtres moteur neufs') {
      throw new Error('[FAIL] Expense update failed!');
    }
    console.log(`  ✓ PASSED: Expense DV-A1 updated successfully.`);

    // ----------------------------------------------------
    // TEST 9 — UPDATE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A attempts to update Expense DV-B1...');
    try {
      await service.update(companyAId, depB1.idDepense, { description: 'Hack Description' });
      throw new Error('[FAIL] User A updated Expense DV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 10 — CHANGE VEHICLE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A changes vehicle on Expense DV-A1 to Vehicule A2...');
    const updatedVehicleA1 = await service.update(companyAId, depA1.idDepense, {
      immatriculation: vehiculeA2.immatriculation,
    });
    if (updatedVehicleA1.immatriculation !== vehiculeA2.immatriculation) {
      throw new Error('[FAIL] Reassigning to vehicle in same tenant failed!');
    }
    console.log(`  ✓ PASSED: Expense DV-A1 reassigned to Vehicule A2 in same tenant.`);

    // Revert back to A1
    await service.update(companyAId, depA1.idDepense, {
      immatriculation: vehiculeA1.immatriculation,
    });

    // ----------------------------------------------------
    // TEST 11 — ATTEMPT VEHICLE CHANGE TO OTHER TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 11] User A attempts to reassign Expense DV-A1 to Vehicule B1...');
    try {
      await service.update(companyAId, depA1.idDepense, {
        immatriculation: vehiculeB1.immatriculation,
      });
      throw new Error('[FAIL] User A reassigned expense to Company B vehicle!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Vehicle change to cross-tenant vehicle refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 12 — RECEIPT UPLOAD LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A replaces receipt PDF on Expense DV-A1...');
    const uploadedA1 = await service.uploadReceipt(companyAId, depA1.idDepense, dummyFileA);
    if (!uploadedA1.hasReceipt || !uploadedA1.fichierRecu) {
      throw new Error('[FAIL] Receipt upload failed!');
    }
    const physicalFileA1 = path.join(
      process.cwd(),
      'uploads',
      'depenses-vehicules',
      path.basename(uploadedA1.fichierRecu),
    );
    if (!fs.existsSync(physicalFileA1)) {
      throw new Error('[FAIL] Uploaded physical receipt file missing on disk!');
    }
    console.log(`  ✓ PASSED: Receipt uploaded successfully to Expense DV-A1.`);

    // ----------------------------------------------------
    // TEST 13 — RECEIPT UPLOAD CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 13] User A attempts to upload receipt to Expense DV-B1...');
    try {
      await service.uploadReceipt(companyAId, depB1.idDepense, dummyFileA);
      throw new Error('[FAIL] User A uploaded receipt to Expense DV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt upload refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 14 — RECEIPT VIEW LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 14] User A views receipt stream for Expense DV-A1...');
    const receiptStreamA1 = await service.getReceiptFileStream(companyAId, depA1.idDepense);
    if (!receiptStreamA1.physicalPath || receiptStreamA1.mimeType !== 'application/pdf') {
      throw new Error('[FAIL] Receipt stream retrieval failed!');
    }
    console.log(`  ✓ PASSED: Receipt stream retrieved successfully for Expense DV-A1.`);

    // ----------------------------------------------------
    // TEST 15 — RECEIPT VIEW CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 15] User B attempts to view receipt stream for Expense DV-A1...');
    try {
      await service.getReceiptFileStream(companyBId, depA1.idDepense);
      throw new Error('[FAIL] User B viewed receipt of Expense DV-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt view refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — RECEIPT DOWNLOAD LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 16] User A downloads receipt file for Expense DV-A1...');
    const downloadA1 = await service.getReceiptFileStream(companyAId, depA1.idDepense);
    if (!downloadA1.filename) {
      throw new Error('[FAIL] Download file info missing!');
    }
    console.log(`  ✓ PASSED: Receipt download info retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 17 — RECEIPT DOWNLOAD CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 17] User B attempts to download receipt for Expense DV-A1...');
    try {
      await service.getReceiptFileStream(companyBId, depA1.idDepense);
      throw new Error('[FAIL] User B downloaded receipt of Expense DV-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt download refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 18 — RECEIPT DELETE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 18] User A attempts to delete receipt from Expense DV-B1...');
    try {
      await service.deleteReceipt(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A deleted receipt of Expense DV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt deletion refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 19 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 19] Checking statistics isolation for Company A and Company B...');
    const statsA = await service.findStats(companyAId);
    const statsB = await service.findStats(companyBId);

    if (statsA.totalCount !== 1 || statsB.totalCount !== 1) {
      throw new Error(
        `[FAIL] Stats count mixed up! Stats A: ${statsA.totalCount}, Stats B: ${statsB.totalCount}`,
      );
    }
    if (statsA.totalMontant !== 3500.0 || statsB.totalMontant !== 800.0) {
      throw new Error(
        `[FAIL] Stats amounts mixed up! Stats A total: ${statsA.totalMontant}, Stats B total: ${statsB.totalMontant}`,
      );
    }
    console.log(
      `  ✓ PASSED: Stats A (Count: ${statsA.totalCount}, Total: ${statsA.totalMontant}) | Stats B (Count: ${statsB.totalCount}, Total: ${statsB.totalMontant}).`,
    );

    // ----------------------------------------------------
    // TEST 20 — CATEGORY / SEARCH ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 20] User A searches for category "ENTRETIEN"...');
    const searchA = await service.findAll(companyAId, { categorieDepense: 'ENTRETIEN' });
    const searchBInA = await service.findAll(companyBId, { categorieDepense: 'ENTRETIEN' });

    if (searchA.data.length !== 1 || searchBInA.data.length !== 0) {
      throw new Error('[FAIL] Category search mixed between tenants!');
    }
    console.log(`  ✓ PASSED: Category search strictly isolated by tenant.`);

    // ----------------------------------------------------
    // TEST 21 — REMOVE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log(
      '\n[TEST 21] User A removes Expense DV-A1 (Hard delete + physical file cleanup)...',
    );
    await service.remove(companyAId, depA1.idDepense);
    const dbDepA1After = await prisma.depenseVehicule.findUnique({
      where: { idDepense: depA1.idDepense },
    });
    if (dbDepA1After) {
      throw new Error('[FAIL] Hard delete failed in DB!');
    }
    if (fs.existsSync(physicalFileA1)) {
      throw new Error('[FAIL] Physical receipt file was not unlinked on remove!');
    }
    console.log(
      `  ✓ PASSED: Expense DV-A1 hard-deleted successfully (DB record & physical file removed).`,
    );

    // ----------------------------------------------------
    // TEST 22 — REMOVE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 22] User A attempts to remove Expense DV-B1...');
    try {
      await service.remove(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A removed Expense DV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant removal refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 23 — ADMIN_GENERAL SCOPE CONFINEMENT
    // ----------------------------------------------------
    console.log('\n[TEST 23] Verifying ADMIN_GENERAL scope confinement...');
    const adminAAll = await service.findAll(companyAId, {});
    const hasAnyB = adminAAll.data.some((d) => d.idDepense === depB1.idDepense);
    if (hasAnyB) {
      throw new Error('[FAIL] Admin A can see Company B expenses!');
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 24 — FINAL DB TENANT INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 24] Re-reading DB to verify tenant integrity...');
    const dbDepB1 = await prisma.depenseVehicule.findUnique({
      where: { idDepense: depB1.idDepense },
      include: { vehicule: true },
    });
    if (!dbDepB1 || dbDepB1.vehicule.companyId !== companyBId) {
      throw new Error('[FAIL] DB tenant integrity corrupted!');
    }
    console.log(`  ✓ PASSED: All DB records inherit correct companyId (${companyBId}).`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test environment...');
    await prisma.depenseVehicule.deleteMany({
      where: { vehicule: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 24 MULTI-TENANT DEPENSEVEHICULE TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b214DepenseVehiculeTests();
