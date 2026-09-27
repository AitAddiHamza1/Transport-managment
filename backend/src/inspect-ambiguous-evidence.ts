import { PrismaClient } from '@prisma/client';

async function inspectAmbiguousEvidence() {
  const prisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://transport:transport@localhost:5439/transport_db?schema=public' } }
  });

  try {
    console.log('==================================================');
    console.log('FORENSIC INVESTIGATION: PAIEMENT 92 & 93 EVIDENCE');
    console.log('==================================================\n');

    const payments: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM paiements_clients WHERE id IN (92, 93)
    `);

    console.log('--- PAIEMENT CLIENTS 92 & 93 METADATA ---');
    console.log(JSON.stringify(payments, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    const factures: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM factures WHERE numero_facture = 'FAC-DASH-A-001'
    `);

    console.log('\n--- FACTURES WITH numero_facture = FAC-DASH-A-001 ---');
    console.log(JSON.stringify(factures, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // Check voyages linked to these factures
    const voyageIds = factures.map(f => f.id_voyage).filter(Boolean);
    if (voyageIds.length > 0) {
      const voyages: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM voyages WHERE id_voyage IN (${voyageIds.join(',')})
      `);
      console.log('\n--- LINKED VOYAGES ---');
      console.log(JSON.stringify(voyages, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    } else {
      console.log('\n--- LINKED VOYAGES ---');
      console.log('No voyages linked (id_voyage IS NULL)');
    }

  } catch (err) {
    console.error('Error during evidence inspection:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectAmbiguousEvidence();
