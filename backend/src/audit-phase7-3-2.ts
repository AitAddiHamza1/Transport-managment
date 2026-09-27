import { PrismaClient } from '@prisma/client';

const REHEARSAL_DB_URL = 'postgresql://transport:transport@localhost:5439/transport_rehearsal_db?schema=public';

async function runAudit() {
  console.log('==================================================');
  console.log('PHASE 7.3.2 DATA PRESERVATION & READINESS AUDIT');
  console.log('Target Database: transport_rehearsal_db');
  console.log('==================================================\n');

  const rehearsalPrisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } }
  });

  try {
    // --------------------------------------------------
    // TASK 1: COMPLETE PAYMENT SCHEMA INVENTORY
    // --------------------------------------------------
    console.log('--- TASK 1: COMPLETE PAYMENT SCHEMA INVENTORY ---');
    const cols: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'paiements_clients'
      ORDER BY ordinal_position;
    `);

    console.log('PaiementClient (`paiements_clients`) PostgreSQL Column Inventory:');
    for (const c of cols) {
      console.log(`  - ${c.column_name}: type=${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default}`);
    }

    // --------------------------------------------------
    // TASK 2 & 3: PROVENANCE COMPLETENESS & BEFORE/AFTER SNAPSHOT
    // --------------------------------------------------
    console.log('\n--- TASK 2 & 3: PROVENANCE COMPLETENESS & BEFORE/AFTER SNAPSHOT ---');

    // Inspect quarantine table columns
    const qCols: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'quarantine_ambiguous_paiements'
      ORDER BY ordinal_position;
    `);

    console.log('Quarantine Table Columns (`quarantine_ambiguous_paiements`):');
    for (const qc of qCols) {
      console.log(`  - ${qc.column_name}: type=${qc.data_type}`);
    }

    // Compare original columns vs quarantine columns
    const origColNames = cols.map(c => c.column_name).filter(c => c !== 'company_id' && c !== 'facture_id');
    const qColNames = qCols.map(qc => qc.column_name);

    const missingInQuarantine = origColNames.filter(c => !qColNames.includes(c));
    if (missingInQuarantine.length > 0) {
      console.log(`\n⚠️ PROVENANCE GAP IDENTIFIED! The following original columns were missing from quarantine_ambiguous_paiements DDL:`);
      for (const m of missingInQuarantine) {
        console.log(`  - MISSING FIELD: ${m}`);
      }
    } else {
      console.log('\n✅ 100% COVERAGE: All original business columns exist in quarantine table.');
    }

    // Fetch snapshot of Quarantined Records 92 and 93
    const qRecords: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT * FROM quarantine_ambiguous_paiements WHERE id IN (92, 93) ORDER BY id
    `);

    console.log('\nQuarantine Snapshot Records (IDs 92 & 93):');
    console.log(JSON.stringify(qRecords, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // --------------------------------------------------
    // TASK 4: QUARANTINE DUPLICATE / IDENTITY SAFETY
    // --------------------------------------------------
    console.log('\n--- TASK 4: QUARANTINE DUPLICATE / IDENTITY SAFETY ---');
    const qCount: any = await rehearsalPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM quarantine_ambiguous_paiements');
    console.log(`Total Quarantined Ambiguous Rows: ${qCount[0].count}`);

    const qUnique: any = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'quarantine_ambiguous_paiements' AND constraint_type = 'PRIMARY KEY'
    `);
    console.log(`Quarantine Primary Key Constraint: ${qUnique.length ? qUnique[0].constraint_name : 'NONE'}`);

    // --------------------------------------------------
    // TASK 5: ACTIVE TABLE STATE
    // --------------------------------------------------
    console.log('\n--- TASK 5: ACTIVE TABLE STATE ---');
    const activePaiementsCount: any = await rehearsalPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM paiements_clients');
    const unmappedActiveCount: any = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT count(*)::text as count FROM paiements_clients WHERE company_id IS NULL OR facture_id IS NULL
    `);
    const activeCreancesCount: any = await rehearsalPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM creances_clients');

    console.log(`Active PaiementsClients Count:        ${activePaiementsCount[0].count} (Expected: 27)`);
    console.log(`Unmapped (NULL) Active Paiements:    ${unmappedActiveCount[0].count} (Expected: 0)`);
    console.log(`Active CreancesClients Count:         ${activeCreancesCount[0].count} (Expected: 51)`);

    // --------------------------------------------------
    // TASK 6: TENANT INTEGRITY SECURITY TEST
    // --------------------------------------------------
    console.log('\n--- TASK 6: TENANT INTEGRITY SECURITY TEST ---');

    // Negative Test: Attempt Company 51 + Invoice 93 (Company 53)
    let negTestPassed = false;
    try {
      await rehearsalPrisma.$executeRawUnsafe(`
        INSERT INTO paiements_clients (company_id, facture_id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement)
        VALUES (51, 93, 'FAC-DASH-A-001', 'Client A Transport', CURRENT_DATE, 6000.00, 'VIREMENT');
      `);
    } catch (err: any) {
      if (err.message.includes('foreign key constraint') || err.message.includes('23503') || err.message.includes('fk_paiements_clients_company_facture')) {
        negTestPassed = true;
        console.log('✅ PASS: Insertion with company_id=51 and facture_id=93 (owned by Company 53) REJECTED by PostgreSQL FK Code 23503');
      }
    }
    if (!negTestPassed) {
      console.error('❌ FAIL: Negative test was NOT rejected by PostgreSQL!');
    }

    // Positive Test with Transaction ROLLBACK: Company 53 + Invoice 93
    let posTestPassed = false;
    try {
      await rehearsalPrisma.$executeRawUnsafe('BEGIN;');
      await rehearsalPrisma.$executeRawUnsafe(`
        INSERT INTO paiements_clients (company_id, facture_id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement)
        VALUES (53, 93, 'FAC-DASH-A-001', 'Client A Transport', CURRENT_DATE, 6000.00, 'VIREMENT');
      `);
      posTestPassed = true;
      console.log('✅ PASS: Insertion with company_id=53 and facture_id=93 (owned by Company 53) ACCEPTED by PostgreSQL');
      await rehearsalPrisma.$executeRawUnsafe('ROLLBACK;');
      console.log('✅ Transaction ROLLED BACK cleanly — zero test rows left behind.');
    } catch (err: any) {
      console.error(`❌ FAIL: Positive test failed: ${err.message}`);
      await rehearsalPrisma.$executeRawUnsafe('ROLLBACK;').catch(() => {});
    }

    // --------------------------------------------------
    // TASK 7: RECEIVABLE QUARANTINE / ORPHAN CONSISTENCY
    // --------------------------------------------------
    console.log('\n--- TASK 7: RECEIVABLE QUARANTINE / ORPHAN CONSISTENCY ---');
    const archCreancesCount: any = await rehearsalPrisma.$queryRawUnsafe('SELECT count(*)::text as count FROM archived_orphan_creances');
    const archCreance54: any = await rehearsalPrisma.$queryRawUnsafe('SELECT * FROM archived_orphan_creances WHERE id = 54');

    console.log(`Archived Orphan Creances Count: ${archCreancesCount[0].count} (Expected: 1)`);
    console.log(`Creance ID 54 Archived Record:`);
    console.log(JSON.stringify(archCreance54, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    const creance1to1Unique: any = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'creances_clients' AND constraint_name = 'uq_creances_clients_company_facture'
    `);
    console.log(`1-to-1 Creance Unique Constraint (uq_creances_clients_company_facture): ${creance1to1Unique.length ? 'VERIFIED PRESENT' : 'MISSING'}`);

  } catch (err) {
    console.error('Error during audit:', err);
  } finally {
    await rehearsalPrisma.$disconnect();
  }
}

runAudit();
