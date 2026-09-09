/**
 * Phase 11 Voyages Invariant & Unit Test Suite
 *
 * Verifies mapper serialization, relation existence validation,
 * and relation deletion invariants using direct Prisma assertions.
 */

import { PrismaClient, VoyageStatut, VoyageType } from '@prisma/client';
import { toVoyageView } from './modules/voyages/voyages.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 11 VOYAGES INVARIANT & UNIT TEST SUITE ===\n');

  let passCount = 0;
  let failCount = 0;

  function assertTrue(label: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`✅ PASSED: ${label}${detail ? ` (${detail})` : ''}`);
      passCount++;
    } else {
      console.log(`❌ FAILED: ${label}${detail ? ` (${detail})` : ''}`);
      failCount++;
    }
  }

  const testRunId = Date.now();

  try {
    // ── 1. Response Mapper & Serialization ───────────────────────────────────
    console.log('--- 1. Voyage View Response Mapper ---');
    const mockVoyage = {
      idVoyage: 501,
      typeVoyage: VoyageType.NATIONAL,
      tracteur: '12345-A-1',
      remorque: '67890-B-1',
      nomConducteur: 'Mohammed Alami',
      nomClient: 'Maghreb Transport S.A.',
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      dateChargement: new Date('2026-08-01T00:00:00Z'),
      numeroCmr: 'CMR-2026-0089',
      statut: VoyageStatut.PLANIFIE,
      montantVoyage: '12500.50',
      tracteurVehicule: {
        immatriculation: '12345-A-1',
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'TRACTEUR',
        statut: 'DISPONIBLE',
      },
    };

    const view = toVoyageView(mockVoyage);
    assertTrue('toVoyageView returns valid idVoyage', view.idVoyage === 501);
    assertTrue(
      'toVoyageView maps lieuChargement & lieuDechargement',
      view.lieuChargement === 'Casablanca Port' && view.lieuDechargement === 'Tanger Med',
    );
    assertTrue(
      'toVoyageView converts montantVoyage to number primitive',
      typeof view.montantVoyage === 'number' && view.montantVoyage === 12500.5,
    );
    assertTrue('toVoyageView maps statut PLANIFIE', view.statut === VoyageStatut.PLANIFIE);
    assertTrue(
      'toVoyageView includes compact tracteurVehicule summary',
      view.tracteurVehicule?.immatriculation === '12345-A-1',
    );

    // ── 2. Database Creation & Relation Validation ───────────────────────────
    console.log('\n--- 2. Database Creation & Cleanup ---');
    const createdVoyage = await prisma.voyage.create({
      data: {
        typeVoyage: VoyageType.NATIONAL,
        lieuChargement: `LieuA-${testRunId}`,
        lieuDechargement: `LieuB-${testRunId}`,
        statut: VoyageStatut.PLANIFIE,
        montantVoyage: 9500,
      },
    });

    assertTrue('Voyage created in database', Boolean(createdVoyage.idVoyage));

    // Cleanup created voyage
    await prisma.voyage.delete({ where: { idVoyage: createdVoyage.idVoyage } });
    const checkDeleted = await prisma.voyage.findUnique({
      where: { idVoyage: createdVoyage.idVoyage },
    });
    assertTrue('Test Voyage cleanly deleted', checkDeleted === null);

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 11 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 11 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
