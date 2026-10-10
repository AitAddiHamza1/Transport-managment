import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ModeFacturation } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

async function runMultiTenantInvoiceNumberingTests() {
  console.log('======================================================================');
  console.log('=== MULTI-TENANT INVOICE NUMBERING & RECEIVABLES VERIFICATION SUITE ===');
  console.log('======================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const creancesService = app.get(CreancesClientsService);
  const voyagesService = app.get(VoyagesService);

  const testCompanyIds: number[] = [];
  let passedCount = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    passedCount++;
    console.log(`  ✓ PASSED: ${message}`);
  }

  try {
    // -------------------------------------------------------------
    // SETUP: Create two fully isolated test tenants
    // -------------------------------------------------------------
    console.log('[SETUP] Provisioning isolated test tenants...');
    const timestamp = Date.now();

    const companyA = await prisma.company.create({
      data: { nom: `__TEST_CORRECTION_COMP_A_${timestamp}` },
    });
    testCompanyIds.push(companyA.id);

    const companyB = await prisma.company.create({
      data: { nom: `__TEST_CORRECTION_COMP_B_${timestamp}` },
    });
    testCompanyIds.push(companyB.id);

    await prisma.companySettings.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: 'Entreprise Test A',
        adresse: 'Rue A, Casablanca',
        telephone: '+212600000001',
        email: 'contact@tempa.ma',
      },
    });

    await prisma.companySettings.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: 'Entreprise Test B',
        adresse: 'Rue B, Tanger',
        telephone: '+212600000002',
        email: 'contact@tempb.ma',
      },
    });

    const clientA = await prisma.client.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: `Client Entreprise A ${timestamp}`,
        telephone: '0611111111',
      },
    });

    const clientB = await prisma.client.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: `Client Entreprise B ${timestamp}`,
        telephone: '0622222222',
      },
    });

    console.log(`  ✓ Tenant A initialized (ID: ${companyA.id})`);
    console.log(`  ✓ Tenant B initialized (ID: ${companyB.id})\n`);

    // -------------------------------------------------------------
    // TEST 1: First invoice of two different companies (Same number F001/2026)
    // -------------------------------------------------------------
    console.log('[TEST 1] First invoice of two different companies (F001/2026 collision check)...');

    const voyageA1 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 5000,
    });

    const factureA1 = await facturesService.create(
      { idVoyage: voyageA1.idVoyage, dateFacture: '2026-05-10' },
      companyA.id,
    );

    assert(
      factureA1.numeroFacture === 'F001/2026',
      `Company A generated first invoice: ${factureA1.numeroFacture}`,
    );

    const voyageB1 = await voyagesService.create(companyB.id, {
      idClient: clientB.id,
      lieuChargement: 'Tanger',
      lieuDechargement: 'Fès',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 8000,
    });

    // This is the exact operation that previously crashed with Unique constraint on numero_facture
    const factureB1 = await facturesService.create(
      { idVoyage: voyageB1.idVoyage, dateFacture: '2026-05-10' },
      companyB.id,
    );

    assert(
      factureB1.numeroFacture === 'F001/2026',
      `Company B independently generated first invoice: ${factureB1.numeroFacture}`,
    );

    // Verify both creances exist and have the same invoice number but distinct tenants
    const creanceA1 = await prisma.creanceClient.findUnique({
      where: {
        companyId_factureId: {
          companyId: companyA.id,
          factureId: factureA1.id,
        },
      },
    });

    const creanceB1 = await prisma.creanceClient.findUnique({
      where: {
        companyId_factureId: {
          companyId: companyB.id,
          factureId: factureB1.id,
        },
      },
    });

    assert(
      creanceA1 !== null && creanceA1.numeroFacture === 'F001/2026' && creanceA1.companyId === companyA.id,
      'Creance A1 correctly created with F001/2026 for Tenant A',
    );
    assert(
      creanceB1 !== null && creanceB1.numeroFacture === 'F001/2026' && creanceB1.companyId === companyB.id,
      'Creance B1 correctly created with F001/2026 for Tenant B (NO UNIQUE VIOLATION)',
    );

    // -------------------------------------------------------------
    // TEST 2: Multiple invoices in the same company
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Multiple sequential invoices in the same company...');

    const voyageA2 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Marrakech',
      lieuDechargement: 'Agadir',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 6000,
    });
    const factureA2 = await facturesService.create(
      { idVoyage: voyageA2.idVoyage, dateFacture: '2026-05-11' },
      companyA.id,
    );

    const voyageA3 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Kenitra',
      lieuDechargement: 'Salé',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 7000,
    });
    const factureA3 = await facturesService.create(
      { idVoyage: voyageA3.idVoyage, dateFacture: '2026-05-12' },
      companyA.id,
    );

    assert(
      factureA2.numeroFacture === 'F002/2026',
      `Sequential invoice 2 created for Company A: ${factureA2.numeroFacture}`,
    );
    assert(
      factureA3.numeroFacture === 'F003/2026',
      `Sequential invoice 3 created for Company A: ${factureA3.numeroFacture}`,
    );

    // Verify Company B counter was NOT consumed
    const voyageB2 = await voyagesService.create(companyB.id, {
      idClient: clientB.id,
      lieuChargement: 'Oujda',
      lieuDechargement: 'Nador',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 4000,
    });
    const factureB2 = await facturesService.create(
      { idVoyage: voyageB2.idVoyage, dateFacture: '2026-05-12' },
      companyB.id,
    );
    assert(
      factureB2.numeroFacture === 'F002/2026',
      `Company B sequential invoice is F002/2026 (not affected by Company A reaching F003)`,
    );

    // -------------------------------------------------------------
    // TEST 3: Year rollover (Change of year)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Year change sequence reset (2026 -> 2027)...');

    const voyageA2027 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 9000,
    });
    const factureA2027 = await facturesService.create(
      { idVoyage: voyageA2027.idVoyage, dateFacture: '2027-01-05' },
      companyA.id,
    );

    assert(
      factureA2027.numeroFacture === 'F001/2027',
      `Year 2027 invoice for Company A correctly starts at F001/2027 (got ${factureA2027.numeroFacture})`,
    );

    const creanceA2027 = await prisma.creanceClient.findUnique({
      where: {
        companyId_factureId: {
          companyId: companyA.id,
          factureId: factureA2027.id,
        },
      },
    });
    assert(
      creanceA2027 !== null && creanceA2027.numeroFacture === 'F001/2027',
      'Creance for 2027 created cleanly',
    );

    // -------------------------------------------------------------
    // TEST 4: Concurrent invoice creation
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Concurrent invoice creations...');

    // 4.1 Concurrent within Company A
    const concVoyagesA = await Promise.all([
      voyagesService.create(companyA.id, {
        idClient: clientA.id,
        lieuChargement: 'C1',
        lieuDechargement: 'D1',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: 1000,
      }),
      voyagesService.create(companyA.id, {
        idClient: clientA.id,
        lieuChargement: 'C2',
        lieuDechargement: 'D2',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: 2000,
      }),
      voyagesService.create(companyA.id, {
        idClient: clientA.id,
        lieuChargement: 'C3',
        lieuDechargement: 'D3',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: 3000,
      }),
    ]);

    const concFacturesA = await Promise.all(
      concVoyagesA.map((v) =>
        facturesService.create({ idVoyage: v.idVoyage, dateFacture: '2026-06-01' }, companyA.id),
      ),
    );

    const generatedNumsA = concFacturesA.map((f) => f.numeroFacture).sort();
    assert(
      generatedNumsA[0] === 'F004/2026' &&
        generatedNumsA[1] === 'F005/2026' &&
        generatedNumsA[2] === 'F006/2026',
      `3 concurrent requests in Company A produced strictly unique consecutive numbers: ${generatedNumsA.join(', ')}`,
    );

    // 4.2 Cross-company simultaneous creation
    const [voyConcCrossA, voyConcCrossB] = await Promise.all([
      voyagesService.create(companyA.id, {
        idClient: clientA.id,
        lieuChargement: 'Cross A',
        lieuDechargement: 'Cross A End',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: 1500,
      }),
      voyagesService.create(companyB.id, {
        idClient: clientB.id,
        lieuChargement: 'Cross B',
        lieuDechargement: 'Cross B End',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: 2500,
      }),
    ]);

    const [crossFactureA, crossFactureB] = await Promise.all([
      facturesService.create({ idVoyage: voyConcCrossA.idVoyage, dateFacture: '2026-06-02' }, companyA.id),
      facturesService.create({ idVoyage: voyConcCrossB.idVoyage, dateFacture: '2026-06-02' }, companyB.id),
    ]);

    assert(
      crossFactureA.numeroFacture === 'F007/2026' && crossFactureB.numeroFacture === 'F003/2026',
      `Simultaneous cross-company creation succeeded without collision (Comp A: ${crossFactureA.numeroFacture}, Comp B: ${crossFactureB.numeroFacture})`,
    );

    // -------------------------------------------------------------
    // TEST 5: Creance creation and financial accuracy
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Linked CreanceClient financial and relational integrity...');

    // 5.1 Check factureA1 (created with past date 2026-05-10, due date 2026-06-09 -> EN_RETARD)
    const creanceCheckPast = await prisma.creanceClient.findUnique({
      where: {
        companyId_factureId: {
          companyId: companyA.id,
          factureId: factureA1.id,
        },
      },
    });

    assert(creanceCheckPast !== null, 'CreanceClient record exists for factureA1');
    assert(creanceCheckPast?.factureId === factureA1.id, 'CreanceClient references exact factureId');
    assert(creanceCheckPast?.companyId === companyA.id, 'CreanceClient belongs to exact companyId');
    assert(
      Number(creanceCheckPast?.montantFacture) === Number(factureA1.montantTotal),
      `Creance amount (${creanceCheckPast?.montantFacture}) matches invoice total (${factureA1.montantTotal})`,
    );
    assert(
      Number(creanceCheckPast?.montantRecu) === 0,
      'Initial Creance received amount is 0',
    );
    assert(
      creanceCheckPast?.statutPaiement === 'EN_RETARD',
      'Past-due invoice creance correctly initialized with status EN_RETARD',
    );

    // 5.2 Create fresh current invoice (due date in future -> NON_PAYE)
    const voyageCurrent = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Casa',
      lieuDechargement: 'Rabat',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 3500,
    });
    const factureCurrent = await facturesService.create(
      { idVoyage: voyageCurrent.idVoyage, dateFacture: new Date(), joursEcheance: 30 },
      companyA.id,
    );
    const creanceCurrent = await prisma.creanceClient.findUnique({
      where: {
        companyId_factureId: {
          companyId: companyA.id,
          factureId: factureCurrent.id,
        },
      },
    });
    assert(
      creanceCurrent !== null && creanceCurrent.statutPaiement === 'NON_PAYE',
      'Active current invoice creance correctly initialized with status NON_PAYE',
    );

    // -------------------------------------------------------------
    // TEST 6: Strict tenant data isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Strict multi-tenant data isolation...');

    const facturesListA = await facturesService.findAll(companyA.id);
    const hasAnyCompBInA = facturesListA.data.some(
      (f) => f.nomClient === clientB.nomEntreprise,
    );
    assert(!hasAnyCompBInA, 'Company A invoice query contains ZERO records from Company B');

    const creancesListA = await creancesService.findAll(companyA.id);
    const hasAnyCompBCreanceInA = creancesListA.data.some(
      (c) => c.nomClient === clientB.nomEntreprise,
    );
    assert(!hasAnyCompBCreanceInA, 'Company A receivables query contains ZERO records from Company B');

    // Cross-tenant single record query protection
    try {
      await facturesService.findOne(factureB1.id, companyA.id);
      throw new Error('Cross-tenant invoice access was allowed!');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        'Cross-tenant invoice access strictly rejected with 404 NotFoundException',
      );
    }

    try {
      await creancesService.findOne(creanceB1!.id, companyA.id);
      throw new Error('Cross-tenant creance access was allowed!');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        'Cross-tenant creance access strictly rejected with 404 NotFoundException',
      );
    }

    console.log('\n======================================================================');
    console.log(`=== ALL ${passedCount} MULTI-TENANT INVOICE & RECEIVABLE TESTS PASSED CLEANLY ===`);
    console.log('======================================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP: Strictly scoped to testCompanyIds (Zero impact on real business data)
    // -------------------------------------------------------------
    if (testCompanyIds.length > 0) {
      console.log('[CLEANUP] Cleaning test tenant fixtures...');
      await prisma.paiementClient.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.creanceClient.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.facture.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.voyage.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.client.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.invoiceSequence.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.companySettings.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: testCompanyIds } },
      });
      console.log('  ✓ Test fixtures cleaned up without touching any existing business data.');
    }
    await app.close();
  }
}

runMultiTenantInvoiceNumberingTests();
