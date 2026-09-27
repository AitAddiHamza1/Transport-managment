import { PrismaClient } from '@prisma/client';

async function runPhase75Audit() {
  console.log('==================================================');
  console.log('PHASE 7.5 FINAL PRODUCTION REVIEW & BACKUP AUDIT');
  console.log('==================================================\n');

  const prodPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://transport:transport@localhost:5439/transport_db?schema=public' } }
  });

  try {
    // --------------------------------------------------
    // TASK 8: PRE-MIGRATION DATA CHECKSUM / COUNT MANIFEST
    // --------------------------------------------------
    console.log('--- TASK 8: PRE-MIGRATION DATA CHECKSUM / COUNT MANIFEST ---');

    const manifestTables = [
      { table: 'companies', pk: 'id' },
      { table: 'factures', pk: 'id' },
      { table: 'paiements_clients', pk: 'id' },
      { table: 'creances_clients', pk: 'id' },
      { table: 'voyages', pk: 'id_voyage' }
    ];

    const manifestResults: any[] = [];

    for (const item of manifestTables) {
      const stats: any = await prodPrisma.$queryRawUnsafe(`
        SELECT count(*)::text as count, min(${item.pk})::text as min_id, max(${item.pk})::text as max_id FROM ${item.table}
      `);
      manifestResults.push({
        table: item.table,
        primary_key: item.pk,
        count: stats[0].count,
        min_id: stats[0].min_id,
        max_id: stats[0].max_id
      });
    }

    console.table(manifestResults);

    console.log('\nCritical ID Manifest (Production transport_db):');
    const criticalPayments: any = await prodPrisma.$queryRawUnsafe(`
      SELECT id, numero_facture, nom_client, montant_recu::text FROM paiements_clients WHERE id IN (92, 93, 97, 99) ORDER BY id
    `);
    console.log('Critical Payments (92, 93, 97, 99):');
    console.table(criticalPayments);

    const criticalInvoices: any = await prodPrisma.$queryRawUnsafe(`
      SELECT id, company_id, numero_facture, nom_client, montant_total::text FROM factures WHERE id IN (36, 92, 93, 392, 393, 436) ORDER BY id
    `);
    console.log('Critical Invoices (36, 92, 93, 392, 393, 436):');
    console.table(criticalInvoices);

    const criticalCreance: any = await prodPrisma.$queryRawUnsafe(`
      SELECT id, numero_facture, nom_client, montant_facture::text FROM creances_clients WHERE id = 54
    `);
    console.log('Critical Creance (54):');
    console.table(criticalCreance);

    // --------------------------------------------------
    // TASK 9: LOCK & ACTIVITY PRECHECK
    // --------------------------------------------------
    console.log('\n--- TASK 9: LOCK & ACTIVITY PRECHECK (transport_db) ---');

    const activeTx: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT pid, usename, client_addr, state, query, age(now(), query_start)::text as duration
      FROM pg_stat_activity
      WHERE datname = 'transport_db' AND pid <> pg_backend_pid() AND state <> 'idle'
    `);

    console.log(`Active non-idle transactions on transport_db: ${activeTx.length}`);
    if (activeTx.length > 0) {
      console.table(activeTx);
    } else {
      console.log('✅ Zero active/blocking transactions on target tables.');
    }

    const currentLocks: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT locktype, relation::regclass, mode, granted
      FROM pg_locks
      WHERE relation IN ('paiements_clients'::regclass, 'creances_clients'::regclass, 'factures'::regclass, 'companies'::regclass)
    `);

    console.log(`Current locks on target tables (paiements_clients, creances_clients, factures, companies): ${currentLocks.length}`);
    if (currentLocks.length > 0) {
      console.table(currentLocks);
    } else {
      console.log('✅ Zero exclusive locks present on target tables.');
    }

  } catch (err) {
    console.error('Error during Phase 7.5 audit:', err);
  } finally {
    await prodPrisma.$disconnect();
  }
}

runPhase75Audit();
