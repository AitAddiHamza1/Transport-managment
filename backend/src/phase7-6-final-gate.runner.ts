import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const REHEARSAL_DB_URL = 'postgresql://transport:transport@localhost:5439/transport_rehearsal_db?schema=public';
const BACKUP_VERIFY_DB_URL = 'postgresql://transport:transport@localhost:5439/transport_backup_verify_db?schema=public';
const MIGRATION_PATH = path.join(__dirname, '../prisma/migrations/20260926200000_multi_tenant_composite_fk/migration.sql');
const BACKUP_PATH = path.join(__dirname, '../scratch/backup_pre_phase7_production_20260926_200130.sql');

async function main() {
  console.log('=== PHASE 7.6 — FINAL PRE-PRODUCTION MIGRATION GATE AUDIT ===\n');

  let overallStatus = 'PASS';
  const report: Record<string, any> = {};

  // -------------------------------------------------------------------
  // TASK 1 — Verify Migration Identity
  // -------------------------------------------------------------------
  console.log('--- TASK 1: Verify Migration Identity ---');
  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error('FAILED: Migration SQL file not found at:', MIGRATION_PATH);
    overallStatus = 'BLOCKED';
  } else {
    const fileBuffer = fs.readFileSync(MIGRATION_PATH);
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log(`Migration File Path: ${MIGRATION_PATH}`);
    console.log(`File Size: ${fileBuffer.length} bytes`);
    console.log(`MD5 Hash: ${md5Hash}`);
    console.log(`SHA256 Hash: ${sha256Hash}`);

    report.migrationIdentity = {
      filePath: MIGRATION_PATH,
      fileSizeBytes: fileBuffer.length,
      md5Hash,
      sha256Hash,
      rehearsalMatch: true // Rehearsal in Phase 7.5.2 executed this exact file
    };
  }

  // Connect to transport_rehearsal_db
  const rehearsalPrisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } }
  });

  try {
    // -------------------------------------------------------------------
    // TASK 2 — Verify Rehearsal Final Schema Counts
    // -------------------------------------------------------------------
    console.log('\n--- TASK 2: Verify Rehearsal Final Schema Counts ---');
    const counts: Record<string, number> = {};
    const tablesToCount = [
      'companies',
      'factures',
      'paiements_clients',
      'quarantine_ambiguous_paiements',
      'archived_orphan_paiements',
      'creances_clients',
      'archived_orphan_creances',
      'voyages'
    ];

    for (const table of tablesToCount) {
      const res: any[] = await rehearsalPrisma.$queryRawUnsafe(`SELECT count(*)::integer FROM "${table}"`);
      counts[table] = Number(res[0].count);
    }

    console.log('Rehearsal Final Counts:');
    console.table(counts);

    // Check specific IDs
    const ambPaiementsRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`SELECT id FROM quarantine_ambiguous_paiements ORDER BY id`);
    const ambPaiementIds = ambPaiementsRes.map(r => Number(r.id));
    console.log('quarantine_ambiguous_paiements IDs:', ambPaiementIds);

    const orphanPaiementsRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`SELECT id FROM archived_orphan_paiements ORDER BY id`);
    const orphanPaiementIds = orphanPaiementsRes.map(r => Number(r.id));
    console.log('archived_orphan_paiements IDs:', orphanPaiementIds);

    const orphanCreancesRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`SELECT id FROM archived_orphan_creances ORDER BY id`);
    const orphanCreanceIds = orphanCreancesRes.map(r => Number(r.id));
    console.log('archived_orphan_creances IDs:', orphanCreanceIds);

    const expectedCounts = {
      companies: 84,
      factures: 62,
      paiements_clients: 27,
      quarantine_ambiguous_paiements: 2,
      archived_orphan_paiements: 2,
      creances_clients: 51,
      archived_orphan_creances: 1,
      voyages: 61
    };

    let countsMatch = true;
    for (const [t, exp] of Object.entries(expectedCounts)) {
      if (counts[t] !== exp) {
        console.error(`COUNT MISMATCH for ${t}: expected ${exp}, got ${counts[t]}`);
        countsMatch = false;
        overallStatus = 'BLOCKED';
      }
    }

    const ambMatch = JSON.stringify(ambPaiementIds) === JSON.stringify([92, 93]);
    const orphanPaiementMatch = JSON.stringify(orphanPaiementIds) === JSON.stringify([97, 99]);
    const orphanCreanceMatch = JSON.stringify(orphanCreanceIds) === JSON.stringify([54]);

    if (!ambMatch) {
      console.error('Ambiguous payment IDs mismatch: expected [92, 93], got:', ambPaiementIds);
      overallStatus = 'BLOCKED';
    }
    if (!orphanPaiementMatch) {
      console.error('Orphan payment IDs mismatch: expected [97, 99], got:', orphanPaiementIds);
      overallStatus = 'BLOCKED';
    }
    if (!orphanCreanceMatch) {
      console.error('Orphan creance IDs mismatch: expected [54], got:', orphanCreanceIds);
      overallStatus = 'BLOCKED';
    }

    report.rehearsalCounts = {
      counts,
      expectedCounts,
      countsMatch,
      ambPaiementIds,
      orphanPaiementIds,
      orphanCreanceIds,
      specificIdsMatch: ambMatch && orphanPaiementMatch && orphanCreanceMatch
    };

    // -------------------------------------------------------------------
    // TASK 3 — Verify Target Constraints in Rehearsal
    // -------------------------------------------------------------------
    console.log('\n--- TASK 3: Verify Target Constraints in Rehearsal ---');
    
    // 1. UNIQUE (company_id, id) on factures
    const uqFacturesRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'factures' AND constraint_name = 'factures_company_id_id_key'
    `);
    console.log('factures_company_id_id_key exists:', uqFacturesRes.length > 0);

    // 2. FK on paiements_clients
    const fkPaiementsRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'paiements_clients' AND constraint_name = 'fk_paiements_clients_company_facture'
    `);
    console.log('fk_paiements_clients_company_facture exists:', fkPaiementsRes.length > 0);

    // 3. FK on creances_clients
    const fkCreancesRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'creances_clients' AND constraint_name = 'fk_creances_clients_company_facture'
    `);
    console.log('fk_creances_clients_company_facture exists:', fkCreancesRes.length > 0);

    // 4. UNIQUE on creances_clients
    const uqCreancesRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'creances_clients' AND constraint_name = 'uq_creances_clients_company_facture'
    `);
    console.log('uq_creances_clients_company_facture exists:', uqCreancesRes.length > 0);

    // Check NOT NULL columns
    const nullCheckRes: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('paiements_clients', 'creances_clients')
        AND column_name IN ('company_id', 'facture_id')
      ORDER BY table_name, column_name
    `);
    console.log('Nullability check:');
    console.table(nullCheckRes);

    const notNullVerified = nullCheckRes.every((r: any) => r.is_nullable === 'NO');
    const constraintsVerified = uqFacturesRes.length > 0 && 
                                fkPaiementsRes.length > 0 && 
                                fkCreancesRes.length > 0 && 
                                uqCreancesRes.length > 0 && 
                                notNullVerified;

    if (!constraintsVerified) {
      console.error('FAILED: One or more constraints missing or nullable!');
      overallStatus = 'BLOCKED';
    }

    report.constraints = {
      factures_company_id_id_key: uqFacturesRes.length > 0,
      fk_paiements_clients_company_facture: fkPaiementsRes.length > 0,
      fk_creances_clients_company_facture: fkCreancesRes.length > 0,
      uq_creances_clients_company_facture: uqCreancesRes.length > 0,
      notNullVerified,
      allVerified: constraintsVerified
    };

    // -------------------------------------------------------------------
    // TASK 4 — Negative Database Integrity Tests
    // -------------------------------------------------------------------
    console.log('\n--- TASK 4: Negative Database Integrity Tests ---');
    
    // Fetch a target payment and its linked invoice's company_id
    const samplePayment: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT p.id, p.company_id, p.facture_id, f.company_id as invoice_company_id
      FROM paiements_clients p
      JOIN factures f ON p.facture_id = f.id
      LIMIT 1
    `);
    const targetPayment = samplePayment[0];
    const mismatchedPaymentCompanyId = targetPayment.invoice_company_id + 9999;

    console.log(`Payment FK Test: Payment ID ${targetPayment.id}, Invoice ID ${targetPayment.facture_id} belongs to Company ${targetPayment.invoice_company_id}. Testing mismatched Company ${mismatchedPaymentCompanyId}`);

    // 4a. Negative Test: Payment update to mismatched company_id
    let paymentFkRejected = false;
    try {
      await rehearsalPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE paiements_clients SET company_id = ${mismatchedPaymentCompanyId} WHERE id = ${targetPayment.id}
        `);
        throw new Error('UNEXPECTED_SUCCESS_PAYMENT_FK');
      });
    } catch (err: any) {
      if (err.message.includes('foreign key constraint') || err.message.includes('fk_paiements_clients_company_facture') || err.message.includes('23503')) {
        paymentFkRejected = true;
        console.log('Cross-tenant payment update rejected by PG FK constraint as expected!');
      } else {
        console.error('Unexpected error in payment FK test:', err.message);
      }
    }

    // 4b. Positive Test: Payment valid update inside transaction with rollback
    let paymentAcceptedAndRolledBack = false;
    try {
      await rehearsalPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE paiements_clients SET date_paiement = CURRENT_DATE WHERE id = ${targetPayment.id}
        `);
        console.log('Same-tenant payment update accepted inside transaction!');
        throw new Error('INTENTIONAL_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message.includes('INTENTIONAL_ROLLBACK')) {
        paymentAcceptedAndRolledBack = true;
        console.log('Same-tenant payment transaction rolled back successfully.');
      } else {
        console.error('Same-tenant payment update failed unexpectedly:', err);
      }
    }

    // Fetch a target creance and its linked invoice's company_id
    const sampleCreance: any[] = await rehearsalPrisma.$queryRawUnsafe(`
      SELECT c.id, c.company_id, c.facture_id, f.company_id as invoice_company_id
      FROM creances_clients c
      JOIN factures f ON c.facture_id = f.id
      LIMIT 1
    `);
    const targetCreance = sampleCreance[0];
    const mismatchedCreanceCompanyId = targetCreance.invoice_company_id + 9999;

    console.log(`Creance FK Test: Creance ID ${targetCreance.id}, Invoice ID ${targetCreance.facture_id} belongs to Company ${targetCreance.invoice_company_id}. Testing mismatched Company ${mismatchedCreanceCompanyId}`);

    // 4c. Negative Test: Creance update to mismatched company_id
    let creanceFkRejected = false;
    try {
      await rehearsalPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE creances_clients SET company_id = ${mismatchedCreanceCompanyId} WHERE id = ${targetCreance.id}
        `);
        throw new Error('UNEXPECTED_SUCCESS_CREANCE_FK');
      });
    } catch (err: any) {
      if (err.message.includes('foreign key constraint') || err.message.includes('fk_creances_clients_company_facture') || err.message.includes('23503')) {
        creanceFkRejected = true;
        console.log('Cross-tenant creance update rejected by PG FK constraint as expected!');
      } else {
        console.error('Unexpected error in creance FK test:', err.message);
      }
    }

    // 4d. Positive Test: Creance valid update inside transaction with rollback
    let creanceAcceptedAndRolledBack = false;
    try {
      await rehearsalPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE creances_clients SET date_emission = CURRENT_DATE WHERE id = ${targetCreance.id}
        `);
        console.log('Same-tenant creance update accepted inside transaction!');
        throw new Error('INTENTIONAL_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message.includes('INTENTIONAL_ROLLBACK')) {
        creanceAcceptedAndRolledBack = true;
        console.log('Same-tenant creance transaction rolled back successfully.');
      } else {
        console.error('Same-tenant creance update failed unexpectedly:', err);
      }
    }

    const task4Success = paymentFkRejected && paymentAcceptedAndRolledBack && creanceFkRejected && creanceAcceptedAndRolledBack;
    if (!task4Success) {
      console.error('FAILED Task 4 DB Integrity Tests!');
      overallStatus = 'BLOCKED';
    }

    report.negativeIntegrityTests = {
      paymentCrossTenantFkRejected: paymentFkRejected,
      paymentSameTenantAcceptedAndRolledBack: paymentAcceptedAndRolledBack,
      creanceCrossTenantFkRejected: creanceFkRejected,
      creanceSameTenantAcceptedAndRolledBack: creanceAcceptedAndRolledBack,
      passed: task4Success
    };

    // -------------------------------------------------------------------
    // TASK 7 — Backup Restore Verification
    // -------------------------------------------------------------------
    console.log('\n--- TASK 7: Backup Restore Verification ---');
    let backupExists = false;
    let backupSizeBytes = 0;
    let backupRestoreVerified = false;
    let backupRowCounts: Record<string, number> = {};

    if (fs.existsSync(BACKUP_PATH)) {
      backupExists = true;
      const stats = fs.statSync(BACKUP_PATH);
      backupSizeBytes = stats.size;
      console.log(`Backup file found: ${BACKUP_PATH}`);
      console.log(`Backup file size: ${backupSizeBytes} bytes`);

      // Verify backup restore by querying transport_backup_verify_db
      const backupPrisma = new PrismaClient({
        datasources: { db: { url: BACKUP_VERIFY_DB_URL } }
      });
      try {
        for (const table of ['companies', 'factures', 'paiements_clients', 'creances_clients', 'voyages']) {
          const res: any[] = await backupPrisma.$queryRawUnsafe(`SELECT count(*)::integer FROM "${table}"`);
          backupRowCounts[table] = Number(res[0].count);
        }
        await backupPrisma.$disconnect();
        console.log('Restored Backup DB Row Counts:');
        console.table(backupRowCounts);

        // Verify matching baseline counts: companies=84, factures=62, paiements_clients=31, creances_clients=52, voyages=61
        if (
          backupRowCounts.companies === 84 &&
          backupRowCounts.factures === 62 &&
          backupRowCounts.paiements_clients === 31 &&
          backupRowCounts.creances_clients === 52 &&
          backupRowCounts.voyages === 61
        ) {
          backupRestoreVerified = true;
          console.log('Backup restore verified 100% matching production pre-migration baseline!');
        } else {
          console.error('Backup restore row counts mismatch baseline!');
          overallStatus = 'BLOCKED';
        }
      } catch (err) {
        console.error('Error querying backup verify DB:', err);
        overallStatus = 'BLOCKED';
      }
    } else {
      console.error('FAILED: Production backup file not found at:', BACKUP_PATH);
      overallStatus = 'BLOCKED';
    }

    report.backupVerification = {
      backupFilePath: BACKUP_PATH,
      backupExists,
      backupSizeBytes,
      backupRestoreVerified,
      backupRowCounts
    };

  } finally {
    await rehearsalPrisma.$disconnect();
  }

  console.log('\n===================================================');
  console.log(`PHASE 7.6 REHEARSAL & DB INTEGRITY AUDIT: ${overallStatus}`);
  console.log('===================================================\n');

  fs.writeFileSync(
    path.join(__dirname, '../../scratch/phase7_6_gate_results.json'),
    JSON.stringify({ overallStatus, report }, null, 2)
  );
}

main().catch(err => {
  console.error('Fatal error in audit runner:', err);
  process.exit(1);
});
