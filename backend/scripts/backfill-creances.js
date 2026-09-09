const { PrismaClient, CreanceStatut } = require('@prisma/client');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.error('Usage: node scripts/backfill-creances.js [--dry-run | --execute]');
    process.exit(1);
  }

  console.log(`=== BACKFILL CREANCES CLIENTS (Mode: ${isDryRun ? 'DRY-RUN' : 'EXECUTE'}) ===`);

  const prisma = new PrismaClient();

  let scannedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  let conflictedCount = 0;

  try {
    const activeFactures = await prisma.facture.findMany({
      where: {
        supprimeLe: null,
      },
      include: {
        creance: true,
      },
      orderBy: { id: 'asc' },
    });

    scannedCount = activeFactures.length;
    console.log(`Scanned ${scannedCount} active invoices...`);

    for (const facture of activeFactures) {
      if (facture.creance) {
        skippedCount++;
        continue;
      }

      // Check if a CreanceClient already exists for this numeroFacture
      const existing = await prisma.creanceClient.findUnique({
        where: { numeroFacture: facture.numeroFacture },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Compute authoritative montantTotal (TTC)
      const sousTotalNum = Number(facture.sousTotal ?? 0);
      const tauxTvaNum = Number(facture.tauxTva ?? 20);
      const montantTva = Math.round(sousTotalNum * (tauxTvaNum / 100) * 100) / 100;
      const montantTotal =
        facture.montantTotal !== null && facture.montantTotal !== undefined
          ? Number(facture.montantTotal)
          : sousTotalNum + montantTva;

      let dateEcheance = facture.dateEcheance;
      if (!dateEcheance) {
        dateEcheance = new Date(facture.dateFacture);
        dateEcheance.setDate(dateEcheance.getDate() + (facture.joursEcheance || 30));
      }

      let initialStatut = CreanceStatut.NON_PAYE;
      if (dateEcheance < new Date()) {
        initialStatut = CreanceStatut.EN_RETARD;
      }

      if (isDryRun) {
        console.log(`[DRY-RUN WOULD CREATE] Creance for Facture "${facture.numeroFacture}": Client="${facture.nomClient}", Montant=${montantTotal} MAD`);
        createdCount++;
      } else {
        try {
          await prisma.creanceClient.create({
            data: {
              numeroFacture: facture.numeroFacture,
              nomClient: facture.nomClient,
              dateEmission: facture.dateFacture,
              delaiPaiementJours: facture.joursEcheance || 30,
              montantFacture: montantTotal,
              montantRecu: 0,
              dateEcheance,
              statutPaiement: initialStatut,
            },
          });
          console.log(`[CREATED] Creance for Facture "${facture.numeroFacture}": Montant=${montantTotal} MAD`);
          createdCount++;
        } catch (err) {
          if (err.code === 'P2002') {
            console.warn(`[CONFLICT P2002] Creance for Facture "${facture.numeroFacture}" already exists.`);
            conflictedCount++;
          } else {
            throw err;
          }
        }
      }
    }

    console.log('--- SUMMARY ---');
    console.log(`Scanned    : ${scannedCount}`);
    console.log(`Created    : ${createdCount}`);
    console.log(`Skipped    : ${skippedCount}`);
    console.log(`Conflicted : ${conflictedCount}`);
    console.log('=== BACKFILL COMPLETE ===');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed with error:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
