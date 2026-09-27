import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runReadinessAudit() {
  console.log('====================================================');
  console.log('=== PHASE 7 DATABASE MIGRATION READINESS AUDIT ===');
  console.log('====================================================\n');

  try {
    // 1. Total counts
    const totalCompanies = await prisma.company.count();
    const totalFactures = await prisma.facture.count();
    const totalPaiements = await prisma.paiementClient.count();
    const totalCreances = await prisma.creanceClient.count();

    console.log('--- TOTAL RECORD COUNTS ---');
    console.log(`- Companies      : ${totalCompanies}`);
    console.log(`- Factures       : ${totalFactures}`);
    console.log(`- PaiementsClient: ${totalPaiements}`);
    console.log(`- CreancesClient : ${totalCreances}\n`);

    // 2. Orphan PaiementClient rows (numeroFacture not in Facture)
    const allPaiements = await prisma.paiementClient.findMany({
      select: { id: true, numeroFacture: true },
    });
    const allFactures = await prisma.facture.findMany({
      select: { id: true, numeroFacture: true, companyId: true },
    });

    const factureMapByNum = new Map<string, { id: number; companyId: number }>();
    for (const f of allFactures) {
      factureMapByNum.set(f.numeroFacture, { id: f.id, companyId: f.companyId });
    }

    const orphanPaiements = allPaiements.filter((p) => !factureMapByNum.has(p.numeroFacture));

    // 3. Orphan CreanceClient rows (numeroFacture not in Facture)
    const allCreances = await prisma.creanceClient.findMany({
      select: { id: true, numeroFacture: true },
    });
    const orphanCreances = allCreances.filter((c) => !factureMapByNum.has(c.numeroFacture));

    console.log('--- ORPHAN RECORD ANALYSIS ---');
    console.log(`- Orphan PaiementClient records : ${orphanPaiements.length}`);
    if (orphanPaiements.length > 0) {
      console.log('  Details:', JSON.stringify(orphanPaiements, null, 2));
    }

    console.log(`- Orphan CreanceClient records  : ${orphanCreances.length}`);
    if (orphanCreances.length > 0) {
      console.log('  Details:', JSON.stringify(orphanCreances, null, 2));
    }

    // 4. Duplicate invoice numbers analysis across and inside companies
    const numToCompanies = new Map<string, Set<number>>();
    const numToCompanyCount = new Map<string, number>();

    for (const f of allFactures) {
      if (!numToCompanies.has(f.numeroFacture)) {
        numToCompanies.set(f.numeroFacture, new Set());
      }
      numToCompanies.get(f.numeroFacture)!.add(f.companyId);
      numToCompanyCount.set(f.numeroFacture, (numToCompanyCount.get(f.numeroFacture) || 0) + 1);
    }

    const crossCompanyDuplicates: { numeroFacture: string; companies: number[] }[] = [];
    const intraCompanyDuplicates: { numeroFacture: string; count: number }[] = [];

    for (const [num, compSet] of numToCompanies.entries()) {
      if (compSet.size > 1) {
        crossCompanyDuplicates.push({ numeroFacture: num, companies: Array.from(compSet) });
      }
    }

    for (const [num, count] of numToCompanyCount.entries()) {
      if (count > 1) {
        intraCompanyDuplicates.push({ numeroFacture: num, count });
      }
    }

    console.log('\n--- INVOICE NUMBER COLLISION ANALYSIS ---');
    console.log(`- Duplicate numeroFacture across different companies : ${crossCompanyDuplicates.length}`);
    if (crossCompanyDuplicates.length > 0) {
      console.log('  Details:', JSON.stringify(crossCompanyDuplicates, null, 2));
    }

    console.log(`- Duplicate numeroFacture inside the same company   : ${intraCompanyDuplicates.length}`);
    if (intraCompanyDuplicates.length > 0) {
      console.log('  Details:', JSON.stringify(intraCompanyDuplicates, null, 2));
    }

    // 5. Invalid / NULL companyId in Facture
    const nullCompanyFactures = allFactures.filter((f) => !f.companyId || f.companyId <= 0);
    console.log(`\n- Factures with NULL/invalid companyId             : ${nullCompanyFactures.length}`);

    // 6. Non-backfillable records total
    const nonBackfillablePaiements = orphanPaiements.length;
    const nonBackfillableCreances = orphanCreances.length;
    console.log(`- Non-backfillable PaiementClient records         : ${nonBackfillablePaiements}`);
    console.log(`- Non-backfillable CreanceClient records          : ${nonBackfillableCreances}`);

    console.log('\n====================================================');
    console.log('=== AUDIT COMPLETE ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ Audit Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runReadinessAudit();
