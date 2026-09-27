import { PrismaClient } from '@prisma/client';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient();

async function inspectDetails() {
  console.log('====================================================');
  console.log('=== DETAILED DATA EVIDENCE & ORPHAN INVESTIGATION ===');
  console.log('====================================================\n');

  try {
    // 1. Inspect duplicate factures
    const duplicateFactures: any[] = await prisma.$queryRaw`
      SELECT id, company_id, numero_facture, nom_client, montant_total::text, date_facture::text, supprime_le::text
      FROM factures
      WHERE numero_facture IN ('F001/2026', 'SF001/2026', 'FAC-DASH-A-001')
      ORDER BY numero_facture, company_id;
    `;
    console.log('--- DUPLICATE FACTURES IN POSTGRESQL ---');
    console.log(JSON.stringify(duplicateFactures, null, 2));

    // 2. Inspect orphan paiements (97, 99)
    const orphanPaiements: any[] = await prisma.$queryRaw`
      SELECT 
        id, 
        numero_facture, 
        nom_client, 
        date_paiement::text, 
        montant_recu::text, 
        methode_paiement, 
        devise
      FROM paiements_clients
      WHERE id IN (97, 99);
    `;
    console.log('\n--- ORPHAN PAIEMENTS (ID 97, 99) ---');
    console.log(JSON.stringify(orphanPaiements, null, 2));

    // Check if cheque or lettre_de_change exists for orphan paiements 97, 99
    const orphanPaiementCheques: any[] = await prisma.$queryRaw`
      SELECT id, id_paiement_client FROM cheques WHERE id_paiement_client IN (97, 99);
    `;
    console.log('  Cheques linked to orphan paiements:', JSON.stringify(orphanPaiementCheques, null, 2));

    const orphanPaiementLettres: any[] = await prisma.$queryRaw`
      SELECT id, id_paiement_client FROM lettres_de_change WHERE id_paiement_client IN (97, 99);
    `;
    console.log('  Lettres de change linked to orphan paiements:', JSON.stringify(orphanPaiementLettres, null, 2));

    // 3. Inspect orphan creance (54)
    const orphanCreances: any[] = await prisma.$queryRaw`
      SELECT 
        id, 
        numero_facture, 
        nom_client, 
        date_emission::text, 
        montant_facture::text, 
        montant_recu::text, 
        solde::text, 
        statut_paiement
      FROM creances_clients
      WHERE id = 54;
    `;
    console.log('\n--- ORPHAN CREANCES (ID 54) ---');
    console.log(JSON.stringify(orphanCreances, null, 2));

    // 4. Inspect payments referencing duplicated invoice numbers
    const dupInvoicePaiements: any[] = await prisma.$queryRaw`
      SELECT 
        p.id, 
        p.numero_facture, 
        p.nom_client, 
        p.montant_recu::text, 
        p.date_paiement::text
      FROM paiements_clients p
      WHERE p.numero_facture IN ('F001/2026', 'SF001/2026', 'FAC-DASH-A-001');
    `;
    console.log('\n--- PAIEMENTS REFERENCING DUPLICATED INVOICE NUMBERS ---');
    console.log(JSON.stringify(dupInvoicePaiements, null, 2));

    // 5. Inspect creances referencing duplicated invoice numbers
    const dupInvoiceCreances: any[] = await prisma.$queryRaw`
      SELECT 
        c.id, 
        c.numero_facture, 
        c.nom_client, 
        c.montant_facture::text, 
        c.date_emission::text
      FROM creances_clients c
      WHERE c.numero_facture IN ('F001/2026', 'SF001/2026', 'FAC-DASH-A-001');
    `;
    console.log('\n--- CREANCES REFERENCING DUPLICATED INVOICE NUMBERS ---');
    console.log(JSON.stringify(dupInvoiceCreances, null, 2));

  } catch (err: any) {
    console.error('❌ Detail Audit Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDetails();
