import { PrismaService } from './prisma/prisma.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { VoyageResourceSyncService } from './modules/voyages/voyage-resource-sync.service';
import { NotFoundException } from '@nestjs/common';

async function runVoyageIdClientTests() {
  console.log('======================================================================');
  console.log('=== VOYAGE MODULE idClient CONTRACT REGRESSION VERIFICATION SUITE ===');
  console.log('======================================================================\n');

  const prisma = new PrismaService();
  const syncService = new VoyageResourceSyncService();
  const voyagesService = new VoyagesService(prisma, syncService);

  try {
    // Step 1: Ensure a test Client exists
    console.log('[STEP 1] Setting up test Client in database...');
    let client = await prisma.client.findFirst({ where: { statut: 'ACTIF' } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          nomEntreprise: 'Test Transport Partner S.A.R.L.',
          ice: '123456789012345',
          statut: 'ACTIF',
        },
      });
    }
    console.log(`  ✓ Test Client ID: ${client.id}, Company: "${client.nomEntreprise}"`);

    // Step 2: Create Voyage with valid idClient
    console.log('\n[STEP 2] Creating Voyage with valid idClient...');
    const createdVoyage = await voyagesService.create({
      idClient: client.id,
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      montantVoyage: 15000,
    });

    console.log(`  ✓ Voyage Created ID: #${createdVoyage.idVoyage}`);
    if (createdVoyage.idClient !== client.id) {
      throw new Error(`Expected voyage.idClient=${client.id}, got ${createdVoyage.idClient}`);
    }
    if (createdVoyage.nomClient !== client.nomEntreprise) {
      throw new Error(
        `Expected voyage.nomClient="${client.nomEntreprise}", got "${createdVoyage.nomClient}"`,
      );
    }
    console.log(
      `  ✓ PASSED: voyage.idClient (${createdVoyage.idClient}) and voyage.nomClient ("${createdVoyage.nomClient}") match Client snapshot!`,
    );

    // Step 3: Attempt creation with unknown idClient (should throw NotFoundException 404)
    console.log('\n[STEP 3] Testing creation with unknown idClient (expect 404)...');
    try {
      await voyagesService.create({
        idClient: 999999,
        lieuChargement: 'Fès',
        lieuDechargement: 'Agadir',
        montantVoyage: 8000,
      });
      throw new Error('Expected 404 NotFoundException for unknown idClient');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`  ✓ PASSED: Unknown idClient rejected with 404 (${err.message})`);
      } else {
        throw err;
      }
    }

    // Step 4: Create a second Client and test PATCH update idClient snapshot refresh
    console.log('\n[STEP 4] Testing PATCH update idClient snapshot refresh...');
    const client2 = await prisma.client.create({
      data: {
        nomEntreprise: 'Second Logistics Partner Inc',
        ice: '987654321054321',
        statut: 'ACTIF',
      },
    });

    const updatedVoyage = await voyagesService.update(createdVoyage.idVoyage, {
      idClient: client2.id,
    });

    if (updatedVoyage.idClient !== client2.id) {
      throw new Error(`Expected updated idClient=${client2.id}, got ${updatedVoyage.idClient}`);
    }
    if (updatedVoyage.nomClient !== client2.nomEntreprise) {
      throw new Error(
        `Expected refreshed nomClient="${client2.nomEntreprise}", got "${updatedVoyage.nomClient}"`,
      );
    }
    console.log(
      `  ✓ PASSED: PATCH idClient updated to ${updatedVoyage.idClient} and nomClient refreshed to "${updatedVoyage.nomClient}"`,
    );

    // Cleanup test data
    console.log('\n[CLEANUP] Removing test artifacts...');
    await prisma.voyage.delete({ where: { idVoyage: createdVoyage.idVoyage } });
    await prisma.client.delete({ where: { id: client2.id } });
    console.log('  ✓ Cleanup complete');

    console.log('\n======================================================================');
    console.log('=== ALL VOYAGE idClient CONTRACT REGRESSION TESTS PASSED CLEANLY ===');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVoyageIdClientTests();
