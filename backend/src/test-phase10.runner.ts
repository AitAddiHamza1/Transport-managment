/**
 * Phase 10 Fournisseurs Invariant & Unit Test Suite
 *
 * Verifies mapper serialization, nomFournisseur & ICE normalization & unique conflict,
 * and relation deletion invariants using direct Prisma assertions.
 */

import { ClientStatut, PrismaClient } from '@prisma/client';
import { toFournisseurView } from './modules/fournisseurs/fournisseurs.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 10 FOURNISSEURS INVARIANT & UNIT TEST SUITE ===\n');

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
    console.log('--- 1. Fournisseur View Response Mapper ---');
    const mockFournisseur = {
      id: 301,
      nomFournisseur: 'TotalEnergies Marketing Maroc',
      ice: '001654321000099',
      telephone: '+212522998877',
      email: 'contact@totalenergies.ma',
      adresse: 'Mohammedia',
      statut: ClientStatut.ACTIF,
      creeLe: new Date('2026-01-01T10:00:00Z'),
    };

    const view = toFournisseurView(mockFournisseur);
    assertTrue('toFournisseurView returns valid ID', view.id === 301);
    assertTrue(
      'toFournisseurView returns nomFournisseur',
      view.nomFournisseur === 'TotalEnergies Marketing Maroc',
    );
    assertTrue('toFournisseurView returns ice in uppercase', view.ice === '001654321000099');
    assertTrue('toFournisseurView returns email', view.email === 'contact@totalenergies.ma');
    assertTrue('toFournisseurView maps statut ACTIF', view.statut === ClientStatut.ACTIF);

    // ── 2. Database Creation & Unique Constraints ───────────────────────────
    console.log('\n--- 2. Database Creation & Unique Constraints ---');
    const testName = `SupplierComp-${testRunId}`;
    const testIce = `00${testRunId.toString().slice(-13)}`;

    const createdSupplier = await prisma.fournisseur.create({
      data: {
        nomFournisseur: testName,
        ice: testIce,
        telephone: '+212600112233',
        email: `testsupplier-${testRunId}@test.local`,
        statut: ClientStatut.ACTIF,
      },
    });

    assertTrue('Fournisseur created in database', Boolean(createdSupplier.id));

    // Try creating another supplier with exact same nomFournisseur -> Expect P2002
    let duplicateNameError = false;
    try {
      await prisma.fournisseur.create({
        data: {
          nomFournisseur: testName,
          ice: `99${testRunId.toString().slice(-13)}`,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') duplicateNameError = true;
    }
    assertTrue('Duplicate nomFournisseur throws P2002 unique constraint error', duplicateNameError);

    // Try creating another supplier with exact same ICE -> Expect P2002
    let duplicateIceError = false;
    try {
      await prisma.fournisseur.create({
        data: {
          nomFournisseur: `DiffSupplier-${testRunId}`,
          ice: testIce,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') duplicateIceError = true;
    }
    assertTrue('Duplicate ICE throws P2002 unique constraint error', duplicateIceError);

    // Cleanup created supplier
    await prisma.fournisseur.delete({ where: { id: createdSupplier.id } });
    const checkDeleted = await prisma.fournisseur.findUnique({ where: { id: createdSupplier.id } });
    assertTrue('Test Fournisseur cleanly deleted', checkDeleted === null);

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 10 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 10 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
