import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import {
  generateInvoicePdfBuffer,
  InvoicePdfViewModel,
  sanitizeFilename,
} from './modules/factures/utils/facture-pdf.generator';
import { NotFoundException } from '@nestjs/common';

async function runPhase14_1InvariantSuite() {
  console.log('=== PHASE 14.1 INVOICE PDF GENERATION INVARIANT SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(FacturesService);

  const runId = Date.now();
  const testNum = `FAC-P14-1-${runId.toString().slice(-4)}`;

  try {
    // -------------------------------------------------------------
    // 1. Filename Sanitization Unit Tests
    // -------------------------------------------------------------
    console.log('--- 1. Filename Sanitization Unit Tests ---');
    const dirtyName = 'Facture-F/2026\\0001.pdf';
    const cleanName = sanitizeFilename(dirtyName);
    if (cleanName.includes('/') || cleanName.includes('\\')) {
      throw new Error(`Sanitization failed, got: ${cleanName}`);
    }
    console.log(`✅ PASSED: Filename "${dirtyName}" sanitized to "${cleanName}"`);

    // -------------------------------------------------------------
    // 2. Direct PDF Buffer Generation & Magic Bytes Signature
    // -------------------------------------------------------------
    console.log('\n--- 2. PDF Buffer Generation & Magic Bytes Signature ---');
    const viewModel: InvoicePdfViewModel = {
      numeroFacture: testNum,
      dateFactureStr: '23/07/2026',
      dateEcheanceStr: '22/08/2026',
      statut: 'EMISE',
      sousTotalFormatted: '25 000,00 MAD',
      tauxTva: 20,
      tauxTvaFormatted: '20,00 %',
      montantTvaFormatted: '5 000,00 MAD',
      montantTotalFormatted: '30 000,00 MAD',
      montantEnLettres: 'Trente mille dirhams',
      notes: 'Règlement sous 30 jours net',
      client: {
        nomEntreprise: 'Atlas Transports SARL',
        ice: '002938470000099',
        adresse: 'Zone Industrielle Ain Sebaa, Casablanca',
        telephone: '+212 522 99 88 77',
        email: 'client@atlas.ma',
      },
      transport: {
        idVoyage: 12,
        typeVoyage: 'NATIONAL',
        tracteur: 'T-100-A',
        remorque: null,
        nomConducteur: null,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger Port',
        dateChargementStr: '23/07/2026',
        numeroCmr: null,
      },
      company: {
        nomEntreprise: 'Société Logistique Maroc',
        nomLegal: null,
        adresse: 'Zone Industrielle Ain Sebaa, Casablanca',
        ville: 'Casablanca',
        pays: 'Maroc',
        telephone: '+212 522 99 88 77',
        telephoneSecondaire: null,
        email: 'contact@logistique.ma',
        ice: '002938470000099',
        identifiantFiscal: null,
        registreCommerce: null,
        cnss: null,
        patente: 'P9938212',
        siteWeb: 'www.logistique.ma',
        nomBanque: null,
        rib: null,
        iban: null,
        swiftBic: null,
        devise: 'MAD',
        footerText: null,
        legalTaxNote: null,
        logoPhysicalPath: null,
        stampPhysicalPath: null,
      },
      template: 'CLASSIC_TRANSPORT',
    };

    const pdfBuffer = await generateInvoicePdfBuffer(viewModel, { includeStamp: false });

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('PDF generator did not return a valid non-empty Buffer');
    }

    const headerSignature = pdfBuffer.slice(0, 5).toString('ascii');
    if (!headerSignature.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF header signature, got: ${headerSignature}`);
    }

    const pdfString = pdfBuffer.toString('binary');
    const pageMatches = pdfString.match(/\/Type\s*\/Page(?!\w)/g);
    const pageCount = pageMatches ? pageMatches.length : 0;
    if (pageCount < 1) {
      throw new Error(`Expected valid PDF page structure, but got ${pageCount} pages`);
    }

    console.log(
      `✅ PASSED: PDF Buffer generated successfully (${pdfBuffer.length} bytes), magic signature: ${headerSignature}, exact page count: ${pageCount}`,
    );

    // -------------------------------------------------------------
    // 3. Service PDF Generation (Database Fixture & Relations)
    // -------------------------------------------------------------
    console.log('\n--- 3. Service PDF Generation (Database Fixture & Relations) ---');
    // Configure minimum company profile first
    await prisma.companySettings.upsert({
      where: { singletonKey: 'DEFAULT' },
      create: {
        singletonKey: 'DEFAULT',
        nomEntreprise: 'Transport Co',
        adresse: '123 Main St',
        telephone: '+212522000000',
        email: 'test@transport.co',
      },
      update: {
        nomEntreprise: 'Transport Co',
        adresse: '123 Main St',
        telephone: '+212522000000',
        email: 'test@transport.co',
      },
    });

    const createdFacture = await service.create({
      idVoyage: 42,
      tauxTva: 20,
      dateFacture: '2026-07-23',
    });

    const servicePdf = await service.generatePdf(createdFacture.id);
    if (!Buffer.isBuffer(servicePdf.buffer) || servicePdf.buffer.length === 0) {
      throw new Error('Service generatePdf returned invalid buffer');
    }
    if (!servicePdf.filename.endsWith('.pdf')) {
      throw new Error(`Service generatePdf returned invalid filename: ${servicePdf.filename}`);
    }
    console.log(
      `✅ PASSED: Service generated PDF for Facture #${createdFacture.id} (${servicePdf.filename})`,
    );

    // -------------------------------------------------------------
    // 4. Soft-Deleted Invoice Handling
    // -------------------------------------------------------------
    console.log('\n--- 4. Soft-Deleted Invoice Handling ---');
    await service.remove(createdFacture.id);

    let softDeleteBlocked = false;
    try {
      await service.generatePdf(createdFacture.id);
    } catch (err: any) {
      softDeleteBlocked = err instanceof NotFoundException;
    }

    if (!softDeleteBlocked) {
      throw new Error('Generating PDF for soft-deleted invoice should throw NotFoundException');
    }
    console.log(`✅ PASSED: Soft-deleted invoice #${createdFacture.id} blocked from PDF download`);

    // Clean up created fixture
    await prisma.paiementClient.deleteMany({
      where: { numeroFacture: createdFacture.numeroFacture },
    });
    await prisma.creanceClient.deleteMany({
      where: { numeroFacture: createdFacture.numeroFacture },
    });
    await prisma.facture.delete({ where: { id: createdFacture.id } });
    await prisma.voyage.update({ where: { idVoyage: 42 }, data: { statut: 'LIVRE' } });

    console.log('\n🎉 ALL PHASE 14.1 INVARIANT TESTS PASSED CLEANLY!');
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 14.1 invariant runner: ${error.message}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase14_1InvariantSuite();
