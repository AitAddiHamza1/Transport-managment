import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const REHEARSAL_DB_URL = 'postgresql://transport:transport@localhost:5439/transport_rehearsal_db?schema=public';

async function runRehearsalFile() {
  console.log('==================================================');
  console.log('REHEARSAL EXECUTION OF EXACT migration.sql FILE');
  console.log('Target Database: transport_rehearsal_db');
  console.log('==================================================\n');

  const rehearsalPrisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } }
  });

  try {
    const migrationSqlPath = path.join(__dirname, '../prisma/migrations/20260926200000_multi_tenant_composite_fk/migration.sql');
    const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');

    console.log(`Executing migration file: ${migrationSqlPath}`);
    await rehearsalPrisma.$executeRawUnsafe(sqlContent);
    console.log('✅ EXECUTED EXACT migration.sql FILE SUCCESSFULLY ON transport_rehearsal_db!');

  } catch (err) {
    console.error('Error executing migration.sql file:', err);
  } finally {
    await rehearsalPrisma.$disconnect();
  }
}

runRehearsalFile();
