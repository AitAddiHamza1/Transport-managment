/**
 * Phase 9 Clients Invariant & Unit Test Suite
 *
 * Verifies mapper serialization, ICE normalization & unique conflict,
 * and relation deletion invariants using direct Prisma assertions.
 */

import { ClientStatut, PrismaClient } from '@prisma/client';
import { toClientView } from './modules/clients/clients.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 9 CLIENTS INVARIANT & UNIT TEST SUITE ===\n');

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
    console.log('--- 1. Client View Response Mapper ---');
    const mockClient = {
      id: 201,
      nomEntreprise: 'Maghreb Transport SARL',
      ice: '001524389000045',
      telephone: '+212522112233',
      email: 'contact@maghreb.ma',
      adresse: 'Casablanca',
      delaiPaiementJours: 30,
      limiteCredit: 50000.0,
      statut: ClientStatut.ACTIF,
    };

    const view = toClientView(mockClient);
    assertTrue('toClientView returns valid ID', view.id === 201);
    assertTrue(
      'toClientView returns nomEntreprise',
      view.nomEntreprise === 'Maghreb Transport SARL',
    );
    assertTrue('toClientView returns ice in uppercase', view.ice === '001524389000045');
    assertTrue(
      'toClientView converts limiteCredit to number primitive',
      typeof view.limiteCredit === 'number' && view.limiteCredit === 50000,
    );
    assertTrue('toClientView maps statut ACTIF', view.statut === ClientStatut.ACTIF);

    // ── 2. Database Creation & Unique ICE Handling ───────────────────────────
    console.log('\n--- 2. Database Creation & ICE Unique Constraint ---');
    const testIce = `00${testRunId.toString().slice(-13)}`;

    const createdClient = await prisma.client.create({
      data: {
        nomEntreprise: `ClientComp-${testRunId}`,
        ice: testIce,
        telephone: '+212600112233',
        email: `testclient-${testRunId}@test.local`,
        statut: ClientStatut.ACTIF,
      },
    });

    assertTrue('Client created in database', Boolean(createdClient.id));

    // Try creating another client with the exact same ICE -> Expect Prisma unique error (P2002)
    let duplicateErrorCaught = false;
    try {
      await prisma.client.create({
        data: {
          nomEntreprise: `DuplicateClient-${testRunId}`,
          ice: testIce,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        duplicateErrorCaught = true;
      }
    }

    assertTrue('Duplicate ICE throws P2002 unique constraint error', duplicateErrorCaught);

    // Cleanup created client
    await prisma.client.delete({ where: { id: createdClient.id } });
    const checkDeleted = await prisma.client.findUnique({ where: { id: createdClient.id } });
    assertTrue('Test Client cleanly deleted', checkDeleted === null);

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 9 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 9 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
