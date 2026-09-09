const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditBonsCarburantDb() {
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default, generation_expression
      FROM information_schema.columns
      WHERE table_name = 'bons_carburant'
      ORDER BY ordinal_position
    `);
    console.log('BonsCarburant Columns in Live PostgreSQL:', JSON.stringify(cols, null, 2));

    const fks = await prisma.$queryRawUnsafe(`
      SELECT
        tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='bons_carburant';
    `);
    console.log('BonsCarburant Foreign Keys in Live PostgreSQL:', JSON.stringify(fks, null, 2));

    const count = await prisma.bonCarburant.count();
    console.log('Total BonCarburant records:', count);

    const sample = await prisma.bonCarburant.findMany({ take: 3 });
    console.log('Sample BonCarburant records:', JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

auditBonsCarburantDb();
