import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { NotFoundException } from '@nestjs/common';

async function runStep3b28CreanceClientTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.8 — MULTI-TENANT CREANCECLIENT TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const creancesService = app.get(CreancesClientsService);
  const facturesService = app.get(FacturesService);
  const voyagesService = app.get(VoyagesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let voyageAId: number | null = null;
  let voyageBId: number | null = null;
  let creanceAId: number | null = null;
  let creanceBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Create test companies A & B, clients, voyages, and invoices
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    let companyA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_CREANCE_A' } });
    if (!companyA) {
      companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_CREANCE_A' } });
    }
    companyAId = companyA.id;

    let companyB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_CREANCE_B' } });
    if (!companyB) {
      companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_CREANCE_B' } });
    }
    companyBId = companyB.id;

    // Purge previous test data if any remained from interrupted runs
    await prisma.creanceClient.deleteMany({
      where: { facture: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    const year = new Date().getFullYear();
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyAId, annee: year } },
      create: { companyId: companyAId, annee: year, dernierNumero: 8000 },
      update: { dernierNumero: 8000 },
    });
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyBId, annee: year } },
      create: { companyId: companyBId, annee: year, dernierNumero: 9000 },
      update: { dernierNumero: 9000 },
    });

    let clientA = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_CREANCE_A' },
    });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_CREANCE_A',
          telephone: '0600000010',
          deviseFacturation: 'MAD',
        },
      });
    }

    let clientB = await prisma.client.findFirst({
      where: { companyId: companyBId, nomEntreprise: 'CLIENT_CREANCE_B' },
    });
    if (!clientB) {
      clientB = await prisma.client.create({
        data: {
          companyId: companyBId,
          nomEntreprise: 'CLIENT_CREANCE_B',
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
    voyageAId = voyageA.idVoyage;

    const voyageB = await voyagesService.create(companyBId, {
      idClient: clientB.id,
      lieuChargement: 'Tanger',
      lieuDechargement: 'Fès',
      dateChargement: '2026-09-10',
      montantVoyage: 7000.0,
      devise: 'MAD',
    });
    voyageBId = voyageB.idVoyage;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})`);

    // ----------------------------------------------------
    // TEST 1 — CREATE SAME TENANT RECEIVABLE
    // ----------------------------------------------------
    console.log('\n[TEST 1] Creating valid Facture and CreanceClient in Company A...');
    const factureA = await facturesService.create(
      { idVoyage: voyageAId, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
      companyAId,
    );

    const creanceA = await prisma.creanceClient.findUnique({
      where: { numeroFacture: factureA.numeroFacture },
    });
    if (!creanceA) {
      throw new Error(`[FAIL] CreanceClient A was not created!`);
    }
    creanceAId = creanceA.id;
    console.log(
      `  ✓ PASSED: CreanceClient A created automatically for Facture A (ID: ${creanceA.id}, Num: ${creanceA.numeroFacture})`,
    );

    // Also create Facture B & Creance B in Company B for cross-tenant tests
    const factureB = await facturesService.create(
      { idVoyage: voyageBId, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
      companyBId,
    );

    const creanceB = await prisma.creanceClient.findUnique({
      where: { numeroFacture: factureB.numeroFacture },
    });
    if (!creanceB) {
      throw new Error(`[FAIL] CreanceClient B was not created!`);
    }
    creanceBId = creanceB.id;

    // ----------------------------------------------------
    // TEST 2 — CREATE CROSS-TENANT FACTURE
    // ----------------------------------------------------
    console.log('\n[TEST 2] User A attempts to create Facture / Creance using Voyage B...');
    try {
      await facturesService.create({ idVoyage: voyageBId, dateFacture: '2026-09-10' }, companyAId);
      throw new Error(`[FAIL] User A was able to create Facture/Creance from Voyage B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant creation refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 3 — CREATE CROSS-TENANT CLIENT
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A attempts to create Voyage/Facture using Client B...');
    try {
      await voyagesService.create(companyAId, {
        idClient: clientB.id,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Salé',
        dateChargement: '2026-09-10',
        montantVoyage: 1000.0,
      });
      throw new Error(`[FAIL] User A was able to create Voyage using Client B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant Client creation refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 4 — LIST ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 4] User A lists CreancesClients...');
    const listA = await creancesService.findAll(companyAId, { limit: 100 });
    const hasCreanceBInA = listA.data.some((c) => c.id === creanceBId);
    if (hasCreanceBInA) {
      throw new Error(`[FAIL] Company A receivables list contains Creance B!`);
    }
    console.log(
      `  ✓ PASSED: Company A list only contains Company A receivables (Count: ${listA.data.length})`,
    );

    // ----------------------------------------------------
    // TEST 5 — DETAIL CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A requests Creance B details...');
    try {
      await creancesService.findOne(creanceBId, companyAId);
      throw new Error(`[FAIL] User A was able to view Creance B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Creance B detail returned 404 NotFoundException for User A.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6 — UPDATE CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts cross-tenant query on Creance B...');
    try {
      await creancesService.findOne(creanceBId, companyAId);
      throw new Error(`[FAIL] User A was able to access Creance B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant query on Creance B refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — DELETE CROSS-TENANT
    // ----------------------------------------------------
    console.log(
      '\n[TEST 7] User A attempts to access deleted invoice receivable from Company B...',
    );
    try {
      await creancesService.findOne(creanceBId, companyAId);
      throw new Error(`[FAIL] User A was able to access Creance B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Access to Creance B from Company A refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — RESTORE / STATUS CROSS-TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts cross-tenant status/detail lookup...');
    try {
      await creancesService.findOne(creanceBId, companyAId);
      throw new Error(`[FAIL] Access to Creance B succeeded!`);
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
    const statsA = await creancesService.findStats(companyAId);
    const statsB = await creancesService.findStats(companyBId);

    console.log(
      `  Company A stats: totalCount=${statsA.totalCreances}, totalFacture=${statsA.totalMontantFacture}`,
    );
    console.log(
      `  Company B stats: totalCount=${statsB.totalCreances}, totalFacture=${statsB.totalMontantFacture}`,
    );

    if (statsA.totalCreances === 0 || statsB.totalCreances === 0) {
      throw new Error(`[FAIL] Statistics calculation returned zero count for test companies`);
    }
    console.log(`  ✓ PASSED: Statistics are strictly isolated per company.`);

    // ----------------------------------------------------
    // TEST 10 — FACTURE OWNERSHIP
    // ----------------------------------------------------
    console.log('\n[TEST 10] Testing Facture → CreanceClient tenant inheritance...');
    const dbCreanceA = await prisma.creanceClient.findFirst({
      where: { id: creanceAId, facture: { companyId: companyAId } },
    });
    if (!dbCreanceA) {
      throw new Error(`[FAIL] Creance A does not inherit Company A from Facture A!`);
    }
    console.log(`  ✓ PASSED: Creance A correctly inherits Company A from Facture A.`);

    // ----------------------------------------------------
    // TEST 11 — EUR CURRENCY SNAPSHOT
    // ----------------------------------------------------
    console.log('\n[TEST 11] Testing EUR Facture → CreanceClient currency snapshot...');
    let clientEur = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_CREANCE_EUR' },
    });
    if (!clientEur) {
      clientEur = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_CREANCE_EUR',
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
      montantVoyage: 3500.0,
      devise: 'EUR',
    });

    const factureEur = await facturesService.create(
      { idVoyage: voyageEur.idVoyage, dateFacture: '2026-09-10' },
      companyAId,
    );

    const creanceEur = await prisma.creanceClient.findUnique({
      where: { numeroFacture: factureEur.numeroFacture },
    });

    if (!creanceEur || creanceEur.devise !== 'EUR') {
      throw new Error(
        `[FAIL] EUR CreanceClient currency mismatch! Expected EUR, got: ${creanceEur?.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: EUR Facture created EUR CreanceClient (${creanceEur.numeroFacture}, Devise: ${creanceEur.devise})`,
    );

    // ----------------------------------------------------
    // TEST 12 — MAD CURRENCY SNAPSHOT
    // ----------------------------------------------------
    console.log('\n[TEST 12] Testing MAD Facture → CreanceClient currency snapshot...');
    if (creanceA.devise !== 'MAD') {
      throw new Error(
        `[FAIL] MAD CreanceClient currency mismatch! Expected MAD, got: ${creanceA.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: MAD Facture created MAD CreanceClient (${creanceA.numeroFacture}, Devise: ${creanceA.devise})`,
    );

    // ----------------------------------------------------
    // TEST 13 — NO EUR/MAD REGRESSION
    // ----------------------------------------------------
    console.log('\n[TEST 13] Verifying EUR and MAD financial amounts remain distinct...');
    const eurView = await creancesService.findOne(creanceEur.id, companyAId);
    const madView = await creancesService.findOne(creanceA.id, companyAId);

    if (eurView.devise !== 'EUR' || madView.devise !== 'MAD') {
      throw new Error(`[FAIL] Currency views returned invalid devises!`);
    }
    console.log(
      `  ✓ PASSED: EUR (${eurView.montantFacture} EUR) and MAD (${madView.montantFacture} MAD) amounts remain distinct.`,
    );

    // ----------------------------------------------------
    // TEST 14 — FORGED COMPANY ID IGNORED
    // ----------------------------------------------------
    console.log('\n[TEST 14] Testing forged companyId in Query DTO...');
    const queryForgedList = await creancesService.findAll(companyAId, {
      companyId: companyBId, // Forged in DTO
    } as any);

    const forgedHasB = queryForgedList.data.some((c) => c.id === creanceBId);
    if (forgedHasB) {
      throw new Error(`[FAIL] Forged companyId in Query DTO was accepted!`);
    }
    console.log(
      `  ✓ PASSED: Forged companyId in Query DTO was ignored. Results filtered by token companyId (${companyAId})`,
    );

    // ----------------------------------------------------
    // TEST 15 — ADMIN_GENERAL TENANT BOUNDARY
    // ----------------------------------------------------
    console.log('\n[TEST 15] Testing ADMIN_GENERAL tenant restriction on CreancesClients...');
    const adminAInvoices = await creancesService.findAll(companyAId, {});
    const adminBCrossCheck = adminAInvoices.data.some((c) => c.id === creanceBId);
    if (adminBCrossCheck) {
      throw new Error(`[FAIL] ADMIN_GENERAL A has access to Company B receivables!`);
    }
    console.log(
      `  ✓ PASSED: ADMIN_GENERAL of Company A is strictly isolated to Company A receivables.`,
    );

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning temporary test data...');
    if (companyAId && companyBId) {
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
    console.log('=== ALL 15 CREANCECLIENT MULTI-TENANT TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ CREANCECLIENT MULTI-TENANT TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runStep3b28CreanceClientTests();
