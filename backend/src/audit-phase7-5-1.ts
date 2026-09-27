import { PrismaClient } from '@prisma/client';

async function runPhase752Audit() {
  console.log('==================================================');
  console.log('PHASE 7.5.2 CREANCE RECONCILIATION & AUDIT');
  console.log('Target Database: transport_db (READ-ONLY)');
  console.log('==================================================\n');

  const prodPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://transport:transport@localhost:5439/transport_db?schema=public' } }
  });

  try {
    // --------------------------------------------------
    // TASK 3: RECALCULATE ALL 52 CREANCES WITH CORRECTED SQL
    // --------------------------------------------------
    console.log('--- TASK 3: CREANCE CANDIDATE RECONCILIATION (52 TOTAL) ---');

    const creancesDetail: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT c.id::integer as id, c.numero_facture, c.nom_client, c.montant_facture::text as montant_facture,
        ARRAY(SELECT f.id::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_invoice_ids,
        ARRAY(SELECT f.company_id::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_company_ids,
        (SELECT count(*)::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_count
      FROM creances_clients c
      ORDER BY c.id;
    `);

    const creanceDeterministic = creancesDetail.filter(c => c.candidate_count === 1);
    const creanceAmbiguous = creancesDetail.filter(c => c.candidate_count > 1);
    const creanceOrphan = creancesDetail.filter(c => c.candidate_count === 0);

    console.log(`Total Creances:           ${creancesDetail.length}`);
    console.log(`Deterministic (count=1):   ${creanceDeterministic.length}`);
    console.log(`Ambiguous (count>1):       ${creanceAmbiguous.length}`);
    console.log(`Orphan (count=0):          ${creanceOrphan.length}`);

    console.log('\nDeterministic Creance IDs (count=1):');
    console.log(`[${creanceDeterministic.map(c => c.id).join(', ')}]`);

    console.log('\nAmbiguous Creance IDs (count>1):');
    console.log(creanceAmbiguous.length > 0 ? `[${creanceAmbiguous.map(c => c.id).join(', ')}]` : 'None ([])');

    console.log('\nOrphan Creance IDs (count=0):');
    console.log(`[${creanceOrphan.map(c => c.id).join(', ')}]`);

    // --------------------------------------------------
    // TASK 4: VERIFY CREANCE 54 DETAILS
    // --------------------------------------------------
    console.log('\n--- TASK 4: VERIFY CREANCE 54 FORENSICS ---');
    const c54 = creancesDetail.find(c => c.id === 54);
    if (c54) {
      console.log(`ID:                     ${c54.id}`);
      console.log(`numeroFacture:          ${c54.numero_facture}`);
      console.log(`nomClient:              ${c54.nom_client}`);
      console.log(`candidate_invoice_ids:  [${c54.candidate_invoice_ids.join(', ')}]`);
      console.log(`candidate_company_ids:  [${c54.candidate_company_ids.join(', ')}]`);
      console.log(`candidate_count:        ${c54.candidate_count}`);
      console.log(`Status:                 ${c54.candidate_count === 0 ? 'ORPHAN' : 'NOT ORPHAN'}`);
    } else {
      console.error('❌ Creance 54 not found in production!');
    }

    // --------------------------------------------------
    // TASK 6: VERIFY PAYMENTS REMAIN UNCHANGED
    // --------------------------------------------------
    console.log('\n--- TASK 6: VERIFY PAYMENTS CANDIDATE COUNTS (31 TOTAL) ---');
    const paymentsDetail: any[] = await prodPrisma.$queryRawUnsafe(`
      SELECT p.id::integer as id, p.numero_facture, p.nom_client,
        ARRAY(SELECT f.id::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_invoice_ids,
        ARRAY(SELECT f.company_id::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_company_ids,
        (SELECT count(*)::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_count
      FROM paiements_clients p
      ORDER BY p.id;
    `);

    const pDeterministic = paymentsDetail.filter(p => p.candidate_count === 1);
    const pAmbiguous = paymentsDetail.filter(p => p.candidate_count > 1);
    const pOrphan = paymentsDetail.filter(p => p.candidate_count === 0);

    console.log(`Total Payments:           ${paymentsDetail.length}`);
    console.log(`Deterministic (count=1):   ${pDeterministic.length}`);
    console.log(`Ambiguous (count>1):       ${pAmbiguous.length} (IDs: [${pAmbiguous.map(p => p.id).join(', ')}])`);
    console.log(`Orphan (count=0):          ${pOrphan.length} (IDs: [${pOrphan.map(p => p.id).join(', ')}])`);

  } catch (err) {
    console.error('Error during Phase 7.5.2 audit:', err);
  } finally {
    await prodPrisma.$disconnect();
  }
}

runPhase752Audit();
