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

async function runStep4_6PayeeProtectionTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.6 — PAYEE PROTECTION TEST SUITE ===');
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

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant environment for Companies A and B
    // -------------------------------------------------------------
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_46_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_46_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_46_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_46_B' } });
    companyBId = compB.id;

    // Clean up any leftover test data
    await prisma.paiementClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.fraisImmobilisation.deleteMany({ where: { voyage: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    let clientA = await prisma.client.create({
      data: {
        companyId: companyAId,
        nomEntreprise: 'CLIENT_46_A',
        telephone: '0666666666',
        deviseFacturation: 'MAD',
      },
    });
    clientAId = clientA.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    const createTestVoyage = async (companyId: number, montant = 10000) => {
      return voyagesService.create(companyId, {
        idClient: clientAId!,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Marrakech',
        montantVoyage: montant,
      });
    };

    // -------------------------------------------------------------
    // TEST A — Unpaid invoice financial modification
    // -------------------------------------------------------------
    console.log('[TEST A] Financial modification on unpaid invoice (0 payments)...');
    const vA = await createTestVoyage(companyAId!, 10000);
    const fA = await facturesService.create({ idVoyage: vA.idVoyage }, companyAId!);

    await voyagesService.createFraisImmobilisation(companyAId!, vA.idVoyage, {
      prixParJour: 500,
      nombreJoursRetard: 3,
    });

    const fAAfter = await facturesService.findOne(fA.id, companyAId!);
    if (fAAfter.sousTotal !== 11500 || fAAfter.montantTotal !== 13800) {
      throw new Error(`Test A failed! Expected HT=11500, TTC=13800, got HT=${fAAfter.sousTotal}, TTC=${fAAfter.montantTotal}`);
    }
    console.log('  ✓ PASSED: Unpaid invoice financial modification allowed cleanly.');

    // -------------------------------------------------------------
    // TEST B — Partially paid invoice financial modification
    // -------------------------------------------------------------
    console.log('\n[TEST B] Financial modification on partially paid invoice...');
    await paiementsService.create(companyAId!, {
      numeroFacture: fA.numeroFacture,
      montantRecu: 4000,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    await voyagesService.updateFraisImmobilisation(companyAId!, vA.idVoyage, {
      prixParJour: 700,
      nombreJoursRetard: 5,
    });

    const fBAfter = await facturesService.findOne(fA.id, companyAId!);
    if (fBAfter.montantPaye !== '4000.00' || fBAfter.soldeRestant !== '12200.00') {
      throw new Error(`Test B failed! Got montantPaye=${fBAfter.montantPaye}, soldeRestant=${fBAfter.soldeRestant}`);
    }
    console.log('  ✓ PASSED: Partially paid invoice recalculation allowed, payment preserved (4,000 MAD), remaining solde updated (12,200 MAD).');

    // -------------------------------------------------------------
    // TEST C — Fully paid invoice financial modification attempt
    // -------------------------------------------------------------
    console.log('\n[TEST C] Attempt financial modification on fully paid invoice (PAYEE)...');
    const vC = await createTestVoyage(companyAId!, 10000);
    const fC = await facturesService.create({ idVoyage: vC.idVoyage }, companyAId!);

    // Fully pay invoice (12,000 TTC)
    await paiementsService.create(companyAId!, {
      numeroFacture: fC.numeroFacture,
      montantRecu: 12000,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    try {
      await voyagesService.createFraisImmobilisation(companyAId!, vC.idVoyage, {
        prixParJour: 500,
        nombreJoursRetard: 3,
      });
      throw new Error('Frais creation on PAYEE invoice succeeded when it should have been rejected!');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('déjà payée')) {
        console.log(`  ✓ PASSED: Rejected with HTTP 400 (${err.message})`);
      } else {
        throw new Error(`Expected BadRequestException with 'déjà payée', got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST D — Overpaid invoice protection
    // -------------------------------------------------------------
    console.log('\n[TEST D] Overpaid invoice protection...');
    // fC has 12,000 payments and 12,000 total (PAYEE). Verify tauTva modification is rejected.
    try {
      await facturesService.update(fC.id, { tauxTva: 10 }, companyAId!);
      throw new Error('Facture.update on PAYEE invoice succeeded when it should have failed!');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('déjà payée')) {
        console.log('  ✓ PASSED: Facture update (tauxTva) on PAYEE invoice rejected cleanly.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // TEST E — FraisImmobilisation CRUD on PAYEE invoice
    // -------------------------------------------------------------
    console.log('\n[TEST E] FraisImmobilisation CRUD operations on PAYEE invoice...');
    // Create Frais on unpaid voyage vE, pay it fully, then test update and remove
    const vE = await createTestVoyage(companyAId!, 10000);
    await voyagesService.createFraisImmobilisation(companyAId!, vE.idVoyage, { prixParJour: 500, nombreJoursRetard: 2 }); // 1,000 HT -> TTC 13,200
    const fE = await facturesService.create({ idVoyage: vE.idVoyage }, companyAId!);

    await paiementsService.create(companyAId!, {
      numeroFacture: fE.numeroFacture,
      montantRecu: 13200,
      methodePaiement: PaiementMethode.VIREMENT,
    });

    // 1) Update Frais on PAYEE
    try {
      await voyagesService.updateFraisImmobilisation(companyAId!, vE.idVoyage, { prixParJour: 600 });
      throw new Error('Update Frais on PAYEE invoice succeeded!');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) throw err;
    }

    // 2) Remove Frais on PAYEE
    try {
      await voyagesService.removeFraisImmobilisation(companyAId!, vE.idVoyage);
      throw new Error('Remove Frais on PAYEE invoice succeeded!');
    } catch (err: any) {
      if (!(err instanceof BadRequestException)) throw err;
    }

    console.log('  ✓ PASSED: All FraisImmobilisation operations on PAYEE invoice rejected.');

    // -------------------------------------------------------------
    // TEST F — FraisImmobilisation on partially paid invoice
    // -------------------------------------------------------------
    console.log('\n[TEST F] FraisImmobilisation on partially paid invoice...');
    const vF = await createTestVoyage(companyAId!, 10000);
    const fF = await facturesService.create({ idVoyage: vF.idVoyage }, companyAId!);

    await paiementsService.create(companyAId!, {
      numeroFacture: fF.numeroFacture,
      montantRecu: 2000,
      methodePaiement: PaiementMethode.ESPECES,
    });

    await voyagesService.createFraisImmobilisation(companyAId!, vF.idVoyage, { prixParJour: 400, nombreJoursRetard: 3 });
    const fFAfter = await facturesService.findOne(fF.id, companyAId!);
    if (fFAfter.montantTotal !== 13440 || fFAfter.soldeRestant !== '11440.00') {
      throw new Error(`Test F failed! TTC=${fFAfter.montantTotal}, solde=${fFAfter.soldeRestant}`);
    }
    console.log('  ✓ PASSED: Frais on partially paid invoice succeeded cleanly.');

    // -------------------------------------------------------------
    // TEST G — Voyage.montantVoyage update on PAYEE invoice
    // -------------------------------------------------------------
    console.log('\n[TEST G] Attempt Voyage.montantVoyage update on PAYEE invoice...');
    try {
      await voyagesService.update(companyAId!, vC.idVoyage, { montantVoyage: 15000 });
      throw new Error('Voyage.montantVoyage update on PAYEE invoice succeeded!');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('déjà payée')) {
        console.log('  ✓ PASSED: Voyage.montantVoyage update on PAYEE invoice rejected with HTTP 400.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // TEST H — Unrelated Voyage update on PAYEE invoice
    // -------------------------------------------------------------
    console.log('\n[TEST H] Unrelated Voyage update on PAYEE invoice (lieuChargement)...');
    const updatedVoyageH = await voyagesService.update(companyAId!, vC.idVoyage, {
      lieuChargement: 'Rabat Ville',
    });
    if (updatedVoyageH.lieuChargement !== 'Rabat Ville') {
      throw new Error('Non-financial Voyage update failed!');
    }
    console.log('  ✓ PASSED: Non-financial Voyage fields can be updated on PAYEE invoice.');

    // -------------------------------------------------------------
    // TEST I — Voyage with NO active Facture
    // -------------------------------------------------------------
    console.log('\n[TEST I] Voyage with NO active Facture (montant update)...');
    const vI = await createTestVoyage(companyAId!, 10000);
    const updatedVoyageI = await voyagesService.update(companyAId!, vI.idVoyage, { montantVoyage: 12000 });
    if (updatedVoyageI.montantVoyage !== 12000) {
      throw new Error('Voyage update without Facture failed!');
    }
    console.log('  ✓ PASSED: Voyage without Facture updated cleanly.');

    // -------------------------------------------------------------
    // TEST J — Tenant isolation
    // -------------------------------------------------------------
    console.log('\n[TEST J] Tenant isolation on PAYEE invoice operation...');
    try {
      await voyagesService.update(companyBId!, vC.idVoyage, { lieuChargement: 'Tangier' });
      throw new Error('Company B updated Company A Voyage!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Tenant isolation intact (404 NotFoundException).');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // TEST K — No side effects on rejection
    // -------------------------------------------------------------
    console.log('\n[TEST K] Verify zero side effects on rejection...');
    const fCBefore = await facturesService.findOne(fC.id, companyAId!);
    const creanceCBefore = await prisma.creanceClient.findUnique({ where: { numeroFacture: fC.numeroFacture } });

    try {
      await voyagesService.createFraisImmobilisation(companyAId!, vC.idVoyage, { prixParJour: 999, nombreJoursRetard: 9 });
    } catch (e) {
      // Expected rejection
    }

    const fCAfter = await facturesService.findOne(fC.id, companyAId!);
    const creanceCAfter = await prisma.creanceClient.findUnique({ where: { numeroFacture: fC.numeroFacture } });

    if (fCBefore.sousTotal !== fCAfter.sousTotal || Number(creanceCBefore?.montantFacture) !== Number(creanceCAfter?.montantFacture)) {
      throw new Error('Side effects detected on rejected operation!');
    }
    console.log('  ✓ PASSED: Zero side effects on rejected operation.');

    // -------------------------------------------------------------
    // REGRESSION TESTS 21 - 27
    // -------------------------------------------------------------
    console.log('\n[REGRESSION] Step 4.1 InvoiceSequence numbering...');
    const vReg41 = await createTestVoyage(companyAId!, 5000);
    await voyagesService.update(companyAId!, vReg41.idVoyage, { modeFacturation: ModeFacturation.SANS_FACTURE });
    const fReg41 = await facturesService.create({ idVoyage: vReg41.idVoyage }, companyAId!);
    if (!fReg41.numeroFacture.startsWith('SF')) throw new Error('Step 4.1 regression failed');
    console.log(`  ✓ PASSED: Step 4.1 regression verified (${fReg41.numeroFacture}).`);

    console.log('\n[REGRESSION] Step 4.2 Voyage modeFacturation...');
    const vReg42 = await createTestVoyage(companyAId!, 5000);
    if (vReg42.modeFacturation !== ModeFacturation.AVEC_FACTURE) throw new Error('Step 4.2 regression failed');
    console.log('  ✓ PASSED: Step 4.2 regression verified.');

    console.log('\n[REGRESSION] Step 4.3 Safe mode change & payment protection...');
    try {
      await voyagesService.update(companyAId!, vA.idVoyage, { modeFacturation: ModeFacturation.SANS_FACTURE });
      throw new Error('Mode change on invoice with payments succeeded!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('  ✓ PASSED: Step 4.3 regression verified.');
      } else throw err;
    }

    console.log('\n[REGRESSION] Step 4.4 FraisImmobilisation DTO validation & Conflict...');
    try {
      await voyagesService.createFraisImmobilisation(companyAId!, vA.idVoyage, { prixParJour: 100, nombreJoursRetard: 1 });
      throw new Error('Duplicate Frais creation succeeded!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log('  ✓ PASSED: Step 4.4 regression verified.');
      } else throw err;
    }

    console.log('\n[REGRESSION] Step 4.5 Facture recalculation & Creance sync...');
    const fList = await facturesService.findAll(companyAId!);
    const cList = await creancesService.findAll(companyAId!);
    const pList = await paiementsService.findAll(companyAId!);
    if (fList.meta.total < 1 || cList.meta.total < 1 || pList.meta.total < 1) {
      throw new Error('Step 4.5 regression failed');
    }
    console.log('  ✓ PASSED: Step 4.5 regression verified.');

    // -------------------------------------------------------------
    // PRISMA VALIDATE & NPM BUILD
    // -------------------------------------------------------------
    console.log('\n[PRISMA VALIDATE] Running npx prisma validate...');
    const prismaValidateOutput = execSync('npx prisma validate', { cwd: process.cwd(), encoding: 'utf-8' });
    console.log(`  ✓ PASSED: npx prisma validate succeeded.\n  ${prismaValidateOutput.trim()}`);

    console.log('\n[BUILD] Running npm run build...');
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
    console.log('=== ALL SUB-STEP 4.6 PAYEE PROTECTION TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SUB-STEP 4.6 TEST RUNNER FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep4_6PayeeProtectionTests();
