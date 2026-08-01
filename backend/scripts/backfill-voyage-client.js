const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.error('Usage: node scripts/backfill-voyage-client.js [--dry-run | --execute]');
    process.exit(1);
  }

  console.log(`=== VOYAGE TO CLIENT BACKFILL TOOL (Mode: ${isDryRun ? 'DRY-RUN' : 'EXECUTE'}) ===`);

  const prisma = new PrismaClient();

  let scannedCount = 0;
  let linkedCount = 0;
  let skippedAlreadyLinked = 0;
  let unlinkedCount = 0;
  let ambiguousCount = 0;

  try {
    const voyages = await prisma.voyage.findMany({ orderBy: { idVoyage: 'asc' } });
    const clients = await prisma.client.findMany();

    scannedCount = voyages.length;
    console.log(`Scanned ${scannedCount} total voyages in database...`);

    const clientMap = new Map();
    clients.forEach((c) => {
      const key = (c.nomEntreprise || '').trim().toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, []);
      }
      clientMap.get(key).push(c);
    });

    const unlinkedVoyagesList = [];

    for (const v of voyages) {
      if (v.idClient !== null && v.idClient !== undefined) {
        skippedAlreadyLinked++;
        continue;
      }

      const name = (v.nomClient || '').trim().toLowerCase();
      if (!name) {
        unlinkedCount++;
        unlinkedVoyagesList.push({ idVoyage: v.idVoyage, reason: 'Empty nomClient' });
        continue;
      }

      const matches = clientMap.get(name) || [];
      if (matches.length === 1) {
        const client = matches[0];
        if (isDryRun) {
          console.log(`[DRY-RUN WOULD LINK] Voyage #${v.idVoyage} ("${v.nomClient}") -> Client #${client.id} ("${client.nomEntreprise}")`);
          linkedCount++;
        } else {
          await prisma.voyage.update({
            where: { idVoyage: v.idVoyage },
            data: { idClient: client.id },
          });
          console.log(`[LINKED] Voyage #${v.idVoyage} ("${v.nomClient}") -> Client #${client.id} ("${client.nomEntreprise}")`);
          linkedCount++;
        }
      } else if (matches.length > 1) {
        ambiguousCount++;
        unlinkedVoyagesList.push({ idVoyage: v.idVoyage, reason: `Ambiguous matches (${matches.length})` });
      } else {
        unlinkedCount++;
        unlinkedVoyagesList.push({ idVoyage: v.idVoyage, reason: `No matching client row for "${v.nomClient}"` });
      }
    }

    console.log('\n--- BACKFILL SUMMARY ---');
    console.log(`Total Voyages Scanned  : ${scannedCount}`);
    console.log(`Already Linked         : ${skippedAlreadyLinked}`);
    console.log(`Newly Linked           : ${linkedCount}`);
    console.log(`Unlinked (Missing/Null): ${unlinkedCount}`);
    console.log(`Ambiguous (Skipped)    : ${ambiguousCount}`);

    if (unlinkedVoyagesList.length > 0) {
      console.log('\nUnlinked Voyages Requiring Manual UI Assignment:');
      console.log(JSON.stringify(unlinkedVoyagesList, null, 2));
    }

    console.log('=== VOYAGE BACKFILL COMPLETE ===');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
