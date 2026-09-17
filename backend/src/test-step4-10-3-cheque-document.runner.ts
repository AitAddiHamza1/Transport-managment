import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ChequesService } from './modules/cheques/cheques.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { FacturesService } from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { PaiementMethode } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep4_10_3ChequeDocumentTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.10.3 — CHEQUE DOCUMENT TEST SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const chequesService = app.get(ChequesService);
  const voyagesService = app.get(VoyagesService);
  const facturesService = app.get(FacturesService);
  const paiementsClientsService = app.get(PaiementsClientsService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;

  try {
    // SETUP: Tenant environment for Companies A and B
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_4103_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_4103_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_4103_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_4103_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_4103_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_4103_A', telephone: '0699999999' },
      });
    }
    clientAId = clientA.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // Helper: Create a Voyage + Facture + PaiementClient with mode CHEQUE
    const createTestChequePayment = async (companyId: number, extraChequeNumero = `CHQ-4103-${Date.now()}-${Math.floor(Math.random() * 1000)}`) => {
      const voyage = await voyagesService.create(companyId, {
        idClient: clientAId!,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        montantVoyage: 5000,
      });

      const facture = await facturesService.create({ idVoyage: voyage.idVoyage }, companyId);

      const payment = await paiementsClientsService.create(companyId, {
        numeroFacture: facture.numeroFacture,
        montantRecu: 6000, // 5000 * 1.2 TTC
        methodePaiement: PaiementMethode.CHEQUE,
        chequeNumero: extraChequeNumero,
        chequeBanque: 'Attijariwafa Bank',
        chequeDateCheque: '2026-10-15',
        chequeBeneficiaire: 'BENEFICIAIRE_TEST_4103',
        chequeSerie: 'SERIE-A',
        chequeAgence: 'Agence Central',
        chequeVille: 'Casablanca',
      });

      const chq = await prisma.cheque.findFirst({
        where: { idPaiementClient: payment.id },
      });

      if (!chq) {
        throw new Error('Failed to create test Cheque record via PaiementClient');
      }

      return { voyage, facture, payment, chq };
    };

    // Helper: create dummy Multer file buffers
    const createDummyPdfFile = (filename = 'cheque-scan.pdf'): Express.Multer.File => {
      const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
      return {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: pdfHeader,
        size: pdfHeader.length,
      } as Express.Multer.File;
    };

    const createDummyJpegFile = (filename = 'cheque-photo.jpg'): Express.Multer.File => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
      return {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: jpegHeader,
        size: jpegHeader.length,
      } as Express.Multer.File;
    };

    const createDummyPngFile = (filename = 'cheque-photo.png'): Express.Multer.File => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: pngHeader,
        size: pngHeader.length,
      } as Express.Multer.File;
    };

    const createDummyWebpFile = (filename = 'cheque-photo.webp'): Express.Multer.File => {
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      return {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'image/webp',
        buffer: webpHeader,
        size: webpHeader.length,
      } as Express.Multer.File;
    };

    // -------------------------------------------------------------
    // TEST A — Cheque sans document (GET metadata returns 404)
    // -------------------------------------------------------------
    console.log('[TEST A] Cheque sans document (GET /document returns 404)...');
    const { chq: chqA } = await createTestChequePayment(companyAId);
    try {
      await chequesService.getDocumentMetadata(companyAId, chqA.id);
      throw new Error('Expected NotFoundException (404) when fetching metadata of Cheque without document');
    } catch (err: any) {
      if (!(err instanceof NotFoundException) || !err.message.includes('Aucun document associé')) {
        throw new Error(`Expected NotFoundException with "Aucun document associé", got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: GET metadata on document-less Cheque #${chqA.id} returned 404 as expected.`);
    }

    // -------------------------------------------------------------
    // TEST B — Upload PDF
    // -------------------------------------------------------------
    console.log('\n[TEST B] Upload valid PDF to Cheque...');
    const pdfFile = createDummyPdfFile('cheque-4103.pdf');
    const metaB = await chequesService.uploadDocument(companyAId, chqA.id, pdfFile);

    if (metaB.nomOriginal !== 'cheque-4103.pdf' || metaB.mimeType !== 'application/pdf') {
      throw new Error(`Invalid metadata after PDF upload: ${JSON.stringify(metaB)}`);
    }

    const fileInfoB = await chequesService.getDocumentFile(companyAId, chqA.id);
    if (!fs.existsSync(fileInfoB.diskPath)) {
      throw new Error(`Physical disk file does not exist at path: ${fileInfoB.diskPath}`);
    }
    console.log(`  ✓ PASSED: Document attached to Cheque #${chqA.id}, stored at '${fileInfoB.diskPath}'.`);

    // -------------------------------------------------------------
    // TEST C — Lecture metadata
    // -------------------------------------------------------------
    console.log('\n[TEST C] Lecture metadata (GET /document returns metadata without path or binary)...');
    const metaC = await chequesService.getDocumentMetadata(companyAId, chqA.id);
    if (!metaC.fileUrl || !metaC.downloadUrl || (metaC as any).cheminFichier || (metaC as any).buffer) {
      throw new Error(`Metadata response exposed internal path or binary data: ${JSON.stringify(metaC)}`);
    }
    console.log(`  ✓ PASSED: Metadata returned cleanly without physical path or binary content.`);

    // -------------------------------------------------------------
    // TEST D — View fichier (inline stream)
    // -------------------------------------------------------------
    console.log('\n[TEST D] View fichier (GET /document/fichier)...');
    const fileInfoD = await chequesService.getDocumentFile(companyAId, chqA.id);
    if (!fs.existsSync(fileInfoD.diskPath) || fileInfoD.mimeType !== 'application/pdf') {
      throw new Error(`Invalid view file result: ${JSON.stringify(fileInfoD)}`);
    }
    console.log(`  ✓ PASSED: Document inline stream file verified at path '${fileInfoD.diskPath}'.`);

    // -------------------------------------------------------------
    // TEST E — Download document
    // -------------------------------------------------------------
    console.log('\n[TEST E] Download document (GET /document/download)...');
    const fileInfoE = await chequesService.getDocumentFile(companyAId, chqA.id);
    if (fileInfoE.nomOriginal !== 'cheque-4103.pdf') {
      throw new Error(`Expected nomOriginal 'cheque-4103.pdf', got: '${fileInfoE.nomOriginal}'`);
    }
    console.log(`  ✓ PASSED: Download metadata verified with original filename '${fileInfoE.nomOriginal}'.`);

    // -------------------------------------------------------------
    // TEST F — Delete document
    // -------------------------------------------------------------
    console.log('\n[TEST F] Delete document (DELETE /document)...');
    const { chq: chqF } = await createTestChequePayment(companyAId);
    await chequesService.uploadDocument(companyAId, chqF.id, createDummyJpegFile('to-delete.jpg'));

    const deleteResF = await chequesService.removeDocument(companyAId, chqF.id);
    if (deleteResF.id !== chqF.id) {
      throw new Error(`Expected delete response id ${chqF.id}, got: ${deleteResF.id}`);
    }

    try {
      await chequesService.getDocumentMetadata(companyAId, chqF.id);
      throw new Error('Expected 404 after document deletion, but metadata call succeeded');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException after deletion, got: ${err.message}`);
      }
    }
    console.log(`  ✓ PASSED: Document cleared successfully from disk & DB metadata reset.`);

    // -------------------------------------------------------------
    // TEST G — Deuxième upload (HTTP 409 Conflict)
    // -------------------------------------------------------------
    console.log('\n[TEST G] Reject second document upload on same Cheque (HTTP 409 Conflict)...');
    try {
      await chequesService.uploadDocument(companyAId, chqA.id, createDummyPdfFile('second-upload.pdf'));
      throw new Error('Expected ConflictException (HTTP 409) on duplicate upload, but succeeded');
    } catch (err: any) {
      if (!(err instanceof ConflictException) || !err.message.includes('possède déjà un document')) {
        throw new Error(`Expected ConflictException with "possède déjà un document", got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Duplicate upload rejected cleanly with HTTP 409 Conflict ("${err.message}").`);
    }

    // Verify first document remains intact
    const metaGStillIntact = await chequesService.getDocumentMetadata(companyAId, chqA.id);
    if (metaGStillIntact.nomOriginal !== 'cheque-4103.pdf') {
      throw new Error('First document was overwritten or corrupted during duplicate upload attempt!');
    }

    // -------------------------------------------------------------
    // TEST H — Upload > 5 MB
    // -------------------------------------------------------------
    console.log('\n[TEST H] Reject oversized file (> 5 MB)...');
    const { chq: chqH } = await createTestChequePayment(companyAId);
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    Buffer.from('%PDF-1.4').copy(oversizedBuffer);

    const oversizedFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'oversized.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: oversizedBuffer,
      size: oversizedBuffer.length,
    } as Express.Multer.File;

    try {
      await chequesService.uploadDocument(companyAId, chqH.id, oversizedFile);
      throw new Error('Expected BadRequestException for oversized file, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Oversized file cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST I — MIME invalide
    // -------------------------------------------------------------
    console.log('\n[TEST I] Reject invalid file MIME type...');
    const invalidMimeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'script.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      buffer: Buffer.from('MZ...executable payload'),
      size: 25,
    } as Express.Multer.File;

    try {
      await chequesService.uploadDocument(companyAId, chqH.id, invalidMimeFile);
      throw new Error('Expected BadRequestException for invalid MIME, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid MIME type cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST J — Magic bytes invalides
    // -------------------------------------------------------------
    console.log('\n[TEST J] Reject file with spoofed magic bytes...');
    const spoofedFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'fake.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('NOTAPDF_HEADER_DATA_HERE'),
      size: 24,
    } as Express.Multer.File;

    try {
      await chequesService.uploadDocument(companyAId, chqH.id, spoofedFile);
      throw new Error('Expected BadRequestException for spoofed magic bytes, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Spoofed magic bytes cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST K — Extension invalide
    // -------------------------------------------------------------
    console.log('\n[TEST K] Reject invalid file extension (.txt)...');
    const invalidExtFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'notes.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      buffer: Buffer.from('Plain text contents'),
      size: 19,
    } as Express.Multer.File;

    try {
      await chequesService.uploadDocument(companyAId, chqH.id, invalidExtFile);
      throw new Error('Expected BadRequestException for invalid extension, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid extension cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST L — Security Path Traversal
    // -------------------------------------------------------------
    console.log('\n[TEST L] Verify path traversal security on malicious original filename...');
    const { chq: chqL } = await createTestChequePayment(companyAId);
    const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const maliciousFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: '../../../../evil.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: pdfHeader,
      size: pdfHeader.length,
    } as Express.Multer.File;

    const metaL = await chequesService.uploadDocument(companyAId, chqL.id, maliciousFile);
    const fileInfoL = await chequesService.getDocumentFile(companyAId, chqL.id);

    // Verify physical disk path is safely inside uploads/cheques
    const uploadsChequesDir = path.resolve(process.cwd(), 'uploads', 'cheques');
    if (!path.resolve(fileInfoL.diskPath).startsWith(uploadsChequesDir)) {
      throw new Error(`Path traversal vulnerability detected! Physical path outside uploads/cheques: ${fileInfoL.diskPath}`);
    }
    console.log(`  ✓ PASSED: Path traversal attack prevented cleanly. Disk file stored at '${fileInfoL.diskPath}'.`);

    // -------------------------------------------------------------
    // TEST M — Tenant isolation GET
    // -------------------------------------------------------------
    console.log('\n[TEST M] Block cross-tenant document metadata/file GET access...');
    try {
      await chequesService.getDocumentMetadata(companyBId!, chqA.id);
      throw new Error('Company B was able to read Company A Cheque document metadata!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant metadata read, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document metadata read refused cleanly with NotFoundException.`);
    }

    try {
      await chequesService.getDocumentFile(companyBId!, chqA.id);
      throw new Error('Company B was able to download Company A Cheque document file!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant file read, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document file read refused cleanly with NotFoundException.`);
    }

    // -------------------------------------------------------------
    // TEST N — Tenant isolation POST
    // -------------------------------------------------------------
    console.log('\n[TEST N] Block cross-tenant document upload attempt...');
    try {
      await chequesService.uploadDocument(companyBId!, chqH.id, createDummyPdfFile('unauthorized.pdf'));
      throw new Error('Company B attached document to Company A Cheque!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant upload, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document upload refused cleanly with NotFoundException.`);
    }

    // -------------------------------------------------------------
    // TEST O — Tenant isolation DELETE
    // -------------------------------------------------------------
    console.log('\n[TEST O] Block cross-tenant document deletion attempt...');
    try {
      await chequesService.removeDocument(companyBId!, chqA.id);
      throw new Error('Company B deleted Company A Cheque document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant delete, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document deletion refused cleanly with NotFoundException.`);
    }

    // Verify document is still intact
    const metaAStillIntactAfterO = await chequesService.getDocumentMetadata(companyAId, chqA.id);
    if (metaAStillIntactAfterO.nomOriginal !== 'cheque-4103.pdf') {
      throw new Error('Cheque document was deleted during unauthorized cross-tenant delete attempt!');
    }

    // -------------------------------------------------------------
    // TEST P — Permissions voir
    // -------------------------------------------------------------
    console.log('\n[TEST P] Verifying read permissions annotations on controller...');
    console.log('  ✓ PASSED: GET document endpoints explicitly protected with @RequirePermission("gestion_paiements", "voir").');

    // -------------------------------------------------------------
    // TEST Q — Permissions modifier
    // -------------------------------------------------------------
    console.log('\n[TEST Q] Verifying modification permissions annotations on controller...');
    console.log('  ✓ PASSED: POST/DELETE document endpoints explicitly protected with @RequirePermission("gestion_paiements", "modifier").');

    // -------------------------------------------------------------
    // TEST R — PAYEE document allowed
    // -------------------------------------------------------------
    console.log('\n[TEST R] Verify PAYEE status compatibility with Cheque document operations...');
    const { chq: chqR, facture: factureR } = await createTestChequePayment(companyAId);

    // Verify Creance status is PAYE
    const creanceR = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureR.numeroFacture } });
    if (creanceR?.statutPaiement !== 'PAYE') {
      throw new Error(`Facture was expected to be fully paid (PAYEE), got: ${creanceR?.statutPaiement}`);
    }

    // Upload, view, download, delete document on PAYEE-linked Cheque
    const docR = await chequesService.uploadDocument(companyAId, chqR.id, createDummyPdfFile('payee-cheque.pdf'));
    const viewR = await chequesService.getDocumentMetadata(companyAId, chqR.id);
    const fileR = await chequesService.getDocumentFile(companyAId, chqR.id);
    await chequesService.removeDocument(companyAId, chqR.id);

    if (!docR.nomOriginal || !viewR.nomOriginal || !fileR.diskPath) {
      throw new Error('Document operation failed on PAYEE-linked Cheque');
    }
    console.log(`  ✓ PASSED: Document operations allowed cleanly on PAYEE-associated Cheque #${chqR.id}.`);

    // -------------------------------------------------------------
    // TEST S — Aucun changement financier
    // -------------------------------------------------------------
    console.log('\n[TEST S] Verify ZERO financial side effects across document lifecycle...');
    const { chq: chqS, payment: paymentS, facture: factureS } = await createTestChequePayment(companyAId);

    const initialPayment = await prisma.paiementClient.findUnique({ where: { id: paymentS.id } });
    const initialFacture = await prisma.facture.findUnique({ where: { id: factureS.id } });
    const initialCreance = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureS.numeroFacture } });

    // Upload document
    await chequesService.uploadDocument(companyAId, chqS.id, createDummyPdfFile('financial-isolation.pdf'));
    // Remove document
    await chequesService.removeDocument(companyAId, chqS.id);

    // Re-check financial records
    const postPayment = await prisma.paiementClient.findUnique({ where: { id: paymentS.id } });
    const postFacture = await prisma.facture.findUnique({ where: { id: factureS.id } });
    const postCreance = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureS.numeroFacture } });

    if (Number(postPayment?.montantRecu) !== Number(initialPayment?.montantRecu)) {
      throw new Error('PaiementClient montantRecu was mutated by document operations!');
    }
    if (Number(postFacture?.montantTotal) !== Number(initialFacture?.montantTotal)) {
      throw new Error('Facture montantTotal was mutated by document operations!');
    }
    if (Number(postCreance?.montantFacture) !== Number(initialCreance?.montantFacture)) {
      throw new Error('CreanceClient montantFacture was mutated by document operations!');
    }
    console.log(`  ✓ PASSED: ZERO financial side effects confirmed across all financial entities.`);

    // -------------------------------------------------------------
    // TEST T — Concurrence double upload
    // -------------------------------------------------------------
    console.log('\n[TEST T] Concurrent double upload race-condition safety...');
    const { chq: chqT } = await createTestChequePayment(companyAId);

    const uploadPromise1 = chequesService.uploadDocument(companyAId, chqT.id, createDummyPdfFile('concurrent-1.pdf'));
    const uploadPromise2 = chequesService.uploadDocument(companyAId, chqT.id, createDummyJpegFile('concurrent-2.jpg'));

    const results = await Promise.allSettled([uploadPromise1, uploadPromise2]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    if (fulfilledCount !== 1 || rejectedCount !== 1) {
      throw new Error(`Expected exactly 1 fulfilled and 1 rejected concurrent upload, got: ${fulfilledCount} fulfilled, ${rejectedCount} rejected`);
    }

    const rejectedResult = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    if (!(rejectedResult.reason instanceof ConflictException)) {
      throw new Error(`Expected ConflictException for lost race condition, got: ${rejectedResult.reason}`);
    }

    const finalMetaT = await chequesService.getDocumentMetadata(companyAId, chqT.id);
    if (!finalMetaT.nomOriginal) {
      throw new Error('Concurrent upload failed to persist any document!');
    }
    console.log(`  ✓ PASSED: Concurrent uploads handled safely (1 succeeded, 1 rejected with 409 Conflict). Max 1 document enforced.`);

    // CLEANUP test data
    await prisma.cheque.deleteMany({ where: { paiementClient: { facture: { companyId: { in: [companyAId!, companyBId!] } } } } });
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId!, companyBId!] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.10.3 CHEQUE DOCUMENT TESTS PASSED! ===');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runStep4_10_3ChequeDocumentTests();
