import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ForexService } from './modules/forex/forex.service';

async function runStep2ForexTests() {
  console.log('====================================================');
  console.log('=== PHASE 7F STEP 2 — FOREX BACKEND TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const paiementsService = app.get(PaiementsClientsService);
  const voyagesService = app.get(VoyagesService);
  const forexService = app.get(ForexService);

  let eurClient: any = null;
  let madClient: any = null;
  let eurVoyage: any = null;
  let madVoyage: any = null;
  let eurInvoice: any = null;
  let madInvoice: any = null;

  try {
    // ----------------------------------------------------
    // PREPARATION: Create Test Clients and Invoices
    // ----------------------------------------------------
    eurClient = await prisma.client.create({
      data: {
        nomEntreprise: 'TEST_STEP2_EUR_CLIENT',
        telephone: '0611111111',
        deviseFacturation: 'EUR',
      },
    });

    madClient = await prisma.client.create({
      data: {
        nomEntreprise: 'TEST_STEP2_MAD_CLIENT',
        telephone: '0622222222',
        deviseFacturation: 'MAD',
      },
    });

    eurVoyage = await voyagesService.create({
      idClient: eurClient.id,
      lieuChargement: 'Tangier Med',
      lieuDechargement: 'Rotterdam Port',
      dateChargement: '2026-09-01',
      montantVoyage: 10000.0,
      devise: 'EUR',
    });

    madVoyage = await voyagesService.create({
      idClient: madClient.id,
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Agadir Zone',
      dateChargement: '2026-09-01',
      montantVoyage: 50000.0,
      devise: 'MAD',
    });

    eurInvoice = await facturesService.create({
      idVoyage: eurVoyage.idVoyage,
      dateFacture: '2026-09-01',
      joursEcheance: 30,
      tauxTva: 20,
    }); // Total TTC: 12000 EUR

    madInvoice = await facturesService.create({
      idVoyage: madVoyage.idVoyage,
      dateFacture: '2026-09-01',
      joursEcheance: 30,
      tauxTva: 20,
    }); // Total TTC: 60000 MAD

    // ----------------------------------------------------
    // TEST 1: MAD Invoice + MAD Payment -> Conversion fields null
    // ----------------------------------------------------
    console.log('[TEST 1] Testing MAD Invoice Payment (No conversion)...');
    const madPaiement = await paiementsService.create({
      numeroFacture: madInvoice.numeroFacture,
      datePaiement: '2026-09-02',
      montantRecu: 10000.0,
      methodePaiement: 'VIREMENT',
      devise: 'MAD',
    });

    if (
      madPaiement.tauxChange !== null ||
      madPaiement.montantConvertiMad !== null ||
      madPaiement.sourceTaux !== null ||
      madPaiement.dateTauxUtilise !== null ||
      madPaiement.estTauxManuel !== false
    ) {
      throw new Error(
        '[FAIL] MAD payment must have null conversion fields and estTauxManuel = false',
      );
    }
    console.log('  ✓ PASSED: MAD payment created cleanly with null conversion fields.');

    // ----------------------------------------------------
    // TEST 2: EUR Invoice + Automatic EUR Payment (Frankfurter BAM)
    // ----------------------------------------------------
    console.log('\n[TEST 2] Testing Automatic EUR Payment (Frankfurter BAM)...');
    const autoEurPaiement = await paiementsService.create({
      numeroFacture: eurInvoice.numeroFacture,
      datePaiement: '2026-09-02',
      montantRecu: 2000.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
    });

    if (
      !autoEurPaiement.tauxChange ||
      autoEurPaiement.tauxChange <= 0 ||
      !autoEurPaiement.montantConvertiMad ||
      autoEurPaiement.sourceTaux !== 'FRANKFURTER_BAM' ||
      autoEurPaiement.estTauxManuel !== false ||
      !autoEurPaiement.dateTauxUtilise
    ) {
      throw new Error(
        `[FAIL] Automatic EUR payment failed. Received: ${JSON.stringify(autoEurPaiement)}`,
      );
    }

    const expectedMadAuto = Math.round(2000.0 * autoEurPaiement.tauxChange * 100) / 100;
    if (Math.abs(autoEurPaiement.montantConvertiMad - expectedMadAuto) > 0.01) {
      throw new Error(
        `[FAIL] Calculated converted MAD amount mismatch. Got: ${autoEurPaiement.montantConvertiMad}, expected: ${expectedMadAuto}`,
      );
    }
    console.log(
      `  ✓ PASSED: Automatic EUR payment created. Taux: ${autoEurPaiement.tauxChange}, Converted MAD: ${autoEurPaiement.montantConvertiMad} MAD (Source: ${autoEurPaiement.sourceTaux}, Date: ${autoEurPaiement.dateTauxUtilise}).`,
    );

    // ----------------------------------------------------
    // TEST 3: EUR Invoice + Manual Rate (1000 EUR @ 10.780000)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing Manual EUR Payment Rate (1000 EUR @ 10.780000)...');
    const manualEurPaiement = await paiementsService.create({
      numeroFacture: eurInvoice.numeroFacture,
      datePaiement: '2026-09-02',
      montantRecu: 1000.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
      tauxChange: 10.78,
    });

    if (
      manualEurPaiement.tauxChange !== 10.78 ||
      manualEurPaiement.montantConvertiMad !== 10780.0 ||
      manualEurPaiement.sourceTaux !== 'MANUEL' ||
      manualEurPaiement.estTauxManuel !== true ||
      manualEurPaiement.dateTauxUtilise !== null
    ) {
      throw new Error(
        `[FAIL] Manual EUR payment fields invalid. Received: ${JSON.stringify(manualEurPaiement)}`,
      );
    }
    console.log(
      '  ✓ PASSED: Manual EUR payment created cleanly (1000 EUR * 10.78 = 10780 MAD, source: MANUEL, dateTauxUtilise: null).',
    );

    // ----------------------------------------------------
    // TEST 4: Rate <= 0 Validation Rejection
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing Invalid Rate Rejection (Rate <= 0)...');
    try {
      await paiementsService.create({
        numeroFacture: eurInvoice.numeroFacture,
        datePaiement: '2026-09-02',
        montantRecu: 500.0,
        methodePaiement: 'VIREMENT',
        devise: 'EUR',
        tauxChange: -10.5,
      });
      throw new Error('[FAIL] Should have thrown BadRequestException for negative rate');
    } catch (err: any) {
      if (err.message.includes('[FAIL]')) throw err;
      console.log('  ✓ PASSED: Negative exchange rate rejected cleanly with BadRequestException.');
    }

    // ----------------------------------------------------
    // TEST 5: MAD Invoice with Conversion Fields (Must be ignored)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Testing MAD Invoice with Submitted Conversion Fields...');
    const madIgnoredPaiement = await paiementsService.create({
      numeroFacture: madInvoice.numeroFacture,
      datePaiement: '2026-09-02',
      montantRecu: 5000.0,
      methodePaiement: 'VIREMENT',
      devise: 'MAD',
      tauxChange: 10.85, // submitted but must be ignored for MAD
    });

    if (
      madIgnoredPaiement.tauxChange !== null ||
      madIgnoredPaiement.montantConvertiMad !== null ||
      madIgnoredPaiement.sourceTaux !== null
    ) {
      throw new Error('[FAIL] MAD payment must ignore submitted conversion fields');
    }
    console.log('  ✓ PASSED: Submitted conversion fields ignored for MAD invoice.');

    // ----------------------------------------------------
    // TEST 6: Cross-Currency Rejection (EUR invoice + MAD payment)
    // ----------------------------------------------------
    console.log('\n[TEST 6] Testing Cross-Currency Rejection (EUR invoice + MAD payment)...');
    try {
      await paiementsService.create({
        numeroFacture: eurInvoice.numeroFacture,
        datePaiement: '2026-09-02',
        montantRecu: 1000.0,
        methodePaiement: 'VIREMENT',
        devise: 'MAD',
      });
      throw new Error('[FAIL] Cross-currency payment should have been rejected');
    } catch (err: any) {
      if (err.message.includes('[FAIL]')) throw err;
      console.log('  ✓ PASSED: Cross-currency payment attempt rejected cleanly.');
    }

    // ----------------------------------------------------
    // TEST 7: Historical / Weekend Date Rate Date Persistence
    // ----------------------------------------------------
    console.log('\n[TEST 7] Testing Weekend Payment Date Rate (Sunday 2026-08-30)...');
    const weekendPaiement = await paiementsService.create({
      numeroFacture: eurInvoice.numeroFacture,
      datePaiement: '2026-08-30', // Sunday
      montantRecu: 1000.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
    });

    if (!weekendPaiement.dateTauxUtilise || weekendPaiement.dateTauxUtilise !== '2026-08-28') {
      throw new Error(
        `[FAIL] Weekend dateTauxUtilise should be Friday 2026-08-28. Got: ${weekendPaiement.dateTauxUtilise}`,
      );
    }
    console.log(
      `  ✓ PASSED: Sunday payment date (2026-08-30) correctly stored Friday publication date (dateTauxUtilise = ${weekendPaiement.dateTauxUtilise}).`,
    );

    // ----------------------------------------------------
    // TEST 8: Direct ForexService Unit Test
    // ----------------------------------------------------
    console.log('\n[TEST 8] Testing Direct ForexService query...');
    const rateDirect = await forexService.getEurToMadRate('2026-08-28');
    if (
      rateDirect.source !== 'FRANKFURTER_BAM' ||
      rateDirect.date !== '2026-08-28' ||
      Number(rateDirect.rate) <= 0
    ) {
      throw new Error(`[FAIL] Direct ForexService call invalid: ${JSON.stringify(rateDirect)}`);
    }
    console.log(
      `  ✓ PASSED: Direct ForexService query returned rate ${rateDirect.rate} for date ${rateDirect.date}.`,
    );

    // ----------------------------------------------------
    // TEST 9: Server Authority Over Forged Client Metadata
    // ----------------------------------------------------
    console.log('\n[TEST 9] Testing Server Authority Over Forged Client Metadata...');
    const forgedPaiement = await paiementsService.create({
      numeroFacture: eurInvoice.numeroFacture,
      datePaiement: '2026-09-02',
      montantRecu: 1000.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
      sourceTaux: 'FORGED_SOURCE',
      estTauxManuel: true,
      montantConvertiMad: 999999.99,
      dateTauxUtilise: '1999-01-01',
    } as any);

    if (
      forgedPaiement.sourceTaux === 'FORGED_SOURCE' ||
      forgedPaiement.sourceTaux !== 'FRANKFURTER_BAM' ||
      forgedPaiement.estTauxManuel !== false ||
      forgedPaiement.montantConvertiMad === 999999.99
    ) {
      throw new Error(
        `[FAIL] Server failed to override forged client metadata! Result: ${JSON.stringify(forgedPaiement)}`,
      );
    }
    console.log(
      '  ✓ PASSED: Forged metadata ignored and server-side values enforced (sourceTaux: FRANKFURTER_BAM, estTauxManuel: false).',
    );

    // ----------------------------------------------------
    // CLEANUP: Delete temporary test records
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Deleting temporary test records...');
    await prisma.paiementClient.deleteMany({
      where: { numeroFacture: { in: [eurInvoice.numeroFacture, madInvoice.numeroFacture] } },
    });
    await prisma.creanceClient.deleteMany({
      where: { numeroFacture: { in: [eurInvoice.numeroFacture, madInvoice.numeroFacture] } },
    });
    await prisma.facture.deleteMany({
      where: { numeroFacture: { in: [eurInvoice.numeroFacture, madInvoice.numeroFacture] } },
    });
    await prisma.voyage.deleteMany({
      where: { idVoyage: { in: [eurVoyage.idVoyage, madVoyage.idVoyage] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [eurClient.id, madClient.id] } },
    });

    console.log('\n====================================================');
    console.log('=== ALL STEP 2 FOREX BACKEND TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ STEP 2 FOREX TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep2ForexTests();
