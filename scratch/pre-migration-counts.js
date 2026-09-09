const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

async function main() {
  const prisma = new PrismaClient();
  try {
    const clients = await prisma.client.count();
    const voyages = await prisma.voyage.count();
    const voyagesWithNomClient = await prisma.voyage.count({
      where: { nomClient: { not: null, gt: '' } },
    });
    const voyagesWithNullNomClient = await prisma.voyage.count({
      where: { OR: [{ nomClient: null }, { nomClient: '' }] },
    });
    const factures = await prisma.facture.count();
    const facturesWithVoyage = await prisma.facture.count({
      where: { idVoyage: { not: null } },
    });
    const facturesWithoutVoyage = await prisma.facture.count({
      where: { idVoyage: null },
    });
    const creances = await prisma.creanceClient.count();
    const paiements = await prisma.paiementClient.count();

    console.log(`=== PRE-MIGRATION EVIDENCE ===`);
    console.log(`Total Clients               : ${clients}`);
    console.log(`Total Voyages               : ${voyages}`);
    console.log(`  - Voyages with nomClient  : ${voyagesWithNomClient}`);
    console.log(`  - Voyages with null name  : ${voyagesWithNullNomClient}`);
    console.log(`Total Factures              : ${factures}`);
    console.log(`  - Factures with idVoyage  : ${facturesWithVoyage}`);
    console.log(`  - Factures without Voyage : ${facturesWithoutVoyage}`);
    console.log(`Total CreanceClient         : ${creances}`);
    console.log(`Total PaiementClient        : ${paiements}`);

  } catch (err) {
    console.error('Error recording pre-migration counts:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
