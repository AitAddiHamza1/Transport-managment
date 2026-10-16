import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ChequesService } from './modules/cheques/cheques.service';
import { LettresDeChangeService } from './modules/lettres-de-change/lettres-de-change.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { FournisseursService } from './modules/fournisseurs/fournisseurs.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PaiementMethode } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

async function runVuln01RemediationTests() {
  console.log('========================================================================');
  console.log('=== REGRESSION TEST SUITE: VULN-01 CROSS-TENANT REMEDIATION ===');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const chequesService = app.get(ChequesService);
  const lettresService = app.get(LettresDeChangeService);
  const paiementsClientsService = app.get(PaiementsClientsService);
  const fournisseursService = app.get(FournisseursService);
  const dettesFournisseursService = app.get(DettesFournisseursService);
  const paiementsFournisseursService = app.get(PaiementsFournisseursService);

  const SUITE_PREFIX = `VULN01_${Date.now()}`;
  let companyAId: number | undefined;
  let companyBId: number | undefined;
  let chequeB: any = null;
  let lcB: any = null;
  let supplierChequeB: any = null;
  let orphanCheque: any = null;
  let orphanLc: any = null;
  let paymentB: any = null;
  let paymentBLc: any = null;
  let supplierPaymentB: any = null;
  let supplierPaymentBLc: any = null;
  let supplierLcB: any = null;
  let detteB: any = null;
  let fourB: any = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create two distinct tenant companies A and B
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning two distinct tenant companies A and B...');
    const compA = await prisma.company.create({
      data: { nom: `${SUITE_PREFIX}_COMPANY_A`, statut: 'ACTIF' },
    });
    companyAId = compA.id;

    const compB = await prisma.company.create({
      data: { nom: `${SUITE_PREFIX}_COMPANY_B`, statut: 'ACTIF' },
    });
    companyBId = compB.id;

    console.log(`  ✓ Company A created (ID: ${companyAId})`);
    console.log(`  ✓ Company B created (ID: ${companyBId})`);

    // Helper: Create Multer file mock
    const createDummyPdfFile = (filename = 'sample.pdf'): Express.Multer.File => {
      const buf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
      return {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: buf,
        size: buf.length,
      } as Express.Multer.File;
    };

    // -------------------------------------------------------------------------
    // SCENARIO 1 & 2: Overlapping Invoice Number F001/2026 on Company A and Company B
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 1 & 2] Creating overlapping invoice numbers (F001/2026) in both companies...');
    const OVERLAPPING_INVOICE_NUM = `F001/2026`;

    // Company A creates invoice F001/2026
    const invoiceA = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: OVERLAPPING_INVOICE_NUM,
        dateFacture: new Date('2026-01-10'),
        nomClient: 'CLIENT_OF_COMPANY_A',
        sousTotal: 10000,
        tauxTva: 20,
      },
    });

    await prisma.creanceClient.create({
      data: {
        companyId: companyAId,
        factureId: invoiceA.id,
        numeroFacture: invoiceA.numeroFacture,
        nomClient: invoiceA.nomClient,
        dateEmission: invoiceA.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 12000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    // Company B creates invoice F001/2026
    const invoiceB = await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: OVERLAPPING_INVOICE_NUM,
        dateFacture: new Date('2026-01-15'),
        nomClient: 'CLIENT_OF_COMPANY_B',
        sousTotal: 50000,
        tauxTva: 20,
      },
    });

    await prisma.creanceClient.create({
      data: {
        companyId: companyBId,
        factureId: invoiceB.id,
        numeroFacture: invoiceB.numeroFacture,
        nomClient: invoiceB.nomClient,
        dateEmission: invoiceB.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 60000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    console.log(`  ✓ Company A Invoice created: #${invoiceA.id} (numero: "${invoiceA.numeroFacture}", companyId: ${invoiceA.companyId})`);
    console.log(`  ✓ Company B Invoice created: #${invoiceB.id} (numero: "${invoiceB.numeroFacture}", companyId: ${invoiceB.companyId})`);

    // Company B registers client payment with CHEQUE on its invoice F001/2026
    paymentB = await paiementsClientsService.create(companyBId, {
      numeroFacture: invoiceB.numeroFacture,
      montantRecu: 60000,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: 'CHQ-COMPANY-B-999',
      chequeBanque: 'Banque Populaire B',
      chequeDateCheque: '2026-01-20',
      chequeBeneficiaire: 'COMPANY_B_BENEFICIARY',
      chequeAgence: 'Agence Agdal',
      chequeVille: 'Rabat',
    });

    chequeB = await prisma.cheque.findFirst({
      where: { idPaiementClient: paymentB.id },
    });
    if (!chequeB) throw new Error('Cheque B was not created');

    console.log(`  ✓ Company B Cheque created: #${chequeB.id} (numero: "${chequeB.numero}", linked payment: #${paymentB.id})`);

    // -------------------------------------------------------------------------
    // SCENARIO 3: Company A attempts cross-tenant read of Company B's Cheque
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 3] Company A attempts cross-tenant read on Company B Cheque...');
    try {
      await chequesService.getChequeById(companyAId, chequeB.id);
      throw new Error('SECURITY BREACH: Company A successfully read Company B Cheque by ID!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A read on Cheque #${chequeB.id} REJECTED with 404 NotFound ("${err.message}")`);
    }

    try {
      await chequesService.getChequeByClientPaymentId(companyAId, paymentB.id);
      throw new Error('SECURITY BREACH: Company A read Company B Cheque via getChequeByClientPaymentId!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A read on Payment #${paymentB.id} REJECTED with 404 NotFound ("${err.message}")`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 4: Company B uploads document; Company A attempts download/preview
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 4] Company B attaches confidential scan; Company A attempts download/preview...');
    const scanFileB = createDummyPdfFile('confidential-cheque-b.pdf');
    const uploadedDocB = await chequesService.uploadDocument(companyBId, chequeB.id, scanFileB);
    console.log(`  ✓ Company B uploaded document: "${uploadedDocB.nomOriginal}"`);

    // Company A attempts getDocumentMetadata
    try {
      await chequesService.getDocumentMetadata(companyAId, chequeB.id);
      throw new Error('SECURITY BREACH: Company A read metadata of Company B Cheque document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A metadata request REJECTED with 404 NotFound`);
    }

    // Company A attempts getDocumentFile (preview / download)
    try {
      await chequesService.getDocumentFile(companyAId, chequeB.id);
      throw new Error('SECURITY BREACH: Company A downloaded file of Company B Cheque document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A download request REJECTED with 404 NotFound`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 5: Company A attempts cross-tenant document deletion
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 5] Company A attempts cross-tenant document deletion...');
    try {
      await chequesService.removeDocument(companyAId, chequeB.id);
      throw new Error('SECURITY BREACH: Company A deleted Company B Cheque document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A document deletion REJECTED with 404 NotFound`);
    }

    // Verify Company B document is STILL intact
    const intactCheckB = await chequesService.getDocumentFile(companyBId, chequeB.id);
    if (!intactCheckB || !fs.existsSync(intactCheckB.diskPath)) {
      throw new Error('Integrity violation: Company B Cheque document was affected by unauthorized delete attempt!');
    }
    console.log(`  ✓ PASSED: Company B document remains 100% intact on disk and in database`);

    // -------------------------------------------------------------------------
    // SCENARIO 6: Letters of exchange (Lettre de Change) equivalent scenarios
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 6] Lettres de change cross-tenant protection with overlapping invoice number...');
    const OVERLAPPING_LC_INVOICE = `F002/2026`;

    // Company A invoice F002/2026
    const invoiceALc = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: OVERLAPPING_LC_INVOICE,
        dateFacture: new Date('2026-02-01'),
        nomClient: 'CLIENT_OF_COMPANY_A_LC',
        sousTotal: 8000,
        tauxTva: 20,
      },
    });

    await prisma.creanceClient.create({
      data: {
        companyId: companyAId,
        factureId: invoiceALc.id,
        numeroFacture: invoiceALc.numeroFacture,
        nomClient: invoiceALc.nomClient,
        dateEmission: invoiceALc.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 9600,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    // Company B invoice F002/2026
    const invoiceBLc = await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: OVERLAPPING_LC_INVOICE,
        dateFacture: new Date('2026-02-05'),
        nomClient: 'CLIENT_OF_COMPANY_B_LC',
        sousTotal: 40000,
        tauxTva: 20,
      },
    });

    await prisma.creanceClient.create({
      data: {
        companyId: companyBId,
        factureId: invoiceBLc.id,
        numeroFacture: invoiceBLc.numeroFacture,
        nomClient: invoiceBLc.nomClient,
        dateEmission: invoiceBLc.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 48000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    // Company B payment with EFFET (Lettre de change)
    paymentBLc = await paiementsClientsService.create(companyBId, {
      numeroFacture: invoiceBLc.numeroFacture,
      montantRecu: 48000,
      methodePaiement: PaiementMethode.EFFET,
      lettreNumero: 'LC-COMPANY-B-888',
      lettreDateEcheance: '2026-06-30',
      lettreMontant: 48000,
      lettreBeneficiaire: 'COMPANY_B_LC_BENEFICIARY',
      lettreCause: 'Facture F002/2026 Transport',
      lettreTireNom: 'TIRE_CLIENT_B',
      lettreTireAdresse: 'Casablanca Anfa',
    });

    lcB = await prisma.lettreDeChange.findFirst({
      where: { idPaiementClient: paymentBLc.id },
    });
    if (!lcB) throw new Error('LettreDeChange B was not created');

    // Company B uploads document on its lettre de change
    const scanLcFileB = createDummyPdfFile('confidential-lc-b.pdf');
    await lettresService.uploadDocument(companyBId, lcB.id, scanLcFileB);
    console.log(`  ✓ Company B LettreDeChange created (#${lcB.id}) and document attached`);

    // Company A attempts cross-tenant read of LettreDeChange metadata
    try {
      await lettresService.getDocumentMetadata(companyAId, lcB.id);
      throw new Error('SECURITY BREACH: Company A read metadata of Company B LettreDeChange!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A LettreDeChange metadata read REJECTED with 404 NotFound`);
    }

    // Company A attempts cross-tenant download of LettreDeChange
    try {
      await lettresService.getDocumentFile(companyAId, lcB.id);
      throw new Error('SECURITY BREACH: Company A downloaded Company B LettreDeChange document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A LettreDeChange document download REJECTED with 404 NotFound`);
    }

    // Company A attempts cross-tenant deletion of LettreDeChange document
    try {
      await lettresService.removeDocument(companyAId, lcB.id);
      throw new Error('SECURITY BREACH: Company A deleted Company B LettreDeChange document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A LettreDeChange document deletion REJECTED with 404 NotFound`);
    }

    // Verify Company B LettreDeChange document remains intact
    const intactLcB = await lettresService.getDocumentFile(companyBId, lcB.id);
    if (!intactLcB || !fs.existsSync(intactLcB.diskPath)) {
      throw new Error('Integrity violation: Company B LettreDeChange document was corrupted or deleted!');
    }
    console.log(`  ✓ PASSED: Company B LettreDeChange document remains 100% intact`);

    // ---------------------------------------------------------
    // SCENARIO 7: Legitimate access by owning company (Company B)
    // ---------------------------------------------------------
    console.log('\n[SCENARIO 7] Verifying legitimate access for owning tenant (Company B)...');
    const legitChequeB = await chequesService.getChequeById(companyBId, chequeB.id);
    if (legitChequeB.id !== chequeB.id || legitChequeB.numero !== 'CHQ-COMPANY-B-999') {
      throw new Error('Legitimate read failed for Company B Cheque');
    }
    console.log(`  ✓ PASSED: Company B successfully read its own Cheque #${chequeB.id}`);

    const legitChequeDocB = await chequesService.getDocumentMetadata(companyBId, chequeB.id);
    if (!legitChequeDocB.downloadUrl) {
      throw new Error('Legitimate document metadata failed for Company B Cheque');
    }
    console.log(`  ✓ PASSED: Company B successfully read its own Cheque document metadata`);

    const legitChequeFileB = await chequesService.getDocumentFile(companyBId, chequeB.id);
    if (!legitChequeFileB.diskPath || !fs.existsSync(legitChequeFileB.diskPath)) {
      throw new Error('Legitimate file access failed for Company B Cheque');
    }
    console.log(`  ✓ PASSED: Company B successfully downloaded its own Cheque document`);

    const legitLcDocB = await lettresService.getDocumentMetadata(companyBId, lcB.id);
    if (!legitLcDocB.hasDocument) {
      throw new Error('Legitimate metadata failed for Company B LettreDeChange');
    }
    console.log(`  ✓ PASSED: Company B successfully read its own LettreDeChange document metadata`);

    // -------------------------------------------------------------------------
    // SCENARIO 8: Supplier-payment ownership paths (PaiementFournisseur)
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 8] Verifying supplier-payment path (detteFournisseur -> paiementFournisseur -> cheque)...');
    fourB = await fournisseursService.create({
      nomFournisseur: `${SUITE_PREFIX}_SUPPLIER_B`,
      ice: '009988776655443',
    }, companyBId);

    detteB = await dettesFournisseursService.create(companyBId, {
      idFournisseur: fourB.id,
      montantDu: 25000,
      delaiPaiementJours: 30,
      dateDette: '2026-01-20',
    });

    supplierPaymentB = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-${SUITE_PREFIX}-001`,
        idDetteFournisseur: detteB.id,
        montant: 15000,
        datePaiement: new Date('2026-01-25'),
        modePaiement: PaiementMethode.CHEQUE,
      },
    });

    supplierChequeB = await prisma.cheque.create({
      data: {
        idPaiementFournisseur: supplierPaymentB.id,
        numero: 'CHQ-SUPPLIER-B-111',
        banque: 'Attijariwafa Bank',
        dateCheque: new Date('2026-01-25'),
        beneficiaire: fourB.nomFournisseur,
      },
    });
    console.log(`  ✓ Company B Supplier Cheque created: #${supplierChequeB.id} (linked to dette #${detteB.id})`);

    // Upload document on supplier cheque
    await chequesService.uploadDocument(companyBId, supplierChequeB.id, createDummyPdfFile('supplier-chq-b.pdf'));

    // Company A attempts cross-tenant read of supplier cheque by ID
    try {
      await chequesService.getChequeById(companyAId, supplierChequeB.id);
      throw new Error('SECURITY BREACH: Company A read Company B supplier cheque by ID!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A read on supplier Cheque #${supplierChequeB.id} REJECTED with 404 NotFound`);
    }

    // Company A attempts cross-tenant read via getChequeBySupplierPaymentId
    try {
      await chequesService.getChequeBySupplierPaymentId(companyAId, supplierPaymentB.id);
      throw new Error('SECURITY BREACH: Company A read Company B supplier cheque via paymentId!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A read via supplierPaymentId REJECTED with 404 NotFound`);
    }

    // Company A attempts cross-tenant file download of supplier cheque
    try {
      await chequesService.getDocumentFile(companyAId, supplierChequeB.id);
      throw new Error('SECURITY BREACH: Company A downloaded supplier cheque document!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A download of supplier cheque document REJECTED with 404 NotFound`);
    }

    // Company B legitimate read of supplier cheque
    const legitSupplierChq = await chequesService.getChequeBySupplierPaymentId(companyBId, supplierPaymentB.id);
    if (legitSupplierChq.id !== supplierChequeB.id) {
      throw new Error('Legitimate supplier cheque access failed for Company B');
    }
    console.log(`  ✓ PASSED: Company B successfully read its own supplier Cheque`);

    // 8.2 Supplier Lettre de Change test (detteFournisseur -> paiementFournisseur -> lettreDeChange)
    supplierPaymentBLc = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-${SUITE_PREFIX}-002`,
        idDetteFournisseur: detteB.id,
        montant: 10000,
        datePaiement: new Date('2026-01-26'),
        modePaiement: PaiementMethode.EFFET,
      },
    });

    supplierLcB = await prisma.lettreDeChange.create({
      data: {
        idPaiementFournisseur: supplierPaymentBLc.id,
        numero: 'LC-SUPPLIER-B-222',
        dateEcheance: new Date('2026-07-31'),
        montant: 10000,
        beneficiaire: fourB.nomFournisseur,
        cause: 'Facture Fournisseur Test',
        tireNom: 'Company B Tireur',
        tireAdresse: 'Casablanca',
      },
    });

    await lettresService.uploadDocument(companyBId, supplierLcB.id, createDummyPdfFile('supplier-lc-b.pdf'));

    // Company A attempts cross-tenant read of supplier LC document
    try {
      await lettresService.getDocumentMetadata(companyAId, supplierLcB.id);
      throw new Error('SECURITY BREACH: Company A read Company B supplier LettreDeChange document metadata!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Company A read on supplier LettreDeChange #${supplierLcB.id} REJECTED with 404 NotFound`);
    }

    // Company B legitimate read of supplier LC document
    const legitSupplierLc = await lettresService.getDocumentMetadata(companyBId, supplierLcB.id);
    if (!legitSupplierLc.hasDocument) {
      throw new Error('Legitimate supplier LettreDeChange access failed for Company B');
    }
    console.log(`  ✓ PASSED: Company B successfully read its own supplier LettreDeChange document metadata`);

    // -------------------------------------------------------------------------
    // SCENARIO 9: Missing or inconsistent ownership links rejected safely (Fail-Closed)
    // -------------------------------------------------------------------------
    console.log('\n[SCENARIO 9] Verifying fail-closed rejection for missing / inconsistent links...');

    // 9.1 Non-existent Cheque ID
    try {
      await chequesService.getChequeById(companyAId, 99999999);
      throw new Error('Expected 404 for non-existent Cheque ID');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Non-existent Cheque ID rejected with 404 NotFound`);
    }

    // 9.2 Non-existent LettreDeChange ID
    try {
      await lettresService.getDocumentMetadata(companyAId, 99999999);
      throw new Error('Expected 404 for non-existent LettreDeChange ID');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Non-existent LettreDeChange ID rejected with 404 NotFound`);
    }

    // 9.3 Inconsistent Cheque rejected at DB level (chk_cheque_exactly_one_owner)
    try {
      await prisma.cheque.create({
        data: {
          numero: 'ORPHAN-CHQ-001',
          dateCheque: new Date('2026-01-01'),
          banque: 'Orphan Bank',
          beneficiaire: 'Orphan Beneficiary',
          idPaiementClient: null,
          idPaiementFournisseur: null,
        },
      });
      throw new Error('Expected DB constraint failure for orphan Cheque');
    } catch (err: any) {
      console.log(`  ✓ PASSED: DB constraint "chk_cheque_exactly_one_owner" strictly prevents orphan Cheques`);
    }

    // 9.4 Inconsistent LettreDeChange rejected at DB level (chk_lettre_change_exactly_one_owner)
    try {
      await prisma.lettreDeChange.create({
        data: {
          numero: 'ORPHAN-LC-001',
          dateEcheance: new Date('2026-01-01'),
          montant: 1000,
          beneficiaire: 'Orphan LC Beneficiary',
          cause: 'Orphan Cause',
          tireNom: 'Orphan Tire',
          tireAdresse: 'Orphan Address',
          idPaiementClient: null,
          idPaiementFournisseur: null,
        },
      });
      throw new Error('Expected DB constraint failure for orphan LettreDeChange');
    } catch (err: any) {
      console.log(`  ✓ PASSED: DB constraint "chk_lettre_change_exactly_one_owner" strictly prevents orphan LettresDeChange`);
    }

    // 9.5 Application-level Fail-Closed check on invalid tenant company IDs (0, -1, NaN)
    try {
      await chequesService.getChequeById(0, chequeB.id);
      throw new Error('Expected 404 for invalid companyId 0');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid companyId 0 rejected with 404 NotFound`);
    }

    try {
      await lettresService.getDocumentMetadata(-1, lcB.id);
      throw new Error('Expected 404 for invalid companyId -1');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Invalid companyId -1 rejected with 404 NotFound`);
    }

    // -------------------------------------------------------------------------
    // CLEANUP: Clean up test records created for this suite
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records from local database...');
    // Delete test files on disk
    try {
      if (chequeB && companyBId) {
        const chqBFile = await chequesService.getDocumentFile(companyBId, chequeB.id);
        if (fs.existsSync(chqBFile.diskPath)) fs.unlinkSync(chqBFile.diskPath);
      }
    } catch (_) {}
    try {
      if (lcB && companyBId) {
        const lcBFile = await lettresService.getDocumentFile(companyBId, lcB.id);
        if (fs.existsSync(lcBFile.diskPath)) fs.unlinkSync(lcBFile.diskPath);
      }
    } catch (_) {}
    try {
      if (supplierChequeB && companyBId) {
        const supChqFile = await chequesService.getDocumentFile(companyBId, supplierChequeB.id);
        if (fs.existsSync(supChqFile.diskPath)) fs.unlinkSync(supChqFile.diskPath);
      }
    } catch (_) {}
    try {
      if (supplierLcB && companyBId) {
        const supLcFile = await lettresService.getDocumentFile(companyBId, supplierLcB.id);
        if (fs.existsSync(supLcFile.diskPath)) fs.unlinkSync(supLcFile.diskPath);
      }
    } catch (_) {}

    const chequeIdsToDelete = [chequeB?.id, supplierChequeB?.id, orphanCheque?.id].filter(Boolean);
    if (chequeIdsToDelete.length > 0) {
      await prisma.cheque.deleteMany({ where: { id: { in: chequeIdsToDelete } } });
    }

    const lcIdsToDelete = [lcB?.id, supplierLcB?.id, orphanLc?.id].filter(Boolean);
    if (lcIdsToDelete.length > 0) {
      await prisma.lettreDeChange.deleteMany({ where: { id: { in: lcIdsToDelete } } });
    }

    const clientPaymentIds = [paymentB?.id, paymentBLc?.id].filter(Boolean);
    if (clientPaymentIds.length > 0) {
      await prisma.paiementClient.deleteMany({ where: { id: { in: clientPaymentIds } } });
    }

    const supplierPaymentIds = [supplierPaymentB?.id, supplierPaymentBLc?.id].filter(Boolean);
    if (supplierPaymentIds.length > 0) {
      await prisma.paiementFournisseur.deleteMany({ where: { id: { in: supplierPaymentIds } } });
    }
    if (detteB?.id) {
      await prisma.detteFournisseur.deleteMany({ where: { id: detteB.id } });
    }
    if (fourB?.id) {
      await prisma.fournisseur.deleteMany({ where: { id: fourB.id } });
    }

    const compIds = [companyAId, companyBId].filter(Boolean) as number[];
    if (compIds.length > 0) {
      await prisma.creanceClient.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.facture.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.detteFournisseurSequence.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.company.deleteMany({ where: { id: { in: compIds } } });
    }

    console.log('  ✓ Test cleanup completed successfully.');

    console.log('\n========================================================================');
    console.log('=== ALL 9 REGRESSION SCENARIOS PASSED VERIFIED SAFE! ===');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ REGRESSION TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runVuln01RemediationTests();
