import { PrismaClient } from '@prisma/client';

async function runProductionPreflight() {
  console.log('==================================================');
  console.log('PHASE 7.4 PRODUCTION PRE-FLIGHT READ-ONLY AUDIT');
  console.log('Target Database: transport_db (PRODUCTION)');
  console.log('==================================================\n');

  const prodPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://transport:transport@localhost:5439/transport_db?schema=public' } }
  });

  try {
    // --------------------------------------------------
    // TASK 1: PRODUCTION DATABASE BASELINE
    // --------------------------------------------------
    console.log('--- TASK 1: PRODUCTION DATABASE BASELINE ---');
    const versionRes: any = await prodPrisma.$queryRawUnsafe('SELECT version()');
    const dbNameRes: any = await prodPrisma.$queryRawUnsafe('SELECT current_database(), current_schema()');
    const tableCountRes: any = await prodPrisma.$queryRawUnsafe(`
      SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public'
    `);
    
    // Check migration table if readable
    let migrationState = 'N/A';
    try {
      const migCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM _prisma_migrations WHERE finished_at IS NOT NULL');
      migrationState = `${migCount[0].count} applied Prisma migrations recorded in _prisma_migrations`;
    } catch (e) {}

    const companyCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM companies');
    const factureCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM factures');
    const paiementCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const creanceCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');
    const voyageCount: any = await prodPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM voyages');

    console.log(`Database Name:     ${dbNameRes[0].current_database}`);
    console.log(`Schema Name:       ${dbNameRes[0].current_schema}`);
    console.log(`PostgreSQL Ver:    ${versionRes[0].version}`);
    console.log(`Public Tables:     ${tableCountRes[0].count}`);
    console.log(`Migration State:   ${migrationState}`);
    console.log(`Companies:        ${companyCount[0].count}`);
    console.log(`Factures:         ${factureCount[0].count}`);
    console.log(`PaiementsClients: ${paiementCount[0].count}`);
    console.log(`CreancesClients:  ${creanceCount[0].count}`);
    console.log(`Voyages:          ${voyageCount[0].count}`);

    // --------------------------------------------------
    // TASK 3: PRODUCTION PAYMENT FORENSICS (IDs 92, 93, 97, 99)
    // --------------------------------------------------
    console.log('\n--- TASK 3: PRODUCTION PAYMENT FORENSICS (92, 93, 97, 99) ---');
    const pForensics: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT * FROM paiements_clients WHERE id IN (92, 93, 97, 99) ORDER BY id
    `);
    console.log(JSON.stringify(pForensics, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // --------------------------------------------------
    // TASK 4: PRODUCTION RECEIVABLE FORENSICS (ID 54)
    // --------------------------------------------------
    console.log('\n--- TASK 4: PRODUCTION RECEIVABLE FORENSICS (54) ---');
    const cForensics: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT * FROM creances_clients WHERE id = 54
    `);
    console.log(JSON.stringify(cForensics, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // --------------------------------------------------
    // TASK 5: PRODUCTION INVOICE DUPLICATE ANALYSIS
    // --------------------------------------------------
    console.log('\n--- TASK 5: PRODUCTION INVOICE DUPLICATE ANALYSIS ---');
    const dupAnalysis: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT numero_facture, company_id, id as invoice_id, nom_client, montant_total
      FROM factures
      WHERE numero_facture IN ('FAC-DASH-A-001', 'F001/2026', 'SF001/2026')
      ORDER BY numero_facture, company_id
    `);
    console.log(JSON.stringify(dupAnalysis, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // --------------------------------------------------
    // TASK 6: PRODUCTION CURRENT CONSTRAINTS IN CATALOG
    // --------------------------------------------------
    console.log('\n--- TASK 6: PRODUCTION CURRENT CONSTRAINTS & COLUMNS ---');

    // 1. Factures UNIQUE(company_id, numero_facture)
    const fCompNumKey: any = await prodPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'factures' AND constraint_name = 'factures_company_id_numero_facture_key'
    `);
    console.log(`1. Factures UNIQUE(company_id, numero_facture): ${fCompNumKey.length ? 'PRESENT (factures_company_id_numero_facture_key)' : 'ABSENT'}`);

    // 2. Factures UNIQUE(company_id, id)
    const fCompIdKey: any = await prodPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'factures' AND constraint_name = 'factures_company_id_id_key'
    `);
    console.log(`2. Factures UNIQUE(company_id, id):          ${fCompIdKey.length ? 'PRESENT' : 'ABSENT (Target constraint for composite FK)'}`);

    // 3 & 4. PaiementsClients company_id & facture_id columns
    const pCols: any = await prodPrisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'paiements_clients' AND column_name IN ('company_id', 'facture_id')
    `);
    console.log(`3 & 4. PaiementsClients company_id/facture_id: ${pCols.length === 2 ? 'PRESENT' : `ABSENT (${pCols.length} found - Target pre-migration state)`}`);

    // 5. PaiementsClients Composite FK
    const pCompFk: any = await prodPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'paiements_clients' AND constraint_name = 'fk_paiements_clients_company_facture'
    `);
    console.log(`5. PaiementsClients Composite FK:             ${pCompFk.length ? 'PRESENT' : 'ABSENT (Target pre-migration state)'}`);

    // 6. CreancesClients Composite FK
    const cCompFk: any = await prodPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'creances_clients' AND constraint_name = 'fk_creances_clients_company_facture'
    `);
    console.log(`6. CreancesClients Composite FK:              ${cCompFk.length ? 'PRESENT' : 'ABSENT (Target pre-migration state)'}`);

    // 7. CreancesClients UNIQUE(company_id, facture_id)
    const cCompUnique: any = await prodPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'creances_clients' AND constraint_name = 'uq_creances_clients_company_facture'
    `);
    console.log(`7. CreancesClients UNIQUE(company_id, facture_id): ${cCompUnique.length ? 'PRESENT' : 'ABSENT (Target pre-migration state)'}`);

    console.log('\n==================================================');
    console.log('READ-ONLY PRE-FLIGHT AUDIT COMPLETE FOR transport_db');
    console.log('Zero mutations executed on production database.');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error during production pre-flight audit:', err);
  } finally {
    await prodPrisma.$disconnect();
  }
}

runProductionPreflight();
