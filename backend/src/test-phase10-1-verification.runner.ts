import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { ForexService } from './modules/forex/forex.service';
import { Prisma } from '@prisma/client';

async function verifyPhase10_1() {
  console.log('====================================================');
  console.log('=== PHASE 10.1: VERIFICATION TEST RUNNER ===');
  console.log('====================================================\n');

  class MockForexService extends ForexService {
    async getEurToMadRate(dateStr?: string) {
      return {
        rate: new Prisma.Decimal(10.75),
        date: dateStr ? dateStr.split('T')[0] : '2026-10-19',
        source: 'FRANKFURTER_BAM',
      };
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const voyagesService = app.get(VoyagesService);
  const creancesService = app.get(CreancesClientsService);
  const paiementsService = new PaiementsClientsService(
    prisma,
    creancesService,
    new MockForexService(),
  );

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    let comp = await prisma.company.findFirst({ where: { nom: 'TEST_PHASE10_1_COMP' } });
    if (!comp) comp = await prisma.company.create({ data: { nom: 'TEST_PHASE10_1_COMP' } });
    const companyId = comp.id;

    // Clean previous records
    await prisma.lettreDeChange.deleteMany({
      where: { paiementClient: { facture: { companyId } } },
    });
    await prisma.cheque.deleteMany({
      where: { paiementClient: { facture: { companyId } } },
    });
    await prisma.paiementClient.deleteMany({
      where: { facture: { companyId } },
    });
    await prisma.creanceClient.deleteMany({
      where: { facture: { companyId } },
    });
    await prisma.facture.deleteMany({ where: { companyId } });
    await prisma.voyage.deleteMany({ where: { companyId } });
    await prisma.client.deleteMany({ where: { companyId } });

    const client = await prisma.client.create({
      data: { companyId, nomEntreprise: 'CLIENT_PHASE_10_1', deviseFacturation: 'MAD' },
    });

    const voyage = await voyagesService.create(companyId, {
      idClient: client.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Rabat',
      dateChargement: '2026-10-19',
      montantVoyage: 10000,
      devise: 'MAD',
    });

    const facture = await facturesService.create(
      { idVoyage: voyage.idVoyage, dateFacture: '2026-10-19', joursEcheance: 30, tauxTva: 20 },
      companyId,
    );

    // 1. Create active payment
    const payment = await paiementsService.create(companyId, {
      numeroFacture: facture.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'CHEQUE' as any,
      datePaiement: '2026-10-19',
      chequeNumero: 'CHQ-10-1',
      chequeBanque: 'ATTIJARIWAFA',
      chequeDateCheque: '2026-10-19',
      chequeBeneficiaire: 'TRANSIVO',
    });

    assert(payment.estAnnule === false, 'Payment created with estAnnule = false');
    assert(payment.cheque?.statutBancaire === 'EN_PORTEFEUILLE', 'Child cheque created with status EN_PORTEFEUILLE');

    // 2. Verify findAll() includes active payment
    const initialList = await paiementsService.findAll(companyId);
    assert(
      initialList.data.some((p) => p.id === payment.id),
      'findAll() includes active payment',
    );

    // 3. Logically delete/cancel payment
    const cancelled = await paiementsService.cancel(
      payment.id,
      { motifAnnulation: 'Annulation demandée par client' },
      companyId,
      1,
    );
    assert(cancelled.estAnnule === true, 'Logical cancellation sets estAnnule = true');
    assert(cancelled.motifAnnulation === 'Annulation demandée par client', 'motifAnnulation stored');

    // 4. Verify record remains in database
    const dbRecord = await prisma.paiementClient.findUnique({
      where: { id: payment.id },
      include: { cheque: true },
    });
    assert(dbRecord !== null, 'Record is NOT permanently deleted, remains in database');
    assert(dbRecord?.estAnnule === true, 'Database record has estAnnule = true');
    assert(dbRecord?.cheque?.statutBancaire === 'ANNULE', 'Child cheque status transitioned to ANNULE');

    // 5. Verify default findAll() excludes cancelled payments
    const defaultList = await paiementsService.findAll(companyId);
    assert(
      !defaultList.data.some((p) => p.id === payment.id),
      'Default findAll() excludes cancelled payments (shows active payments only)',
    );

    // 6. Verify findAll({ includeCancelled: true }) can retrieve cancelled payments
    const allList = await paiementsService.findAll(companyId, { includeCancelled: true });
    assert(
      allList.data.some((p) => p.id === payment.id),
      'findAll({ includeCancelled: true }) retrieves cancelled payment for audit traversal',
    );

    // 7. Verify findOne() retrieves cancelled payment
    const detail = await paiementsService.findOne(payment.id, companyId);
    assert(detail.id === payment.id && detail.estAnnule === true, 'findOne() preserves direct lookup and audit detail');

    // 8. Verify findStats() excludes cancelled payments from montantTotalRecu
    const stats = await paiementsService.findStats(companyId);
    assert(
      stats.montantTotalRecu === 0 && stats.totalPaiements === 0 && stats.cancelledCount === 1,
      'findStats() excludes cancelled payment from financial total and active count',
    );

    // 9. Verify invoice settlement exclusion
    const factureAfter = await facturesService.findOne(facture.id, companyId);
    assert(
      Number(factureAfter.montantPaye) === 0 && Number(factureAfter.soldeRestant) === 12000,
      'Invoice balance recalculated: montantPaye = 0, soldeRestant = 12000',
    );

    console.log(`\n====================================================`);
    console.log(`=== SUMMARY: ${passed} PASSED / ${failed} FAILED ===`);
    console.log(`====================================================\n`);
  } finally {
    await app.close();
  }
}

verifyPhase10_1().catch((err) => {
  console.error(err);
  process.exit(1);
});
