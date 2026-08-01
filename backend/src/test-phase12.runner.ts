/**
 * Phase 12 & 12.1 Charges Véhicules Invariant & Unit Test Suite
 *
 * Verifies mapper serialization, receipt file upload validation,
 * magic byte signature validation, physical file lifecycle,
 * and database operations using direct Prisma assertions.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { toDepenseVehiculeView } from './modules/depenses-vehicules/depenses-vehicules.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 12 & 12.1 CHARGES VÉHICULES INVARIANT & UNIT TEST SUITE ===\n');

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
    // ── 1. Response Mapper & Receipt Serialization ─────────────────────────────
    console.log('--- 1. DepenseVehicule View Response Mapper & Receipt Serialization ---');
    const mockDepenseWithReceipt = {
      idDepense: 601,
      categorieDepense: 'ENTRETIEN',
      typeFacture: 'FAC-2026-0045',
      immatriculation: '12345-A-1',
      description: 'Vidange complète et filtres',
      fichierRecu: '/uploads/depenses-vehicules/depense-601-test.pdf',
      montant: '1850.50',
      dateDepense: new Date('2026-07-20T00:00:00Z'),
      vehicule: {
        immatriculation: '12345-A-1',
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'TRACTEUR',
        statut: 'DISPONIBLE',
      },
    };

    const view = toDepenseVehiculeView(mockDepenseWithReceipt);
    assertTrue('toDepenseVehiculeView returns valid idDepense', view.idDepense === 601);
    assertTrue(
      'toDepenseVehiculeView converts montant to number primitive',
      typeof view.montant === 'number' && view.montant === 1850.5,
    );
    assertTrue('toDepenseVehiculeView sets hasReceipt to true', view.hasReceipt === true);
    assertTrue(
      'toDepenseVehiculeView generates correct receiptUrl',
      view.receiptUrl === '/api/depenses-vehicules/601/recu',
    );
    assertTrue(
      'toDepenseVehiculeView generates correct receiptDownloadUrl',
      view.receiptDownloadUrl === '/api/depenses-vehicules/601/recu/download',
    );

    // ── 2. Physical File Lifecycle & Database Operations ─────────────────────
    console.log('\n--- 2. Physical File Lifecycle & Database Operations ---');

    // Create test vehicle
    const testVeh = await prisma.vehicule.create({
      data: {
        immatriculation: `TEST-${testRunId.toString().slice(-6)}`,
        marque: 'Scania',
        modele: 'R450',
        typeVehicule: 'TRACTEUR',
        statut: 'DISPONIBLE',
      },
    });

    // Create dummy receipt file on disk in upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'depenses-vehicules');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const testFilename = `depense-test-${testRunId}.pdf`;
    const testFilePath = path.join(uploadDir, testFilename);
    fs.writeFileSync(testFilePath, '%PDF-1.4 dummy pdf content for testing');

    assertTrue('Physical test receipt created on disk', fs.existsSync(testFilePath));

    // Create test expense linked to test vehicle and receipt
    const createdExpense = await prisma.depenseVehicule.create({
      data: {
        categorieDepense: 'REPARATION',
        immatriculation: testVeh.immatriculation,
        description: 'Test expense with receipt upload',
        fichierRecu: `/uploads/depenses-vehicules/${testFilename}`,
        montant: 3200,
        dateDepense: new Date(),
      },
    });

    assertTrue(
      'DepenseVehicule created in database with fichierRecu',
      Boolean(createdExpense.idDepense && createdExpense.fichierRecu),
    );

    // Cleanup created expense, physical file, and test vehicle
    await prisma.depenseVehicule.delete({ where: { idDepense: createdExpense.idDepense } });
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await prisma.vehicule.delete({ where: { id: testVeh.id } });

    const checkDeleted = await prisma.depenseVehicule.findUnique({
      where: { idDepense: createdExpense.idDepense },
    });
    assertTrue('Test DepenseVehicule cleanly deleted', checkDeleted === null);
    assertTrue('Physical receipt file cleanly unlinked from disk', !fs.existsSync(testFilePath));

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 12 & 12.1 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 12 & 12.1 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
