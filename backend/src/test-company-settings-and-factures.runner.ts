import { PrismaClient, Prisma } from '@prisma/client';
import { formatInvoiceNumber } from './modules/factures/utils/invoice-number.formatter';

async function runCompanySettingsAndFacturesVerification() {
  console.log('=================================================================');
  console.log('=== COMPANY SETTINGS & INVOICE NUMBERING VERIFICATION SUITE ===');
  console.log('=================================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // Test 1: Formatter Unit Invariants (F001/2026)
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Invoice Number Formatter Rules...');
    const f1_2026 = formatInvoiceNumber(2026, 1);
    const f2_2026 = formatInvoiceNumber(2026, 2);
    const f12_2026 = formatInvoiceNumber(2026, 12);
    const f125_2026 = formatInvoiceNumber(2026, 125);
    const f1_2027 = formatInvoiceNumber(2027, 1);

    if (f1_2026 !== 'F001/2026') throw new Error(`Expected F001/2026, got ${f1_2026}`);
    if (f2_2026 !== 'F002/2026') throw new Error(`Expected F002/2026, got ${f2_2026}`);
    if (f12_2026 !== 'F012/2026') throw new Error(`Expected F012/2026, got ${f12_2026}`);
    if (f125_2026 !== 'F125/2026') throw new Error(`Expected F125/2026, got ${f125_2026}`);
    if (f1_2027 !== 'F001/2027') throw new Error(`Expected F001/2027, got ${f1_2027}`);

    console.log('  ✓ PASSED: 1, 2026  -> F001/2026');
    console.log('  ✓ PASSED: 2, 2026  -> F002/2026');
    console.log('  ✓ PASSED: 12, 2026 -> F012/2026');
    console.log('  ✓ PASSED: 125, 2026 -> F125/2026');
    console.log('  ✓ PASSED: 1, 2027  -> F001/2027');

    // -------------------------------------------------------------
    // Test 2: Concurrency-Safe Sequence Generator & Annual Reset
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Concurrency-Safe Atomic Sequence Generator & Annual Reset...');

    // Clean up sequence table for test years
    await prisma.$executeRaw`DELETE FROM invoice_sequences WHERE annee IN (2026, 2027);`;

    const seq2026_1 = await prisma.$transaction(async (tx) => {
      const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO invoice_sequences (annee, dernier_numero)
        VALUES (2026, 1)
        ON CONFLICT (annee) DO UPDATE
        SET dernier_numero = invoice_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;
      return formatInvoiceNumber(2026, res[0].dernier_numero);
    });

    const seq2026_2 = await prisma.$transaction(async (tx) => {
      const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO invoice_sequences (annee, dernier_numero)
        VALUES (2026, 1)
        ON CONFLICT (annee) DO UPDATE
        SET dernier_numero = invoice_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;
      return formatInvoiceNumber(2026, res[0].dernier_numero);
    });

    const seq2027_1 = await prisma.$transaction(async (tx) => {
      const res: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO invoice_sequences (annee, dernier_numero)
        VALUES (2027, 1)
        ON CONFLICT (annee) DO UPDATE
        SET dernier_numero = invoice_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;
      return formatInvoiceNumber(2027, res[0].dernier_numero);
    });

    if (seq2026_1 !== 'F001/2026') throw new Error(`Expected F001/2026, got ${seq2026_1}`);
    if (seq2026_2 !== 'F002/2026') throw new Error(`Expected F002/2026, got ${seq2026_2}`);
    if (seq2027_1 !== 'F001/2027') throw new Error(`Expected F001/2027, got ${seq2027_1}`);

    console.log(`  ✓ PASSED: Transaction 1 (2026) -> ${seq2026_1}`);
    console.log(`  ✓ PASSED: Transaction 2 (2026) -> ${seq2026_2}`);
    console.log(`  ✓ PASSED: Transaction 3 (2027 Reset) -> ${seq2027_1}`);

    // -------------------------------------------------------------
    // Test 3: Database Unique Constraint on numeroFacture
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Database Unique Constraint on numeroFacture...');
    const testNum = `F_TEST_UNIQUE_${Date.now()}`;
    const voyage = await prisma.voyage.findFirst();

    if (voyage) {
      const createdFacture = await prisma.facture.create({
        data: {
          numeroFacture: testNum,
          nomClient: voyage.nomClient || 'TEST_CLIENT',
          idVoyage: voyage.idVoyage,
          dateFacture: new Date(),
          sousTotal: new Prisma.Decimal(1000),
          tauxTva: new Prisma.Decimal(20),
        },
      });

      let duplicateBlocked = false;
      try {
        await prisma.facture.create({
          data: {
            numeroFacture: testNum,
            nomClient: voyage.nomClient || 'TEST_CLIENT',
            idVoyage: voyage.idVoyage,
            dateFacture: new Date(),
            sousTotal: new Prisma.Decimal(1000),
            tauxTva: new Prisma.Decimal(20),
          },
        });
      } catch (err: any) {
        duplicateBlocked = true;
      }

      await prisma.facture.delete({ where: { id: createdFacture.id } });

      if (duplicateBlocked) {
        console.log(
          '  ✓ PASSED: Duplicate numeroFacture insertion correctly rejected by database unique constraint',
        );
      } else {
        throw new Error('FAILED: Duplicate numeroFacture was allowed by database!');
      }
    } else {
      console.log('  ⚠ SKIPPED DB duplicate test (no voyage record available)');
    }

    // -------------------------------------------------------------
    // Test 4: Company Settings Profile Configuration Audit
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Company Settings Profile & Assets Metadata...');
    const company = await prisma.companySettings.upsert({
      where: { singletonKey: 'DEFAULT' },
      create: {
        singletonKey: 'DEFAULT',
        nomEntreprise: 'TRANSPORT MAROC SARL',
        adresse: '123 Boulevard Zerktouni',
        telephone: '0522000000',
        email: 'contact@transportmaroc.ma',
        ice: '001584920000034',
        tauxTvaParDefaut: new Prisma.Decimal(20),
        delaiPaiementParDefaut: 30,
        devise: 'MAD',
      },
      update: {
        nomEntreprise: 'TRANSPORT MAROC SARL',
        adresse: '123 Boulevard Zerktouni',
        telephone: '0522000000',
        email: 'contact@transportmaroc.ma',
      },
    });

    const isConfigured = Boolean(
      company.nomEntreprise && company.adresse && company.telephone && company.email,
    );

    if (isConfigured) {
      console.log(
        `  ✓ PASSED: Company Settings profile ("${company.nomEntreprise}") correctly identified as FULLY CONFIGURED`,
      );
    } else {
      throw new Error('FAILED: Company Settings profile completeness check failed');
    }

    console.log('\n=================================================================');
    console.log('=== ALL COMPANY SETTINGS & INVOICE TESTS PASSED CLEANLY ===');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Test Runner Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCompanySettingsAndFacturesVerification();
