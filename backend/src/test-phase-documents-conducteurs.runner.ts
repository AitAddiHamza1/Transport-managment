import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DocumentsConducteursService } from './modules/documents-conducteurs/documents-conducteurs.service';
import { ConducteursService } from './modules/conducteurs/conducteurs.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runDocumentsConducteursIntegrationTests() {
  console.log('====================================================');
  console.log('=== PHASE 3 — DOCUMENTS CONDUCTEURS INTEGRATION TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const conducteursService = app.get(ConducteursService);
  const service = app.get(DocumentsConducteursService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Clean up & Create test companies A & B and Conducteurs A & B
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    const oldCompanies = await prisma.company.findMany({
      where: { nom: { startsWith: 'TEST_COMPANY_DOCCOND_' } },
      select: { id: true },
    });
    const oldCompanyIds = oldCompanies.map((c) => c.id);

    if (oldCompanyIds.length > 0) {
      await prisma.documentConducteur.deleteMany({
        where: { conducteur: { companyId: { in: oldCompanyIds } } },
      });
      await prisma.conducteur.deleteMany({
        where: { companyId: { in: oldCompanyIds } },
      });
      await prisma.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    }

    const companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DOCCOND_A' } });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_DOCCOND_B' } });
    companyBId = companyB.id;

    // Create conducteurs for A & B
    const conducteurA1 = await conducteursService.create(
      { nomConducteur: 'Conducteur A1', telephone: '0600000001' },
      companyAId,
    );

    const conducteurA2 = await conducteursService.create(
      { nomConducteur: 'Conducteur A2', telephone: '0600000002' },
      companyAId,
    );

    const conducteurB1 = await conducteursService.create(
      { nomConducteur: 'Conducteur B1', telephone: '0600000003' },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, CondA1 ID: ${conducteurA1.id} | Company B: ${companyBId}, CondB1 ID: ${conducteurB1.id})`,
    );

    // Dummy Buffers for File Testing
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
    );
    const dummyPdfFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'passeport-driver-a.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: dummyPdfBuffer,
      size: dummyPdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const dummyJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ]);
    const dummyJpegFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'visa-driver-a.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: dummyJpegBuffer,
      size: dummyJpegBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const dummyPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const dummyPngFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'permis-driver-a.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: dummyPngBuffer,
      size: dummyPngBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    // ----------------------------------------------------
    // TEST A — CREATE DOCUMENT FOR COMPANY A CONDUCTEUR
    // ----------------------------------------------------
    console.log('\n[TEST A] User A creates PASSEPORT document for Conducteur A1...');
    const docA1 = await service.create(companyAId, {
      idConducteur: conducteurA1.id,
      typeDocument: 'PASSEPORT',
      numeroDocument: 'PASS-2026-A1',
      dateEmission: '2026-01-01',
      dateExpiration: '2030-12-31',
      notes: 'Passeport valide 5 ans',
    });
    console.log(
      `  ✓ TEST A PASSED: Document created (ID: ${docA1.id}, Type: ${docA1.typeDocument}, Status: ${docA1.status})`,
    );

    // ----------------------------------------------------
    // TEST B — LIST COMPANY A DOCUMENTS
    // ----------------------------------------------------
    console.log('\n[TEST B] User A lists all driver documents...');
    const listA = await service.findAll(companyAId, {});
    if (listA.data.length === 0 || listA.data[0].id !== docA1.id) {
      throw new Error('[FAIL] List Company A failed or missing created document!');
    }
    console.log(`  ✓ TEST B PASSED: Listed Company A documents (Count: ${listA.data.length}).`);

    // ----------------------------------------------------
    // TEST C — READ COMPANY A DOCUMENT
    // ----------------------------------------------------
    console.log('\n[TEST C] User A reads Document A1 details...');
    const readA1 = await service.findOne(companyAId, docA1.id);
    if (readA1.id !== docA1.id || readA1.numeroDocument !== 'PASS-2026-A1') {
      throw new Error('[FAIL] Read Company A document failed!');
    }
    console.log(`  ✓ TEST C PASSED: Read Company A document successfully.`);

    // ----------------------------------------------------
    // TEST D — UPDATE COMPANY A DOCUMENT
    // ----------------------------------------------------
    console.log('\n[TEST D] User A updates notes on Document A1...');
    const updatedA1 = await service.update(companyAId, docA1.id, {
      notes: 'Passeport mis à jour avec visa',
    });
    if (updatedA1.notes !== 'Passeport mis à jour avec visa') {
      throw new Error('[FAIL] Update Company A document failed!');
    }
    console.log(`  ✓ TEST D PASSED: Document updated successfully.`);

    // ----------------------------------------------------
    // TEST E & F & Z — SOFT-DELETE COMPANY A DOCUMENT & EXCLUSION FROM NORMAL LISTING
    // ----------------------------------------------------
    console.log('\n[TEST E & F & Z] Creating temporary document for Conducteur A2 and soft-deleting it...');
    const tempDoc = await service.create(companyAId, {
      idConducteur: conducteurA2.id,
      typeDocument: 'CARTE_DE_SANTE',
      numeroDocument: 'HEALTH-001',
    });
    const deleteRes = await service.softDelete(companyAId, tempDoc.id);
    if (!deleteRes.id) {
      throw new Error('[FAIL] Soft delete response invalid!');
    }

    // Verify excluded from normal listing
    const listAfterDelete = await service.findAll(companyAId, {});
    const isDeletedIncluded = listAfterDelete.data.some((d) => d.id === tempDoc.id);
    if (isDeletedIncluded) {
      throw new Error('[FAIL] Soft-deleted document is included in normal list!');
    }

    // Verify Conducteur remains intact (TEST Z)
    const condA2Check = await prisma.conducteur.findUnique({ where: { id: conducteurA2.id } });
    if (!condA2Check) {
      throw new Error('[FAIL] Conducteur was deleted when document was soft-deleted!');
    }
    console.log(
      `  ✓ TEST E, F & Z PASSED: Soft-deleted document excluded from listing and parent Conducteur remains intact.`,
    );

    // ----------------------------------------------------
    // TEST G — VALID PDF UPLOAD
    // ----------------------------------------------------
    console.log('\n[TEST G] User A uploads valid PDF to Document A1...');
    const uploadedPdf = await service.uploadFile(companyAId, docA1.id, dummyPdfFile);
    if (!uploadedPdf.hasFile || uploadedPdf.mimeType !== 'application/pdf') {
      throw new Error('[FAIL] Valid PDF upload failed!');
    }
    console.log(`  ✓ TEST G PASSED: PDF file uploaded successfully.`);

    // ----------------------------------------------------
    // TEST H — VALID JPEG/PNG UPLOAD
    // ----------------------------------------------------
    console.log('\n[TEST H] User A creates VISA document and uploads PNG...');
    const docA2 = await service.create(companyAId, {
      idConducteur: conducteurA1.id,
      typeDocument: 'VISA',
      numeroDocument: 'VISA-SCHENGEN-001',
    });
    const uploadedPng = await service.uploadFile(companyAId, docA2.id, dummyPngFile);
    if (!uploadedPng.hasFile || uploadedPng.mimeType !== 'image/png') {
      throw new Error('[FAIL] Valid PNG upload failed!');
    }
    console.log(`  ✓ TEST H PASSED: PNG file uploaded successfully.`);

    // ----------------------------------------------------
    // TEST I — INVALID EXTENSION REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST I] Attempting to upload invalid extension (.exe)...');
    const invalidExtFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'malware.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      buffer: Buffer.from('MZ...exe'),
      size: 10,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    try {
      await service.uploadFile(companyAId, docA1.id, invalidExtFile);
      throw new Error('[FAIL] Invalid extension was accepted!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ TEST I PASSED: Invalid extension rejected with 400 BadRequestException.`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST J — INVALID MAGIC BYTES REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST J] Attempting to upload fake PDF with invalid magic bytes...');
    const fakePdfFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'fake.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('THIS_IS_NOT_A_REAL_PDF_HEADER'),
      size: 30,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    try {
      await service.uploadFile(companyAId, docA1.id, fakePdfFile);
      throw new Error('[FAIL] Fake magic bytes file was accepted!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ TEST J PASSED: Corrupted magic bytes rejected with 400 BadRequestException.`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST K — FILE >5MB REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST K] Attempting to upload file larger than 5MB...');
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);
    largeBuffer.write('%PDF-1.4', 0);
    const largeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'huge.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: largeBuffer,
      size: largeBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    try {
      await service.uploadFile(companyAId, docA1.id, largeFile);
      throw new Error('[FAIL] File >5MB was accepted!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ TEST K PASSED: File >5MB rejected with 400 BadRequestException.`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST L & M — PREVIEW & DOWNLOAD AUTHORIZED DOCUMENT
    // ----------------------------------------------------
    console.log('\n[TEST L & M] Testing preview and download file info for authorized document...');
    const fileInfo = await service.getFile(companyAId, docA1.id);
    if (!fileInfo.diskPath || !fileInfo.nomOriginal || !fs.existsSync(fileInfo.diskPath)) {
      throw new Error('[FAIL] Authorized file info or physical disk path missing!');
    }
    console.log(
      `  ✓ TEST L & M PASSED: Authorized file preview/download info verified (DiskPath: ${path.basename(fileInfo.diskPath)}).`,
    );

    // ----------------------------------------------------
    // SETUP COMPANY B DOCUMENT FOR CROSS-TENANT TESTS N THROUGH S
    // ----------------------------------------------------
    const docB1 = await service.create(companyBId, {
      idConducteur: conducteurB1.id,
      typeDocument: 'PASSEPORT',
      numeroDocument: 'PASS-2026-B1',
    });
    await service.uploadFile(companyBId, docB1.id, dummyJpegFile);

    // ----------------------------------------------------
    // TEST N — UNAUTHORIZED CROSS-TENANT READ REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST N] User A attempts to read Company B Document B1...');
    try {
      await service.findOne(companyAId, docB1.id);
      throw new Error('[FAIL] Cross-tenant read was permitted!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ TEST N PASSED: Cross-tenant read rejected with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST O — UNAUTHORIZED CROSS-TENANT UPDATE REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST O] User A attempts to update Company B Document B1...');
    try {
      await service.update(companyAId, docB1.id, { notes: 'Unauthorized update' });
      throw new Error('[FAIL] Cross-tenant update was permitted!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ TEST O PASSED: Cross-tenant update rejected with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST P — UNAUTHORIZED CROSS-TENANT DELETE REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST P] User A attempts to delete Company B Document B1...');
    try {
      await service.softDelete(companyAId, docB1.id);
      throw new Error('[FAIL] Cross-tenant delete was permitted!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ TEST P PASSED: Cross-tenant delete rejected with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST Q — UNAUTHORIZED CROSS-TENANT UPLOAD REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST Q] User A attempts to upload file to Company B Document B1...');
    try {
      await service.uploadFile(companyAId, docB1.id, dummyPdfFile);
      throw new Error('[FAIL] Cross-tenant upload was permitted!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ TEST Q PASSED: Cross-tenant upload rejected with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST R & S — UNAUTHORIZED CROSS-TENANT PREVIEW / DOWNLOAD REJECTED
    // ----------------------------------------------------
    console.log('\n[TEST R & S] User A attempts preview/download of Company B file...');
    try {
      await service.getFile(companyAId, docB1.id);
      throw new Error('[FAIL] Cross-tenant file access was permitted!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ TEST R & S PASSED: Cross-tenant preview/download rejected with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST T — EXPIRATION DATE VALIDATION
    // ----------------------------------------------------
    console.log('\n[TEST T] Testing dateExpiration < dateEmission validation...');
    try {
      await service.create(companyAId, {
        idConducteur: conducteurA1.id,
        typeDocument: 'PERMIS_DE_CONDUIRE',
        dateEmission: '2026-06-01',
        dateExpiration: '2026-01-01',
      });
      throw new Error('[FAIL] Invalid date range was permitted!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ TEST T PASSED: Invalid date range rejected with 400 BadRequestException.`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST U — MULTIPLE DOCUMENTS FOR SAME CONDUCTEUR
    // ----------------------------------------------------
    console.log('\n[TEST U] Verifying Conducteur A1 can own multiple different documents...');
    const listCondA1 = await service.findAll(companyAId, { idConducteur: conducteurA1.id });
    if (listCondA1.data.length < 2) {
      throw new Error('[FAIL] Conducteur A1 should have multiple active documents!');
    }
    console.log(
      `  ✓ TEST U PASSED: Conducteur A1 has ${listCondA1.data.length} active documents attached.`,
    );

    // ----------------------------------------------------
    // TEST V — DUPLICATE ACTIVE DOCUMENT RULE
    // ----------------------------------------------------
    console.log('\n[TEST V] Attempting to create duplicate active PASSEPORT document for Conducteur A1...');
    try {
      await service.create(companyAId, {
        idConducteur: conducteurA1.id,
        typeDocument: 'PASSEPORT',
      });
      throw new Error('[FAIL] Duplicate active document was permitted!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`  ✓ TEST V PASSED: Duplicate active document rejected with 409 ConflictException.`);
      } else {
        throw new Error(`[FAIL] Expected ConflictException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST W — SOFT-DELETED DOCUMENT REPLACEMENT/RECREATION
    // ----------------------------------------------------
    console.log('\n[TEST W] Verifying soft-deleted document type can be recreated for same conducteur...');
    // tempDoc (CARTE_DE_SANTE) was soft-deleted earlier for Conducteur A2
    const recreatedDoc = await service.create(companyAId, {
      idConducteur: conducteurA2.id,
      typeDocument: 'CARTE_DE_SANTE',
      numeroDocument: 'HEALTH-RECREATED-002',
    });
    if (!recreatedDoc.id) {
      throw new Error('[FAIL] Recreation of soft-deleted document type failed!');
    }
    console.log(`  ✓ TEST W PASSED: Document type recreated successfully after soft delete.`);

    // ----------------------------------------------------
    // TEST X — CUSTOM TYPE "Contrat de travail" ACCEPTED
    // ----------------------------------------------------
    console.log('\n[TEST X] Testing custom document type "Contrat de travail"...');
    const customDoc = await service.create(companyAId, {
      idConducteur: conducteurA1.id,
      typeDocument: 'Contrat de travail',
      notes: 'Contrat CDI chauffeur international',
    });
    if (customDoc.typeDocument !== 'Contrat de travail') {
      throw new Error('[FAIL] Custom typeDocument value was not persisted properly!');
    }
    console.log(`  ✓ TEST X PASSED: Custom document type "Contrat de travail" stored directly.`);

    // ----------------------------------------------------
    // TEST Y — EXISTING FIXED TYPES ACCEPTED
    // ----------------------------------------------------
    console.log('\n[TEST Y] Testing fixed document type "PERMIS_DE_CONDUIRE"...');
    const fixedDoc = await service.create(companyAId, {
      idConducteur: conducteurA1.id,
      typeDocument: 'PERMIS_DE_CONDUIRE',
      numeroDocument: 'PERMIS-B-C-E-001',
    });
    if (fixedDoc.typeDocument !== 'PERMIS_DE_CONDUIRE') {
      throw new Error('[FAIL] Fixed document type was not persisted properly!');
    }
    console.log(`  ✓ TEST Y PASSED: Fixed document type accepted and stored.`);

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test data and physical files...');
    try {
      await service.deleteFile(companyAId, docA1.id);
    } catch (_) {}
    try {
      await service.deleteFile(companyAId, docA2.id);
    } catch (_) {}
    try {
      await service.deleteFile(companyBId, docB1.id);
    } catch (_) {}

    await prisma.documentConducteur.deleteMany({
      where: { conducteur: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.conducteur.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    console.log('  ✓ Test environment cleaned up successfully.');

    console.log('\n====================================================');
    console.log('=== ALL MANDATORY TESTS A THROUGH Z PASSED SUCCESSFULLY (100%) ===');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ INTEGRATION TEST RUNNER FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runDocumentsConducteursIntegrationTests();
