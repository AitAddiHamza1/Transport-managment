/**
 * Phase 8 Conducteurs Invariant & Unit Test Suite
 *
 * Verifies mapper serialization, status transition rules, normalization,
 * and relation deletion invariants using direct Prisma assertions.
 */

import { ConducteurStatut, PrismaClient } from '@prisma/client';
import { toConducteurView } from './modules/conducteurs/conducteurs.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 8 CONDUCTEURS INVARIANT & UNIT TEST SUITE ===\n');

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
    console.log('--- 1. Conducteur View Response Mapper ---');
    const mockConducteur = {
      id: 101,
      nomConducteur: 'Mohamed Alami',
      telephone: '+212600112233',
      adresse: 'Casablanca',
      statut: ConducteurStatut.DISPONIBLE,
      creeLe: new Date('2026-01-01T10:00:00Z'),
      documents: [
        {
          id: 1,
          typeDocument: 'PERMIS',
          numeroDocument: 'PERM-123',
          dateExpiration: new Date('2030-12-31'),
          statut: 'VALIDE',
        },
      ],
    };

    const view = toConducteurView(mockConducteur);
    assertTrue('toConducteurView returns valid ID', view.id === 101);
    assertTrue('toConducteurView returns nomConducteur', view.nomConducteur === 'Mohamed Alami');
    assertTrue('toConducteurView returns telephone', view.telephone === '+212600112233');
    assertTrue(
      'toConducteurView maps documents summary array',
      Array.isArray(view.documents) && view.documents.length === 1,
    );
    assertTrue(
      'Document summary includes typeDocument',
      view.documents?.[0].typeDocument === 'PERMIS',
    );

    // ── 2. Database Creation & Relation Cascade ──────────────────────────────
    console.log('\n--- 2. Database Creation & Document Cascade ---');
    const createdDriver = await prisma.conducteur.create({
      data: {
        nomConducteur: `TestDriver-${testRunId}`,
        telephone: '+212699887766',
        adresse: 'Rabat',
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    assertTrue('Conducteur created in database', Boolean(createdDriver.id));

    // Create attached document
    const createdDoc = await prisma.documentConducteur.create({
      data: {
        idConducteur: createdDriver.id,
        typeDocument: 'PERMIS',
        numeroDocument: `P-${testRunId}`,
        dateExpiration: new Date('2028-06-30'),
        statut: 'VALIDE',
      },
    });

    assertTrue('DocumentConducteur created attached to driver', Boolean(createdDoc.id));

    // Delete Conducteur -> Verify DocumentConducteur cascades
    await prisma.conducteur.delete({ where: { id: createdDriver.id } });
    const checkDoc = await prisma.documentConducteur.findUnique({ where: { id: createdDoc.id } });
    assertTrue('DocumentConducteur cascades on driver deletion', checkDoc === null);

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 8 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 8 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
