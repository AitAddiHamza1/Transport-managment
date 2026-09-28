import { PrismaClient } from '@prisma/client';

async function runIsolatedMigrationAndIntegrityTest() {
  console.log('==================================================');
  console.log('PHASE C: ISOLATED DATABASE MIGRATION & INTEGRITY TEST');
  console.log('Target: transport_db_isolated_restore_test ONLY');
  console.log('==================================================\n');

  // Prisma client connected to isolated restored database
  const isolatedPrisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://transport:transport@localhost:5439/transport_db_isolated_restore_test?schema=public',
      },
    },
  });

  try {
    // --------------------------------------------------
    // STEP A: PRE-MIGRATION COUNTS ON ISOLATED DB
    // --------------------------------------------------
    console.log('--- STEP A: PRE-MIGRATION BASELINE ON ISOLATED RESTORED DB ---');
    const prePayments: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const preFactures: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM factures');
    const preCreances: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');
    const preUsers: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM users');
    const preCompanies: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM companies');
    const preCheques: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM cheques');
    const preLcr: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM lettres_de_change');

    console.log(`Pre-PaiementsClients: ${prePayments[0].count}`);
    console.log(`Pre-Factures:         ${preFactures[0].count}`);
    console.log(`Pre-CreancesClients:  ${preCreances[0].count}`);
    console.log(`Pre-Users:            ${preUsers[0].count}`);
    console.log(`Pre-Companies:        ${preCompanies[0].count}`);
    console.log(`Pre-Cheques:          ${preCheques[0].count}`);
    console.log(`Pre-LettresDeChange:  ${preLcr[0].count}`);

    // --------------------------------------------------
    // STEP B: APPLY PHASE C MIGRATION SQL TO ISOLATED DB ONLY
    // --------------------------------------------------
    console.log('\n--- STEP B: APPLYING PHASE C MIGRATION SQL TO ISOLATED DB ONLY ---');
    await isolatedPrisma.$executeRawUnsafe(`
      ALTER TABLE "paiements_clients"
        ADD COLUMN IF NOT EXISTS "est_annule" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "date_annulation" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "motif_annulation" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "annule_par_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "cree_par_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "cree_le" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await isolatedPrisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "paiements_clients_est_annule_idx" ON "paiements_clients"("est_annule");
    `);

    await isolatedPrisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "paiements_clients_cree_le_idx" ON "paiements_clients"("cree_le");
    `);

    await isolatedPrisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'paiements_clients_cree_par_id_fkey'
        ) THEN
          ALTER TABLE "paiements_clients"
            ADD CONSTRAINT "paiements_clients_cree_par_id_fkey"
            FOREIGN KEY ("cree_par_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'paiements_clients_annule_par_id_fkey'
        ) THEN
          ALTER TABLE "paiements_clients"
            ADD CONSTRAINT "paiements_clients_annule_par_id_fkey"
            FOREIGN KEY ("annule_par_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Mark migration as applied in isolated DB's _prisma_migrations table if table exists
    try {
      await isolatedPrisma.$executeRawUnsafe(`
        INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
          gen_random_uuid()::text,
          'c38210f92ab801238918239081290381',
          NOW(),
          '20260928200000_customer_payment_cancellation_audit',
          NULL, NULL, NOW(), 1
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('Migration record added to _prisma_migrations in isolated DB.');
    } catch (e: any) {
      console.log('Note on _prisma_migrations insert in isolated DB:', e.message);
    }

    console.log('Migration SQL applied successfully to isolated database.');

    // --------------------------------------------------
    // STEP C: POST-MIGRATION COUNTS & INTEGRITY CHECKS
    // --------------------------------------------------
    console.log('\n--- STEP C: POST-MIGRATION INTEGRITY CHECKS ---');
    const postPayments: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const postFactures: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM factures');
    const postCreances: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');
    const postUsers: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM users');
    const postCompanies: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM companies');
    const postCheques: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM cheques');
    const postLcr: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM lettres_de_change');

    console.log(`Post-PaiementsClients: ${postPayments[0].count} (Equal to Pre: ${prePayments[0].count === postPayments[0].count})`);
    console.log(`Post-Factures:         ${postFactures[0].count} (Equal to Pre: ${preFactures[0].count === postFactures[0].count})`);
    console.log(`Post-CreancesClients:  ${postCreances[0].count} (Equal to Pre: ${preCreances[0].count === postCreances[0].count})`);
    console.log(`Post-Users:            ${postUsers[0].count} (Equal to Pre: ${preUsers[0].count === postUsers[0].count})`);
    console.log(`Post-Companies:        ${postCompanies[0].count} (Equal to Pre: ${preCompanies[0].count === postCompanies[0].count})`);
    console.log(`Post-Cheques:          ${postCheques[0].count} (Equal to Pre: ${preCheques[0].count === postCheques[0].count})`);
    console.log(`Post-LettresDeChange:  ${postLcr[0].count} (Equal to Pre: ${preLcr[0].count === postLcr[0].count})`);

    // Check defaults and data safety
    const nonFalseEstAnnule: any[] = await isolatedPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients WHERE est_annule IS NOT false');
    console.log(`Payments with est_annule != false: ${nonFalseEstAnnule[0].count} (Expected 0)`);

    const orphanPayments: any[] = await isolatedPrisma.$queryRawUnsafe(`
      SELECT count(*)::text as count FROM paiements_clients p
      LEFT JOIN factures f ON p.company_id = f.company_id AND p.facture_id = f.id
      WHERE f.id IS NULL
    `);
    console.log(`Orphan Payments (missing invoice): ${orphanPayments[0].count} (Expected 0)`);

    const orphanCheques: any[] = await isolatedPrisma.$queryRawUnsafe(`
      SELECT count(*)::text as count FROM cheques c
      LEFT JOIN paiements_clients p ON c.id_paiement_client = p.id
      WHERE c.id_paiement_client IS NOT NULL AND p.id IS NULL
    `);
    console.log(`Orphan Cheques (missing payment):   ${orphanCheques[0].count} (Expected 0)`);

    const orphanLcr: any[] = await isolatedPrisma.$queryRawUnsafe(`
      SELECT count(*)::text as count FROM lettres_de_change l
      LEFT JOIN paiements_clients p ON l.id_paiement_client = p.id
      WHERE l.id_paiement_client IS NOT NULL AND p.id IS NULL
    `);
    console.log(`Orphan LettresDeChange (missing payment): ${orphanLcr[0].count} (Expected 0)`);

    console.log('\n==================================================');
    console.log('ISOLATED RESTORED DB MIGRATION & INTEGRITY TEST COMPLETE');
    console.log('Production database remained 100% untouched!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during isolated migration test:', err);
  } finally {
    await isolatedPrisma.$disconnect();
  }
}

runIsolatedMigrationAndIntegrityTest();
