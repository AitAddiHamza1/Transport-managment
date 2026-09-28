import { PrismaClient } from '@prisma/client';

async function runPostReconciliationCheck() {
  console.log('==================================================');
  console.log('PHASE C: POST-RECONCILIATION VERIFICATION & INTEGRITY AUDIT');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Verify _prisma_migrations
    console.log('--- 1. MIGRATION HISTORY VERIFICATION ---');
    const migs: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at, applied_steps_count
      FROM _prisma_migrations
      WHERE migration_name = '20260928200000_customer_payment_cancellation_audit'
    `);

    if (migs.length > 0) {
      console.log(`Migration 20260928200000_customer_payment_cancellation_audit: RECORDED AS APPLIED`);
      console.log(`Finished At: ${migs[0].finished_at}`);
      console.log(`Applied Steps: ${migs[0].applied_steps_count}`);
    } else {
      console.error('Migration NOT FOUND in _prisma_migrations!');
    }

    // 2. Data Integrity Checks
    console.log('\n--- 2. DATA INTEGRITY CHECKS ---');
    const paymentsRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const facturesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM factures');
    const creancesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');
    const usersRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM users');
    const companiesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM companies');
    const chequesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM cheques');
    const lcrRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM lettres_de_change');

    console.log(`PaiementClient count: ${paymentsRes[0].count} (Expected: 39) - Match: ${paymentsRes[0].count === '39' ? 'YES' : 'NO'}`);
    console.log(`Facture count:        ${facturesRes[0].count} (Expected: 73) - Match: ${facturesRes[0].count === '73' ? 'YES' : 'NO'}`);
    console.log(`CreanceClient count:  ${creancesRes[0].count} (Expected: 62) - Match: ${creancesRes[0].count === '62' ? 'YES' : 'NO'}`);
    console.log(`User count:           ${usersRes[0].count} (Expected: 100) - Match: ${usersRes[0].count === '100' ? 'YES' : 'NO'}`);
    console.log(`Company count:        ${companiesRes[0].count} (Expected: 86) - Match: ${companiesRes[0].count === '86' ? 'YES' : 'NO'}`);
    console.log(`Cheque count:         ${chequesRes[0].count} (Expected: 15) - Match: ${chequesRes[0].count === '15' ? 'YES' : 'NO'}`);
    console.log(`LettreDeChange count: ${lcrRes[0].count} (Expected: 5) - Match: ${lcrRes[0].count === '5' ? 'YES' : 'NO'}`);

    const estAnnuleFalseRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients WHERE est_annule = false');
    console.log(`PaiementClient with est_annule = false: ${estAnnuleFalseRes[0].count} (Expected: 39)`);

    console.log('\n==================================================');
    console.log('POST-RECONCILIATION VERIFICATION COMPLETE');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during post-reconciliation check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runPostReconciliationCheck();
