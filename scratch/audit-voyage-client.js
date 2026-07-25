const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

async function main() {
  const prisma = new PrismaClient();
  try {
    const voyages = await prisma.voyage.findMany();
    const clients = await prisma.client.findMany();

    console.log(`=== VOYAGE TO CLIENT DIAGNOSTIC ===`);
    console.log(`Total Voyages: ${voyages.length}`);
    console.log(`Total Clients: ${clients.length}`);

    const clientMap = new Map();
    clients.forEach((c) => {
      const key = c.nomEntreprise.trim().toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, []);
      }
      clientMap.get(key).push(c);
    });

    let unambiguousMatches = 0;
    let missingMatches = 0;
    let ambiguousMatches = 0;

    const auditDetails = [];

    for (const v of voyages) {
      const name = (v.nomClient || '').trim().toLowerCase();
      if (!name) {
        missingMatches++;
        auditDetails.push({ idVoyage: v.idVoyage, nomClient: v.nomClient, status: 'MISSING (Empty nomClient)' });
      } else {
        const matches = clientMap.get(name) || [];
        if (matches.length === 1) {
          unambiguousMatches++;
          auditDetails.push({ idVoyage: v.idVoyage, nomClient: v.nomClient, status: 'UNAMBIGUOUS', clientId: matches[0].id });
        } else if (matches.length > 1) {
          ambiguousMatches++;
          auditDetails.push({ idVoyage: v.idVoyage, nomClient: v.nomClient, status: 'AMBIGUOUS', matchCount: matches.length });
        } else {
          missingMatches++;
          auditDetails.push({ idVoyage: v.idVoyage, nomClient: v.nomClient, status: 'MISSING (No matching Client row)' });
        }
      }
    }

    console.log(`Unambiguous Matches : ${unambiguousMatches}`);
    console.log(`Missing Matches     : ${missingMatches}`);
    console.log(`Ambiguous Matches   : ${ambiguousMatches}`);
    console.log(`\nAudit Details:`);
    console.log(JSON.stringify(auditDetails, null, 2));

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
