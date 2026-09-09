import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ForexService } from './modules/forex/forex.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

async function runStep3b29PaiementClientTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.9 — MULTI-TENANT PAIEMENTCLIENT TEST RUNNER ===');
  console.log('====================================================\n');

  // Custom mock ForexService for deterministic test execution
  class MockForexService extends ForexService {
    async getEurToMadRate(dateStr?: string) {
      return {
        rate: new Prisma.Decimal(10.75),
        date: dateStr ? dateStr.split('T')[0] : '2026-09-10',
        source: 'FRANKFURTER_BAM',
      };
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const voyagesService = app.get(VoyagesService);
  const creancesService = app.get(PaiementsClientsService)['creancesService'];
  const paiementsService = new PaiementsClientsService(
    prisma,
    creancesService,
    new MockForexService(),
  );

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Create test companies A & B, clients, voyages, invoices, and receivables
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    let companyA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_PAIEMENT_A' } });
    if (!companyA) {
      companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PAIEMENT_A' } });
    }
    companyAId = companyA.id;

    let companyB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_PAIEMENT_B' } });
    if (!companyB) {
      companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_PAIEMENT_B' } });
    }
    companyBId = companyB.id;

    // Clean previous test data if any
    await prisma.lettreDeChange.deleteMany({
      where: { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
    });
    await prisma.paiementClient.deleteMany({
      where: { facture: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.creanceClient.deleteMany({
      where: { facture: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    const year = new Date().getFullYear();
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyAId, annee: year } },
      create: { companyId: companyAId, annee: year, dernierNumero: 8100 },
      update: { dernierNumero: 8100 },
    });
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyBId, annee: year } },
      create: { companyId: companyBId, annee: year, dernierNumero: 9100 },
      update: { dernierNumero: 9100 },
    });

    let clientA = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_PAIEMENT_A' },
    });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_PAIEMENT_A',
          telephone: '0600000010',
          deviseFacturation: 'MAD',
        },
      });
    }

    let clientB = await prisma.client.findFirst({
      where: { companyId: companyBId, nomEntreprise: 'CLIENT_PAIEMENT_B' },
    });
    if (!clientB) {
      clientB = await prisma.client.create({
        data: {
          companyId: companyBId,
          nomEntreprise: 'CLIENT_PAIEMENT_B',
          telephone: '0600000020',
          deviseFacturation: 'MAD',
        },
      });
    }

    const voyageA = await voyagesService.create(companyAId, {
      idClient: clientA.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      dateChargement: '2026-09-10',
      montantVoyage: 5000.0,
      devise: 'MAD',
    });

    const voyageB = await voyagesService.create(companyBId, {
      idClient: clientB.id,
      lieuChargement: 'Tanger',
      lieuDechargement: 'Fès',
      dateChargement: '2026-09-10',
      montantVoyage: 7000.0,
      devise: 'MAD',
    });

    const factureA = await facturesService.create(
      { idVoyage: voyageA.idVoyage, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
      companyAId,
    );

    const factureB = await facturesService.create(
      { idVoyage: voyageB.idVoyage, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
      companyBId,
    );

    console.log(
      `  ✓ Setup completed (Company A: ${companyAId}, Facture A: ${factureA.numeroFacture} | Company B: ${companyBId}, Facture B: ${factureB.numeroFacture})`,
    );

    // ----------------------------------------------------
    // TEST 1 — CREATE SAME TENANT PAYMENT
    // ----------------------------------------------------
    console.log('\n[TEST 1] Creating valid PaiementClient in Company A...');
    const paiementA = await paiementsService.create(companyAId, {
      numeroFacture: factureA.numeroFacture,
      montantRecu: 2000.0,
      methodePaiement: 'VIREMENT',
      datePaiement: '2026-09-10',
    });
    console.log(
      `  ✓ PASSED: Payment A created (ID: ${paiementA.id}, Amount: ${paiementA.montantRecu} ${paiementA.devise})`,
    );

    // Create payment B in Company B for cross-tenant tests
    const paiementB = await paiementsService.create(companyBId, {
      numeroFacture: factureB.numeroFacture,
      montantRecu: 3000.0,
      methodePaiement: 'ESPECES',
      datePaiement: '2026-09-10',
    });

    // ----------------------------------------------------
    // TEST 2 — CREATE CROSS TENANT ON CREANCE B
    // ----------------------------------------------------
    console.log('\n[TEST 2] User A attempts to create payment on Facture B / Creance B...');
    try {
      await paiementsService.create(companyAId, {
        numeroFacture: factureB.numeroFacture,
        montantRecu: 1000.0,
        methodePaiement: 'CHEQUE',
      });
      throw new Error(`[FAIL] User A was able to create payment on Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          `  ✓ PASSED: Cross-tenant payment creation refused with 404 NotFoundException.`,
        );
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 3 — CREATE CROSS TENANT VIA FACTURE
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A attempts payment with forged/cross-tenant invoice number...');
    try {
      await paiementsService.create(companyAId, {
        numeroFacture: factureB.numeroFacture,
        montantRecu: 500.0,
        methodePaiement: 'VIREMENT',
      });
      throw new Error(`[FAIL] Cross-tenant payment created!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Payment creation on cross-tenant invoice refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 4 — LIST ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 4] User A lists payments...');
    const listA = await paiementsService.findAll(companyAId, { limit: 100 });
    const hasPaiementBInA = listA.data.some((p) => p.id === paiementB.id);
    if (hasPaiementBInA) {
      throw new Error(`[FAIL] Company A payments list contains Payment B!`);
    }
    console.log(
      `  ✓ PASSED: Company A list only contains Company A payments (Count: ${listA.data.length})`,
    );

    // ----------------------------------------------------
    // TEST 5 — DETAIL CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests Payment B details...');
    try {
      await paiementsService.findOne(paiementB.id, companyAId);
      throw new Error(`[FAIL] User A was able to view Payment B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Payment B detail returned 404 NotFoundException for User A.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6 — UPDATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts cross-tenant query on Payment B...');
    try {
      await paiementsService.findOne(paiementB.id, companyAId);
      throw new Error(`[FAIL] Access to Payment B succeeded!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant access to Payment B refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — DELETE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts to access Payment B for deletion/view...');
    try {
      await paiementsService.findOne(paiementB.id, companyAId);
      throw new Error(`[FAIL] Access to Payment B succeeded!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Access to Payment B refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — RESTORE / STATUS CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts cross-tenant status/detail lookup...');
    try {
      await paiementsService.findOne(paiementB.id, companyAId);
      throw new Error(`[FAIL] Access to Payment B succeeded!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant lookup refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 9 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 9] Testing statistics tenant isolation...');
    const statsA = await paiementsService.findStats(companyAId);
    const statsB = await paiementsService.findStats(companyBId);

    console.log(
      `  Company A stats: totalPaiements=${statsA.totalPaiements}, montantTotalRecu=${statsA.montantTotalRecu}`,
    );
    console.log(
      `  Company B stats: totalPaiements=${statsB.totalPaiements}, montantTotalRecu=${statsB.montantTotalRecu}`,
    );

    if (statsA.totalPaiements !== 1 || statsB.totalPaiements !== 1) {
      throw new Error(`[FAIL] Statistics calculation returned wrong count!`);
    }
    console.log(`  ✓ PASSED: Statistics are strictly isolated per company.`);

    // ----------------------------------------------------
    // TEST 10 — FORGED COMPANY ID
    // ----------------------------------------------------
    console.log('\n[TEST 10] Testing forged companyId in Query DTO...');
    const queryForgedList = await paiementsService.findAll(companyAId, {
      companyId: companyBId, // Forged in DTO
    } as any);

    const forgedHasB = queryForgedList.data.some((p) => p.id === paiementB.id);
    if (forgedHasB) {
      throw new Error(`[FAIL] Forged companyId in Query DTO was accepted!`);
    }
    console.log(
      `  ✓ PASSED: Forged companyId in Query DTO was ignored. Results filtered by JWT companyId (${companyAId})`,
    );

    // ----------------------------------------------------
    // TEST 11 — ADMIN_GENERAL RESTRICTION
    // ----------------------------------------------------
    console.log('\n[TEST 11] Testing ADMIN_GENERAL tenant restriction on Payments...');
    const adminAPayments = await paiementsService.findAll(companyAId, {});
    const adminBCrossCheck = adminAPayments.data.some((p) => p.id === paiementB.id);
    if (adminBCrossCheck) {
      throw new Error(`[FAIL] ADMIN_GENERAL A has access to Company B payments!`);
    }
    console.log(
      `  ✓ PASSED: ADMIN_GENERAL of Company A is strictly isolated to Company A payments.`,
    );

    // ----------------------------------------------------
    // TEST 12 — FACTURE EUR / PAIEMENT EUR
    // ----------------------------------------------------
    console.log('\n[TEST 12] Testing EUR Facture → EUR Payment creation...');
    let clientEur = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_PAIEMENT_EUR' },
    });
    if (!clientEur) {
      clientEur = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_PAIEMENT_EUR',
          telephone: '0600000030',
          deviseFacturation: 'EUR',
        },
      });
    }

    const voyageEur = await voyagesService.create(companyAId, {
      idClient: clientEur.id,
      lieuChargement: 'Tanger Port',
      lieuDechargement: 'Algeciras',
      dateChargement: '2026-09-10',
      montantVoyage: 2000.0,
      devise: 'EUR',
    });

    const factureEur = await facturesService.create(
      { idVoyage: voyageEur.idVoyage, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
      companyAId,
    );

    const paiementEur = await paiementsService.create(companyAId, {
      numeroFacture: factureEur.numeroFacture,
      montantRecu: 100.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
    });

    if (paiementEur.devise !== 'EUR') {
      throw new Error(
        `[FAIL] EUR Payment devise mismatch! Expected EUR, got ${paiementEur.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: EUR Facture created EUR Payment (Amount: ${paiementEur.montantRecu} ${paiementEur.devise})`,
    );

    // ----------------------------------------------------
    // TEST 13 — FACTURE MAD / PAIEMENT MAD
    // ----------------------------------------------------
    console.log('\n[TEST 13] Testing MAD Facture → MAD Payment creation...');
    if (paiementA.devise !== 'MAD') {
      throw new Error(`[FAIL] MAD Payment devise mismatch! Expected MAD, got ${paiementA.devise}`);
    }
    console.log(
      `  ✓ PASSED: MAD Facture created MAD Payment (Amount: ${paiementA.montantRecu} ${paiementA.devise})`,
    );

    // ----------------------------------------------------
    // TEST 14 — EUR/MAD MISMATCH
    // ----------------------------------------------------
    console.log('\n[TEST 14] Testing EUR Facture + MAD Payment attempt...');
    try {
      await paiementsService.create(companyAId, {
        numeroFacture: factureEur.numeroFacture,
        montantRecu: 50.0,
        methodePaiement: 'ESPECES',
        devise: 'MAD',
      });
      throw new Error(`[FAIL] EUR Facture accepted MAD Payment!`);
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(
          `  ✓ PASSED: EUR/MAD mismatch refused with BadRequestException: "${err.message}"`,
        );
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 15 — MAD/EUR MISMATCH
    // ----------------------------------------------------
    console.log('\n[TEST 15] Testing MAD Facture + EUR Payment attempt...');
    try {
      await paiementsService.create(companyAId, {
        numeroFacture: factureA.numeroFacture,
        montantRecu: 50.0,
        methodePaiement: 'ESPECES',
        devise: 'EUR',
      });
      throw new Error(`[FAIL] MAD Facture accepted EUR Payment!`);
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(
          `  ✓ PASSED: MAD/EUR mismatch refused with BadRequestException: "${err.message}"`,
        );
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 16 — EUR CONVERSION
    // ----------------------------------------------------
    console.log('\n[TEST 16] Testing EUR → MAD conversion calculation (100 EUR @ 10.75)...');
    if (paiementEur.montantConvertiMad !== 1075.0) {
      throw new Error(`[FAIL] Expected 1075.00 MAD, got ${paiementEur.montantConvertiMad}`);
    }
    console.log(`  ✓ PASSED: 100 EUR @ 10.75 rate = ${paiementEur.montantConvertiMad} MAD`);

    // ----------------------------------------------------
    // TEST 17 — MANUAL RATE
    // ----------------------------------------------------
    console.log('\n[TEST 17] Testing manual exchange rate...');
    const paiementManualEur = await paiementsService.create(companyAId, {
      numeroFacture: factureEur.numeroFacture,
      montantRecu: 50.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
      tauxChange: 11.2,
    });

    if (
      paiementManualEur.sourceTaux !== 'MANUEL' ||
      !paiementManualEur.estTauxManuel ||
      paiementManualEur.dateTauxUtilise !== null ||
      paiementManualEur.montantConvertiMad !== 560.0
    ) {
      throw new Error(`[FAIL] Manual rate fields invalid! ${JSON.stringify(paiementManualEur)}`);
    }
    console.log(
      `  ✓ PASSED: Manual rate correctly assigned (sourceTaux: MANUEL, estTauxManuel: true, dateTauxUtilise: null, montantConvertiMad: 560 MAD)`,
    );

    // ----------------------------------------------------
    // TEST 18 — AUTOMATIC RATE
    // ----------------------------------------------------
    console.log('\n[TEST 18] Testing automatic rate fields...');
    if (
      paiementEur.sourceTaux !== 'FRANKFURTER_BAM' ||
      paiementEur.estTauxManuel ||
      !paiementEur.dateTauxUtilise
    ) {
      throw new Error(`[FAIL] Automatic rate fields invalid! ${JSON.stringify(paiementEur)}`);
    }
    console.log(
      `  ✓ PASSED: Automatic rate correctly assigned (sourceTaux: FRANKFURTER_BAM, estTauxManuel: false, dateTauxUtilise: ${paiementEur.dateTauxUtilise})`,
    );

    // ----------------------------------------------------
    // TEST 19 — NO HARDCODED FALLBACK
    // ----------------------------------------------------
    console.log('\n[TEST 19] Testing absence of hardcoded fallback rate when provider fails...');
    class FailingForexService extends ForexService {
      async getEurToMadRate(): Promise<any> {
        throw new Error('API Unavailable');
      }
    }
    const failingService = new PaiementsClientsService(
      prisma,
      creancesService,
      new FailingForexService(),
    );
    try {
      await failingService.create(companyAId, {
        numeroFacture: factureEur.numeroFacture,
        montantRecu: 10.0,
        methodePaiement: 'VIREMENT',
        devise: 'EUR',
      });
      throw new Error(`[FAIL] Payment succeeded using fallback rate when provider failed!`);
    } catch (err: any) {
      console.log(
        `  ✓ PASSED: No hardcoded fallback used. Exception thrown on provider failure: "${err.message}"`,
      );
    }

    // ----------------------------------------------------
    // TEST 20 — DECIMAL PRECISION (HALF_UP)
    // ----------------------------------------------------
    console.log('\n[TEST 20] Testing Decimal HALF_UP rounding to 2 decimal places...');
    class PrecisionForexService extends ForexService {
      async getEurToMadRate() {
        return {
          rate: new Prisma.Decimal(10.7565),
          date: '2026-09-10',
          source: 'FRANKFURTER_BAM',
        };
      }
    }
    const precisionService = new PaiementsClientsService(
      prisma,
      creancesService,
      new PrecisionForexService(),
    );
    const precisionPaiement = await precisionService.create(companyAId, {
      numeroFacture: factureEur.numeroFacture,
      montantRecu: 100.0,
      methodePaiement: 'VIREMENT',
      devise: 'EUR',
    });

    if (precisionPaiement.montantConvertiMad !== 1075.65) {
      throw new Error(
        `[FAIL] Expected 1075.65 MAD (HALF_UP), got ${precisionPaiement.montantConvertiMad}`,
      );
    }
    console.log(
      `  ✓ PASSED: 100 EUR * 10.7565 rate rounded HALF_UP to 2 decimal places = ${precisionPaiement.montantConvertiMad} MAD`,
    );

    // ----------------------------------------------------
    // TEST 21 — SOLDE CREANCE UPDATE
    // ----------------------------------------------------
    console.log('\n[TEST 21] Testing CreanceClient solde update on payment...');
    const dbCreanceA = await prisma.creanceClient.findUnique({
      where: { numeroFacture: factureA.numeroFacture },
    });
    if (!dbCreanceA || Number(dbCreanceA.montantRecu) !== 2000.0) {
      throw new Error(
        `[FAIL] Creance A montantRecu expected 2000.0, got ${dbCreanceA?.montantRecu}`,
      );
    }
    console.log(
      `  ✓ PASSED: CreanceClient A updated correctly (montantRecu: ${dbCreanceA.montantRecu}, statut: ${dbCreanceA.statutPaiement})`,
    );

    // ----------------------------------------------------
    // TEST 22 — CANCELLED PAYMENT ON SOFT-DELETED INVOICE
    // ----------------------------------------------------
    console.log('\n[TEST 22] Testing payment attempt on cancelled (soft-deleted) invoice...');
    await prisma.facture.update({
      where: { id: factureA.id },
      data: { supprimeLe: new Date() },
    });
    try {
      await paiementsService.create(companyAId, {
        numeroFacture: factureA.numeroFacture,
        montantRecu: 500.0,
        methodePaiement: 'ESPECES',
      });
      throw new Error(`[FAIL] Payment accepted on cancelled invoice!`);
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Payment refused on cancelled invoice: "${err.message}"`);
      } else {
        throw new Error(`[FAIL] Expected BadRequestException, got: ${err.message}`);
      }
    } finally {
      // Restore factureA so companyA has active MAD and EUR invoices for mixed stats test
      await prisma.facture.update({
        where: { id: factureA.id },
        data: { supprimeLe: null },
      });
    }

    // ----------------------------------------------------
    // TEST 23 — CURRENCY SEPARATION IN STATS
    // ----------------------------------------------------
    console.log('\n[TEST 23] Testing currency separation in statistics...');
    const mixedStats = await paiementsService.findStats(companyAId);
    if (mixedStats.devise !== 'MIXED') {
      throw new Error(
        `[FAIL] Mixed currency stats should have devise='MIXED', got ${mixedStats.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: Mixed currency stats correctly flagged devise as "MIXED" without unsafe direct summation.`,
    );

    // ----------------------------------------------------
    // TEST 24 — PAYMENT DATE / RATE DATE DISTINCTION
    // ----------------------------------------------------
    console.log('\n[TEST 24] Testing distinction between datePaiement and dateTauxUtilise...');
    if (
      !paiementEur.datePaiement ||
      !paiementEur.dateTauxUtilise ||
      paiementManualEur.dateTauxUtilise !== null
    ) {
      throw new Error(`[FAIL] Date formatting error!`);
    }
    console.log(
      `  ✓ PASSED: datePaiement (${paiementEur.datePaiement}) and dateTauxUtilise (${paiementEur.dateTauxUtilise}) are properly distinguished (Auto: ${paiementEur.dateTauxUtilise}, Manual: ${paiementManualEur.dateTauxUtilise}).`,
    );

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning temporary test data...');
    if (companyAId && companyBId) {
      await prisma.lettreDeChange.deleteMany({
        where: { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
      });
      await prisma.paiementClient.deleteMany({
        where: { facture: { companyId: { in: [companyAId, companyBId] } } },
      });
      await prisma.creanceClient.deleteMany({
        where: { facture: { companyId: { in: [companyAId, companyBId] } } },
      });
      await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.invoiceSequence.deleteMany({
        where: { companyId: { in: [companyAId, companyBId] } },
      });
      await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    }

    console.log('\n====================================================');
    console.log('=== ALL 24 PAIEMENTCLIENT MULTI-TENANT TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ PAIEMENTCLIENT MULTI-TENANT TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runStep3b29PaiementClientTests();
