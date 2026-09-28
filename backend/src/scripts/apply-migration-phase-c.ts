import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const prisma = new PrismaClient();
  try {
    console.log('Applying Phase C SQL migration to local database...');
    const sqlPath = path.join(__dirname, '../../prisma/migrations/20260928200000_customer_payment_cancellation_audit/migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "paiements_clients"
        ADD COLUMN IF NOT EXISTS "est_annule" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "date_annulation" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "motif_annulation" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "annule_par_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "cree_par_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "cree_le" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "paiements_clients_est_annule_idx" ON "paiements_clients"("est_annule");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "paiements_clients_cree_le_idx" ON "paiements_clients"("cree_le");
    `);

    await prisma.$executeRawUnsafe(`
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

    console.log('Phase C SQL migration applied successfully to local DB!');
  } catch (e) {
    console.error('Error applying migration:', e);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
