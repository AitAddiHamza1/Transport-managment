import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DepensesAdministrativesService } from './modules/depenses-administratives/depenses-administratives.service';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep3b213DepenseAdministrativeTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.13 — MULTI-TENANT DEPENSEADMINISTRATIVE TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(DepensesAdministrativesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_DA_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.depenseAdministrative.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DA_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DA_B' } });
    companyBId = companyB.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId} | Company B: ${companyBId})`);

    // Dummy Multer PDF File for receipt testing
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
    );
    const dummyFileA: Express.Multer.File = {
      fieldname: 'recu',
      originalname: 'receipt-company-a.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: dummyPdfBuffer,
      size: dummyPdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const dummyFileB: Express.Multer.File = {
      fieldname: 'recu',
      originalname: 'receipt-company-b.pdf',
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
    console.log('\n[TEST 1] User A creates administrative expense in Company A...');
    const depA1 = await service.create(companyAId, {
      categorieDepense: 'LOYER',
      description: 'Loyer bureau Casablanca Septembre 2026',
      montant: 8500.0,
      dateDepense: '2026-09-01',
    });
    console.log(
      `  ✓ PASSED: Expense DA-A1 created (ID: ${depA1.idDepense}, Montant: ${depA1.montant})`,
    );

    // ----------------------------------------------------
    // TEST 2 — CREATE EXPENSE LEGITIMATE (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates administrative expense in Company B...');
    const depB1 = await service.create(companyBId, {
      categorieDepense: 'ELECTRICITE',
      description: 'Facture Redal Septembre 2026',
      montant: 1200.0,
      dateDepense: '2026-09-02',
    });
    console.log(
      `  ✓ PASSED: Expense DA-B1 created (ID: ${depB1.idDepense}, Montant: ${depB1.montant})`,
    );

    // ----------------------------------------------------
    // TEST 3 — FIND ALL GLOBAL (Company A Isolation)
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all administrative expenses...');
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
    console.log('\n[TEST 4] User B lists all administrative expenses...');
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
    console.log('\n[TEST 5] User A requests details of Expense DA-A1...');
    const detailA1 = await service.findOne(companyAId, depA1.idDepense);
    if (detailA1.idDepense !== depA1.idDepense) {
      throw new Error('[FAIL] Retrieved wrong expense details!');
    }
    console.log(`  ✓ PASSED: Expense DA-A1 details retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 6 — FIND ONE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to request details of Expense DA-B1...');
    try {
      await service.findOne(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A was able to view Expense DA-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant findOne refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE WITH FORGED COMPANY ID IN DTO
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to send forged companyId in body...');
    const depA2 = await service.create(companyAId, {
      categorieDepense: 'TELEPHONE_INTERNET',
      description: 'Abonnement Fibre Maroc Telecom',
      montant: 499.0,
      companyId: companyBId, // Forged
    } as any);

    const dbDepA2 = await prisma.depenseAdministrative.findUnique({
      where: { idDepense: depA2.idDepense },
    });
    if (dbDepA2?.companyId !== companyAId) {
      throw new Error('[FAIL] Forged companyId was accepted!');
    }
    console.log(
      `  ✓ PASSED: Expense created under Company A (${companyAId}). Forged body property ignored.`,
    );

    // ----------------------------------------------------
    // TEST 8 — UPDATE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A updates description on Expense DA-A1...');
    const updatedA1 = await service.update(companyAId, depA1.idDepense, {
      description: 'Loyer bureau Siege Casablanca Septembre 2026',
    });
    if (updatedA1.description !== 'Loyer bureau Siege Casablanca Septembre 2026') {
      throw new Error('[FAIL] Expense update failed!');
    }
    console.log(`  ✓ PASSED: Expense DA-A1 updated successfully.`);

    // ----------------------------------------------------
    // TEST 9 — UPDATE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 9] User A attempts to update Expense DA-B1...');
    try {
      await service.update(companyAId, depB1.idDepense, { description: 'Hack Description' });
      throw new Error('[FAIL] User A updated Expense DA-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 10 — UPLOAD RECEIPT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A uploads receipt PDF to Expense DA-A1...');
    const uploadedA1 = await service.uploadOrReplaceReceipt(
      companyAId,
      depA1.idDepense,
      dummyFileA,
    );
    if (!uploadedA1.hasReceipt || !uploadedA1.fichierRecu) {
      throw new Error('[FAIL] Receipt upload failed!');
    }
    const physicalFileA1 = path.join(
      process.cwd(),
      'uploads',
      'depenses-administratives',
      path.basename(uploadedA1.fichierRecu),
    );
    if (!fs.existsSync(physicalFileA1)) {
      throw new Error('[FAIL] Uploaded physical receipt file missing on disk!');
    }
    console.log(
      `  ✓ PASSED: Receipt uploaded successfully to Expense DA-A1 (Physical file present).`,
    );

    // ----------------------------------------------------
    // TEST 11 — UPLOAD RECEIPT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 11] User A attempts to upload receipt to Expense DA-B1...');
    try {
      await service.uploadOrReplaceReceipt(companyAId, depB1.idDepense, dummyFileA);
      throw new Error('[FAIL] User A uploaded receipt to Expense DA-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt upload refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 12 — VIEW RECEIPT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A views receipt stream for Expense DA-A1...');
    const receiptStreamA1 = await service.getReceiptFileStream(companyAId, depA1.idDepense);
    if (!receiptStreamA1.physicalPath || receiptStreamA1.mimeType !== 'application/pdf') {
      throw new Error('[FAIL] Receipt stream retrieval failed!');
    }
    console.log(`  ✓ PASSED: Receipt stream retrieved successfully for Expense DA-A1.`);

    // ----------------------------------------------------
    // TEST 13 — VIEW RECEIPT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 13] User B attempts to view receipt stream for Expense DA-A1...');
    try {
      await service.getReceiptFileStream(companyBId, depA1.idDepense);
      throw new Error('[FAIL] User B viewed receipt of Expense DA-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt view refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 14 — DOWNLOAD RECEIPT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 14] User A downloads receipt file for Expense DA-A1...');
    const downloadA1 = await service.getReceiptFileStream(companyAId, depA1.idDepense);
    if (!downloadA1.filename) {
      throw new Error('[FAIL] Download file info missing!');
    }
    console.log(`  ✓ PASSED: Receipt download info retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 15 — DOWNLOAD RECEIPT CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 15] User B attempts to download receipt for Expense DA-A1...');
    try {
      await service.getReceiptFileStream(companyBId, depA1.idDepense);
      throw new Error('[FAIL] User B downloaded receipt of Expense DA-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt download refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — REPLACE RECEIPT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 16] User A replaces receipt for Expense DA-A1 with new file...');
    const oldPhysicalPath = physicalFileA1;
    const replacedA1 = await service.uploadOrReplaceReceipt(
      companyAId,
      depA1.idDepense,
      dummyFileB,
    );
    const newPhysicalPath = path.join(
      process.cwd(),
      'uploads',
      'depenses-administratives',
      path.basename(replacedA1.fichierRecu!),
    );

    if (fs.existsSync(oldPhysicalPath) && oldPhysicalPath !== newPhysicalPath) {
      throw new Error('[FAIL] Old physical receipt file was not deleted after replacement!');
    }
    if (!fs.existsSync(newPhysicalPath)) {
      throw new Error('[FAIL] New physical receipt file missing on disk!');
    }
    console.log(`  ✓ PASSED: Receipt replaced successfully (Old file deleted, new file saved).`);

    // ----------------------------------------------------
    // TEST 17 — DELETE RECEIPT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 17] User A deletes receipt from Expense DA-A1...');
    const deletedReceiptA1 = await service.deleteReceipt(companyAId, depA1.idDepense);
    if (deletedReceiptA1.hasReceipt || deletedReceiptA1.fichierRecu !== null) {
      throw new Error('[FAIL] DB receipt path was not set to null!');
    }
    if (fs.existsSync(newPhysicalPath)) {
      throw new Error('[FAIL] Physical file was not deleted from disk after receipt deletion!');
    }
    console.log(
      `  ✓ PASSED: Receipt deleted successfully (DB set to null & physical file unlinked).`,
    );

    // ----------------------------------------------------
    // TEST 18 — DELETE RECEIPT CROSS-TENANT
    // ----------------------------------------------------
    console.log(
      '\n[TEST 18] User B uploads receipt on Expense DA-B1, User A attempts to delete it...',
    );
    const uploadedB1 = await service.uploadOrReplaceReceipt(
      companyBId,
      depB1.idDepense,
      dummyFileB,
    );
    try {
      await service.deleteReceipt(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A deleted receipt of Expense DA-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant receipt deletion refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // Clean up physical file for B1
    if (uploadedB1.fichierRecu) {
      await service.deleteReceipt(companyBId, depB1.idDepense);
    }

    // ----------------------------------------------------
    // TEST 19 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 19] Checking statistics isolation for Company A and Company B...');
    const statsA = await service.findStats(companyAId, {});
    const statsB = await service.findStats(companyBId, {});

    if (statsA.totalCount !== 2 || statsB.totalCount !== 1) {
      throw new Error(
        `[FAIL] Stats count mixed up! Stats A count: ${statsA.totalCount}, Stats B count: ${statsB.totalCount}`,
      );
    }
    console.log(
      `  ✓ PASSED: Stats A (Count: ${statsA.totalCount}, Total: ${statsA.montantTotal}) | Stats B (Count: ${statsB.totalCount}, Total: ${statsB.montantTotal}).`,
    );

    // ----------------------------------------------------
    // TEST 20 — SEARCH & FILTER ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 20] User A searches for category "LOYER"...');
    const searchA = await service.findAll(companyAId, { categorieDepense: 'LOYER' });
    const searchBInA = await service.findAll(companyBId, { categorieDepense: 'LOYER' });

    if (searchA.data.length !== 1 || searchBInA.data.length !== 0) {
      throw new Error('[FAIL] Category search mixed between tenants!');
    }
    console.log(`  ✓ PASSED: Category search strictly isolated by tenant.`);

    // ----------------------------------------------------
    // TEST 21 — SOFT DELETE LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 21] User A soft-deletes Expense DA-A2...');
    await service.softDelete(companyAId, depA2.idDepense);
    const softDeletedDep = await prisma.depenseAdministrative.findUnique({
      where: { idDepense: depA2.idDepense },
    });
    if (!softDeletedDep || !softDeletedDep.supprimeLe) {
      throw new Error('[FAIL] Soft delete failed!');
    }
    console.log(`  ✓ PASSED: Expense DA-A2 soft-deleted successfully.`);

    // ----------------------------------------------------
    // TEST 22 — SOFT DELETE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 22] User A attempts to soft-delete Expense DA-B1...');
    try {
      await service.softDelete(companyAId, depB1.idDepense);
      throw new Error('[FAIL] User A soft-deleted Expense DA-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant soft-delete refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 23 — ADMIN GENERAL ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 23] Verifying ADMIN_GENERAL scope confinement...');
    const adminAAll = await service.findAll(companyAId, {});
    const hasAnyB = adminAAll.data.some((d) => d.idDepense === depB1.idDepense);
    if (hasAnyB) {
      throw new Error('[FAIL] Admin A can see Company B expenses!');
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 24 — DB & FILESYSTEM INTEGRITY
    // ----------------------------------------------------
    console.log('\n[TEST 24] Re-reading DB to verify tenant integrity...');
    const dbDepA1 = await prisma.depenseAdministrative.findUnique({
      where: { idDepense: depA1.idDepense },
    });
    if (!dbDepA1 || dbDepA1.companyId !== companyAId) {
      throw new Error('[FAIL] DB tenant integrity corrupted!');
    }
    console.log(`  ✓ PASSED: All DB records inherit correct companyId (${companyAId}).`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test environment...');
    await prisma.depenseAdministrative.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 24 MULTI-TENANT DEPENSEADMINISTRATIVE TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b213DepenseAdministrativeTests();
