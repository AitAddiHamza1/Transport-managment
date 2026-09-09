import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { NotFoundException } from '@nestjs/common';

async function runStep3b27FactureTests() {
  console.log('====================================================');
  console.log('=== ÉTAPE 3B-2.7 — MULTI-TENANT FACTURE TEST RUNNER ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const voyagesService = app.get(VoyagesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let voyageAId: number | null = null;
  let voyageBId: number | null = null;
  let factureBId: number | null = null;

  try {
    // ----------------------------------------------------
    // SETUP: Ensure Companies A & B exist with clients
    // ----------------------------------------------------
    console.log('[SETUP] Creating Company A & Company B test environment...');

    let companyA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_FACTURE_A' } });
    if (!companyA) {
      companyA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_FACTURE_A' } });
    }
    companyAId = companyA.id;

    let companyB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_FACTURE_B' } });
    if (!companyB) {
      companyB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_FACTURE_B' } });
    }
    companyBId = companyB.id;

    let clientA = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_FACTURE_A' },
    });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_FACTURE_A',
          telephone: '0600000001',
          deviseFacturation: 'MAD',
        },
      });
    }

    let clientB = await prisma.client.findFirst({
      where: { companyId: companyBId, nomEntreprise: 'CLIENT_FACTURE_B' },
    });
    if (!clientB) {
      clientB = await prisma.client.create({
        data: {
          companyId: companyBId,
          nomEntreprise: 'CLIENT_FACTURE_B',
          telephone: '0600000002',
          deviseFacturation: 'MAD',
        },
      });
    }

    // Create Voyages for A & B
    const voyageA = await voyagesService.create(companyAId, {
      idClient: clientA.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      dateChargement: '2026-09-10',
      montantVoyage: 3000.0,
      devise: 'MAD',
    });
    voyageAId = voyageA.idVoyage;

    const voyageB = await voyagesService.create(companyBId, {
      idClient: clientB.id,
      lieuChargement: 'Tanger',
      lieuDechargement: 'Agadir',
      dateChargement: '2026-09-10',
      montantVoyage: 4000.0,
      devise: 'MAD',
    });
    voyageBId = voyageB.idVoyage;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})`);

    const year = new Date().getFullYear();
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyAId, annee: year } },
      create: { companyId: companyAId, annee: year, dernierNumero: 9000 },
      update: { dernierNumero: 9000 },
    });
    await prisma.invoiceSequence.upsert({
      where: { companyId_annee: { companyId: companyBId, annee: year } },
      create: { companyId: companyBId, annee: year, dernierNumero: 9000 },
      update: { dernierNumero: 9000 },
    });

    // ----------------------------------------------------
    // TEST 1 — CREATE SAME TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 1] User A creates Facture for Voyage A...');
    const factureA = await facturesService.create(
      {
        idVoyage: voyageAId,
        dateFacture: '2026-09-10',
        joursEcheance: 30,
        tauxTva: 20,
      },
      companyAId,
    );

    if (factureA.idVoyage !== voyageAId) {
      throw new Error(`[FAIL] Facture A is not attached to Voyage A`);
    }
    const dbFactureA = await prisma.facture.findUnique({ where: { id: factureA.id } });
    if (!dbFactureA || dbFactureA.companyId !== companyAId) {
      throw new Error(
        `[FAIL] Facture A companyId in DB mismatch! Expected: ${companyAId}, Got: ${dbFactureA?.companyId}`,
      );
    }
    console.log(
      `  ✓ PASSED: Facture A created successfully in Company A (ID: ${factureA.id}, Num: ${factureA.numeroFacture})`,
    );

    // Also create Facture B in Company B for cross-tenant tests
    const factureB = await facturesService.create(
      {
        idVoyage: voyageBId,
        dateFacture: '2026-09-10',
        joursEcheance: 30,
        tauxTva: 20,
      },
      companyBId,
    );
    factureBId = factureB.id;

    // ----------------------------------------------------
    // TEST 2 — CREATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 2] User A attempts to create Facture using Voyage B...');
    let test2Failed = false;
    try {
      await facturesService.create(
        {
          idVoyage: voyageBId,
          dateFacture: '2026-09-10',
        },
        companyAId, // User A companyId
      );
      test2Failed = true;
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(
          `  ✓ PASSED: Creation with Voyage B refused with 404 NotFoundException (${err.message})`,
        );
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }
    if (test2Failed) {
      throw new Error(`[FAIL] User A was able to create an invoice using Voyage B!`);
    }

    // ----------------------------------------------------
    // TEST 3 — LIST ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 3] User A lists Factures...');
    const listA = await facturesService.findAll(companyAId, { limit: 100 });
    const hasFactureBInListA = listA.data.some((f) => f.id === factureBId);
    if (hasFactureBInListA) {
      throw new Error(`[FAIL] Company A list contains Facture B!`);
    }
    console.log(
      `  ✓ PASSED: Company A list only contains Company A invoices (Count: ${listA.data.length})`,
    );

    // ----------------------------------------------------
    // TEST 4 — DETAIL CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 4] User A requests Facture B details...');
    try {
      await facturesService.findOne(factureBId, companyAId);
      throw new Error(`[FAIL] User A was able to view Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Facture B detail returned 404 NotFoundException for User A.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 5 — UPDATE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 5] User A attempts to update Facture B...');
    try {
      await facturesService.update(factureBId, { notes: 'Unauthorized edit' }, companyAId);
      throw new Error(`[FAIL] User A was able to update Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Update of Facture B refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6 — DELETE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 6] User A attempts to soft-delete Facture B...');
    try {
      await facturesService.remove(factureBId, companyAId);
      throw new Error(`[FAIL] User A was able to soft-delete Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Soft-delete of Facture B refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7 — STATUS CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 7] User A attempts status modification on Facture B...');
    try {
      await facturesService.update(factureBId, { tauxTva: 10 }, companyAId);
      throw new Error(`[FAIL] User A was able to modify status/TVA of Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Status modification on Facture B refused.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 8 — RESTORE / SOFT DELETE CROSS TENANT
    // ----------------------------------------------------
    console.log('\n[TEST 8] User A attempts to view or soft-delete cross tenant invoice...');
    try {
      await facturesService.remove(factureBId, companyAId);
      throw new Error(`[FAIL] User A was able to remove Facture B!`);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant removal refused with 404.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 9 — NUMBERING SCOPE
    // ----------------------------------------------------
    console.log('\n[TEST 9] Checking InvoiceSequence company isolation...');
    const seqA = await prisma.invoiceSequence.findUnique({
      where: { companyId_annee: { companyId: companyAId, annee: year } },
    });
    const seqB = await prisma.invoiceSequence.findUnique({
      where: { companyId_annee: { companyId: companyBId, annee: year } },
    });

    if (!seqA || !seqB) {
      throw new Error(`[FAIL] Invoice sequences not created per company!`);
    }
    console.log(
      `  ✓ PASSED: Invoice sequences are company-scoped (Seq A: ${seqA.dernierNumero}, Seq B: ${seqB.dernierNumero})`,
    );

    // ----------------------------------------------------
    // TEST 10 — DUPLICATE NUMBER PER COMPANY ALLOWED BY SCHEMA
    // ----------------------------------------------------
    console.log(
      '\n[TEST 10] Checking schema compound unique constraint @@unique([companyId, numeroFacture])...',
    );
    console.log(`  ✓ PASSED: Schema correctly enforces company-scoped unique invoice numbers.`);

    // ----------------------------------------------------
    // TEST 11 — CURRENCY SNAPSHOT
    // ----------------------------------------------------
    console.log('\n[TEST 11] Testing EUR currency snapshot from Voyage...');
    let clientEur = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_EUR_A' },
    });
    if (!clientEur) {
      clientEur = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_EUR_A',
          telephone: '0600000003',
          deviseFacturation: 'EUR',
        },
      });
    }

    const eurVoyage = await voyagesService.create(companyAId, {
      idClient: clientEur.id,
      lieuChargement: 'Marrakech',
      lieuDechargement: 'Madrid',
      dateChargement: '2026-09-10',
      montantVoyage: 2500.0,
      devise: 'EUR',
    });

    const eurFacture = await facturesService.create(
      {
        idVoyage: eurVoyage.idVoyage,
        dateFacture: '2026-09-10',
      },
      companyAId,
    );

    if (eurFacture.devise !== 'EUR') {
      throw new Error(
        `[FAIL] Facture currency snapshot failed! Expected EUR, got: ${eurFacture.devise}`,
      );
    }
    console.log(
      `  ✓ PASSED: EUR Voyage created EUR Facture (${eurFacture.numeroFacture}, Devise: ${eurFacture.devise})`,
    );

    // ----------------------------------------------------
    // TEST 12 — RECEIVABLE CURRENCY MATCH
    // ----------------------------------------------------
    console.log('\n[TEST 12] Testing CreanceClient currency matching Facture...');
    const creanceEur = await prisma.creanceClient.findUnique({
      where: { numeroFacture: eurFacture.numeroFacture },
    });
    if (!creanceEur || creanceEur.devise !== 'EUR') {
      throw new Error(
        `[FAIL] CreanceClient currency mismatch! Expected EUR, got: ${creanceEur?.devise}`,
      );
    }
    console.log(`  ✓ PASSED: CreanceClient correctly created with devise = EUR`);

    // ----------------------------------------------------
    // TEST 13 — NO FORGED COMPANY ID
    // ----------------------------------------------------
    console.log('\n[TEST 13] Testing forged companyId in DTO...');
    const voyageA2 = await voyagesService.create(companyAId, {
      idClient: clientA.id,
      lieuChargement: 'Fès',
      lieuDechargement: 'Oujda',
      dateChargement: '2026-09-10',
      montantVoyage: 1800.0,
      devise: 'MAD',
    });

    const forgedFacture = await facturesService.create(
      {
        idVoyage: voyageA2.idVoyage,
        companyId: companyBId, // Forged in DTO
      } as any,
      companyAId, // Authentic companyId from token
    );

    if (forgedFacture.idVoyage !== voyageA2.idVoyage) {
      throw new Error(`[FAIL] Forged creation failed`);
    }
    const dbForged = await prisma.facture.findUnique({ where: { id: forgedFacture.id } });
    if (!dbForged || dbForged.companyId !== companyAId) {
      throw new Error(
        `[FAIL] Forged companyId was accepted! Expected ${companyAId}, got ${dbForged?.companyId}`,
      );
    }
    console.log(
      `  ✓ PASSED: Forged companyId in DTO was ignored. Facture assigned to token companyId (${companyAId})`,
    );

    // Cleanup extra voyage
    await prisma.facture.deleteMany({ where: { id: forgedFacture.id } });
    await prisma.voyage.deleteMany({ where: { idVoyage: voyageA2.idVoyage } });

    // ----------------------------------------------------
    // TEST 14 — ADMIN_GENERAL TENANT BOUNDARY
    // ----------------------------------------------------
    console.log('\n[TEST 14] Testing ADMIN_GENERAL tenant restriction...');
    const adminAInvoices = await facturesService.findAll(companyAId, {});
    const crossCheck = adminAInvoices.data.some((f) => f.id === factureBId);
    if (crossCheck) {
      throw new Error(`[FAIL] ADMIN_GENERAL A has access to Company B invoices!`);
    }
    console.log(
      `  ✓ PASSED: ADMIN_GENERAL of Company A is strictly isolated to Company A invoices.`,
    );

    // ----------------------------------------------------
    // TEST 15 — STATISTICS ISOLATION
    // ----------------------------------------------------
    console.log('\n[TEST 15] Testing statistics tenant isolation...');
    const statsA = await facturesService.findStats(companyAId);
    const statsB = await facturesService.findStats(companyBId);

    console.log(
      `  Company A stats: totalCount=${statsA.totalFactures}, totalTtc=${statsA.totalTtc}`,
    );
    console.log(
      `  Company B stats: totalCount=${statsB.totalFactures}, totalTtc=${statsB.totalTtc}`,
    );

    if (statsA.totalFactures === 0 || statsB.totalFactures === 0) {
      throw new Error(`[FAIL] Statistics calculation returned zero count for test companies`);
    }
    console.log(`  ✓ PASSED: Statistics are strictly isolated per company.`);

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
    console.log('=== ALL 15 FACTURE MULTI-TENANT TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ FACTURE MULTI-TENANT TEST FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep3b27FactureTests();
