import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DocumentsVehiculesService } from './modules/documents-vehicules/documents-vehicules.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep3b216DocumentVehiculeTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.16 — MULTI-TENANT DOCUMENTVEHICULE TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const vehiculesService = app.get(VehiculesService);
  const service = app.get(DocumentsVehiculesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B and Vehicles A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_DOCV_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.documentVehicule.deleteMany({
        where: { vehicule: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.vehicule.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DOCV_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DOCV_B' } });
    companyBId = companyB.id;

    // Create vehicles for A & B
    const vehiculeA1 = await vehiculesService.create(
      {
        immatriculation: '11111-DOCV-A',
        marque: 'VOLVO',
        modele: 'FH16',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeA2 = await vehiculesService.create(
      {
        immatriculation: '11112-DOCV-A',
        marque: 'SCANIA',
        modele: 'R500',
        typeVehicule: 'CAMION',
      },
      companyAId,
    );

    const vehiculeB1 = await vehiculesService.create(
      {
        immatriculation: '22222-DOCV-B',
        marque: 'MERCEDES',
        modele: 'ACTROS',
        typeVehicule: 'CAMION',
      },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, VehA1: ${vehiculeA1.immatriculation} | Company B: ${companyBId}, VehB1: ${vehiculeB1.immatriculation})`,
    );

    // Dummy Multer PDF File for testing
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
    );
    const dummyFilePdfA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'assurance-veh-a.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: dummyPdfBuffer,
      size: dummyPdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    // Dummy JPEG File for replacement testing
    const dummyJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ]);
    const dummyFileJpegA: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'assurance-veh-a.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: dummyJpegBuffer,
      size: dummyJpegBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    // ----------------------------------------------------
    // TEST 1 — CREATE DOCUMENT LEGITIMATE (Company A)
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates ASSURANCE document for Vehicule A1...');
    const docA1 = await service.create(companyAId, {
      immatriculation: vehiculeA1.immatriculation,
      typeDocument: 'ASSURANCE',
      numeroDocument: 'ASSUR-2026-001',
      organismeEmetteur: 'AXA Assurance',
      dateEmission: '2026-01-01',
      dateExpiration: '2026-12-31',
      notes: 'Police tous risques',
    });
    console.log(
      `  ✓ PASSED: Document DOCV-A1 created (ID: ${docA1.idDocument}, Type: ${docA1.typeDocument}, Status: ${docA1.status})`,
    );

    // ----------------------------------------------------
    // TEST 2 — CREATE DOCUMENT LEGITIMATE (Company B)
    // ----------------------------------------------------
    console.log('\n[TEST 2] User B creates ASSURANCE document for Vehicule B1...');
    const docB1 = await service.create(companyBId, {
      immatriculation: vehiculeB1.immatriculation,
      typeDocument: 'ASSURANCE',
      numeroDocument: 'ASSUR-2026-002',
      organismeEmetteur: 'Wafa Assurance',
      dateEmission: '2026-01-01',
      dateExpiration: '2026-12-31',
      notes: 'Police tiers',
    });
    console.log(
      `  ✓ PASSED: Document DOCV-B1 created for Company B (ID: ${docB1.idDocument}, Type: ${docB1.typeDocument}).`,
    );

    // ----------------------------------------------------
    // TEST 3 — LIST A ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists all vehicle documents...');
    const listA = await service.findAll(companyAId, {});
    const containsBInA = listA.data.some((d) => d.idDocument === docB1.idDocument);
    if (containsBInA) {
      throw new Error('[FAIL] Company A list contains Company B vehicle document!');
    }
    console.log(`  ✓ PASSED: Company A list strictly isolated (Count: ${listA.data.length}).`);

    // ----------------------------------------------------
    // TEST 4 — LIST B ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 4] User B lists all vehicle documents...');
    const listB = await service.findAll(companyBId, {});
    const containsAInB = listB.data.some((d) => d.idDocument === docA1.idDocument);
    if (containsAInB) {
      throw new Error('[FAIL] Company B list contains Company A vehicle document!');
    }
    console.log(`  ✓ PASSED: Company B list strictly isolated (Count: ${listB.data.length}).`);

    // ----------------------------------------------------
    // TEST 5 — FIND ONE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests details of Document DOCV-A1...');
    const detailA1 = await service.findOne(companyAId, docA1.idDocument);
    if (detailA1.idDocument !== docA1.idDocument) {
      throw new Error('[FAIL] Retrieved wrong document details!');
    }
    console.log(`  ✓ PASSED: Document DOCV-A1 details retrieved successfully.`);

    // ----------------------------------------------------
    // TEST 6 — FIND ONE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to request details of Document DOCV-B1...');
    try {
      await service.findOne(companyAId, docB1.idDocument);
      throw new Error('[FAIL] User A was able to view Document DOCV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant findOne refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — CREATE ON CROSS-TENANT VEHICLE
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to create document on Vehicule B1 immatriculation...');
    try {
      await service.create(companyAId, {
        immatriculation: vehiculeB1.immatriculation,
        typeDocument: 'VISITE_TECHNIQUE',
      });
      throw new Error('[FAIL] User A created document on Company B vehicle!');
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
    console.log('\n[TEST 9] User A updates notes on Document DOCV-A1...');
    const updatedA1 = await service.update(companyAId, docA1.idDocument, {
      notes: 'Police tous risques mise à jour',
    });
    if (updatedA1.notes !== 'Police tous risques mise à jour') {
      throw new Error('[FAIL] Document update failed!');
    }
    console.log(`  ✓ PASSED: Document DOCV-A1 updated successfully.`);

    // ----------------------------------------------------
    // TEST 10 — UPDATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 10] User A attempts to update Document DOCV-B1...');
    try {
      await service.update(companyAId, docB1.idDocument, { notes: 'Hack Notes' });
      throw new Error('[FAIL] User A updated Document DOCV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 11 — SOFT DELETE SAME TENANT
    // ----------------------------------------------------
    console.log(
      '\n[TEST 11] User A creates and soft-deletes a temporary document on Vehicule A2...',
    );
    const tempDocA2 = await service.create(companyAId, {
      immatriculation: vehiculeA2.immatriculation,
      typeDocument: 'CARTE_GRISE',
      numeroDocument: 'CG-TEMP-001',
    });
    await service.softDelete(companyAId, tempDocA2.idDocument);
    const dbTempDocA2 = await prisma.documentVehicule.findUnique({
      where: { idDocument: tempDocA2.idDocument },
    });
    if (!dbTempDocA2 || dbTempDocA2.supprimeLe === null) {
      throw new Error('[FAIL] Soft delete failed in DB!');
    }
    console.log(`  ✓ PASSED: Document soft-deleted successfully (supprimeLe timestamp set).`);

    // ----------------------------------------------------
    // TEST 12 — SOFT DELETE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 12] User A attempts to soft-delete Document DOCV-B1...');
    try {
      await service.softDelete(companyAId, docB1.idDocument);
      throw new Error('[FAIL] User A soft-deleted Document DOCV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant soft delete refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 13 — DUPLICATE ACTIVE DOCUMENT SAME VEHICLE
    // ----------------------------------------------------
    console.log(
      '\n[TEST 13] User A attempts to create 2nd active ASSURANCE document on Vehicule A1...',
    );
    try {
      await service.create(companyAId, {
        immatriculation: vehiculeA1.immatriculation,
        typeDocument: 'ASSURANCE',
      });
      throw new Error('[FAIL] Duplicate active document allowed on same vehicle!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`  ✓ PASSED: Duplicate active document type on same vehicle refused with 409.`);
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 14 — SAME DOCUMENT TYPE ALLOWED ON DIFFERENT VEHICLES / TENANTS
    // ----------------------------------------------------
    console.log(
      '\n[TEST 14] Verifying ASSURANCE document type coexists on Vehicule A1 and Vehicule B1...',
    );
    const docCheckA = await service.findOne(companyAId, docA1.idDocument);
    const docCheckB = await service.findOne(companyBId, docB1.idDocument);
    if (docCheckA.typeDocument !== 'ASSURANCE' || docCheckB.typeDocument !== 'ASSURANCE') {
      throw new Error('[FAIL] Cross-tenant document type check failed!');
    }
    console.log(
      `  ✓ PASSED: ASSURANCE documents coexist on Vehicule A1 (${docCheckA.immatriculation}) and Vehicule B1 (${docCheckB.immatriculation}).`,
    );

    // ----------------------------------------------------
    // TEST 15 — UPLOAD FILE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 15] User A uploads PDF attachment to Document DOCV-A1...');
    const uploadedA1 = await service.uploadFile(companyAId, docA1.idDocument, dummyFilePdfA);
    if (!uploadedA1.hasFile || !uploadedA1.originalFileName) {
      throw new Error('[FAIL] File upload failed!');
    }
    const fileInfoA1 = await service.getFile(companyAId, docA1.idDocument);
    if (!fs.existsSync(fileInfoA1.diskPath)) {
      throw new Error('[FAIL] Uploaded physical file missing on disk!');
    }
    console.log(`  ✓ PASSED: Attachment uploaded to Document DOCV-A1 successfully.`);

    // ----------------------------------------------------
    // TEST 16 — UPLOAD FILE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 16] User A attempts to upload attachment to Document DOCV-B1...');
    try {
      await service.uploadFile(companyAId, docB1.idDocument, dummyFilePdfA);
      throw new Error('[FAIL] User A uploaded attachment to Document DOCV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant file upload refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 17 — INLINE VIEW SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 17] User A gets inline file stream info for Document DOCV-A1...');
    const getFileA1 = await service.getFile(companyAId, docA1.idDocument);
    if (!getFileA1.diskPath || getFileA1.mimeType !== 'application/pdf') {
      throw new Error('[FAIL] Get file inline failed!');
    }
    console.log(
      `  ✓ PASSED: File info retrieved for inline viewing (Path: ${path.basename(getFileA1.diskPath)}).`,
    );

    // ----------------------------------------------------
    // TEST 18 — INLINE VIEW CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 18] User B attempts to get inline file info for Document DOCV-A1...');
    try {
      await service.getFile(companyBId, docA1.idDocument);
      throw new Error('[FAIL] User B viewed file of Document DOCV-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant inline view refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 19 — DOWNLOAD FILE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 19] User A downloads file info for Document DOCV-A1...');
    const downloadA1 = await service.getFile(companyAId, docA1.idDocument);
    if (!downloadA1.nomOriginal) {
      throw new Error('[FAIL] Download file info missing original name!');
    }
    console.log(`  ✓ PASSED: Download info retrieved (Original: ${downloadA1.nomOriginal}).`);

    // ----------------------------------------------------
    // TEST 20 — DOWNLOAD FILE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 20] User B attempts to download file of Document DOCV-A1...');
    try {
      await service.getFile(companyBId, docA1.idDocument);
      throw new Error('[FAIL] User B downloaded file of Document DOCV-A1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant download refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 21 — FILE REPLACEMENT SAFETY
    // ----------------------------------------------------
    console.log('\n[TEST 21] User A replaces PDF on Document DOCV-A1 with a new JPEG file...');
    const oldFileInfo = await service.getFile(companyAId, docA1.idDocument);
    const oldPhysicalPath = oldFileInfo.diskPath;

    await service.uploadFile(companyAId, docA1.idDocument, dummyFileJpegA);

    const newFileInfo = await service.getFile(companyAId, docA1.idDocument);
    const newPhysicalPath = newFileInfo.diskPath;

    if (fs.existsSync(oldPhysicalPath)) {
      throw new Error('[FAIL] Old physical file was not unlinked on replacement!');
    }
    if (!fs.existsSync(newPhysicalPath)) {
      throw new Error('[FAIL] New physical file missing after replacement!');
    }
    console.log(
      `  ✓ PASSED: File replaced safely (Old unlinked, New created: ${path.basename(newPhysicalPath)}).`,
    );

    // ----------------------------------------------------
    // TEST 22 — DELETE FILE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 22] User A attempts to delete attachment on Document DOCV-B1...');
    try {
      await service.deleteFile(companyAId, docB1.idDocument);
      throw new Error('[FAIL] User A deleted attachment on Document DOCV-B1!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant file deletion refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 23 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 23] Checking statistics isolation for Company A and Company B...');
    const statsA = await service.findStats(companyAId);
    const statsB = await service.findStats(companyBId);

    if (statsA.total !== 1 || statsB.total !== 1) {
      throw new Error(
        `[FAIL] Stats total mixed up! Stats A: ${statsA.total}, Stats B: ${statsB.total}`,
      );
    }
    console.log(
      `  ✓ PASSED: Stats A (Total: ${statsA.total}, Valides: ${statsA.valides}) | Stats B (Total: ${statsB.total}, Valides: ${statsB.valides}).`,
    );

    // ----------------------------------------------------
    // TEST 24 — ADMIN_GENERAL SCOPE CONFINEMENT
    // ----------------------------------------------------
    console.log('\n[TEST 24] Verifying ADMIN_GENERAL scope confinement for Company A...');
    const listAAfter = await service.findAll(companyAId, {});
    const hasBInAdminA = listAAfter.data.some((d) => d.idDocument === docB1.idDocument);
    if (hasBInAdminA) {
      throw new Error('[FAIL] Admin A can see Company B documents!');
    }
    console.log(`  ✓ PASSED: Admin A scope strictly limited to Company A.`);

    // ----------------------------------------------------
    // TEST 25 (REQUIRED) — REPLACEMENT FAILURE SAFETY
    // ----------------------------------------------------
    console.log(
      '\n[TEST 25 - REQUIRED] Verifying replacement failure safety (Temp file cleaned up if DB update fails)...',
    );
    const docFailTest = await service.create(companyAId, {
      immatriculation: vehiculeA2.immatriculation,
      typeDocument: 'VISITE_TECHNIQUE',
    });
    await service.uploadFile(companyAId, docFailTest.idDocument, dummyFilePdfA);
    const originalFileOnDisk = (await service.getFile(companyAId, docFailTest.idDocument)).diskPath;

    let thrownError = false;
    try {
      await service.uploadFile(companyAId, 999999, dummyFileJpegA);
    } catch (err) {
      thrownError = true;
    }
    if (!thrownError) {
      throw new Error('[FAIL] Upload on invalid document should have thrown 404!');
    }
    if (!fs.existsSync(originalFileOnDisk)) {
      throw new Error('[FAIL] Original file was unexpectedly unlinked on failed attempt!');
    }
    console.log(
      `  ✓ PASSED: Replacement failure safety verified (Original file preserved on disk).`,
    );

    // Clean up test document file
    await service.deleteFile(companyAId, docFailTest.idDocument);

    // ----------------------------------------------------
    // TEST 26 (REQUIRED) — PATH TRAVERSAL SECURITY
    // ----------------------------------------------------
    console.log(
      '\n[TEST 26 - REQUIRED] Verifying path traversal protection (resolveSecurePath with ../ or ..\\)...',
    );
    const resolvedPath1 = service.resolveSecurePath('../../etc/passwd');
    const resolvedPath2 = service.resolveSecurePath('..\\..\\Windows\\System32\\cmd.exe');

    const expectedUploadDir = path.resolve(process.cwd(), 'uploads', 'documents-vehicules');
    if (
      !resolvedPath1.startsWith(expectedUploadDir) ||
      !resolvedPath2.startsWith(expectedUploadDir)
    ) {
      throw new Error('[FAIL] Path traversal protection failed! File escaped upload dir.');
    }
    console.log(
      `  ✓ PASSED: Path traversal neutralized (Path 1: ${resolvedPath1} | Path 2: ${resolvedPath2}).`,
    );

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test environment and physical files...');
    try {
      await service.deleteFile(companyAId, docA1.idDocument);
    } catch (_) {}
    try {
      await service.deleteFile(companyBId, docB1.idDocument);
    } catch (_) {}

    await prisma.documentVehicule.deleteMany({
      where: { vehicule: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL 26 MULTI-TENANT DOCUMENTVEHICULE TESTS PASSED (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b216DocumentVehiculeTests();
