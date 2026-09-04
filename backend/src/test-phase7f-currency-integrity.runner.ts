import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { VoyagesService } from './modules/voyages/voyages.service';

async function runCurrencyIntegrityTests() {
  console.log('====================================================');
  console.log('=== PHASE 7F — CURRENCY INTEGRITY TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const creancesService = app.get(CreancesClientsService);
  const paiementsService = app.get(PaiementsClientsService);
  const voyagesService = app.get(VoyagesService);

  let tempEurVoyageId: number | null = null;
  let tempMadVoyageId: number | null = null;
  let tempEurInvoiceNum: string | null = null;
  let tempMadInvoiceNum: string | null = null;

  try {
    // ----------------------------------------------------
    // TEST 1 — NEW EUR INVOICE END-TO-END TEST
    // ----------------------------------------------------
    console.log('[TEST 1] Creating temporary EUR Voyage and Facture...');

    // Ensure test client exists
    let clientEur = await prisma.client.findFirst({ where: { nomEntreprise: 'TEST_EUR_CLIENT' } });
    if (!clientEur) {
      clientEur = await prisma.client.create({
        data: {
          nomEntreprise: 'TEST_EUR_CLIENT',
          telephone: '0600000001',
          deviseFacturation: 'EUR',
        },
      });
    }

    const eurVoyage = await voyagesService.create({
      idClient: clientEur.id,
      lieuChargement: 'Tanger Port',
      lieuDechargement: 'Madrid Cargo Center',
      dateChargement: '2026-09-10',
      montantVoyage: 5000.0,
      devise: 'EUR',
    });
    tempEurVoyageId = eurVoyage.idVoyage;

    const eurFacture = await facturesService.create({
      idVoyage: eurVoyage.idVoyage,
      dateFacture: '2026-09-10',
      joursEcheance: 30,
      tauxTva: 20,
    });
    tempEurInvoiceNum = eurFacture.numeroFacture;

    // Database verification
    const eurDbFacture = await prisma.facture.findUnique({
      where: { numeroFacture: tempEurInvoiceNum },
    });
    const eurDbCreance = await prisma.creanceClient.findUnique({
      where: { numeroFacture: tempEurInvoiceNum },
    });

    if (!eurDbFacture || eurDbFacture.devise !== 'EUR') {
      throw new Error(
        `[FAIL] Facture currency is not EUR in database! Found: ${eurDbFacture?.devise}`,
      );
    }
    if (!eurDbCreance || eurDbCreance.devise !== 'EUR') {
      throw new Error(
        `[FAIL] CreanceClient currency is not EUR in database! Found: ${eurDbCreance?.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: New EUR Facture (${tempEurInvoiceNum}) & CreanceClient are both stored as EUR in DB.`,
    );

    // ----------------------------------------------------
    // TEST 2 — NEW MAD INVOICE TEST
    // ----------------------------------------------------
    console.log('\n[TEST 2] Creating temporary MAD Voyage and Facture...');

    let clientMad = await prisma.client.findFirst({ where: { nomEntreprise: 'TEST_MAD_CLIENT' } });
    if (!clientMad) {
      clientMad = await prisma.client.create({
        data: {
          nomEntreprise: 'TEST_MAD_CLIENT',
          telephone: '0600000002',
          deviseFacturation: 'MAD',
        },
      });
    }

    const madVoyage = await voyagesService.create({
      idClient: clientMad.id,
      lieuChargement: 'Casablanca Depôt',
      lieuDechargement: 'Marrakech Zone',
      dateChargement: '2026-09-10',
      montantVoyage: 12000.0,
      devise: 'MAD',
    });
    tempMadVoyageId = madVoyage.idVoyage;

    const madFacture = await facturesService.create({
      idVoyage: madVoyage.idVoyage,
      dateFacture: '2026-09-10',
      joursEcheance: 30,
      tauxTva: 20,
    });
    tempMadInvoiceNum = madFacture.numeroFacture;

    // Database verification
    const madDbFacture = await prisma.facture.findUnique({
      where: { numeroFacture: tempMadInvoiceNum },
    });
    const madDbCreance = await prisma.creanceClient.findUnique({
      where: { numeroFacture: tempMadInvoiceNum },
    });

    if (!madDbFacture || madDbFacture.devise !== 'MAD') {
      throw new Error(
        `[FAIL] Facture currency is not MAD in database! Found: ${madDbFacture?.devise}`,
      );
    }
    if (!madDbCreance || madDbCreance.devise !== 'MAD') {
      throw new Error(
        `[FAIL] CreanceClient currency is not MAD in database! Found: ${madDbCreance?.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: New MAD Facture (${tempMadInvoiceNum}) & CreanceClient are both stored as MAD in DB.`,
    );

    // ----------------------------------------------------
    // TEST 3 — PAYMENT CREATION & CURRENCY INVARIANCE
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing EUR & MAD Payment Registration...');

    // 3A. Register EUR payment on EUR invoice (Total TTC: 6000 EUR)
    const eurPayment = await paiementsService.create({
      numeroFacture: tempEurInvoiceNum,
      nomClient: 'TEST_EUR_CLIENT',
      datePaiement: '2026-09-10',
      montantRecu: 2000.0,
      methodePaiement: 'VIREMENT',
    });

    if (eurPayment.devise !== 'EUR') {
      throw new Error(`[FAIL] PaiementClient.devise should be EUR! Found: ${eurPayment.devise}`);
    }

    const updatedEurCreance = await creancesService.findOne(eurDbCreance.id);
    if (updatedEurCreance.devise !== 'EUR' || updatedEurCreance.solde !== 4000.0) {
      throw new Error(
        `[FAIL] EUR Creance view balance invalid! Solde: ${updatedEurCreance.solde}, Devise: ${updatedEurCreance.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: EUR Payment created. Solde remaining = 4000.00 EUR (Devise: ${updatedEurCreance.devise})`,
    );

    // 3B. Register MAD payment on MAD invoice (Total TTC: 14400 MAD)
    const madPayment = await paiementsService.create({
      numeroFacture: tempMadInvoiceNum,
      nomClient: 'TEST_MAD_CLIENT',
      datePaiement: '2026-09-10',
      montantRecu: 4400.0,
      methodePaiement: 'CHEQUE',
    });

    if (madPayment.devise !== 'MAD') {
      throw new Error(`[FAIL] PaiementClient.devise should be MAD! Found: ${madPayment.devise}`);
    }

    const updatedMadCreance = await creancesService.findOne(madDbCreance.id);
    if (updatedMadCreance.devise !== 'MAD' || updatedMadCreance.solde !== 10000.0) {
      throw new Error(
        `[FAIL] MAD Creance view balance invalid! Solde: ${updatedMadCreance.solde}, Devise: ${updatedMadCreance.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: MAD Payment created. Solde remaining = 10000.00 MAD (Devise: ${updatedMadCreance.devise})`,
    );

    // ----------------------------------------------------
    // TEST 4 — EXISTING F004/2026 COMPATIBILITY
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing Existing F004/2026 Compatibility...');

    const allCreances = await creancesService.findAll({ limit: 100 });
    const f004Creance = allCreances.data.find((c) => c.numeroFacture === 'F004/2026');

    if (!f004Creance) {
      console.log(
        '  ⚠️ WARNING: F004/2026 not found in active creances (may have been reset or paid).',
      );
    } else {
      if (f004Creance.devise !== 'EUR') {
        throw new Error(
          `[FAIL] F004/2026 Creance view currency is not EUR! Found: ${f004Creance.devise}`,
        );
      }
      console.log(
        `  ✓ PASSED: F004/2026 Creance view correctly evaluates to EUR (Montant: ${f004Creance.montantFacture} EUR, Solde: ${f004Creance.solde} EUR).`,
      );
    }

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning temporary test data...');
    if (tempEurInvoiceNum) {
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: tempEurInvoiceNum } });
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: tempEurInvoiceNum } });
      await prisma.facture.deleteMany({ where: { numeroFacture: tempEurInvoiceNum } });
    }
    if (tempMadInvoiceNum) {
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: tempMadInvoiceNum } });
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: tempMadInvoiceNum } });
      await prisma.facture.deleteMany({ where: { numeroFacture: tempMadInvoiceNum } });
    }
    if (tempEurVoyageId) await prisma.voyage.deleteMany({ where: { idVoyage: tempEurVoyageId } });
    if (tempMadVoyageId) await prisma.voyage.deleteMany({ where: { idVoyage: tempMadVoyageId } });
    await prisma.client.deleteMany({
      where: { nomEntreprise: { in: ['TEST_EUR_CLIENT', 'TEST_MAD_CLIENT'] } },
    });

    console.log('\n====================================================');
    console.log('=== ALL CURRENCY INTEGRITY CHECKS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ INTEGRITY TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runCurrencyIntegrityTests();
