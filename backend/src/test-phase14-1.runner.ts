import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService, toFactureView } from './modules/factures/factures.service';
import {
  generateInvoicePdfBuffer,
  sanitizeFilename,
} from './modules/factures/utils/facture-pdf.generator';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
    const mockFacture = toFactureView({
      id: 999,
      numeroFacture: testNum,
      nomClient: 'Atlas Transports SARL',
      idVoyage: 12,
      dateFacture: new Date(),
      joursEcheance: 30,
      dateEcheance: new Date(Date.now() + 30 * 86400000),
      devise: 'MAD',
      sousTotal: new Prisma.Decimal('25000.00'),
      tauxTva: new Prisma.Decimal('20.00'),
      montantTva: new Prisma.Decimal('5000.00'),
      montantTotal: new Prisma.Decimal('30000.00'),
      montantEnLettres: 'Trente mille dirhams',
      notes: 'Règlement sous 30 jours net',
      creePar: 1,
      supprimeLe: null,
      voyage: {
        idVoyage: 12,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger Port',
        statut: 'EN_COURS',
        tracteur: 'T-100-A',
      },
    });

    const pdfBuffer = await generateInvoicePdfBuffer(mockFacture, {
      adresse: 'Zone Industrielle Ain Sebaa, Casablanca',
      telephone: '+212 522 99 88 77',
      ice: '002938470000099',
    });

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('PDF generator did not return a valid non-empty Buffer');
    }

    const headerSignature = pdfBuffer.slice(0, 5).toString('ascii');
    if (!headerSignature.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF header signature, got: ${headerSignature}`);
    }

    const pdfString = pdfBuffer.toString('binary');
    const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 0;
    if (pageCount !== 1) {
      throw new Error(`Expected single-page PDF for standard invoice, but got ${pageCount} pages`);
    }

    console.log(
      `✅ PASSED: PDF Buffer generated successfully (${pdfBuffer.length} bytes), magic signature: ${headerSignature}, exact page count: ${pageCount}`,
    );

    // -------------------------------------------------------------
    // 3. Service PDF Generation (Database Fixture & Relations)
    // -------------------------------------------------------------
    console.log('\n--- 3. Service PDF Generation (Database Fixture & Relations) ---');
    const createdFacture = await service.create({
      numeroFacture: testNum,
      nomClient: 'Société Logistique Maroc',
      sousTotal: 15000,
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
    // 4. Soft Delete & Non-existent PDF Request Rejection
    // -------------------------------------------------------------
    console.log('\n--- 4. Soft Delete & Missing Invoice Rejection ---');
    await service.remove(createdFacture.id);

    try {
      await service.generatePdf(createdFacture.id);
      throw new Error('Should have thrown NotFoundException for soft-deleted invoice PDF');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          '✅ PASSED: Soft-deleted invoice PDF request rejected with 404 NotFoundException',
        );
      } else {
        throw err;
      }
    }

    try {
      await service.generatePdf(999999);
      throw new Error('Should have thrown NotFoundException for missing invoice PDF');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          '✅ PASSED: Non-existent invoice PDF request rejected with 404 NotFoundException',
        );
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 5. Teardown
    // -------------------------------------------------------------
    console.log('\n--- 5. Cleaning up disposable test fixtures ---');
    await prisma.facture.delete({ where: { id: createdFacture.id } });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL PHASE 14.1 INVARIANT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('❌ PHASE 14.1 INVARIANT SUITE FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase14_1InvariantSuite();
