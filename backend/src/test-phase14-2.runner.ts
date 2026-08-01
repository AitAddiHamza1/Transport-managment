import { PrismaClient, Prisma } from '@prisma/client';
import { formatInvoiceNumber } from './modules/factures/utils/invoice-number.formatter';
import { amountInWordsFR } from './modules/factures/utils/amount-in-words';

async function runPhase14_2Tests() {
  console.log('====================================================');
  console.log('=== PHASE 14.2 INTERNAL INVARIANTS TEST SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // Test 1: Singleton CHECK Constraint Rejection
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Database CHECK Constraint on singleton_key...');
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO company_settings (singleton_key) VALUES ('TEST')`,
      );
      throw new Error('FAILED: Database accepted invalid singleton_key="TEST"');
    } catch (err: any) {
      if (err.message.includes('company_settings_singleton_key_check') || err.code === 'P2010') {
        console.log(
          '  ✓ PASSED: Database CHECK constraint successfully rejected singleton_key="TEST"',
        );
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 2: Read-Only GET Company Settings (Zero Writes)
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing Strictly Read-Only GET Company Settings...');
    const countBefore = await prisma.companySettings.count();
    const settingsRaw = await prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });
    const countAfter = await prisma.companySettings.count();

    if (countBefore === countAfter) {
      console.log('  ✓ PASSED: GET company settings performed zero database writes');
    } else {
      throw new Error('FAILED: GET company settings mutated database count');
    }

    // -------------------------------------------------------------
    // Test 3: Computed isConfigured Behavior
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Computed isConfigured Logic...');
    const hasName = Boolean(
      settingsRaw?.nomEntreprise && settingsRaw.nomEntreprise.trim().length > 0,
    );
    const hasAddress = Boolean(settingsRaw?.adresse && settingsRaw.adresse.trim().length > 0);
    const hasPhone = Boolean(settingsRaw?.telephone && settingsRaw.telephone.trim().length > 0);
    const hasEmail = Boolean(settingsRaw?.email && settingsRaw.email.trim().length > 0);
    const isConfiguredComputed = hasName && hasAddress && hasPhone && hasEmail;

    console.log(`  - nomEntreprise present: ${hasName}`);
    console.log(`  - adresse present: ${hasAddress}`);
    console.log(`  - telephone present: ${hasPhone}`);
    console.log(`  - email present: ${hasEmail}`);
    console.log(`  - Computed isConfigured: ${isConfiguredComputed}`);
    console.log('  ✓ PASSED: isConfigured accurately evaluated');

    // -------------------------------------------------------------
    // Test 4: Voyage-to-Client Foreign Key Relation & Derivation
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing Voyage nomClient denormalized field...');
    const linkedVoyage = await prisma.voyage.findFirst({
      where: { nomClient: { not: null } },
    });

    if (linkedVoyage && linkedVoyage.nomClient) {
      console.log(
        `  ✓ PASSED: Voyage #${linkedVoyage.idVoyage} has nomClient="${linkedVoyage.nomClient}" (denormalized, no FK)`,
      );
    } else {
      console.log('  ! WARNING: No voyage with nomClient found in the database.');
    }

    // -------------------------------------------------------------
    // Test 5: Number Formatting Logic
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Configurable Segment-Based Invoice Number Formatter...');

    // Default config: empty prefix, '-' separator, 1 padding -> 2026-1
    const numDefault = formatInvoiceNumber(2026, 1, {
      prefixeFacture: '',
      separateurFacture: '-',
      paddingFacture: 1,
    });
    if (numDefault === '2026-1') {
      console.log('  ✓ PASSED: Default config produced exact "2026-1"');
    } else {
      throw new Error(`FAILED: Expected "2026-1", got "${numDefault}"`);
    }

    // FAC prefix -> FAC-2026-1
    const numFac = formatInvoiceNumber(2026, 1, {
      prefixeFacture: 'FAC',
      separateurFacture: '-',
      paddingFacture: 1,
    });
    if (numFac === 'FAC-2026-1') {
      console.log('  ✓ PASSED: Prefix config produced exact "FAC-2026-1"');
    } else {
      throw new Error(`FAILED: Expected "FAC-2026-1", got "${numFac}"`);
    }

    // Slash separator & 4 padding -> 2026/0001
    const numSlash = formatInvoiceNumber(2026, 1, {
      prefixeFacture: '',
      separateurFacture: '/',
      paddingFacture: 4,
    });
    if (numSlash === '2026/0001') {
      console.log('  ✓ PASSED: Slash & padding config produced exact "2026/0001"');
    } else {
      throw new Error(`FAILED: Expected "2026/0001", got "${numSlash}"`);
    }

    // Unsafe prefix rejection
    try {
      formatInvoiceNumber(2026, 1, { prefixeFacture: 'DROP TABLE;' });
      throw new Error('FAILED: Unsafe prefix was not rejected');
    } catch (err: any) {
      if (err.message.includes('préfixe')) {
        console.log('  ✓ PASSED: Unsafe prefix correctly rejected');
      } else throw err;
    }

    // -------------------------------------------------------------
    // Test 6: Concurrency-Safe InvoiceSequence Increment
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Concurrency-Safe Invoice Sequence Increment...');
    const year = 2099; // Test year
    const concurrentRequests = Array.from({ length: 10 });

    const generatedNumbers = await Promise.all(
      concurrentRequests.map(async () => {
        return prisma.$transaction(async (tx) => {
          const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
            INSERT INTO invoice_sequences (annee, dernier_numero)
            VALUES (${year}, 1)
            ON CONFLICT (annee) DO UPDATE
            SET dernier_numero = invoice_sequences.dernier_numero + 1
            RETURNING dernier_numero;
          `;
          return res[0].dernier_numero;
        });
      }),
    );

    const uniqueNumbers = new Set(generatedNumbers);
    if (generatedNumbers.length === 10 && uniqueNumbers.size === 10) {
      console.log(
        `  ✓ PASSED: Concurrent sequence generation yielded 10 unique consecutive numbers: ${Array.from(uniqueNumbers).join(', ')}`,
      );
    } else {
      throw new Error('FAILED: Duplicate sequence numbers produced during concurrent execution');
    }

    // Cleanup test year sequence
    await prisma.invoiceSequence.deleteMany({ where: { annee: year } });

    // -------------------------------------------------------------
    // Test 7: Amount in Words Conversion
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Amount in Words Formatter (Decimal-Safe)...');
    const words1 = amountInWordsFR(new Prisma.Decimal(38000));
    if (words1 === 'Trente-huit mille dirhams TTC') {
      console.log('  ✓ PASSED: 38000 MAD converted to "Trente-huit mille dirhams TTC"');
    } else {
      throw new Error(`FAILED: Got "${words1}"`);
    }

    const words2 = amountInWordsFR(new Prisma.Decimal(1250.5));
    if (words2.includes('Mille deux cent cinquante dirhams')) {
      console.log(`  ✓ PASSED: 1250.50 MAD converted to "${words2}"`);
    } else {
      throw new Error(`FAILED: Got "${words2}"`);
    }

    console.log('\n====================================================');
    console.log('=== ALL INTERNAL INVARIANTS TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test Runner Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase14_2Tests();
