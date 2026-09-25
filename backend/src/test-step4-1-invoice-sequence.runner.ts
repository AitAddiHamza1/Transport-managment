import { PrismaClient, ModeFacturation, Prisma } from '@prisma/client';
import { formatInvoiceNumber } from './modules/factures/utils/invoice-number.formatter';

async function runStep4_1InvoiceSequenceTests() {
  console.log('=================================================================');
  console.log('=== SUB-STEP 4.1 — INVOICE SEQUENCE & F/SF NUMBERING TEST SUITE ===');
  console.log('=================================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // TEST 6: Formatter Unit Invariants
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Formatter Unit Invariants (F / SF)...');

    const avec1 = formatInvoiceNumber(2026, 1, ModeFacturation.AVEC_FACTURE);
    const avec100 = formatInvoiceNumber(2026, 100, ModeFacturation.AVEC_FACTURE);
    const sans1 = formatInvoiceNumber(2026, 1, ModeFacturation.SANS_FACTURE);
    const sans100 = formatInvoiceNumber(2026, 100, ModeFacturation.SANS_FACTURE);

    if (avec1 !== 'F001/2026') throw new Error(`Expected F001/2026, got ${avec1}`);
    if (avec100 !== 'F100/2026') throw new Error(`Expected F100/2026, got ${avec100}`);
    if (sans1 !== 'BL001/2026') throw new Error(`Expected BL001/2026, got ${sans1}`);
    if (sans100 !== 'BL100/2026') throw new Error(`Expected BL100/2026, got ${sans100}`);

    console.log('  ✓ PASSED: AVEC_FACTURE + 1   + 2026 -> F001/2026');
    console.log('  ✓ PASSED: AVEC_FACTURE + 100 + 2026 -> F100/2026');
    console.log('  ✓ PASSED: SANS_FACTURE + 1   + 2026 -> BL001/2026');
    console.log('  ✓ PASSED: SANS_FACTURE + 100 + 2026 -> BL100/2026');

    // Ensure test company exists
    const testCompany = await prisma.company.upsert({
      where: { id: 9999 },
      create: { id: 9999, nom: 'TEST_COMPANY_SEQ_41' },
      update: {},
    });
    const companyId = testCompany.id;
    const testYear = 2088; // Isolated test year

    // Cleanup sequence rows for testCompany & testYear
    await prisma.invoiceSequence.deleteMany({
      where: { companyId, annee: testYear },
    });

    // Helper function for atomic sequence allocation
    async function allocateNextInvoiceNumber(
      cId: number,
      year: number,
      mode: ModeFacturation,
    ): Promise<string> {
      return prisma.$transaction(async (tx) => {
        const seqResult: Array<{ dernier_numero: number }> = await tx.$queryRaw`
          INSERT INTO invoice_sequences (company_id, annee, mode_facturation, dernier_numero)
          VALUES (${cId}, ${year}, ${mode}::"mode_facturation", 1)
          ON CONFLICT (company_id, annee, mode_facturation) DO UPDATE
          SET dernier_numero = invoice_sequences.dernier_numero + 1
          RETURNING dernier_numero;
        `;
        const seqNum = seqResult[0].dernier_numero;
        return formatInvoiceNumber(year, seqNum, mode);
      });
    }

    // -------------------------------------------------------------
    // TEST 1: Existing AVEC counter preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Existing AVEC Counter Preservation...');

    // Seed sequence table with existing counter = 27
    await prisma.invoiceSequence.create({
      data: {
        companyId,
        annee: testYear,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        dernierNumero: 27,
      },
    });

    const nextAvec = await allocateNextInvoiceNumber(companyId, testYear, ModeFacturation.AVEC_FACTURE);
    if (nextAvec !== `F028/${testYear}`) {
      throw new Error(`Expected F028/${testYear}, got ${nextAvec}`);
    }

    const seqRow1 = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });
    if (!seqRow1 || seqRow1.dernierNumero !== 28) {
      throw new Error(`Expected sequence counter 28, got ${seqRow1?.dernierNumero}`);
    }
    console.log(`  ✓ PASSED: Seeded counter 27 -> Next number is ${nextAvec}, counter updated to 28`);

    // -------------------------------------------------------------
    // TEST 2: First SANS sequence initialization
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing First SANS Sequence Initialization...');

    const firstSans = await allocateNextInvoiceNumber(companyId, testYear, ModeFacturation.SANS_FACTURE);
    if (firstSans !== `BL001/${testYear}`) {
      throw new Error(`Expected BL001/${testYear}, got ${firstSans}`);
    }

    const seqRow2 = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.SANS_FACTURE,
        },
      },
    });
    if (!seqRow2 || seqRow2.dernierNumero !== 1) {
      throw new Error(`Expected SANS sequence counter 1, got ${seqRow2?.dernierNumero}`);
    }
    console.log(`  ✓ PASSED: Initial SANS allocation produced ${firstSans}, counter initialized to 1`);

    // -------------------------------------------------------------
    // TEST 3: Independent sequences (Interleaved AVEC & SANS calls)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Interleaved Independent Sequences (AVEC vs SANS)...');

    const nextAvec2 = await allocateNextInvoiceNumber(companyId, testYear, ModeFacturation.AVEC_FACTURE);
    const nextSans2 = await allocateNextInvoiceNumber(companyId, testYear, ModeFacturation.SANS_FACTURE);

    if (nextAvec2 !== `F029/${testYear}`) {
      throw new Error(`Expected F029/${testYear}, got ${nextAvec2}`);
    }
    if (nextSans2 !== `BL002/${testYear}`) {
      throw new Error(`Expected BL002/${testYear}, got ${nextSans2}`);
    }

    console.log(`  ✓ PASSED: Interleaved calls -> AVEC: ${nextAvec2}, SANS: ${nextSans2}. Counters remain completely independent.`);

    // -------------------------------------------------------------
    // TEST 4: Multi-company Isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Tenant / Multi-company Isolation...');

    const companyB = await prisma.company.upsert({
      where: { id: 9998 },
      create: { id: 9998, nom: 'TEST_COMPANY_SEQ_41_B' },
      update: {},
    });
    await prisma.invoiceSequence.deleteMany({
      where: { companyId: companyB.id, annee: testYear },
    });

    const companyBAvec = await allocateNextInvoiceNumber(companyB.id, testYear, ModeFacturation.AVEC_FACTURE);
    if (companyBAvec !== `F001/${testYear}`) {
      throw new Error(`Expected F001/${testYear} for Company B, got ${companyBAvec}`);
    }
    console.log(`  ✓ PASSED: Company B generated ${companyBAvec} independently from Company A (${nextAvec2})`);

    // -------------------------------------------------------------
    // TEST 5: Year Rollover Isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Year Rollover Isolation...');

    const nextYear = testYear + 1;
    await prisma.invoiceSequence.deleteMany({
      where: { companyId, annee: nextYear },
    });

    const avecNextYear = await allocateNextInvoiceNumber(companyId, nextYear, ModeFacturation.AVEC_FACTURE);
    if (avecNextYear !== `F001/${nextYear}`) {
      throw new Error(`Expected F001/${nextYear}, got ${avecNextYear}`);
    }
    console.log(`  ✓ PASSED: Year ${nextYear} generated ${avecNextYear} independently from Year ${testYear}`);

    // -------------------------------------------------------------
    // TEST 7: No sequence consumed by Voyage creation
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Verifying Voyage creation consumes ZERO sequence numbers...');

    const seqBeforeVoyage = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });

    const testVoyage = await prisma.voyage.create({
      data: {
        companyId,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
        modeFacturation: ModeFacturation.AVEC_FACTURE,
        montantVoyage: new Prisma.Decimal(1500),
      },
    });

    const seqAfterVoyage = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });

    if (seqBeforeVoyage?.dernierNumero !== seqAfterVoyage?.dernierNumero) {
      throw new Error('FAILED: Voyage creation modified InvoiceSequence!');
    }
    console.log(`  ✓ PASSED: Voyage #${testVoyage.idVoyage} created without consuming any invoice sequence.`);

    // -------------------------------------------------------------
    // TEST 8: Transaction Rollback Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Transaction Rollback Integrity...');

    const seqBeforeRollback = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });
    const expectedCounter = seqBeforeRollback?.dernierNumero || 29;

    let transactionFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Sequence allocation
        await tx.$queryRaw`
          INSERT INTO invoice_sequences (company_id, annee, mode_facturation, dernier_numero)
          VALUES (${companyId}, ${testYear}, 'AVEC_FACTURE'::"mode_facturation", 1)
          ON CONFLICT (company_id, annee, mode_facturation) DO UPDATE
          SET dernier_numero = invoice_sequences.dernier_numero + 1;
        `;
        // Step 2: Deliberately fail transaction
        throw new Error('FORCED_SIMULATED_FACTURE_CREATION_FAILURE');
      });
    } catch (err: any) {
      if (err.message.includes('FORCED_SIMULATED_FACTURE_CREATION_FAILURE')) {
        transactionFailed = true;
      } else {
        throw err;
      }
    }

    if (!transactionFailed) {
      throw new Error('FAILED: Transaction did not fail as expected');
    }

    const seqAfterRollback = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: testYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });

    if (seqAfterRollback?.dernierNumero !== expectedCounter) {
      throw new Error(`FAILED: Sequence counter changed after rollback! Expected ${expectedCounter}, got ${seqAfterRollback?.dernierNumero}`);
    }

    // Verify next successful allocation produces expected consecutive number
    const nextAfterRollback = await allocateNextInvoiceNumber(companyId, testYear, ModeFacturation.AVEC_FACTURE);
    const expectedNumber = `F0${expectedCounter + 1}/${testYear}`;
    if (nextAfterRollback !== expectedNumber) {
      throw new Error(`Expected next successful allocation ${expectedNumber}, got ${nextAfterRollback}`);
    }

    console.log(`  ✓ PASSED: Failed transaction rolled back sequence increment. Next successful invoice is ${nextAfterRollback} (no skipped number).`);

    // -------------------------------------------------------------
    // CONCURRENCY TEST
    // -------------------------------------------------------------
    console.log('\n[CONCURRENCY TEST] Running 10 Concurrent Requests for AVEC and 10 for SANS...');

    const concurrencyYear = testYear + 2;
    await prisma.invoiceSequence.deleteMany({
      where: { companyId, annee: concurrencyYear },
    });

    const avecPromises = Array.from({ length: 10 }).map(() =>
      allocateNextInvoiceNumber(companyId, concurrencyYear, ModeFacturation.AVEC_FACTURE),
    );
    const sansPromises = Array.from({ length: 10 }).map(() =>
      allocateNextInvoiceNumber(companyId, concurrencyYear, ModeFacturation.SANS_FACTURE),
    );

    const [avecResults, sansResults] = await Promise.all([
      Promise.all(avecPromises),
      Promise.all(sansPromises),
    ]);

    const avecSet = new Set(avecResults);
    const sansSet = new Set(sansResults);

    if (avecResults.length !== 10 || avecSet.size !== 10) {
      throw new Error(`FAILED: AVEC concurrency produced duplicate numbers: ${avecResults.join(', ')}`);
    }
    if (sansResults.length !== 10 || sansSet.size !== 10) {
      throw new Error(`FAILED: SANS concurrency produced duplicate numbers: ${sansResults.join(', ')}`);
    }

    const finalAvecRow = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: concurrencyYear,
          modeFacturation: ModeFacturation.AVEC_FACTURE,
        },
      },
    });
    const finalSansRow = await prisma.invoiceSequence.findUnique({
      where: {
        companyId_annee_modeFacturation: {
          companyId,
          annee: concurrencyYear,
          modeFacturation: ModeFacturation.SANS_FACTURE,
        },
      },
    });

    if (finalAvecRow?.dernierNumero !== 10) {
      throw new Error(`Expected AVEC sequence counter 10, got ${finalAvecRow?.dernierNumero}`);
    }
    if (finalSansRow?.dernierNumero !== 10) {
      throw new Error(`Expected SANS sequence counter 10, got ${finalSansRow?.dernierNumero}`);
    }

    console.log('  ✓ PASSED: 10 concurrent AVEC requests yielded 10 unique numbers:');
    console.log(`    ${avecResults.join(', ')}`);
    console.log('  ✓ PASSED: 10 concurrent SANS requests yielded 10 unique numbers:');
    console.log(`    ${sansResults.join(', ')}`);
    console.log('  ✓ PASSED: Final AVEC counter = 10, Final SANS counter = 10, Duplicate count = 0.');

    // Cleanup test data
    await prisma.voyage.delete({ where: { idVoyage: testVoyage.idVoyage } });
    await prisma.invoiceSequence.deleteMany({
      where: { companyId: { in: [companyId, companyB.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyId, companyB.id] } },
    });

    console.log('\n=================================================================');
    console.log('=== ALL SUB-STEP 4.1 INVOICE SEQUENCE TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('\n❌ SUB-STEP 4.1 TEST RUNNER FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep4_1InvoiceSequenceTests();
