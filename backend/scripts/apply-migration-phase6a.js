const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('--- Applying Phase 6A Migration ---');
    const sqlPath = path.join(__dirname, '../prisma/migrations/20260802170000_add_kilometrage_numero_bon_to_bons_carburant/migration.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log('✅ Migration applied successfully.');

    // Verify columns
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bons_carburant'
      ORDER BY ordinal_position
    `);
    console.log('Verified columns in PostgreSQL:', cols);
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
