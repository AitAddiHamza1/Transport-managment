const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying id_client column migration to voyages table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE voyages ADD COLUMN IF NOT EXISTS id_client BIGINT;
    `);
    console.log('Added id_client column.');

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_voyages_client' AND table_name = 'voyages'
        ) THEN
          ALTER TABLE voyages ADD CONSTRAINT fk_voyages_client
          FOREIGN KEY (id_client) REFERENCES clients(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('Added foreign key fk_voyages_client.');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_voyages_id_client ON voyages (id_client);
    `);
    console.log('Created index idx_voyages_id_client.');

    // Populate id_client for existing voyages based on nom_client matching nom_entreprise
    await prisma.$executeRawUnsafe(`
      UPDATE voyages v
      SET id_client = c.id
      FROM clients c
      WHERE v.id_client IS NULL AND LOWER(v.nom_client) = LOWER(c.nom_entreprise);
    `);
    console.log('Populated id_client for existing voyages.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
