import { PrismaClient } from '@prisma/client';

async function runDiscrepancyAudit() {
  console.log('==================================================');
  console.log('PHASE C: DISCREPANCY INVESTIGATION READ-ONLY AUDIT');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Column Metadata
    console.log('--- 1. POSTGRESQL COLUMN METADATA ON paiements_clients ---');
    const cols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'paiements_clients'
        AND column_name IN ('est_annule', 'date_annulation', 'motif_annulation', 'annule_par_id', 'cree_par_id', 'cree_le', 'mis_a_jour_le')
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(cols, null, 2));

    // 2. Index Metadata
    console.log('\n--- 2. POSTGRESQL INDEX METADATA ON paiements_clients ---');
    const idxs: any[] = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'paiements_clients'
        AND indexname IN ('paiements_clients_est_annule_idx', 'paiements_clients_cree_le_idx')
    `);
    console.log(JSON.stringify(idxs, null, 2));

    // 3. Foreign Key Metadata
    console.log('\n--- 3. POSTGRESQL FOREIGN KEYS ON paiements_clients ---');
    const fkeys: any[] = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'paiements_clients'
        AND conname IN ('paiements_clients_cree_par_id_fkey', 'paiements_clients_annule_par_id_fkey')
    `);
    console.log(JSON.stringify(fkeys, null, 2));

    // 4. Migration History in _prisma_migrations
    console.log('\n--- 4. MIGRATION HISTORY IN _prisma_migrations ---');
    const migs: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(migs, null, 2));

  } catch (e) {
    console.error('Audit Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

runDiscrepancyAudit();
