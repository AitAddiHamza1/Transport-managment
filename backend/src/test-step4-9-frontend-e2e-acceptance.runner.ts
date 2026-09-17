import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { FacturesService } from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { LettresDeChangeService } from './modules/lettres-de-change/lettres-de-change.service';
import { ModeFacturation, PaiementMethode } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function runStep4_9E2EAcceptanceTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.9 — E2E INTEGRATION ACCEPTANCE TEST SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const voyagesService = app.get(VoyagesService);
  const facturesService = app.get(FacturesService);
  const paiementsService = app.get(PaiementsClientsService);
  const lettresService = app.get(LettresDeChangeService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;

  try {
    console.log('[SETUP] Initializing test tenant environment...');
    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_49_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_49_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_49_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_49_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_49_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_49_A', telephone: '0699999999' },
      });
    }
    clientAId = clientA.id;
    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // Helper dummy file creator
    const createDummyPdf = (name = 'doc-test.pdf'): Express.Multer.File => {
      const buf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
      return {
        fieldname: 'file',
        originalname: name,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: buf,
        size: buf.length,
      } as Express.Multer.File;
    };

    // -------------------------------------------------------------
    // TEST 1 — Create Voyage default (mode = AVEC_FACTURE, 0 docs, 0 frais)
    // -------------------------------------------------------------
    console.log('[TEST 1] Create Voyage default (mode = AVEC_FACTURE, 0 docs, 0 frais)...');
    const v1 = await voyagesService.create(companyAId, {
      idClient: clientAId!,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      montantVoyage: 5000,
    });
    if (v1.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Expected default modeFacturation = AVEC_FACTURE, got: ${v1.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${v1.idVoyage} created with default modeFacturation = AVEC_FACTURE.`);

    // -------------------------------------------------------------
    // TEST 2 — Create Voyage with SANS_FACTURE
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Create Voyage with modeFacturation = SANS_FACTURE...');
    const v2 = await voyagesService.create(companyAId, {
      idClient: clientAId!,
      modeFacturation: ModeFacturation.SANS_FACTURE,
      lieuChargement: 'Tanger',
      lieuDechargement: 'Agadir',
      montantVoyage: 8000,
    });
    if (v2.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected modeFacturation = SANS_FACTURE, got: ${v2.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${v2.idVoyage} created with modeFacturation = SANS_FACTURE.`);

    // -------------------------------------------------------------
    // TEST 3 — Attach multiple Voyage documents
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Attach multiple Voyage documents...');
    const pdf1 = createDummyPdf('cmr-scan.pdf');
    const pdf2 = createDummyPdf('bon-livraison.pdf');
    const doc1 = await voyagesService.uploadVoyageDocument(companyAId, v1.idVoyage, pdf1);
    const doc2 = await voyagesService.uploadVoyageDocument(companyAId, v1.idVoyage, pdf2);
    if (!doc1.id || !doc2.id) {
      throw new Error(`Failed to upload documents`);
    }
    console.log(`  ✓ PASSED: 2 documents attached to Voyage #${v1.idVoyage}.`);

    // -------------------------------------------------------------
    // TEST 4 — List and retrieve Voyage documents
    // -------------------------------------------------------------
    console.log('\n[TEST 4] List and retrieve Voyage documents (view/download)...');
    const listDocs = await voyagesService.findAllVoyageDocuments(companyAId, v1.idVoyage);
    if (listDocs.length !== 2) {
      throw new Error(`Expected 2 documents in list, got: ${listDocs.length}`);
    }
    const retrievedFile = await voyagesService.getVoyageDocumentFile(companyAId, v1.idVoyage, doc1.id);
    if (!retrievedFile.diskPath || !fs.existsSync(retrievedFile.diskPath)) {
      throw new Error(`Retrieved file disk path invalid: ${retrievedFile.diskPath}`);
    }
    console.log(`  ✓ PASSED: 2 documents listed and retrieved for Voyage #${v1.idVoyage} (Path: '${retrievedFile.diskPath}').`);

    // -------------------------------------------------------------
    // TEST 5 — Reject invalid file (unsupported extension / spoofed bytes)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Reject invalid Voyage document...');
    const invalidFile: Express.Multer.File = {
      fieldname: 'files',
      originalname: 'virus.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      buffer: Buffer.from('MZ...payload'),
      size: 20,
    } as Express.Multer.File;

    try {
      await voyagesService.uploadVoyageDocument(companyAId, v1.idVoyage, invalidFile);
      throw new Error('Expected BadRequestException, but upload succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid file type cleanly rejected ("${err.message}").`);
    }

    // -------------------------------------------------------------
    // TEST 6 — Create / update FraisImmobilisation
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Create and update FraisImmobilisation...');
    const frais = await voyagesService.createFraisImmobilisation(companyAId, v1.idVoyage, {
      prixParJour: 500,
      nombreJoursRetard: 3,
    });
    if (Number(frais.montantTotal) !== 1500) {
      throw new Error(`Expected montantTotal = 1500, got: ${frais.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Frais created (500 x 3 = 1500 MAD).`);

    // -------------------------------------------------------------
    // TEST 7 — Invoice recalculation with immobilisation (HT, TVA, TTC)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Invoice recalculation with immobilisation breakdown...');
    const f1 = await facturesService.create({ idVoyage: v1.idVoyage }, companyAId);
    // Base 5000 + Frais 1500 = 6500 HT, TVA 20% = 1300, TTC = 7800
    if (Number(f1.sousTotal) !== 6500 || Number(f1.montantTva) !== 1300 || Number(f1.montantTotal) !== 7800) {
      throw new Error(`Invalid invoice calculation: HT=${f1.sousTotal}, TVA=${f1.montantTva}, TTC=${f1.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Invoice #${f1.numeroFacture} recalculates: HT=6,500, TVA=1,300, TTC=7,800 MAD.`);

    // -------------------------------------------------------------
    // TEST 8 — Partially paid invoice + immobilisation update
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Partially paid invoice + immobilisation update...');
    await paiementsService.create(companyAId, {
      numeroFacture: f1.numeroFacture,
      montantRecu: 2000,
      methodePaiement: PaiementMethode.ESPECES,
    });

    // Update Frais 500 x 4 = 2000 -> New HT=7000, TVA=1400, TTC=8400. Solde = 8400 - 2000 = 6400
    await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, {
      nombreJoursRetard: 4,
    });

    const creanceF1 = await prisma.creanceClient.findFirst({ where: { numeroFacture: f1.numeroFacture } });
    if (Number(creanceF1?.montantFacture) !== 8400 || Number(creanceF1?.montantRecu) !== 2000 || Number(creanceF1?.solde) !== 6400) {
      throw new Error(`Creance update failed after Frais update: ${JSON.stringify(creanceF1)}`);
    }
    console.log(`  ✓ PASSED: Partial payment preserved (2,000 MAD), Solde updated to 6,400 MAD.`);

    // -------------------------------------------------------------
    // TEST 9 — PAYEE invoice + financial mutation attempt
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Attempt financial mutation on fully paid invoice (PAYEE)...');
    // Complete payment
    await paiementsService.create(companyAId, {
      numeroFacture: f1.numeroFacture,
      montantRecu: 6400,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    try {
      await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, { nombreJoursRetard: 5 });
      throw new Error('Expected BadRequestException on PAYEE invoice financial update, but succeeded');
    } catch (err: any) {
      if (!(err instanceof BadRequestException) || !err.message.includes('déjà payée')) {
        throw new Error(`Expected BadRequestException for PAYEE protection, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: PAYEE financial mutation rejected with French error: "${err.message}".`);
    }

    // -------------------------------------------------------------
    // TEST 10 — PAYEE invoice + document upload (Allowed)
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Document upload on PAYEE invoice (Allowed)...');
    const docPayee = await voyagesService.uploadVoyageDocument(companyAId, v1.idVoyage, createDummyPdf('receipt-payee.pdf'));
    if (!docPayee.id) {
      throw new Error('Failed to attach document to PAYEE voyage');
    }
    console.log(`  ✓ PASSED: Document upload allowed cleanly on PAYEE voyage #${v1.idVoyage}.`);

    // -------------------------------------------------------------
    // TEST 11 — Facture list filter by modeFacturation
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Facture list server-side filtering by modeFacturation...');
    const f2 = await facturesService.create({ idVoyage: v2.idVoyage }, companyAId);

    const avecInvoices = await facturesService.findAll(companyAId, { modeFacturation: ModeFacturation.AVEC_FACTURE });
    const sansInvoices = await facturesService.findAll(companyAId, { modeFacturation: ModeFacturation.SANS_FACTURE });

    if (avecInvoices.data.some((f) => f.id === f2.id) || !sansInvoices.data.some((f) => f.id === f2.id)) {
      throw new Error('Facture modeFacturation server-side filter failed!');
    }
    console.log(`  ✓ PASSED: Server-side filtering produced exact mode subsets (AVEC: ${avecInvoices.data.length}, SANS: ${sansInvoices.data.length}).`);

    // -------------------------------------------------------------
    // TEST 12 — Lettre de Change document upload
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Lettre de change document upload...');
    const lcPay = await paiementsService.create(companyAId, {
      numeroFacture: f2.numeroFacture,
      montantRecu: 9600,
      methodePaiement: PaiementMethode.EFFET,
      lettreNumero: `LC-49-${Date.now()}`,
      lettreDateEcheance: '2026-12-31',
      lettreMontant: 9600,
      lettreBeneficiaire: 'BENEF_49',
      lettreCause: 'Transport cargo',
      lettreTireNom: 'TIRE_49',
      lettreTireAdresse: 'Casablanca',
    });

    const lcRow = await prisma.lettreDeChange.findFirst({ where: { idPaiementClient: lcPay.id } });
    if (!lcRow) throw new Error('LettreDeChange row not found');

    const lcDoc = await lettresService.uploadDocument(companyAId, lcRow.id, createDummyPdf('scan-effet-49.pdf'));
    if (!lcDoc.hasDocument || lcDoc.nomOriginal !== 'scan-effet-49.pdf') {
      throw new Error(`Invalid LettreDeChange document upload: ${JSON.stringify(lcDoc)}`);
    }
    console.log(`  ✓ PASSED: Document attached to LettreDeChange #${lcRow.id}.`);

    // -------------------------------------------------------------
    // TEST 13 — Duplicate Lettre de Change document upload (HTTP 409)
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Duplicate Lettre de change document upload attempt (HTTP 409)...');
    try {
      await lettresService.uploadDocument(companyAId, lcRow.id, createDummyPdf('second-scan.pdf'));
      throw new Error('Expected ConflictException (HTTP 409), but succeeded');
    } catch (err: any) {
      if (!(err instanceof ConflictException) || !err.message.includes('possède déjà un document')) {
        throw new Error(`Expected ConflictException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Duplicate upload rejected cleanly with HTTP 409 Conflict ("${err.message}").`);
    }

    // -------------------------------------------------------------
    // TEST 14 — Delete Lettre de Change document
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Delete Lettre de change document...');
    await lettresService.removeDocument(companyAId, lcRow.id);
    const metaAfterDel = await lettresService.getDocumentMetadata(companyAId, lcRow.id);
    if (metaAfterDel.hasDocument !== false) {
      throw new Error('LettreDeChange document metadata was not cleared');
    }

    const lcStillIntact = await prisma.lettreDeChange.findUnique({ where: { id: lcRow.id } });
    if (!lcStillIntact || Number(lcStillIntact.montant) !== 9600) {
      throw new Error('LettreDeChange financial record was damaged during document deletion!');
    }
    console.log(`  ✓ PASSED: Document cleared, LettreDeChange #${lcRow.id} financial record remains 100% intact.`);

    // -------------------------------------------------------------
    // TEST 15 — Cross-tenant access protection
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Verify cross-tenant access protection...');
    try {
      await voyagesService.findOne(companyBId!, v1.idVoyage);
      throw new Error('Company B read Company A Voyage!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant access rejected cleanly with NotFoundException.`);
    }

    // Clean up test data
    await prisma.lettreDeChange.deleteMany({ where: { paiementClient: { facture: { companyId: { in: [companyAId!, companyBId!] } } } } });
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.documentVoyage.deleteMany({ where: { voyage: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.fraisImmobilisation.deleteMany({ where: { voyage: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId!, companyBId!] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.9 E2E INTEGRATION ACCEPTANCE TESTS PASSED! ===');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('\n❌ E2E TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runStep4_9E2EAcceptanceTests();
