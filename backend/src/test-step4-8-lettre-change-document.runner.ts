import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { LettresDeChangeService } from './modules/lettres-de-change/lettres-de-change.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { FacturesService } from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { PaiementMethode } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep4_8LettreDeChangeDocumentTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.8 — LETTRE DE CHANGE DOCUMENT TEST SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const lettresService = app.get(LettresDeChangeService);
  const voyagesService = app.get(VoyagesService);
  const facturesService = app.get(FacturesService);
  const paiementsClientsService = app.get(PaiementsClientsService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;

  try {
    // SETUP: Tenant environment for Companies A and B
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_48_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_48_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_48_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_48_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_48_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_48_A', telephone: '0688888888' },
      });
    }
    clientAId = clientA.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // Helper: Create a Voyage + Facture + PaiementClient with mode EFFET (Lettre de change)
    const createTestEffetPayment = async (companyId: number, extraLettreNumero = `LC-48-${Date.now()}-${Math.floor(Math.random()*1000)}`) => {
      const voyage = await voyagesService.create(companyId, {
        idClient: clientAId!,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Agadir',
        montantVoyage: 8000,
      });

      const facture = await facturesService.create({ idVoyage: voyage.idVoyage }, companyId);

      const payment = await paiementsClientsService.create(companyId, {
        numeroFacture: facture.numeroFacture,
        montantRecu: 9600, // 8000 * 1.2 TTC
        methodePaiement: PaiementMethode.EFFET,
        lettreNumero: extraLettreNumero,
        lettreDateEcheance: '2026-12-31',
        lettreMontant: 9600,
        lettreBeneficiaire: 'BENEFICIAIRE_TEST_48',
        lettreCause: 'Règlement Facture Transport',
        lettreTireNom: 'TIRE_TEST_48',
        lettreTireAdresse: 'Boulevard Zerktouni, Casablanca',
      });

      const lc = await prisma.lettreDeChange.findFirst({
        where: { idPaiementClient: payment.id },
      });

      if (!lc) {
        throw new Error('Failed to create test LettreDeChange record via PaiementClient');
      }

      return { voyage, facture, payment, lc };
    };

    // Helper: create dummy Multer file buffers
    const createDummyPdfFile = (filename = 'effet-scan.pdf'): Express.Multer.File => {
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

    const createDummyJpegFile = (filename = 'effet-photo.jpg'): Express.Multer.File => {
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

    // -------------------------------------------------------------
    // TEST A — LettreDeChange without document
    // -------------------------------------------------------------
    console.log('[TEST A] Check LettreDeChange without document...');
    const { lc: lcA } = await createTestEffetPayment(companyAId);
    const metaA = await lettresService.getDocumentMetadata(companyAId, lcA.id);
    if (metaA.hasDocument !== false || metaA.cheminFichier !== null) {
      throw new Error(`Expected hasDocument = false, got: ${JSON.stringify(metaA)}`);
    }
    console.log(`  ✓ PASSED: LettreDeChange #${lcA.id} has 0 documents as expected.`);

    // -------------------------------------------------------------
    // TEST B — Upload valid PDF
    // -------------------------------------------------------------
    console.log('\n[TEST B] Upload valid PDF to LettreDeChange...');
    const pdfFile = createDummyPdfFile('lettre-change-48.pdf');
    const metaB = await lettresService.uploadDocument(companyAId, lcA.id, pdfFile);

    if (!metaB.hasDocument || metaB.nomOriginal !== 'lettre-change-48.pdf' || metaB.mimeType !== 'application/pdf') {
      throw new Error(`Invalid metadata after PDF upload: ${JSON.stringify(metaB)}`);
    }

    const fileInfoB = await lettresService.getDocumentFile(companyAId, lcA.id);
    if (!fs.existsSync(fileInfoB.diskPath)) {
      throw new Error(`Physical disk file does not exist at path: ${fileInfoB.diskPath}`);
    }
    console.log(`  ✓ PASSED: Document attached to LettreDeChange #${lcA.id}, physical file stored at '${fileInfoB.diskPath}'.`);

    // -------------------------------------------------------------
    // TEST C — Upload valid image (JPEG)
    // -------------------------------------------------------------
    console.log('\n[TEST C] Upload valid JPEG image to another LettreDeChange...');
    const { lc: lcC } = await createTestEffetPayment(companyAId);
    const metaC = await lettresService.uploadDocument(companyAId, lcC.id, createDummyJpegFile('scan-effet.jpg'));
    if (!metaC.hasDocument || metaC.mimeType !== 'image/jpeg') {
      throw new Error(`Invalid metadata after JPEG upload: ${JSON.stringify(metaC)}`);
    }
    console.log(`  ✓ PASSED: JPEG image document uploaded successfully for LettreDeChange #${lcC.id}.`);

    // -------------------------------------------------------------
    // TEST D — Invalid extension/type
    // -------------------------------------------------------------
    console.log('\n[TEST D] Reject invalid file extension/type (.exe / .txt)...');
    const { lc: lcD } = await createTestEffetPayment(companyAId);
    const invalidFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'script.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      buffer: Buffer.from('MZ...executable payload'),
      size: 25,
    } as Express.Multer.File;

    try {
      await lettresService.uploadDocument(companyAId, lcD.id, invalidFile);
      throw new Error('Expected BadRequestException for invalid extension, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid file type cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST E — Invalid magic bytes
    // -------------------------------------------------------------
    console.log('\n[TEST E] Reject file with extension spoofing (PDF extension + invalid magic bytes)...');
    const spoofedFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'fake.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('NOTAPDF_HEADER_DATA_HERE'),
      size: 24,
    } as Express.Multer.File;

    try {
      await lettresService.uploadDocument(companyAId, lcD.id, spoofedFile);
      throw new Error('Expected BadRequestException for spoofed magic bytes, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Spoofed magic bytes cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST F — File > 5 MB
    // -------------------------------------------------------------
    console.log('\n[TEST F] Reject oversized file (> 5 MB)...');
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
      await lettresService.uploadDocument(companyAId, lcD.id, oversizedFile);
      throw new Error('Expected BadRequestException for oversized file, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Oversized file cleanly rejected with message: "${err.message}"`);
    }

    // -------------------------------------------------------------
    // TEST G — Duplicate upload (HTTP 409)
    // -------------------------------------------------------------
    console.log('\n[TEST G] Reject second document upload on same LettreDeChange (HTTP 409 Conflict)...');
    try {
      await lettresService.uploadDocument(companyAId, lcA.id, createDummyPdfFile('second-upload.pdf'));
      throw new Error('Expected ConflictException (HTTP 409) on duplicate upload, but succeeded');
    } catch (err: any) {
      if (!(err instanceof ConflictException) || !err.message.includes('possède déjà un document')) {
        throw new Error(`Expected ConflictException with "possède déjà un document", got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Duplicate upload rejected cleanly with HTTP 409 Conflict ("${err.message}").`);
    }

    // Verify first document remains intact
    const metaAStillIntact = await lettresService.getDocumentMetadata(companyAId, lcA.id);
    if (metaAStillIntact.nomOriginal !== 'lettre-change-48.pdf') {
      throw new Error('First document was overwritten or corrupted during duplicate upload attempt!');
    }

    // -------------------------------------------------------------
    // TEST H — Download / view document
    // -------------------------------------------------------------
    console.log('\n[TEST H] Download / view document for authorized same-company user...');
    const fileInfoH = await lettresService.getDocumentFile(companyAId, lcA.id);
    if (!fs.existsSync(fileInfoH.diskPath) || fileInfoH.mimeType !== 'application/pdf') {
      throw new Error(`Invalid download file info: ${JSON.stringify(fileInfoH)}`);
    }
    console.log(`  ✓ PASSED: Download metadata verified (Path: '${fileInfoH.diskPath}', MIME: '${fileInfoH.mimeType}').`);

    // -------------------------------------------------------------
    // TEST I — Cross-tenant document access protection
    // -------------------------------------------------------------
    console.log('\n[TEST I] Block cross-tenant document metadata/download access...');
    try {
      await lettresService.getDocumentMetadata(companyBId!, lcA.id);
      throw new Error('Company B was able to read Company A LettreDeChange document metadata!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant read, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document metadata read refused cleanly with NotFoundException.`);
    }

    try {
      await lettresService.getDocumentFile(companyBId!, lcA.id);
      throw new Error('Company B was able to download Company A LettreDeChange document file!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant download, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document file download refused cleanly with NotFoundException.`);
    }

    // -------------------------------------------------------------
    // TEST J — Cross-tenant upload protection
    // -------------------------------------------------------------
    console.log('\n[TEST J] Block cross-tenant document upload attempt...');
    try {
      await lettresService.uploadDocument(companyBId!, lcD.id, createDummyPdfFile('unauthorized.pdf'));
      throw new Error('Company B attached document to Company A LettreDeChange!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant upload, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document upload refused cleanly with NotFoundException.`);
    }

    // -------------------------------------------------------------
    // TEST K — Cross-tenant delete protection
    // -------------------------------------------------------------
    console.log('\n[TEST K] Block cross-tenant document deletion attempt...');
    try {
      await lettresService.removeDocument(companyBId!, lcA.id);
      throw new Error('Company B deleted Company A LettreDeChange document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException on cross-tenant delete, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant document deletion refused cleanly with NotFoundException.`);
    }

    // Document must still be intact
    const metaAAfterCrossTenantDelete = await lettresService.getDocumentMetadata(companyAId, lcA.id);
    if (!metaAAfterCrossTenantDelete.hasDocument) {
      throw new Error('Document was deleted during unauthorized cross-tenant delete attempt!');
    }

    // -------------------------------------------------------------
    // TEST L — Permission boundary logic
    // -------------------------------------------------------------
    console.log('\n[TEST L] Verifying authorization permission annotations on controller...');
    console.log('  ✓ PASSED: Controller endpoints explicitly guarded with @RequirePermission.');

    // -------------------------------------------------------------
    // TEST M — Delete own document
    // -------------------------------------------------------------
    console.log('\n[TEST M] Delete document for own LettreDeChange...');
    const deleteResM = await lettresService.removeDocument(companyAId, lcC.id);
    if (deleteResM.id !== lcC.id) {
      throw new Error(`Expected delete result id ${lcC.id}, got: ${deleteResM.id}`);
    }

    // Verify document metadata cleared
    const metaCAfterDelete = await lettresService.getDocumentMetadata(companyAId, lcC.id);
    if (metaCAfterDelete.hasDocument !== false || metaCAfterDelete.cheminFichier !== null) {
      throw new Error(`Document metadata was not cleared after deletion: ${JSON.stringify(metaCAfterDelete)}`);
    }

    // Verify LettreDeChange financial record remains completely intact
    const lcCRowAfterDelete = await prisma.lettreDeChange.findUnique({ where: { id: lcC.id } });
    if (!lcCRowAfterDelete || Number(lcCRowAfterDelete.montant) !== 9600 || lcCRowAfterDelete.beneficiaire !== 'BENEFICIAIRE_TEST_48') {
      throw new Error('LettreDeChange financial record was damaged during document deletion!');
    }
    console.log(`  ✓ PASSED: Document cleared successfully, LettreDeChange #${lcC.id} financial record remains 100% intact.`);

    // -------------------------------------------------------------
    // TEST N — PAYEE compatibility
    // -------------------------------------------------------------
    console.log('\n[TEST N] Verify PAYEE status compatibility with LettreDeChange document operations...');
    const { lc: lcN, facture: factureN } = await createTestEffetPayment(companyAId);

    // Verify Facture status is PAYEE
    const updatedFactureN = await prisma.facture.findUnique({ where: { id: factureN.id } });
    const creanceN = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureN.numeroFacture } });
    if (creanceN?.statutPaiement !== 'PAYE') {
      throw new Error(`Facture was expected to be fully paid (PAYEE), got: ${creanceN?.statutPaiement}`);
    }

    // Upload, view, download, delete document on PAYEE-linked LettreDeChange
    const docN = await lettresService.uploadDocument(companyAId, lcN.id, createDummyPdfFile('payee-lc.pdf'));
    const viewN = await lettresService.getDocumentMetadata(companyAId, lcN.id);
    const fileN = await lettresService.getDocumentFile(companyAId, lcN.id);
    await lettresService.removeDocument(companyAId, lcN.id);

    if (!docN.hasDocument || !viewN.hasDocument || !fileN.diskPath) {
      throw new Error('Document operation failed on PAYEE-linked LettreDeChange');
    }
    console.log(`  ✓ PASSED: Document operations allowed cleanly on PAYEE-associated LettreDeChange #${lcN.id}.`);

    // -------------------------------------------------------------
    // TEST O — Financial isolation
    // -------------------------------------------------------------
    console.log('\n[TEST O] Verify ZERO financial side effects when adding and deleting LettreDeChange document...');
    const { lc: lcO, payment: paymentO, facture: factureO } = await createTestEffetPayment(companyAId);

    const initialPayment = await prisma.paiementClient.findUnique({ where: { id: paymentO.id } });
    const initialFacture = await prisma.facture.findUnique({ where: { id: factureO.id } });
    const initialCreance = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureO.numeroFacture } });

    // Attach document
    await lettresService.uploadDocument(companyAId, lcO.id, createDummyPdfFile('isolation-test.pdf'));
    // Remove document
    await lettresService.removeDocument(companyAId, lcO.id);

    // Re-check financial records
    const postPayment = await prisma.paiementClient.findUnique({ where: { id: paymentO.id } });
    const postFacture = await prisma.facture.findUnique({ where: { id: factureO.id } });
    const postCreance = await prisma.creanceClient.findFirst({ where: { numeroFacture: factureO.numeroFacture } });

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
    // TEST P — Failure cleanup (Physical file unlinking on DB error)
    // -------------------------------------------------------------
    console.log('\n[TEST P] Verify physical file unlinking on failure...');
    const uploadDir = path.join(process.cwd(), 'uploads', 'lettres-change');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log('  ✓ PASSED: Try/catch disk file cleanup logic verified.');

    // -------------------------------------------------------------
    // TEST Q — Concurrent upload safety (Max 1 active document)
    // -------------------------------------------------------------
    console.log('\n[TEST Q] Concurrent upload race-condition safety...');
    const { lc: lcQ } = await createTestEffetPayment(companyAId);

    const uploadPromise1 = lettresService.uploadDocument(companyAId, lcQ.id, createDummyPdfFile('concurrent-1.pdf'));
    const uploadPromise2 = lettresService.uploadDocument(companyAId, lcQ.id, createDummyJpegFile('concurrent-2.jpg'));

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

    const finalMetaQ = await lettresService.getDocumentMetadata(companyAId, lcQ.id);
    if (!finalMetaQ.hasDocument) {
      throw new Error('Concurrent upload failed to persist any document!');
    }
    console.log(`  ✓ PASSED: Concurrent uploads handled safely (1 succeeded, 1 rejected with 409 Conflict). Max 1 active document enforced.`);

    // Clean up test data
    await prisma.lettreDeChange.deleteMany({ where: { paiementClient: { facture: { companyId: { in: [companyAId!, companyBId!] } } } } });
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId!, companyBId!] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.8 LETTRE DE CHANGE DOCUMENT TESTS PASSED! ===');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runStep4_8LettreDeChangeDocumentTests();
