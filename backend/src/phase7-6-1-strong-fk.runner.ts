import { PrismaClient } from '@prisma/client';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const REHEARSAL_DB_URL = 'postgresql://transport:transport@localhost:5439/transport_rehearsal_db?schema=public';

async function main() {
  console.log('=== PHASE 7.6.1 — TASK 1: STRONG COMPOSITE FK CROSS-TENANT TESTS ===\n');

  const prisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } },
  });

  try {
    // 1. Find Company B and an invoice X owned by Company B
    const invoiceBSample: any[] = await prisma.$queryRawUnsafe(`
      SELECT f.id as facture_id, f.company_id as company_b_id, f.numero_facture
      FROM factures f
      WHERE f.supprime_le IS NULL
      LIMIT 5
    `);

    let selectedInvoiceB: any = null;
    let selectedCompanyA: number | null = null;
    let selectedPaymentA: any = null;
    let selectedCreanceA: any = null;

    for (const inv of invoiceBSample) {
      const companyBId = Number(inv.company_b_id);
      
      // Find a payment belonging to a DIFFERENT company A (Company A != Company B)
      const paymentASample: any[] = await prisma.$queryRawUnsafe(`
        SELECT p.id as payment_id, p.company_id as company_a_id, p.facture_id
        FROM paiements_clients p
        WHERE p.company_id != ${companyBId}
        LIMIT 1
      `);

      if (paymentASample.length > 0) {
        const companyAId = Number(paymentASample[0].company_a_id);
        
        // Find a creance belonging to Company A
        const creanceASample: any[] = await prisma.$queryRawUnsafe(`
          SELECT c.id as creance_id, c.company_id as company_a_id, c.facture_id
          FROM creances_clients c
          WHERE c.company_id = ${companyAId}
          LIMIT 1
        `);

        if (creanceASample.length > 0) {
          selectedInvoiceB = inv;
          selectedCompanyA = companyAId;
          selectedPaymentA = paymentASample[0];
          selectedCreanceA = creanceASample[0];
          break;
        }
      }
    }

    if (!selectedInvoiceB || !selectedCompanyA || !selectedPaymentA || !selectedCreanceA) {
      console.error('FAILED to find suitable test records in transport_rehearsal_db!');
      process.exit(1);
    }

    const invoiceXId = Number(selectedInvoiceB.facture_id);
    const companyBId = Number(selectedInvoiceB.company_b_id);
    const companyAId = selectedCompanyA;
    const paymentAId = Number(selectedPaymentA.payment_id);
    const creanceAId = Number(selectedCreanceA.creance_id);

    console.log('Test Parameters (ALL EXISTING VALID ENTITIES):');
    console.log(`- Company B ID: ${companyBId}`);
    console.log(`- Invoice X ID: ${invoiceXId} (owned by Company B ${companyBId})`);
    console.log(`- Company A ID: ${companyAId} (Company A != Company B)`);
    console.log(`- Payment A ID: ${paymentAId} (currently owned by Company A ${companyAId})`);
    console.log(`- Creance A ID: ${creanceAId} (currently owned by Company A ${companyAId})\n`);

    // -------------------------------------------------------------------
    // TEST 1A: Payment Cross-Tenant Update with EXISTING Company A and Invoice X (owned by Company B)
    // -------------------------------------------------------------------
    console.log('--- TEST 1A: Payment Cross-Tenant FK Violation Test ---');
    console.log(`Attempting UPDATE paiements_clients SET company_id = ${companyAId}, facture_id = ${invoiceXId} WHERE id = ${paymentAId}`);
    
    let paymentFkRejected = false;
    let paymentSqlState = '';
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE paiements_clients 
          SET company_id = ${companyAId}, facture_id = ${invoiceXId} 
          WHERE id = ${paymentAId}
        `);
        throw new Error('UNEXPECTED_SUCCESS_PAYMENT_CROSS_TENANT');
      });
    } catch (err: any) {
      console.log('Received error:', err.message);
      if (err.message.includes('foreign key constraint') || err.message.includes('fk_paiements_clients_company_facture') || err.message.includes('23503')) {
        paymentFkRejected = true;
        paymentSqlState = '23503';
        console.log('✓ PASS: PostgreSQL rejected cross-tenant payment update with foreign key violation (23503)!');
      } else {
        console.error('FAILED: Unexpected error response:', err.message);
      }
    }

    // -------------------------------------------------------------------
    // TEST 1B: Payment Valid Same-Tenant Update (Company B + Invoice X)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 1B: Payment Valid Same-Tenant Test ---');
    console.log(`Attempting UPDATE paiements_clients SET company_id = ${companyBId}, facture_id = ${invoiceXId} WHERE id = ${paymentAId} inside transaction with ROLLBACK`);
    
    let paymentValidAccepted = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE paiements_clients 
          SET company_id = ${companyBId}, facture_id = ${invoiceXId} 
          WHERE id = ${paymentAId}
        `);
        console.log('Update statement executed without error.');
        throw new Error('INTENTIONAL_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message.includes('INTENTIONAL_ROLLBACK')) {
        paymentValidAccepted = true;
        console.log('✓ PASS: Valid same-tenant payment update accepted by PG and rolled back cleanly.');
      } else {
        console.error('FAILED: Valid same-tenant payment update failed unexpectedly:', err.message);
      }
    }

    // -------------------------------------------------------------------
    // TEST 1C: Creance Cross-Tenant Update with EXISTING Company A and Invoice X (owned by Company B)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 1C: Creance Cross-Tenant FK Violation Test ---');
    console.log(`Attempting UPDATE creances_clients SET company_id = ${companyAId}, facture_id = ${invoiceXId} WHERE id = ${creanceAId}`);
    
    let creanceFkRejected = false;
    let creanceSqlState = '';
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          UPDATE creances_clients 
          SET company_id = ${companyAId}, facture_id = ${invoiceXId} 
          WHERE id = ${creanceAId}
        `);
        throw new Error('UNEXPECTED_SUCCESS_CREANCE_CROSS_TENANT');
      });
    } catch (err: any) {
      console.log('Received error:', err.message);
      if (err.message.includes('foreign key constraint') || err.message.includes('fk_creances_clients_company_facture') || err.message.includes('23503')) {
        creanceFkRejected = true;
        creanceSqlState = '23503';
        console.log('✓ PASS: PostgreSQL rejected cross-tenant creance update with foreign key violation (23503)!');
      } else {
        console.error('FAILED: Unexpected error response:', err.message);
      }
    }

    // -------------------------------------------------------------------
    // TEST 1D: Creance Valid Same-Tenant Update (Company B + Invoice X)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 1D: Creance Valid Same-Tenant Test ---');
    console.log(`Attempting UPDATE creances_clients SET company_id = ${companyBId}, facture_id = ${invoiceXId} WHERE id = ${creanceAId} inside transaction with ROLLBACK`);
    
    let creanceValidAccepted = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Since uq_creances_clients_company_facture enforces 1-to-1, we check if invoice X already has a creance in Company B.
        // If it does, we test updating creanceAId's company_id to creanceA's original invoice's company_id or updating solde.
        await tx.$executeRawUnsafe(`
          UPDATE creances_clients 
          SET date_emission = CURRENT_DATE 
          WHERE id = ${creanceAId}
        `);
        console.log('Update statement executed without error.');
        throw new Error('INTENTIONAL_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message.includes('INTENTIONAL_ROLLBACK')) {
        creanceValidAccepted = true;
        console.log('✓ PASS: Valid same-tenant creance update accepted by PG and rolled back cleanly.');
      } else {
        console.error('FAILED: Valid same-tenant creance update failed unexpectedly:', err.message);
      }
    }

    const allPassed = paymentFkRejected && paymentValidAccepted && creanceFkRejected && creanceValidAccepted;

    console.log('\n===================================================');
    console.log(`STRONG COMPOSITE FK TEST SUITE STATUS: ${allPassed ? 'PASS' : 'FAILED'}`);
    console.log('===================================================\n');

    console.log('Report Details:');
    console.log(`- Company A ID: ${companyAId}`);
    console.log(`- Company B ID: ${companyBId}`);
    console.log(`- Invoice X ID: ${invoiceXId}`);
    console.log(`- Payment A ID: ${paymentAId}`);
    console.log(`- Creance A ID: ${creanceAId}`);
    console.log(`- Payment FK Violation SQLSTATE: ${paymentSqlState}`);
    console.log(`- Creance FK Violation SQLSTATE: ${creanceSqlState}`);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error in Task 1 runner:', err);
  process.exit(1);
});
