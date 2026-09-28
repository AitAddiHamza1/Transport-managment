import { PrismaClient } from '@prisma/client';

async function runPhaseCPreflightReadOnly() {
  console.log('==================================================');
  console.log('PHASE C: PRODUCTION PREFLIGHT READ-ONLY INSPECTION');
  console.log('==================================================\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://transport:transport@localhost:5439/transport_db?schema=public',
      },
    },
  });

  try {
    // --------------------------------------------------
    // STEP 1: PRODUCTION DATABASE IDENTITY (Redacted)
    // --------------------------------------------------
    console.log('--- 1. DATABASE IDENTITY ---');
    const dbNameRes: any = await prisma.$queryRawUnsafe('SELECT current_database(), current_schema()');
    const versionRes: any = await prisma.$queryRawUnsafe('SELECT version()');
    const portRes: any = await prisma.$queryRawUnsafe('SELECT inet_server_addr(), inet_server_port()');

    console.log(`Host:              localhost (Port ${portRes[0]?.inet_server_port || 5439})`);
    console.log(`Database Name:     ${dbNameRes[0]?.current_database}`);
    console.log(`Schema:            ${dbNameRes[0]?.current_schema}`);
    console.log(`PostgreSQL Ver:    ${versionRes[0]?.version}`);

    // --------------------------------------------------
    // STEP 2: CURRENT MIGRATION STATE (_prisma_migrations)
    // --------------------------------------------------
    console.log('\n--- 2. CURRENT MIGRATION STATE ---');
    let totalMigrations = 0;
    let latestMigration = 'None';
    let phaseCMigrationApplied = false;

    try {
      const migs: any[] = await prisma.$queryRawUnsafe(`
        SELECT migration_name, finished_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY started_at DESC
      `);
      totalMigrations = migs.length;
      if (migs.length > 0) {
        latestMigration = migs[0].migration_name;
      }
      phaseCMigrationApplied = migs.some(m => m.migration_name.includes('customer_payment_cancellation_audit'));
      console.log(`Total Applied Migrations: ${totalMigrations}`);
      console.log(`Latest Migration:        ${latestMigration}`);
      console.log(`Phase C Migration State: ${phaseCMigrationApplied ? 'APPLIED (STOP!)' : 'NOT APPLIED (Expected)'}`);
    } catch (e: any) {
      console.log('No _prisma_migrations table found or unreadable:', e.message);
    }

    // --------------------------------------------------
    // STEP 3: PRODUCTION SCHEMA PREFLIGHT (paiements_clients)
    // --------------------------------------------------
    console.log('\n--- 3. PRODUCTION SCHEMA PREFLIGHT (paiements_clients) ---');
    const cols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'paiements_clients'
      ORDER BY ordinal_position
    `);

    const colNames = cols.map(c => c.column_name);
    console.log(`Existing Columns Count: ${cols.length}`);
    console.log(`Target Columns Check:`);
    console.log(`  - est_annule:        ${colNames.includes('est_annule') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - date_annulation:   ${colNames.includes('date_annulation') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - motif_annulation:  ${colNames.includes('motif_annulation') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - annule_par_id:     ${colNames.includes('annule_par_id') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - cree_par_id:       ${colNames.includes('cree_par_id') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - cree_le:           ${colNames.includes('cree_le') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);
    console.log(`  - mis_a_jour_le:     ${colNames.includes('mis_a_jour_le') ? 'EXISTS' : 'ABSENT (Expected pre-migration)'}`);

    const idxs: any[] = await prisma.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'paiements_clients'
    `);
    const idxNames = idxs.map(i => i.indexname);
    console.log(`Indexes Check:`);
    console.log(`  - paiements_clients_est_annule_idx: ${idxNames.includes('paiements_clients_est_annule_idx') ? 'EXISTS' : 'ABSENT'}`);
    console.log(`  - paiements_clients_cree_le_idx:     ${idxNames.includes('paiements_clients_cree_le_idx') ? 'EXISTS' : 'ABSENT'}`);

    const fkeys: any[] = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'paiements_clients' AND c.contype = 'f'
    `);
    console.log(`Foreign Keys Check (${fkeys.length} found):`);
    fkeys.forEach(fk => console.log(`  - ${fk.conname}: ${fk.def}`));

    // --------------------------------------------------
    // STEP 4: PRODUCTION DATA SNAPSHOT (Read-Only Counts)
    // --------------------------------------------------
    console.log('\n--- 4. PRODUCTION DATA SNAPSHOT ---');
    const totalPaymentsRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const totalCompaniesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(DISTINCT company_id)::text as count FROM paiements_clients');
    const totalFacturesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM factures');
    const totalCreancesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');
    const totalUsersRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM users');
    const totalChequesRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM cheques');
    const totalLcrRes: any[] = await prisma.$queryRawUnsafe('SELECT count(*)::text as count FROM lettres_de_change');

    console.log(`Total PaiementClient Rows:   ${totalPaymentsRes[0].count}`);
    console.log(`Total Companies Represented: ${totalCompaniesRes[0].count}`);
    console.log(`Total Factures:              ${totalFacturesRes[0].count}`);
    console.log(`Total CreancesClients:       ${totalCreancesRes[0].count}`);
    console.log(`Total Users:                 ${totalUsersRes[0].count}`);
    console.log(`Total Cheques:               ${totalChequesRes[0].count}`);
    console.log(`Total LettresDeChange:       ${totalLcrRes[0].count}`);

    const paymentsByMethod: any[] = await prisma.$queryRawUnsafe(`
      SELECT methode_paiement, count(*)::text as count
      FROM paiements_clients
      GROUP BY methode_paiement
      ORDER BY count DESC
    `);
    console.log('Payments by Method:');
    paymentsByMethod.forEach(m => console.log(`  - ${m.methode_paiement}: ${m.count}`));

    const paymentsByCompany: any[] = await prisma.$queryRawUnsafe(`
      SELECT company_id, count(*)::text as count
      FROM paiements_clients
      GROUP BY company_id
      ORDER BY company_id
    `);
    console.log('Payments by Company ID:');
    paymentsByCompany.forEach(c => console.log(`  - Company #${c.company_id}: ${c.count}`));

    console.log('\n==================================================');
    console.log('READ-ONLY PREFLIGHT AUDIT COMPLETE (Zero Mutations)');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during preflight audit:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runPhaseCPreflightReadOnly();
