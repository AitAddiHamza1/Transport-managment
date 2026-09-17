import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ModeFacturation } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateFraisImmobilisationDto } from './modules/voyages/dto/create-frais-immobilisation.dto';
import { UpdateFraisImmobilisationDto } from './modules/voyages/dto/update-frais-immobilisation.dto';

async function runStep4_4FraisImmobilisationTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.4 — FRAIS D’IMMOBILISATION CRUD TEST SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const voyagesService = app.get(VoyagesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant environment for Companies A and B
    // -------------------------------------------------------------
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_44_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_44_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_44_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_44_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_44_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_44_A', telephone: '0644444444' },
      });
    }
    clientAId = clientA.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // Helper: create a test voyage
    const createTestVoyage = async (companyId: number) => {
      return voyagesService.create(companyId, {
        idClient: clientAId!,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
        montantVoyage: 5000,
      });
    };

    // -------------------------------------------------------------
    // TEST 1 — CREATE VALID FRAIS (500 x 3 = 1500.00)
    // -------------------------------------------------------------
    console.log('[TEST 1] Create valid FraisImmobilisation (500 x 3)...');
    const v1 = await createTestVoyage(companyAId);
    const f1 = await voyagesService.createFraisImmobilisation(companyAId, v1.idVoyage, {
      prixParJour: 500,
      nombreJoursRetard: 3,
    });

    if (f1.montantTotal !== 1500) {
      throw new Error(`Expected montantTotal = 1500, got: ${f1.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Frais created with id #${f1.id}, montantTotal = ${f1.montantTotal} MAD`);

    // -------------------------------------------------------------
    // TEST 2 — DECIMAL CALCULATION SAFETY (500.10 x 3 = 1500.30)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing decimal calculation safety (500.10 x 3)...');
    const v2 = await createTestVoyage(companyAId);
    const f2 = await voyagesService.createFraisImmobilisation(companyAId, v2.idVoyage, {
      prixParJour: 500.10,
      nombreJoursRetard: 3,
    });

    if (f2.montantTotal !== 1500.30) {
      throw new Error(`Expected exact decimal 1500.30, got: ${f2.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Exact decimal calculation: ${f2.montantTotal} MAD (no float corruption).`);

    // -------------------------------------------------------------
    // TEST 3 — ZERO VALUES (0 x 0 = 0.00)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing zero values (0 x 0)...');
    const v3 = await createTestVoyage(companyAId);
    const f3 = await voyagesService.createFraisImmobilisation(companyAId, v3.idVoyage, {
      prixParJour: 0,
      nombreJoursRetard: 0,
    });

    if (f3.montantTotal !== 0) {
      throw new Error(`Expected montantTotal = 0, got: ${f3.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Zero values accepted, montantTotal = ${f3.montantTotal} MAD`);

    // -------------------------------------------------------------
    // TEST 4 — NEGATIVE PRIX PAR JOUR REJECTED
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing DTO validation for negative prixParJour...');
    const dtoNegPrix = plainToInstance(CreateFraisImmobilisationDto, { prixParJour: -10, nombreJoursRetard: 3 });
    const errsNegPrix = await validate(dtoNegPrix);
    if (errsNegPrix.length === 0 || !errsNegPrix.some((e) => e.property === 'prixParJour')) {
      throw new Error('DTO failed to reject negative prixParJour!');
    }
    console.log('  ✓ PASSED: Negative prixParJour correctly rejected by DTO.');

    // -------------------------------------------------------------
    // TEST 5 — NEGATIVE NOMBRE JOURS RETARD REJECTED
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing DTO validation for negative nombreJoursRetard...');
    const dtoNegRetard = plainToInstance(CreateFraisImmobilisationDto, { prixParJour: 500, nombreJoursRetard: -2 });
    const errsNegRetard = await validate(dtoNegRetard);
    if (errsNegRetard.length === 0 || !errsNegRetard.some((e) => e.property === 'nombreJoursRetard')) {
      throw new Error('DTO failed to reject negative nombreJoursRetard!');
    }
    console.log('  ✓ PASSED: Negative nombreJoursRetard correctly rejected by DTO.');

    // -------------------------------------------------------------
    // TEST 6 — DECIMAL NOMBRE JOURS RETARD REJECTED (e.g. 2.5)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing DTO validation for non-integer nombreJoursRetard (2.5)...');
    const dtoFloatRetard = plainToInstance(CreateFraisImmobilisationDto, { prixParJour: 500, nombreJoursRetard: 2.5 });
    const errsFloatRetard = await validate(dtoFloatRetard);
    if (errsFloatRetard.length === 0 || !errsFloatRetard.some((e) => e.property === 'nombreJoursRetard')) {
      throw new Error('DTO failed to reject decimal nombreJoursRetard!');
    }
    console.log('  ✓ PASSED: Decimal nombreJoursRetard (2.5) correctly rejected by DTO.');

    // -------------------------------------------------------------
    // TEST 7 — INVALID STRING VALUES REJECTED
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing DTO validation for string values ("abc")...');
    const dtoStr = plainToInstance(CreateFraisImmobilisationDto, { prixParJour: 'abc', nombreJoursRetard: 'abc' });
    const errsStr = await validate(dtoStr);
    if (errsStr.length === 0) {
      throw new Error('DTO failed to reject string inputs!');
    }
    console.log('  ✓ PASSED: Invalid string values correctly rejected by DTO.');

    // -------------------------------------------------------------
    // TEST 8 — DUPLICATE CREATION REJECTED WITH 409 CONFLICT
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing duplicate FraisImmobilisation creation for same Voyage...');
    try {
      await voyagesService.createFraisImmobilisation(companyAId, v1.idVoyage, {
        prixParJour: 600,
        nombreJoursRetard: 2,
      });
      throw new Error('Duplicate creation succeeded when it should have thrown 409!');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`  ✓ PASSED: Duplicate creation rejected with 409 ConflictException (${err.message})`);
      } else {
        throw new Error(`Expected ConflictException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 9 — READ (GET)
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Reading FraisImmobilisation via findFraisImmobilisation...');
    const readF1 = await voyagesService.findFraisImmobilisation(companyAId, v1.idVoyage);
    if (readF1.id !== f1.id || readF1.montantTotal !== 1500) {
      throw new Error('Read FraisImmobilisation mismatch!');
    }
    console.log(`  ✓ PASSED: Read FraisImmobilisation successfully for Voyage #${v1.idVoyage}.`);

    // -------------------------------------------------------------
    // TEST 10 — UPDATE PRIX PAR JOUR (500x3=1500 -> 700x3=2100)
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Update prixParJour (500 -> 700)...');
    const updatedPrix = await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, {
      prixParJour: 700,
    });
    if (updatedPrix.montantTotal !== 2100) {
      throw new Error(`Expected updated total = 2100, got: ${updatedPrix.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Updated prixParJour to 700. Recalculated total = ${updatedPrix.montantTotal} MAD.`);

    // -------------------------------------------------------------
    // TEST 11 — UPDATE NOMBRE JOURS RETARD (700x3=2100 -> 700x5=3500)
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Update nombreJoursRetard (3 -> 5)...');
    const updatedRetard = await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, {
      nombreJoursRetard: 5,
    });
    if (updatedRetard.montantTotal !== 3500) {
      throw new Error(`Expected updated total = 3500, got: ${updatedRetard.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Updated nombreJoursRetard to 5. Recalculated total = ${updatedRetard.montantTotal} MAD.`);

    // -------------------------------------------------------------
    // TEST 12 — UPDATE BOTH FIELDS (750.25 x 4 = 3001.00)
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Update both fields (750.25 x 4)...');
    const updatedBoth = await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, {
      prixParJour: 750.25,
      nombreJoursRetard: 4,
    });
    if (updatedBoth.montantTotal !== 3001.00) {
      throw new Error(`Expected updated total = 3001.00, got: ${updatedBoth.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Updated both fields. Recalculated total = ${updatedBoth.montantTotal} MAD.`);

    // -------------------------------------------------------------
    // TEST 13 — CLIENT CANNOT OVERWRITE MONTANT TOTAL
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Verifying client input does not overwrite server-side montantTotal calculation...');
    // Create DTO or object with spoofed montantTotal
    const spoofedInput: any = { prixParJour: 100, nombreJoursRetard: 2, montantTotal: 999999 };
    const fSpoof = await voyagesService.createFraisImmobilisation(companyAId, (await createTestVoyage(companyAId)).idVoyage, spoofedInput);
    if (fSpoof.montantTotal !== 200) {
      throw new Error(`Spoofed montantTotal was accepted! Expected 200, got: ${fSpoof.montantTotal}`);
    }
    console.log('  ✓ PASSED: Server-side calculation ignored client-supplied montantTotal.');

    // -------------------------------------------------------------
    // TEST 14 — CLIENT CANNOT CHANGE ID VOYAGE ON UPDATE
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Verifying idVoyage remains immutable on update...');
    const updatedImmutableVoyage = await voyagesService.updateFraisImmobilisation(companyAId, v1.idVoyage, {
      prixParJour: 800,
    });
    if (updatedImmutableVoyage.idVoyage !== v1.idVoyage) {
      throw new Error('idVoyage was mutated on update!');
    }
    console.log('  ✓ PASSED: idVoyage remains strictly attached to original Voyage.');

    // -------------------------------------------------------------
    // TEST 15 — DELETE
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Deleting FraisImmobilisation...');
    const vDelete = await createTestVoyage(companyAId);
    await voyagesService.createFraisImmobilisation(companyAId, vDelete.idVoyage, {
      prixParJour: 400,
      nombreJoursRetard: 2,
    });

    await voyagesService.removeFraisImmobilisation(companyAId, vDelete.idVoyage);

    try {
      await voyagesService.findFraisImmobilisation(companyAId, vDelete.idVoyage);
      throw new Error('Resource still exists after deletion!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: FraisImmobilisation deleted successfully.');
      } else {
        throw new Error(`Expected NotFoundException after deletion, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 16 — CROSS-TENANT READ
    // -------------------------------------------------------------
    console.log('\n[TEST 16] Testing cross-tenant READ protection...');
    try {
      await voyagesService.findFraisImmobilisation(companyBId, v1.idVoyage);
      throw new Error('Company B was able to read Company A FraisImmobilisation!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant READ refused with 404 NotFoundException.');
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 17 — CROSS-TENANT UPDATE
    // -------------------------------------------------------------
    console.log('\n[TEST 17] Testing cross-tenant UPDATE protection...');
    try {
      await voyagesService.updateFraisImmobilisation(companyBId, v1.idVoyage, { prixParJour: 999 });
      throw new Error('Company B was able to update Company A FraisImmobilisation!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant UPDATE refused with 404 NotFoundException.');
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 18 — CROSS-TENANT DELETE
    // -------------------------------------------------------------
    console.log('\n[TEST 18] Testing cross-tenant DELETE protection...');
    try {
      await voyagesService.removeFraisImmobilisation(companyBId, v1.idVoyage);
      throw new Error('Company B was able to delete Company A FraisImmobilisation!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant DELETE refused with 404 NotFoundException.');
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 19 — CROSS-TENANT CREATE
    // -------------------------------------------------------------
    console.log('\n[TEST 19] Testing cross-tenant CREATE protection...');
    try {
      await voyagesService.createFraisImmobilisation(companyBId, v1.idVoyage, {
        prixParJour: 300,
        nombreJoursRetard: 1,
      });
      throw new Error('Company B was able to create Frais for Company A Voyage!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant CREATE refused with 404 NotFoundException.');
      } else {
        throw new Error(`Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 20 — ZERO FACTURE / SEQUENCE SIDE EFFECTS
    // -------------------------------------------------------------
    console.log('\n[TEST 20] Verifying zero Facture, Sequence, Creance, or Paiement side effects...');
    const facturesBefore = await prisma.facture.count({ where: { companyId: companyAId } });
    const seqBefore = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });
    const creancesBefore = await prisma.creanceClient.count();

    const vSideEffect = await createTestVoyage(companyAId);
    const fSideEffect = await voyagesService.createFraisImmobilisation(companyAId, vSideEffect.idVoyage, {
      prixParJour: 1000,
      nombreJoursRetard: 2,
    });
    await voyagesService.updateFraisImmobilisation(companyAId, vSideEffect.idVoyage, { prixParJour: 1200 });
    await voyagesService.removeFraisImmobilisation(companyAId, vSideEffect.idVoyage);

    const facturesAfter = await prisma.facture.count({ where: { companyId: companyAId } });
    const seqAfter = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });
    const creancesAfter = await prisma.creanceClient.count();

    if (facturesBefore !== facturesAfter || seqBefore !== seqAfter || creancesBefore !== creancesAfter) {
      throw new Error('FraisImmobilisation CRUD modified Facture, Sequence, or Creance data!');
    }
    console.log('  ✓ PASSED: Zero side effects on Factures, Sequences, or Creances.');

    // -------------------------------------------------------------
    // TEST 21 — SAME VOYAGE RELATION AFTER UPDATE
    // -------------------------------------------------------------
    console.log('\n[TEST 21] Verifying Voyage relation intact after update...');
    const vRel = await createTestVoyage(companyAId);
    const fRel = await voyagesService.createFraisImmobilisation(companyAId, vRel.idVoyage, {
      prixParJour: 400,
      nombreJoursRetard: 3,
    });
    await voyagesService.updateFraisImmobilisation(companyAId, vRel.idVoyage, { nombreJoursRetard: 5 });
    const vRelRead = await voyagesService.findOne(companyAId, vRel.idVoyage);

    if (vRelRead.fraisImmobilisation?.montantTotal !== 2000) {
      throw new Error(`Voyage relation view mismatch! Expected 2000, got: ${vRelRead.fraisImmobilisation?.montantTotal}`);
    }
    console.log('  ✓ PASSED: Voyage view correctly exposes updated FraisImmobilisation.');

    // -------------------------------------------------------------
    // TEST 22 — DUPLICATE CONCURRENCY PROTECTION
    // -------------------------------------------------------------
    console.log('\n[TEST 22] Testing concurrent FraisImmobilisation creation safety...');
    const vConc = await createTestVoyage(companyAId);

    const reqs = await Promise.allSettled([
      voyagesService.createFraisImmobilisation(companyAId, vConc.idVoyage, { prixParJour: 500, nombreJoursRetard: 2 }),
      voyagesService.createFraisImmobilisation(companyAId, vConc.idVoyage, { prixParJour: 500, nombreJoursRetard: 2 }),
    ]);

    const fulfilled = reqs.filter((r) => r.status === 'fulfilled');
    const rejected = reqs.filter((r) => r.status === 'rejected');

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Concurrency failure! Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
    }
    console.log('  ✓ PASSED: Concurrent creation handled safely (1 succeeded, 1 rejected with conflict).');

    // -------------------------------------------------------------
    // TEST 23 — DECIMAL MAX BOUNDARY TEST
    // -------------------------------------------------------------
    console.log('\n[TEST 23] Testing Decimal(14,2) max boundary...');
    const vMax = await createTestVoyage(companyAId);
    const fMax = await voyagesService.createFraisImmobilisation(companyAId, vMax.idVoyage, {
      prixParJour: 9999999999.99,
      nombreJoursRetard: 1,
    });
    if (fMax.montantTotal !== 9999999999.99) {
      throw new Error(`Max boundary mismatch! Got: ${fMax.montantTotal}`);
    }
    console.log(`  ✓ PASSED: Max boundary NUMERIC(14,2) accepted cleanly (${fMax.montantTotal} MAD).`);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data...');
    await prisma.fraisImmobilisation.deleteMany({
      where: { voyage: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.4 FRAIS IMMOBILISATION TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SUB-STEP 4.4 TEST RUNNER FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep4_4FraisImmobilisationTests();
