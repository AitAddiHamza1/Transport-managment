import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

async function runPreReconciliationCheck() {
  console.log('==================================================');
  console.log('PHASE C: FINAL PRE-RECONCILIATION CHECK');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Check _prisma_migrations
    console.log('--- 1. PRE-CHECK: MIGRATION TABLE IN DB ---');
    const migs: any[] = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `);

    console.log(`Total migrations recorded: ${migs.length}`);
    if (migs.length > 0) {
      console.log(`Latest recorded migration: ${migs[0].migration_name}`);
    }

    const isPhaseCRecorded = migs.some(m => m.migration_name.includes('customer_payment_cancellation_audit'));
    console.log(`Phase C Migration in _prisma_migrations: ${isPhaseCRecorded ? 'PRESENT (ABORT!)' : 'ABSENT (Confirmed OK)'}`);

    // Check migration files in repository
    const migrationsDir = path.join(__dirname, '../../prisma/migrations');
    const migrationDirs = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
    console.log(`Migration directories in repo (${migrationDirs.length}):`);
    migrationDirs.sort();
    migrationDirs.forEach(d => console.log(`  - ${d}`));

    const latestRepoMigration = migrationDirs[migrationDirs.length - 1];
    console.log(`Latest repo migration: ${latestRepoMigration}`);
    const isLatestPhaseC = latestRepoMigration.includes('customer_payment_cancellation_audit');
    console.log(`Phase C is latest repo migration: ${isLatestPhaseC ? 'YES (Confirmed OK)' : 'NO (Later migration found!)'}`);

    // 2. Backup Confirmation
    console.log('\n--- 2. BACKUP SHA256 VERIFICATION ---');
    const backupPath = path.join(__dirname, '../../scratch/backup_pre_phaseC_production_20260928_193800.sql');
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file NOT FOUND at: ${backupPath}`);
      return;
    }

    const backupBuffer = fs.readFileSync(backupPath);
    const backupHash = crypto.createHash('sha256').update(backupBuffer).digest('hex').toUpperCase();
    const expectedHash = 'AB17E200ECB8F71F8D70F0A389A546614D714DE733D8D9D6F1E56EFACB8ECD81';

    console.log(`Backup Filename: ${backupPath}`);
    console.log(`Backup Size:     ${backupBuffer.length} bytes`);
    console.log(`Backup SHA256:   ${backupHash}`);
    console.log(`Expected SHA256: ${expectedHash}`);
    console.log(`SHA256 Match:    ${backupHash === expectedHash ? 'YES (Confirmed OK)' : 'NO (Hash mismatch!)'}`);

    // 3. Schema Check
    console.log('\n--- 3. FINAL SCHEMA CONFIRMATION BEFORE RECONCILIATION ---');
    const cols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'paiements_clients'
        AND column_name IN ('est_annule', 'date_annulation', 'motif_annulation', 'annule_par_id', 'cree_par_id', 'cree_le', 'mis_a_jour_le')
    `);
    console.log(`Audit Columns Found (${cols.length}/7 expected): ${cols.map(c => c.column_name).join(', ')}`);

    const idxs: any[] = await prisma.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'paiements_clients'
        AND indexname IN ('paiements_clients_est_annule_idx', 'paiements_clients_cree_le_idx')
    `);
    console.log(`Audit Indexes Found (${idxs.length}/2 expected): ${idxs.map(i => i.indexname).join(', ')}`);

    const fkeys: any[] = await prisma.$queryRawUnsafe(`
      SELECT conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'paiements_clients'
        AND conname IN ('paiements_clients_cree_par_id_fkey', 'paiements_clients_annule_par_id_fkey')
    `);
    console.log(`Audit FK Constraints Found (${fkeys.length}/2 expected): ${fkeys.map(f => f.conname).join(', ')}`);

    console.log('\n==================================================');
    console.log('PRE-RECONCILIATION CHECKS COMPLETE');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during pre-reconciliation check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runPreReconciliationCheck();
