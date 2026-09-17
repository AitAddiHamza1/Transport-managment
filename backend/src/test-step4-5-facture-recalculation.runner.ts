import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { CreanceStatut, ModeFacturation, PaiementMethode } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { execSync } from 'child_process';

async function runStep4_5FactureRecalculationTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.5 — FACTURE RECALCULATION & CREANCE SYNC SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const voyagesService = app.get(VoyagesService);
  const facturesService = app.get(FacturesService);
  const creancesService = app.get(CreancesClientsService);
  const paiementsService = app.get(PaiementsClientsService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;
  let clientEurId: number | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant environment for Companies A and B
    // -------------------------------------------------------------
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_45_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_45_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_45_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_45_B' } });
    companyBId = compB.id;

    // Clean up any stale leftover data from previous runs
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.fraisImmobilisation.deleteMany({ where: { voyage: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    let clientA = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_45_A' },
    });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_45_A',
          telephone: '0655555555',
          deviseFacturation: 'MAD',
        },
      });
    }
    clientAId = clientA.id;

    let clientEur = await prisma.client.findFirst({
      where: { companyId: companyAId, nomEntreprise: 'CLIENT_45_EUR' },
    });
    if (!clientEur) {
      clientEur = await prisma.client.create({
        data: {
          companyId: companyAId,
          nomEntreprise: 'CLIENT_45_EUR',
          telephone: '0655555556',
          deviseFacturation: 'EUR',
        },
      });
    }
    clientEurId = clientEur.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    const createTestVoyage = async (companyId: number, idClient = clientAId!, montant = 10000, devise = 'MAD') => {
      return voyagesService.create(companyId, {
        idClient,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        montantVoyage: montant,
        devise,
      });
    };

    // -------------------------------------------------------------
    // TEST 1 — Existing invoice, no immobilisation
    // -------------------------------------------------------------
    console.log('[TEST 1] Existing invoice calculation without FraisImmobilisation...');
    const v1 = await createTestVoyage(companyAId, clientAId!, 10000);
    const f1 = await facturesService.create({ idVoyage: v1.idVoyage }, companyAId!);

    if (f1.sousTotal !== 10000 || f1.montantTva !== 2000 || f1.montantTotal !== 12000) {
      throw new Error(`Test 1 failed! Got sousTotal=${f1.sousTotal}, tva=${f1.montantTva}, ttc=${f1.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Invoice #${f1.numeroFacture} HT=10,000, TVA=2,000, TTC=12,000 MAD.`);

    // -------------------------------------------------------------
    // TEST 2 — Add immobilisation
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Add FraisImmobilisation (500 x 3 = 1,500) to existing Facture...');
    await voyagesService.createFraisImmobilisation(companyAId!, v1.idVoyage, {
      prixParJour: 500,
      nombreJoursRetard: 3,
    });

    const f1AfterAdd = await facturesService.findOne(f1.id, companyAId!);
    if (f1AfterAdd.sousTotal !== 11500 || f1AfterAdd.montantTva !== 2300 || f1AfterAdd.montantTotal !== 13800) {
      throw new Error(`Test 2 failed! Expected HT=11500, TVA=2300, TTC=13800, got: HT=${f1AfterAdd.sousTotal}, TVA=${f1AfterAdd.montantTva}, TTC=${f1AfterAdd.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Facture recalculated HT=11,500, TVA=2,300, TTC=13,800 MAD.`);

    // -------------------------------------------------------------
    // TEST 3 — Same Facture number
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Verify Facture.numeroFacture remains unchanged after adding Frais...');
    if (f1AfterAdd.numeroFacture !== f1.numeroFacture) {
      throw new Error(`Test 3 failed! numeroFacture changed from ${f1.numeroFacture} to ${f1AfterAdd.numeroFacture}`);
    }
    console.log(`  ✓ PASSED: numeroFacture remains "${f1AfterAdd.numeroFacture}".`);

    // -------------------------------------------------------------
    // TEST 4 — Zero sequence side effect
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Verify InvoiceSequence was NOT consumed during Frais addition...');
    const seqCount = await prisma.invoiceSequence.count({ where: { companyId: companyAId! } });
    const seqRow = await prisma.invoiceSequence.findFirst({ where: { companyId: companyAId!, modeFacturation: 'AVEC_FACTURE' } });
    if (seqRow?.dernierNumero !== 1) {
      throw new Error(`Test 4 failed! dernierNumero changed to ${seqRow?.dernierNumero}`);
    }
    console.log(`  ✓ PASSED: InvoiceSequence count = ${seqCount}, dernierNumero = ${seqRow.dernierNumero} (unchanged).`);

    // -------------------------------------------------------------
    // TEST 5 — Zero new Facture
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Verify no new Facture record was created...');
    const totalFacturesV1 = await prisma.facture.count({ where: { idVoyage: v1.idVoyage } });
    if (totalFacturesV1 !== 1) {
      throw new Error(`Test 5 failed! Expected 1 Facture row, got: ${totalFacturesV1}`);
    }
    console.log('  ✓ PASSED: Facture count for Voyage remains exactly 1.');

    // -------------------------------------------------------------
    // TEST 6 — Update immobilisation (500x3 -> 700x5 = 3,500)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Update FraisImmobilisation (700 x 5 = 3,500)...');
    await voyagesService.updateFraisImmobilisation(companyAId!, v1.idVoyage, {
      prixParJour: 700,
      nombreJoursRetard: 5,
    });

    const f1AfterUpdate = await facturesService.findOne(f1.id, companyAId!);
    if (f1AfterUpdate.sousTotal !== 13500 || f1AfterUpdate.montantTva !== 2700 || f1AfterUpdate.montantTotal !== 16200) {
      throw new Error(`Test 6 failed! Expected HT=13500, TVA=2700, TTC=16200, got: HT=${f1AfterUpdate.sousTotal}, TVA=${f1AfterUpdate.montantTva}, TTC=${f1AfterUpdate.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Facture updated HT=13,500, TVA=2,700, TTC=16,200 MAD.`);

    // -------------------------------------------------------------
    // TEST 7 — Delete immobilisation
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Delete FraisImmobilisation...');
    await voyagesService.removeFraisImmobilisation(companyAId!, v1.idVoyage);

    const f1AfterDelete = await facturesService.findOne(f1.id, companyAId!);
    if (f1AfterDelete.sousTotal !== 10000 || f1AfterDelete.montantTva !== 2000 || f1AfterDelete.montantTotal !== 12000) {
      throw new Error(`Test 7 failed! Expected HT=10000, TVA=2000, TTC=12000, got: HT=${f1AfterDelete.sousTotal}, TVA=${f1AfterDelete.montantTva}, TTC=${f1AfterDelete.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Facture reverted HT=10,000, TVA=2,000, TTC=12,000 MAD.`);

    // -------------------------------------------------------------
    // TEST 8 — Payment preservation (Partial payment)
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Partial payment preservation after adding FraisImmobilisation...');
    const v8 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f8 = await facturesService.create({ idVoyage: v8.idVoyage }, companyAId!);

    await paiementsService.create(companyAId!, {
      numeroFacture: f8.numeroFacture,
      montantRecu: 4000,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    // Add immobilisation (1,500 HT -> TTC 13,800)
    await voyagesService.createFraisImmobilisation(companyAId!, v8.idVoyage, {
      prixParJour: 500,
      nombreJoursRetard: 3,
    });

    const f8After = await facturesService.findOne(f8.id, companyAId!);
    const pCount8 = await prisma.paiementClient.count({ where: { numeroFacture: f8.numeroFacture } });

    if (pCount8 !== 1 || f8After.montantPaye !== '4000.00' || f8After.soldeRestant !== '9800.00') {
      throw new Error(`Test 8 failed! Payment count=${pCount8}, montantPaye=${f8After.montantPaye}, soldeRestant=${f8After.soldeRestant}`);
    }
    console.log(`  ✓ PASSED: PaiementClient preserved (4,000.00 MAD), new Solde = 9,800.00 MAD.`);

    // -------------------------------------------------------------
    // TEST 9 — Full payment preservation / PAYEE protection
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Full payment preservation / PAYEE protection after adding FraisImmobilisation...');
    const v9 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f9 = await facturesService.create({ idVoyage: v9.idVoyage }, companyAId!);

    await paiementsService.create(companyAId!, {
      numeroFacture: f9.numeroFacture,
      montantRecu: 12000,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    // Attempt adding immobilisation to PAYEE invoice (Must be rejected by Step 4.6 PAYEE protection)
    try {
      await voyagesService.createFraisImmobilisation(companyAId!, v9.idVoyage, {
        prixParJour: 500,
        nombreJoursRetard: 3,
      });
      throw new Error('Frais creation on PAYEE invoice succeeded when it should have failed!');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('déjà payée')) {
        console.log('  ✓ PASSED: FraisImmobilisation creation on PAYEE invoice correctly rejected with 400 BadRequestException.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // TEST 10 — Creance synchronization
    // -------------------------------------------------------------
    console.log('\n[TEST 10] CreanceClient synchronization after recalculation...');
    const creance8 = await prisma.creanceClient.findUnique({ where: { numeroFacture: f8.numeroFacture } });
    if (!creance8 || Number(creance8.montantFacture) !== 13800 || creance8.statutPaiement !== CreanceStatut.PARTIEL) {
      throw new Error(`Test 10 failed! Creance record: montantFacture=${creance8?.montantFacture}, statut=${creance8?.statutPaiement}`);
    }
    console.log(`  ✓ PASSED: CreanceClient montantFacture=13,800 MAD, statutPaiement=PARTIEL.`);

    // -------------------------------------------------------------
    // TEST 11 — No duplicate Creance
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Verify repeated Frais operations never create multiple CreanceClient rows...');
    const v11 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f11 = await facturesService.create({ idVoyage: v11.idVoyage }, companyAId!);

    await voyagesService.createFraisImmobilisation(companyAId!, v11.idVoyage, { prixParJour: 100, nombreJoursRetard: 1 });
    await voyagesService.updateFraisImmobilisation(companyAId!, v11.idVoyage, { prixParJour: 200 });
    await voyagesService.updateFraisImmobilisation(companyAId!, v11.idVoyage, { nombreJoursRetard: 5 });
    await voyagesService.removeFraisImmobilisation(companyAId!, v11.idVoyage);
    await voyagesService.createFraisImmobilisation(companyAId!, v11.idVoyage, { prixParJour: 300, nombreJoursRetard: 2 });

    const cCount11 = await prisma.creanceClient.count({ where: { numeroFacture: f11.numeroFacture } });
    if (cCount11 !== 1) {
      throw new Error(`Test 11 failed! Expected 1 CreanceClient row, got: ${cCount11}`);
    }
    console.log('  ✓ PASSED: CreanceClient count remains strictly 1 across multiple mutations.');

    // -------------------------------------------------------------
    // TEST 12 — No Facture when none exists
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Add FraisImmobilisation to Voyage with NO Facture...');
    const v12 = await createTestVoyage(companyAId!, clientAId!, 10000);
    await voyagesService.createFraisImmobilisation(companyAId!, v12.idVoyage, { prixParJour: 500, nombreJoursRetard: 3 });

    const facturesV12 = await prisma.facture.count({ where: { idVoyage: v12.idVoyage } });
    if (facturesV12 !== 0) {
      throw new Error(`Test 12 failed! Facture was created when none should exist! Count=${facturesV12}`);
    }
    console.log('  ✓ PASSED: Frais created without creating a Facture or consuming sequence.');

    // -------------------------------------------------------------
    // TEST 13 — First Facture after existing Frais
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Create initial Facture for Voyage with pre-existing Frais...');
    const f13 = await facturesService.create({ idVoyage: v12.idVoyage }, companyAId!);
    if (f13.sousTotal !== 11500 || f13.montantTotal !== 13800) {
      throw new Error(`Test 13 failed! Expected HT=11500, TTC=13800, got HT=${f13.sousTotal}, TTC=${f13.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Initial Facture included pre-existing Frais HT=11,500, TTC=13,800 MAD.`);

    // -------------------------------------------------------------
    // TEST 14 — Decimal safety (500.10 x 3 = 1500.30)
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Testing Decimal safety (500.10 x 3)...');
    const v14 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f14 = await facturesService.create({ idVoyage: v14.idVoyage }, companyAId!);
    await voyagesService.createFraisImmobilisation(companyAId!, v14.idVoyage, { prixParJour: 500.10, nombreJoursRetard: 3 });

    const f14After = await facturesService.findOne(f14.id, companyAId!);
    if (f14After.sousTotal !== 11500.30 || f14After.montantTva !== 2300.06 || f14After.montantTotal !== 13800.36) {
      throw new Error(`Test 14 failed! Got HT=${f14After.sousTotal}, TVA=${f14After.montantTva}, TTC=${f14After.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Exact Decimal results: HT=11,500.30, TVA=2,300.06, TTC=13,800.36 MAD.`);

    // -------------------------------------------------------------
    // TEST 15 — Zero immobilisation
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Testing zero immobilisation (0 x 5 = 0)...');
    const v15 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f15 = await facturesService.create({ idVoyage: v15.idVoyage }, companyAId!);
    await voyagesService.createFraisImmobilisation(companyAId!, v15.idVoyage, { prixParJour: 0, nombreJoursRetard: 5 });

    const f15After = await facturesService.findOne(f15.id, companyAId!);
    if (f15After.sousTotal !== 10000 || f15After.montantTotal !== 12000) {
      throw new Error(`Test 15 failed! Got HT=${f15After.sousTotal}, TTC=${f15After.montantTotal}`);
    }
    console.log('  ✓ PASSED: Zero immobilisation produced no change in invoice totals.');

    // -------------------------------------------------------------
    // TEST 16 — Tenant isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 16] Testing tenant isolation on recalculation...');
    try {
      await voyagesService.updateFraisImmobilisation(companyBId!, v1.idVoyage, { prixParJour: 9999 });
      throw new Error('Company B updated Company A Frais!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant operation blocked with 404 NotFoundException.');
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 17 — Transaction rollback
    // -------------------------------------------------------------
    console.log('\n[TEST 17] Testing transaction rollback on failure...');
    const v17 = await createTestVoyage(companyAId!, clientAId!, 10000);
    const f17 = await facturesService.create({ idVoyage: v17.idVoyage }, companyAId!);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.fraisImmobilisation.create({
          data: { idVoyage: v17.idVoyage, prixParJour: 500, nombreJoursRetard: 3 },
        });
        await facturesService.recalculateFactureInTx(tx, companyAId!, v17.idVoyage);
        throw new Error('SIMULATED_FAIL');
      });
    } catch (err: any) {
      if (err.message !== 'SIMULATED_FAIL') throw err;
    }

    const frais17 = await prisma.fraisImmobilisation.findUnique({ where: { idVoyage: v17.idVoyage } });
    const f17Check = await facturesService.findOne(f17.id, companyAId!);
    if (frais17 !== null || f17Check.sousTotal !== 10000) {
      throw new Error('Test 17 failed! Rollback did not restore original state!');
    }
    console.log('  ✓ PASSED: Transaction rollback restored original state completely.');

    // -------------------------------------------------------------
    // TEST 18 — Currency preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 18] Testing currency preservation (EUR)...');
    const v18 = await createTestVoyage(companyAId!, clientEurId!, 10000, 'EUR');
    const f18 = await facturesService.create({ idVoyage: v18.idVoyage }, companyAId!);
    await voyagesService.createFraisImmobilisation(companyAId!, v18.idVoyage, { prixParJour: 500, nombreJoursRetard: 3 });

    const f18After = await facturesService.findOne(f18.id, companyAId!);
    if (f18After.devise !== 'EUR' || f18After.sousTotal !== 11500) {
      throw new Error(`Test 18 failed! devise=${f18After.devise}, HT=${f18After.sousTotal}`);
    }
    console.log(`  ✓ PASSED: EUR currency preserved, HT=11,500 EUR (no conversion).`);

    // -------------------------------------------------------------
    // TEST 19 — Invoice mode preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 19] Testing modeFacturation preservation...');
    if (f1AfterAdd.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Test 19 failed! modeFacturation changed to ${f1AfterAdd.modeFacturation}`);
    }
    console.log('  ✓ PASSED: modeFacturation remains AVEC_FACTURE.');

    // -------------------------------------------------------------
    // TEST 20 — Historical invoice number preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 20] Testing historical invoice number preservation...');
    if (f1AfterDelete.numeroFacture !== f1.numeroFacture) {
      throw new Error('Test 20 failed! numeroFacture changed during operations!');
    }
    console.log(`  ✓ PASSED: numeroFacture "${f1.numeroFacture}" preserved across all CRUD operations.`);

    // -------------------------------------------------------------
    // REGRESSION TESTS 21 - 27
    // -------------------------------------------------------------
    console.log('\n[TEST 21] Regression: Step 4.1 InvoiceSequence numbering...');
    const v21 = await createTestVoyage(companyAId!, clientAId!, 5000);
    await voyagesService.update(companyAId!, v21.idVoyage, { modeFacturation: ModeFacturation.SANS_FACTURE });
    const f21 = await facturesService.create({ idVoyage: v21.idVoyage }, companyAId!);
    if (!f21.numeroFacture.startsWith('SF')) {
      throw new Error(`Test 21 failed! Expected SF prefix, got: ${f21.numeroFacture}`);
    }
    console.log(`  ✓ PASSED: Step 4.1 regression verified (${f21.numeroFacture}).`);

    console.log('\n[TEST 22] Regression: Step 4.2 Voyage modeFacturation...');
    const v22 = await createTestVoyage(companyAId!, clientAId!, 5000);
    if (v22.modeFacturation !== ModeFacturation.AVEC_FACTURE) throw new Error('Default mode failed');
    console.log('  ✓ PASSED: Step 4.2 regression verified.');

    console.log('\n[TEST 23] Regression: Step 4.3 Payment protection on mode change...');
    try {
      await voyagesService.update(companyAId!, v8.idVoyage, { modeFacturation: ModeFacturation.SANS_FACTURE });
      throw new Error('Mode change succeeded when payment existed!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('  ✓ PASSED: Step 4.3 regression verified (payment blocked mode change).');
      } else {
        throw err;
      }
    }

    console.log('\n[TEST 24] Regression: Step 4.4 FraisImmobilisation DTO validation & Conflict...');
    try {
      await voyagesService.createFraisImmobilisation(companyAId!, v8.idVoyage, { prixParJour: 100, nombreJoursRetard: 1 });
      throw new Error('Duplicate Frais creation succeeded!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log('  ✓ PASSED: Step 4.4 regression verified (409 Conflict on duplicate).');
      } else {
        throw err;
      }
    }

    console.log('\n[TEST 25] Regression: FacturesService queries & stats...');
    const fList = await facturesService.findAll(companyAId!);
    const fStats = await facturesService.findStats(companyAId!);
    if (fList.meta.total < 1 || fStats.totalFactures < 1) throw new Error('FacturesService stats failed');
    console.log('  ✓ PASSED: FacturesService queries intact.');

    console.log('\n[TEST 26] Regression: CreancesClientsService queries & stats...');
    const cList = await creancesService.findAll(companyAId!);
    const cStats = await creancesService.findStats(companyAId!);
    if (cList.meta.total < 1 || cStats.totalCreances < 1) throw new Error('CreancesClientsService stats failed');
    console.log('  ✓ PASSED: CreancesClientsService queries intact.');

    console.log('\n[TEST 27] Regression: PaiementsClientsService queries & stats...');
    const pList = await paiementsService.findAll(companyAId!);
    const pStats = await paiementsService.findStats(companyAId!);
    if (pList.meta.total < 1 || pStats.totalPaiements < 1) throw new Error('PaiementsClientsService stats failed');
    console.log('  ✓ PASSED: PaiementsClientsService queries intact.');

    // -------------------------------------------------------------
    // TEST 28 — Prisma validate
    // -------------------------------------------------------------
    console.log('\n[TEST 28] Running npx prisma validate...');
    const prismaValidateOutput = execSync('npx prisma validate', { cwd: process.cwd(), encoding: 'utf-8' });
    console.log(`  ✓ PASSED: npx prisma validate succeeded.\n  ${prismaValidateOutput.trim()}`);

    // -------------------------------------------------------------
    // TEST 29 — npm run build
    // -------------------------------------------------------------
    console.log('\n[TEST 29] Running npm run build...');
    const buildOutput = execSync('npm run build', { cwd: process.cwd(), encoding: 'utf-8' });
    console.log('  ✓ PASSED: npm run build completed with 0 errors.');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data...');
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.fraisImmobilisation.deleteMany({ where: { voyage: { companyId: { in: [companyAId!, companyBId!] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId!, companyBId!] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId!, companyBId!] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.5 FACTURE RECALCULATION TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SUB-STEP 4.5 TEST RUNNER FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep4_5FactureRecalculationTests();
