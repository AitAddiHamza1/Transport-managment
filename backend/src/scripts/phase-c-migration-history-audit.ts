import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrationHistoryAudit() {
  console.log('==================================================');
  console.log('PHASE C: MIGRATION HISTORY CONSISTENCY READ-ONLY AUDIT');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Query all DB migrations
    console.log('--- 1. DATABASE MIGRATIONS IN _prisma_migrations ---');
    const dbMigs: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
      FROM _prisma_migrations
      ORDER BY started_at ASC
    `);

    console.log(`Total Database Migrations Recorded: ${dbMigs.length}`);
    dbMigs.forEach((m, i) => {
      console.log(`  [${i + 1}] ${m.migration_name} | Finished: ${m.finished_at ? m.finished_at.toISOString() : 'NULL'} | RolledBack: ${m.rolled_back_at ? m.rolled_back_at.toISOString() : 'NULL'} | Steps: ${m.applied_steps_count}`);
    });

    // 2. List Repo migrations
    console.log('\n--- 2. REPOSITORY MIGRATIONS IN backend/prisma/migrations ---');
    const migrationsDir = path.join(__dirname, '../../prisma/migrations');
    const repoDirs = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
    repoDirs.sort();

    console.log(`Total Repository Migration Directories: ${repoDirs.length}`);
    repoDirs.forEach((d, i) => console.log(`  [${i + 1}] ${d}`));

    // 3. Compute Difference
    console.log('\n--- 3. COMPARISON & DIFFERENCE COMPUTATION ---');
    const dbNames = dbMigs.map(m => m.migration_name);
    const dbSet = new Set(dbNames);
    const repoSet = new Set(repoDirs);

    const dbOnly = dbNames.filter(name => !repoSet.has(name));
    const repoOnly = repoDirs.filter(name => !dbSet.has(name));
    const inBoth = dbNames.filter(name => repoSet.has(name));

    console.log(`Present in BOTH DB and Repo (${inBoth.length}):`);
    inBoth.forEach(name => console.log(`  ✓ ${name}`));

    console.log(`\nDB-ONLY Migrations (${dbOnly.length}):`);
    dbOnly.forEach(name => {
      const detail = dbMigs.find(m => m.migration_name === name);
      console.log(`  ? ${name} (Finished: ${detail?.finished_at ? detail.finished_at.toISOString() : 'NULL'}, RolledBack: ${detail?.rolled_back_at ? detail.rolled_back_at.toISOString() : 'NULL'})`);
    });

    console.log(`\nREPO-ONLY Migrations (${repoOnly.length}):`);
    repoOnly.forEach(name => console.log(`  ! ${name}`));

    // 4. Detailed Investigation of DB-only migrations
    console.log('\n--- 4. DETAILED INSPECTION OF DB-ONLY MIGRATIONS ---');
    dbOnly.forEach(name => {
      const detail = dbMigs.find(m => m.migration_name === name);
      console.log(`\nMigration Name: ${name}`);
      console.log(`  - ID:                 ${detail.id}`);
      console.log(`  - Started At:         ${detail.started_at ? detail.started_at.toISOString() : 'NULL'}`);
      console.log(`  - Finished At:        ${detail.finished_at ? detail.finished_at.toISOString() : 'NULL'}`);
      console.log(`  - Rolled Back At:     ${detail.rolled_back_at ? detail.rolled_back_at.toISOString() : 'NULL'}`);
      console.log(`  - Applied Steps Count:${detail.applied_steps_count}`);
      console.log(`  - Logs:               ${detail.logs ? detail.logs : 'None'}`);
    });

    // 5. Ordering check between 20260926200000_multi_tenant_composite_fk and 20260928200000_customer_payment_cancellation_audit
    console.log('\n--- 5. ORDERING CHECK FOR PHASE C ---');
    const indexCompositeFk = repoDirs.indexOf('20260926200000_multi_tenant_composite_fk');
    const indexPhaseC = repoDirs.indexOf('20260928200000_customer_payment_cancellation_audit');
    console.log(`Index of 20260926200000_multi_tenant_composite_fk: ${indexCompositeFk}`);
    console.log(`Index of 20260928200000_customer_payment_cancellation_audit: ${indexPhaseC}`);
    const migrationsBetween = repoDirs.slice(indexCompositeFk + 1, indexPhaseC);
    console.log(`Migrations in Repo between Composite FK and Phase C (${migrationsBetween.length}):`);
    migrationsBetween.forEach(m => console.log(`  - ${m}`));

    console.log('\n==================================================');
    console.log('MIGRATION HISTORY AUDIT COMPLETE (Zero Mutations)');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during migration history audit:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigrationHistoryAudit();
