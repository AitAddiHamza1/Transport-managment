import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ModeFacturation } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateVoyageDto } from './modules/voyages/dto/create-voyage.dto';
import { UpdateVoyageDto } from './modules/voyages/dto/update-voyage.dto';

async function runStep4_2VoyageModeTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.2 — VOYAGE MODE FACTURATION TEST SUITE ===');
  console.log('=================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const voyagesService = app.get(VoyagesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;
  let clientAId: number | null = null;
  let clientBId: number | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant environment for Companies A and B
    // -------------------------------------------------------------
    console.log('[SETUP] Setting up test companies and clients...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_MODE_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_COMPANY_MODE_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_COMPANY_MODE_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_COMPANY_MODE_B' } });
    companyBId = compB.id;

    let clientA = await prisma.client.findFirst({ where: { companyId: companyAId, nomEntreprise: 'CLIENT_MODE_A' } });
    if (!clientA) {
      clientA = await prisma.client.create({
        data: { companyId: companyAId, nomEntreprise: 'CLIENT_MODE_A', telephone: '0600000001' },
      });
    }
    clientAId = clientA.id;

    let clientB = await prisma.client.findFirst({ where: { companyId: companyBId, nomEntreprise: 'CLIENT_MODE_B' } });
    if (!clientB) {
      clientB = await prisma.client.create({
        data: { companyId: companyBId, nomEntreprise: 'CLIENT_MODE_B', telephone: '0600000002' },
      });
    }
    clientBId = clientB.id;

    console.log(`  ✓ Setup completed (Company A: ${companyAId}, Company B: ${companyBId})\n`);

    // -------------------------------------------------------------
    // TEST 1 — CREATE DEFAULT (Missing modeFacturation -> AVEC_FACTURE)
    // -------------------------------------------------------------
    console.log('[TEST 1] Create Voyage without modeFacturation (Default behavior)...');
    const vDefault = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      montantVoyage: 2500,
    });

    if (vDefault.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Expected default modeFacturation to be AVEC_FACTURE, got: ${vDefault.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${vDefault.idVoyage} created with default modeFacturation = ${vDefault.modeFacturation}`);

    // -------------------------------------------------------------
    // TEST 2 — CREATE AVEC_FACTURE EXPLICIT
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Create Voyage with explicit modeFacturation = AVEC_FACTURE...');
    const vAvec = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      montantVoyage: 3000,
    });

    if (vAvec.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Expected modeFacturation AVEC_FACTURE, got: ${vAvec.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${vAvec.idVoyage} created with explicit modeFacturation = ${vAvec.modeFacturation}`);

    // -------------------------------------------------------------
    // TEST 3 — CREATE SANS_FACTURE EXPLICIT
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Create Voyage with explicit modeFacturation = SANS_FACTURE...');
    const vSans = await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Tangier',
      lieuDechargement: 'Agadir',
      modeFacturation: ModeFacturation.SANS_FACTURE,
      montantVoyage: 4000,
    });

    if (vSans.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected modeFacturation SANS_FACTURE, got: ${vSans.modeFacturation}`);
    }

    const dbSans = await prisma.voyage.findUnique({ where: { idVoyage: vSans.idVoyage } });
    if (dbSans?.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`DB record modeFacturation mismatch! Expected SANS_FACTURE, got: ${dbSans?.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${vSans.idVoyage} created and persisted with modeFacturation = ${vSans.modeFacturation}`);

    // -------------------------------------------------------------
    // TEST 4 — INVALID CREATE DTO VALIDATION
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing CreateVoyageDto validation with invalid modeFacturation...');
    const invalidCreateDto = plainToInstance(CreateVoyageDto, {
      idClient: clientAId,
      lieuChargement: 'Fes',
      lieuDechargement: 'Meknes',
      modeFacturation: 'INVALID_MODE',
    });

    const createErrors = await validate(invalidCreateDto);
    if (createErrors.length === 0 || !createErrors.some((e) => e.property === 'modeFacturation')) {
      throw new Error('FAILED: CreateVoyageDto accepted invalid modeFacturation="INVALID_MODE"!');
    }
    console.log('  ✓ PASSED: CreateVoyageDto correctly rejected invalid modeFacturation value.');

    // -------------------------------------------------------------
    // TEST 5 — UPDATE TO SANS_FACTURE
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Update Voyage modeFacturation from AVEC_FACTURE to SANS_FACTURE...');
    const updatedToSans = await voyagesService.update(companyAId, vAvec.idVoyage, {
      modeFacturation: ModeFacturation.SANS_FACTURE,
    });

    if (updatedToSans.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected modeFacturation to become SANS_FACTURE, got: ${updatedToSans.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${vAvec.idVoyage} updated successfully to SANS_FACTURE.`);

    // -------------------------------------------------------------
    // TEST 6 — UPDATE TO AVEC_FACTURE
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Update Voyage modeFacturation from SANS_FACTURE to AVEC_FACTURE...');
    const updatedToAvec = await voyagesService.update(companyAId, updatedToSans.idVoyage, {
      modeFacturation: ModeFacturation.AVEC_FACTURE,
    });

    if (updatedToAvec.modeFacturation !== ModeFacturation.AVEC_FACTURE) {
      throw new Error(`Expected modeFacturation to become AVEC_FACTURE, got: ${updatedToAvec.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Voyage #${vAvec.idVoyage} updated successfully back to AVEC_FACTURE.`);

    // -------------------------------------------------------------
    // TEST 7 — UPDATE WITHOUT MODE (Preserve existing mode)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Update Voyage unrelated field without modeFacturation...');
    const updatedUnrelated = await voyagesService.update(companyAId, vSans.idVoyage, {
      lieuChargement: 'Marrakech',
    });

    if (updatedUnrelated.modeFacturation !== ModeFacturation.SANS_FACTURE) {
      throw new Error(`Expected modeFacturation to remain SANS_FACTURE, got: ${updatedUnrelated.modeFacturation}`);
    }
    console.log(`  ✓ PASSED: Updating unrelated field preserved existing modeFacturation = ${updatedUnrelated.modeFacturation}.`);

    // -------------------------------------------------------------
    // TEST 8 — INVALID UPDATE DTO VALIDATION
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing UpdateVoyageDto validation with invalid modeFacturation...');
    const invalidUpdateDto = plainToInstance(UpdateVoyageDto, {
      modeFacturation: 'FACTURE',
    });

    const updateErrors = await validate(invalidUpdateDto);
    if (updateErrors.length === 0 || !updateErrors.some((e) => e.property === 'modeFacturation')) {
      throw new Error('FAILED: UpdateVoyageDto accepted invalid modeFacturation="FACTURE"!');
    }
    console.log('  ✓ PASSED: UpdateVoyageDto correctly rejected invalid modeFacturation value.');

    // -------------------------------------------------------------
    // TEST 9 — NO INVOICE SEQUENCE SIDE EFFECT
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Verifying Voyage operations consume ZERO InvoiceSequences...');
    const seqCountBefore = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });

    await voyagesService.create(companyAId, {
      idClient: clientAId,
      lieuChargement: 'Oujda',
      lieuDechargement: 'Nador',
      modeFacturation: ModeFacturation.SANS_FACTURE,
    });

    const seqCountAfter = await prisma.invoiceSequence.count({ where: { companyId: companyAId } });
    if (seqCountBefore !== seqCountAfter) {
      throw new Error('FAILED: Voyage creation modified InvoiceSequence table!');
    }
    console.log('  ✓ PASSED: Voyage creation resulted in zero InvoiceSequence allocation or side effects.');

    // -------------------------------------------------------------
    // TEST 10 — NO FACTURE SIDE EFFECT
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Verifying Voyage operations create ZERO Factures...');
    const factureCountBefore = await prisma.facture.count({ where: { companyId: companyAId } });

    await voyagesService.update(companyAId, vSans.idVoyage, {
      modeFacturation: ModeFacturation.AVEC_FACTURE,
    });

    const factureCountAfter = await prisma.facture.count({ where: { companyId: companyAId } });
    if (factureCountBefore !== factureCountAfter) {
      throw new Error('FAILED: Voyage update created a Facture!');
    }
    console.log('  ✓ PASSED: Voyage operations created zero Factures or invoice side effects.');

    // -------------------------------------------------------------
    // TEST 11 — TENANT ISOLATION (CROSS-TENANT UPDATE)
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Testing cross-tenant Voyage update protection...');
    try {
      await voyagesService.update(companyBId, vDefault.idVoyage, {
        lieuChargement: 'Unauthorized Update',
      });
      throw new Error('FAILED: User from Company B updated Company A Voyage!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant update refused with 404 NotFoundException (${err.message})`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TEST 12 — TENANT ISOLATION (CROSS-TENANT READ)
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Testing cross-tenant Voyage read protection...');
    try {
      await voyagesService.findOne(companyBId, vDefault.idVoyage);
      throw new Error('FAILED: User from Company B read Company A Voyage details!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Cross-tenant read refused with 404 NotFoundException.`);
      } else {
        throw new Error(`[FAIL] Expected NotFoundException, got: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data...');
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.2 VOYAGE MODE TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err: any) {
    console.error('\n❌ SUB-STEP 4.2 TEST RUNNER FAILED:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runStep4_2VoyageModeTests();
