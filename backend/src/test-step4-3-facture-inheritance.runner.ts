import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { ModeFacturation, Prisma } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateVoyageDto } from './modules/voyages/dto/update-voyage.dto';

async function runStep4_3FactureInheritanceTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.3 — SAFE FACTURE MODE CHANGE & DEBT PROTECTION ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const voyagesService = app.get(VoyagesService);
  const facturesService = app.get(FacturesService);
  const creancesService = app.get(CreancesClientsService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;
  let clientBId: number | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant environment for Companies A and B
    // -------------------------------------------------------------
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_43_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_43_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_43_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_43_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_43_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_43_A', telephone: '0611111111' },
      });
    }
    clientAId = clientA.id;

    let clientB = await prisma.client.findFirst({ where: { companyId: companyBId, nomEntreprise: 'CLIENT_43_B' } });
    if (!clientB) {
      clientB = await prisma.client.create({
        data: { companyId: companyBId, nomEntreprise: 'CLIENT_43_B', telephone: '0622222222' },
      });
    }
    clientBId = clientB.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // -------------------------------------------------------------
    // TEST 1 — FIRST AVEC VOYAGE -> Fxxx/YYYY
    // -------------------------------------------------------------
    console.log('[TEST 1] First AVEC Voyage -> Fxxx/YYYY invoice...');
    const vAvec1 = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 10000,
    });
    const fAvec1 = await facturesService.create({ idVoyage: vAvec1.idVoyage }, companyAId);

    if (!fAvec1.numeroFacture.startsWith('F')) {
      throw new Error(`Expected F prefix, got: ${fAvec1.numeroFacture}`);
    }
    if (fAvec1.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Expected AVEC_FACTURE, got: ${fAvec1.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: First AVEC invoice created: ${fAvec1.numeroFacture}`);

    // -------------------------------------------------------------
    // TEST 2 — FIRST SANS VOYAGE -> SFxxx/YYYY
    // -------------------------------------------------------------
    console.log('\n[TEST 2] First SANS Voyage -> SFxxx/YYYY invoice...');
    const vSans1 = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Tangier',
      lieuDechargement: 'Agadir',
      modeFacturation: ModeFacturation.SANS_FACTURE,
      montantVoyage: 8000,
    });
    const fSans1 = await facturesService.create({ idVoyage: vSans1.idVoyage }, companyAId);

    if (!fSans1.numeroFacture.startsWith('SF')) {
      throw new Error(`Expected SF prefix, got: ${fSans1.numeroFacture}`);
    }
    if (fSans1.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected SANS_FACTURE, got: ${fSans1.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: First SANS invoice created: ${fSans1.numeroFacture}`);

    // -------------------------------------------------------------
    // TEST 3 — AVEC -> SANS WITH ZERO PAYMENTS (SAFE REPLACEMENT + NO DOUBLE DEBT)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] AVEC -> SANS transition on zero-payment invoice...');
    const oldFAvecId = fAvec1.id;
    const oldFAvecNum = fAvec1.numeroFacture;

    const updatedVoyageToSans = await voyagesService.update(companyAId, vAvec1.idVoyage, {
      modeFacturation: ModeFacturation.SANS_FACTURE,
    });

    if (updatedVoyageToSans.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected Voyage mode SANS_FACTURE, got: ${updatedVoyageToSans.modeFacturation}`);
    }

    // Verify old Facture preserved historically
    const oldFAvecDb = await prisma.facture.findUnique({ where: { id: oldFAvecId } });
    if (!oldFAvecDb) throw new Error('Old Facture was deleted!');
    if (oldFAvecDb.numeroFacture !== oldFAvecNum) {
      throw new Error(`Old Facture renumbered! Expected ${oldFAvecNum}, got: ${oldFAvecDb.numeroFacture}`);
    }
    if (oldFAvecDb.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Old Facture mode mutated! Expected AVEC_FACTURE, got: ${oldFAvecDb.modeFacturation}`);
    }
    if (!oldFAvecDb.supprimeLe) {
      throw new Error('Old Facture supprimeLe timestamp was not set!');
    }

    // Verify NEW Facture created
    const activeFacturesVoyage1 = await prisma.facture.findMany({
      where: { idVoyage: vAvec1.idVoyage, companyId: companyAId, supprimeLe: null },
    });
    if (activeFacturesVoyage1.length !== 1) {
      throw new Error(`Expected exactly 1 active Facture for Voyage, got: ${activeFacturesVoyage1.length}`);
    }
    const newSFFacture = activeFacturesVoyage1[0];
    if (!newSFFacture.numeroFacture.startsWith('SF')) {
      throw new Error(`Expected SF prefix for new invoice, got: ${newSFFacture.numeroFacture}`);
    }

    // Verify NO DOUBLE DEBT via CreanceClient service query
    const statsCompany = await creancesService.findStats(companyAId);
    const activeCreancesList = await creancesService.findAll(companyAId);
    const voyage1ActiveCreance = activeCreancesList.data.filter(
      (c) => c.numeroFacture === oldFAvecNum || c.numeroFacture === newSFFacture.numeroFacture,
    );

    if (voyage1ActiveCreance.length !== 1) {
      throw new Error(`DOUBLE DEBT DETECTED! Found ${voyage1ActiveCreance.length} active debts for Voyage #1`);
    }
    console.log(`  ✓ PASSED: Old invoice ${oldFAvecNum} preserved historically. New invoice ${newSFFacture.numeroFacture} created. Exactly 1 active debt (NO DOUBLE DEBT).`);

    // -------------------------------------------------------------
    // TEST 4 — SANS -> AVEC WITH ZERO PAYMENTS
    // -------------------------------------------------------------
    console.log('\n[TEST 4] SANS -> AVEC transition on zero-payment invoice...');
    const oldFSansId = fSans1.id;
    const oldFSansNum = fSans1.numeroFacture;

    await voyagesService.update(companyAId, vSans1.idVoyage, {
      modeFacturation: ModeFacturation.AVEC_FACTURE,
    });

    const oldFSansDb = await prisma.facture.findUnique({ where: { id: oldFSansId } });
    if (!oldFSansDb || oldFSansDb.numeroFacture !== oldFSansNum || oldFSansDb.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error('Old SANS invoice was deleted or mutated!');
    }
    if (!oldFSansDb.supprimeLe) {
      throw new Error('Old SANS invoice supprimeLe timestamp was not set!');
    }

    const activeFacturesVoyage2 = await prisma.facture.findMany({
      where: { idVoyage: vSans1.idVoyage, companyId: companyAId, supprimeLe: null },
    });
    if (activeFacturesVoyage2.length !== 1 || !activeFacturesVoyage2[0].numeroFacture.startsWith('F')) {
      throw new Error('Failed to create new active AVEC invoice!');
    }
    console.log(`  ✓ PASSED: Old invoice ${oldFSansNum} preserved. New active AVEC invoice ${activeFacturesVoyage2[0].numeroFacture} created.`);

    // -------------------------------------------------------------
    // TEST 5 — AVEC -> SANS WITH PARTIAL PAYMENT (MUST BE REJECTED)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] AVEC -> SANS transition with PARTIAL payment (Must be rejected)...');
    const vPartial = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Oujda',
      lieuDechargement: 'Nador',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 12000,
    });
    const fPartial = await facturesService.create({ idVoyage: vPartial.idVoyage }, companyAId);

    // Record partial payment of 5000 MAD
    await prisma.paiementClient.create({
      data: {
        numeroFacture: fPartial.numeroFacture,
        nomClient: fPartial.nomClient,
        datePaiement: new Date(),
        montantRecu: new Prisma.Decimal(5000),
        methodePaiement: 'VIREMENT',
      },
    });

    const seqBeforePartial = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });

    try {
      await voyagesService.update(companyAId, vPartial.idVoyage, {
        modeFacturation: ModeFacturation.SANS_FACTURE,
      });
      throw new Error('FAILED: Mode change succeeded when partial payment existed!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Rejected with HTTP 400 BadRequestException: "${err.message}"`);
      } else {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
    }

    // Verify zero side effects
    const vPartialAfter = await voyagesService.findOne(companyAId, vPartial.idVoyage);
    if (vPartialAfter.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error('Voyage mode was mutated despite rejection!');
    }
    const seqAfterPartial = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });
    if (seqBeforePartial !== seqAfterPartial) {
      throw new Error('Invoice sequence was consumed despite rejection!');
    }

    // -------------------------------------------------------------
    // TEST 6 — AVEC -> SANS WITH FULL PAYMENT (MUST BE REJECTED)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] AVEC -> SANS transition with FULL payment (Must be rejected)...');
    const vFull = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Fes',
      lieuDechargement: 'Meknes',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 10000,
    });
    const fFull = await facturesService.create({ idVoyage: vFull.idVoyage }, companyAId);

    // Record full payment of 12000 MAD (TTC = 10000 + 20% TVA = 12000)
    await prisma.paiementClient.create({
      data: {
        numeroFacture: fFull.numeroFacture,
        nomClient: fFull.nomClient,
        datePaiement: new Date(),
        montantRecu: new Prisma.Decimal(12000),
        methodePaiement: 'VIREMENT',
      },
    });

    try {
      await voyagesService.update(companyAId, vFull.idVoyage, {
        modeFacturation: ModeFacturation.SANS_FACTURE,
      });
      throw new Error('FAILED: Mode change succeeded when full payment existed!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Rejected with HTTP 400 BadRequestException: "${err.message}"`);
      } else {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 7 — SANS -> AVEC WITH PARTIAL PAYMENT (MUST BE REJECTED)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] SANS -> AVEC transition with PARTIAL payment (Must be rejected)...');
    const vSansPartial = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Kenitra',
      lieuDechargement: 'Salé',
      modeFacturation: ModeFacturation.SANS_FACTURE,
      montantVoyage: 15000,
    });
    const fSansPartial = await facturesService.create({ idVoyage: vSansPartial.idVoyage }, companyAId);

    await prisma.paiementClient.create({
      data: {
        numeroFacture: fSansPartial.numeroFacture,
        nomClient: fSansPartial.nomClient,
        datePaiement: new Date(),
        montantRecu: new Prisma.Decimal(3000),
        methodePaiement: 'CHEQUE',
      },
    });

    try {
      await voyagesService.update(companyAId, vSansPartial.idVoyage, {
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      });
      throw new Error('FAILED: SANS -> AVEC succeeded with partial payment!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Rejected with HTTP 400 BadRequestException.`);
      } else {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 8 — SANS -> AVEC WITH FULL PAYMENT (MUST BE REJECTED)
    // -------------------------------------------------------------
    console.log('\n[TEST 8] SANS -> AVEC transition with FULL payment (Must be rejected)...');
    const vSansFull = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Taza',
      lieuDechargement: 'Guercif',
      modeFacturation: ModeFacturation.SANS_FACTURE,
      montantVoyage: 18000,
    });
    const fSansFull = await facturesService.create({ idVoyage: vSansFull.idVoyage }, companyAId);

    await prisma.paiementClient.create({
      data: {
        numeroFacture: fSansFull.numeroFacture,
        nomClient: fSansFull.nomClient,
        datePaiement: new Date(),
        montantRecu: new Prisma.Decimal(21600),
        methodePaiement: 'VIREMENT',
      },
    });

    try {
      await voyagesService.update(companyAId, vSansFull.idVoyage, {
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      });
      throw new Error('FAILED: SANS -> AVEC succeeded with full payment!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`  ✓ PASSED: Rejected with HTTP 400 BadRequestException.`);
      } else {
        throw new Error(`Expected BadRequestException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 9 — SAME MODE UPDATE (ZERO FACTURE / ZERO SEQUENCE)
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Update Voyage with SAME modeFacturation...');
    const fCountSameBefore = await prisma.facture.count({ where: { idVoyage: vAvec1.idVoyage } });
    await voyagesService.update(companyAId, vAvec1.idVoyage, {
      modeFacturation: ModeFacturation.SANS_FACTURE,
    });
    const fCountSameAfter = await prisma.facture.count({ where: { idVoyage: vAvec1.idVoyage } });
    if (fCountSameBefore !== fCountSameAfter) {
      throw new Error('Same mode update created an unexpected Facture!');
    }
    console.log('  ✓ PASSED: Updating with same mode created zero new factures.');

    // -------------------------------------------------------------
    // TEST 10 — UNRELATED VOYAGE FIELD UPDATE
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Update Voyage unrelated field (lieuChargement)...');
    const fCountUnrelatedBefore = await prisma.facture.count({ where: { idVoyage: vAvec1.idVoyage } });
    await voyagesService.update(companyAId, vAvec1.idVoyage, {
      lieuChargement: 'Updated Location',
    });
    const fCountUnrelatedAfter = await prisma.facture.count({ where: { idVoyage: vAvec1.idVoyage } });
    if (fCountUnrelatedBefore !== fCountUnrelatedAfter) {
      throw new Error('Unrelated field update created an unexpected Facture!');
    }
    console.log('  ✓ PASSED: Unrelated field update created zero new factures.');

    // -------------------------------------------------------------
    // TEST 11 — INVALID MODE REJECTED BY DTO
    // -------------------------------------------------------------
    console.log('\n[TEST 11] DTO validation for invalid modeFacturation...');
    const invalidDto = plainToInstance(UpdateVoyageDto, { modeFacturation: 'INVALID_ENUM' });
    const errors = await validate(invalidDto);
    if (errors.length === 0 || !errors.some((e) => e.property === 'modeFacturation')) {
      throw new Error('DTO failed to reject invalid modeFacturation!');
    }
    console.log('  ✓ PASSED: Invalid mode value correctly rejected by DTO validation.');

    // -------------------------------------------------------------
    // TEST 12 — CROSS-TENANT UPDATE REJECTED
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Cross-tenant Voyage update protection...');
    try {
      await voyagesService.update(companyBId, vAvec1.idVoyage, {
        modeFacturation: ModeFacturation.SANS_FACTURE,
      });
      throw new Error('Cross-tenant Voyage update succeeded when it should have failed!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update rejected with 404 NotFoundException.`);
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 13 — OLD FACTURE HISTORY PRESERVED
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Verifying old Facture history preservation (id, number, mode, amounts, date)...');
    const oldF1InDb = await prisma.facture.findUnique({ where: { id: oldFAvecId } });
    if (!oldF1InDb) throw new Error('Old Facture was deleted!');
    if (oldF1InDb.numeroFacture !== oldFAvecNum) throw new Error('Old Facture number changed!');
    if (oldF1InDb.modeFacturation !== ModeFacturation.AVEC_FACTURE) throw new Error('Old Facture mode changed!');
    if (Number(oldF1InDb.sousTotal) !== 10000) throw new Error('Old Facture amount changed!');
    console.log(`  ✓ PASSED: Old Facture ${oldFAvecNum} preserves all historical fields intact.`);

    // -------------------------------------------------------------
    // TEST 14 — OLD ZERO-PAYMENT FACTURE IS NOT AN ACTIVE DEBT
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Verifying replaced zero-payment Facture is excluded from active debt...');
    const activeCreanceOldF1 = await creancesService.findAll(companyAId, { search: oldFAvecNum });
    if (activeCreanceOldF1.data.length !== 0) {
      throw new Error(`Replaced Facture ${oldFAvecNum} is still returned in active CreanceClient search!`);
    }
    console.log(`  ✓ PASSED: Replaced invoice ${oldFAvecNum} is no longer returned in active debt queries.`);

    // -------------------------------------------------------------
    // TEST 15 — NEW FACTURE HAS CORRECT MODE AND PREFIX
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Verifying new Facture prefix and mode consistency...');
    const activeF1 = await prisma.facture.findFirst({
      where: { idVoyage: vAvec1.idVoyage, supprimeLe: null },
    });
    if (!activeF1 || !activeF1.numeroFacture.startsWith('SF') || activeF1.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error('New active Facture has incorrect mode or prefix!');
    }
    console.log(`  ✓ PASSED: New active invoice ${activeF1.numeroFacture} has correct prefix (SF) and mode (SANS_FACTURE).`);

    // -------------------------------------------------------------
    // TEST 16 — EXACTLY ONE NEW ACTIVE CREANCE EXISTS
    // -------------------------------------------------------------
    console.log('\n[TEST 16] Verifying exactly one new active CreanceClient exists after replacement...');
    const activeCreanceNewF1 = await prisma.creanceClient.findUnique({
      where: { numeroFacture: activeF1.numeroFacture },
    });
    if (!activeCreanceNewF1) {
      throw new Error('CreanceClient for new active Facture missing!');
    }
    console.log(`  ✓ PASSED: Exactly 1 active CreanceClient exists for invoice ${activeF1.numeroFacture}.`);

    // -------------------------------------------------------------
    // TEST 17 — NO DUPLICATE ACTIVE DEBT
    // -------------------------------------------------------------
    console.log('\n[TEST 17] Verifying total active debt sum for Voyage #1...');
    const activeCreancesVoyage1 = await prisma.creanceClient.findMany({
      where: { facture: { idVoyage: vAvec1.idVoyage, supprimeLe: null } },
    });
    const totalVoyage1Debt = activeCreancesVoyage1.reduce((sum, c) => sum + Number(c.montantFacture), 0);
    if (totalVoyage1Debt !== 12000) {
      throw new Error(`Expected active debt sum of 12000 TTC, got: ${totalVoyage1Debt}`);
    }
    console.log(`  ✓ PASSED: Total active debt sum = ${totalVoyage1Debt} MAD TTC (NO DOUBLE DEBT).`);

    // -------------------------------------------------------------
    // TEST 18 — TRANSACTION ROLLBACK SIMULATION
    // -------------------------------------------------------------
    console.log('\n[TEST 18] Simulating transaction rollback on forced error...');
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          INSERT INTO invoice_sequences (company_id, annee, mode_facturation, dernier_numero)
          VALUES (${companyAId}, 2099, 'AVEC_FACTURE'::"mode_facturation", 1)
          ON CONFLICT (company_id, annee, mode_facturation) DO UPDATE
          SET dernier_numero = invoice_sequences.dernier_numero + 1
          RETURNING dernier_numero;
        `;
        throw new Error('SIMULATED_FAILURE');
      });
    } catch (err: any) {
      if (err.message !== 'SIMULATED_FAILURE') throw err;
    }

    const seqRollback = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId: companyAId!,
          annee: 2099,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });
    if (seqRollback) throw new Error('Transaction rollback failed!');
    console.log('  ✓ PASSED: Simulated transaction rollback executed cleanly.');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data...');
    await prisma.paiementClient.deleteMany({
      where: {
        facture: { companyId: { in: [companyAId, companyBId] } },
      },
    });
    await prisma.creanceClient.deleteMany({
      where: {
        facture: { companyId: { in: [companyAId, companyBId] } },
      },
    });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.3 CORRECTION TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SUB-STEP 4.3 TEST RUNNER FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep4_3FactureInheritanceTests();
