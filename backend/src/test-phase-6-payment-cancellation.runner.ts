import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ForexService } from './modules/forex/forex.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { Prisma } from '@prisma/client';

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('=== PHASE 6: PAYMENT CANCELLATION FINANCIAL TESTS ===');
  console.log('====================================================\n');

  class MockForexService extends ForexService {
    async getEurToMadRate(dateStr?: string) {
      return {
        rate: new Prisma.Decimal(10.75),
        date: dateStr ? dateStr.split('T')[0] : '2026-09-10',
        source: 'FRANKFURTER_BAM',
      };
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);
  const voyagesService = app.get(VoyagesService);
  const creancesService = app.get(CreancesClientsService);
  const gestionPaiementsService = app.get(GestionPaiementsService);
  const dashboardService = app.get(DashboardService);
  const dettesFournisseursService = app.get(DettesFournisseursService);
  const paiementsFournisseursService = app.get(PaiementsFournisseursService);
  const paiementsClientsService = new PaiementsClientsService(
    prisma,
    creancesService,
    new MockForexService(),
  );

  let companyAId: number;
  let companyBId: number;
  let userAId: number = 1;

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✗ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedCount++;
    }
  }

  try {
    console.log('[SETUP] Initializing clean test environment for Company A & B...');

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_PHASE6_COMP_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_PHASE6_COMP_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_PHASE6_COMP_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_PHASE6_COMP_B' } });
    companyBId = compB.id;

    const firstUser = await prisma.user.findFirst({ where: { companyId: companyAId } });
    if (firstUser) userAId = firstUser.id;

    // Clean test data for company A & B
    await prisma.lettreDeChange.deleteMany({
      where: {
        OR: [
          { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
          { paiementFournisseur: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } } },
        ],
      },
    });
    await prisma.cheque.deleteMany({
      where: {
        OR: [
          { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
          { paiementFournisseur: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } } },
        ],
      },
    });
    await prisma.paiementFournisseur.deleteMany({
      where: { detteFournisseur: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.depenseVehicule.deleteMany({
      where: { vehicule: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await prisma.fournisseur.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });

    await prisma.paiementClient.deleteMany({
      where: { facture: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.creanceClient.deleteMany({
      where: { facture: { companyId: { in: [companyAId, companyBId] } } },
    });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.client.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    const clientA = await prisma.client.create({
      data: { companyId: companyAId, nomEntreprise: 'CLIENT_P6_A', deviseFacturation: 'MAD' },
    });
    const clientB = await prisma.client.create({
      data: { companyId: companyBId, nomEntreprise: 'CLIENT_P6_B', deviseFacturation: 'MAD' },
    });

    const year = new Date().getFullYear();
    const seqA = await prisma.invoiceSequence.findFirst({ where: { companyId: companyAId, annee: year } });
    if (!seqA) {
      await prisma.invoiceSequence.create({ data: { companyId: companyAId, annee: year, dernierNumero: 7000 } });
    }
    const seqB = await prisma.invoiceSequence.findFirst({ where: { companyId: companyBId, annee: year } });
    if (!seqB) {
      await prisma.invoiceSequence.create({ data: { companyId: companyBId, annee: year, dernierNumero: 8000 } });
    }

    const pfSeqA = await prisma.paiementFournisseurSequence.findFirst({ where: { companyId: companyAId, annee: year } });
    if (!pfSeqA) {
      await prisma.paiementFournisseurSequence.create({ data: { companyId: companyAId, annee: year, dernierNumero: 9000 } });
    } else {
      await prisma.paiementFournisseurSequence.update({
        where: { companyId_annee: { companyId: companyAId, annee: year } },
        data: { dernierNumero: pfSeqA.dernierNumero + 100 },
      });
    }

    async function createTestInvoice(companyId: number, clientId: number, totalTTC: number) {
      const voyage = await voyagesService.create(companyId, {
        idClient: clientId,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        dateChargement: '2026-10-01',
        montantVoyage: totalTTC / 1.2,
        devise: 'MAD',
      });

      const factureView = await facturesService.create(
        { idVoyage: voyage.idVoyage, dateFacture: '2026-10-01', joursEcheance: 30, tauxTva: 20 },
        companyId,
      );

      const facture = await prisma.facture.findUnique({
        where: { id: factureView.id },
        include: { creance: true },
      });
      return facture!;
    }

    console.log('\n--- EXECUTING MANDATORY TESTS A THROUGH L ---\n');

    // TEST A: Active payment contributes to invoice montantPaye
    const invA = await createTestInvoice(companyAId, clientA.id, 12000);
    const pA = await paiementsClientsService.create(companyAId, {
      numeroFacture: invA.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-10-02',
    }, userAId);

    const fAView = await facturesService.findOne(invA.id, companyAId);
    assert(
      Number(fAView.montantPaye) === 4000 && Number(fAView.soldeRestant) === 8000,
      'Test A (real Prisma/PostgreSQL integration): Active payment contributes to invoice montantPaye (4000 EUR paid, 8000 solde)'
    );

    // TEST B & C & D: Cancelled payment does NOT contribute to invoice montantPaye, soldeRestant, or status
    await paiementsClientsService.cancel(pA.id, { motifAnnulation: 'Test Cancellation' }, companyAId, userAId);
    const fACancelledView = await facturesService.findOne(invA.id, companyAId);
    assert(
      Number(fACancelledView.montantPaye) === 0 &&
        Number(fACancelledView.soldeRestant) === 12000 &&
        fACancelledView.statut === 'EMISE',
      'Test B, C, D (real Prisma/PostgreSQL integration): Cancelled payment resets montantPaye to 0, soldeRestant to 12000, statut to EMISE'
    );

    // SPECIFIC CASE F017/2026 REGRESSION SCENARIO
    const invF017 = await createTestInvoice(companyAId, clientA.id, 4800);
    const pREG0314 = await paiementsClientsService.create(companyAId, {
      numeroFacture: invF017.numeroFacture,
      montantRecu: 3000,
      methodePaiement: 'VIREMENT' as any,
      datePaiement: '2026-10-03',
    }, userAId);

    // Verify initially partially paid
    let fF017View = await facturesService.findOne(invF017.id, companyAId);
    assert(fF017View.statut === 'PARTIELLEMENT_PAYEE', 'Regression F017/2026: Initially PARTIELLEMENT_PAYEE with 3000 EUR payment');

    // Cancel REG-0314
    await paiementsClientsService.cancel(pREG0314.id, { motifAnnulation: 'Client cancelled payment' }, companyAId, userAId);
    fF017View = await facturesService.findOne(invF017.id, companyAId);
    assert(
      Number(fF017View.montantPaye) === 0 &&
        Number(fF017View.soldeRestant) === 4800 &&
        fF017View.statut === 'EMISE',
      'Regression F017/2026: After payment cancellation, F017/2026 reports montantPaye = 0, soldeRestant = 4800, statut != PARTIELLEMENT_PAYEE'
    );

    // TEST E: isFacturePayeeInTx ignores cancelled payments
    await prisma.$transaction(async (tx) => {
      const { isPayee } = await facturesService.isFacturePayeeInTx(tx, companyAId, { factureId: invF017.id });
      assert(!isPayee, 'Test E (real Prisma/PostgreSQL integration): isFacturePayeeInTx returns false when invoice payments are cancelled');
    });

    // TEST F & G: GestionPaiements CLIENT_PAYMENT exposes ACTIVE/CANCELLED and stats exclude cancelled
    const invG = await createTestInvoice(companyAId, clientA.id, 10000);
    const pActive = await paiementsClientsService.create(companyAId, {
      numeroFacture: invG.numeroFacture,
      montantRecu: 2000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-10-04',
    }, userAId);

    const pCancel = await paiementsClientsService.create(companyAId, {
      numeroFacture: invG.numeroFacture,
      montantRecu: 3000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-10-04',
    }, userAId);

    await paiementsClientsService.cancel(pCancel.id, { motifAnnulation: 'Cancel test' }, companyAId, userAId);

    const gestionMovements = await gestionPaiementsService.findAll(companyAId, { page: 1, limit: 100, status: undefined }, null, 'ADMIN');
    const activeMov = gestionMovements.data.find((m) => m.sourceId === pActive.id);
    const cancelMov = gestionMovements.data.find((m) => m.sourceId === pCancel.id);

    assert(
      activeMov?.status === 'ACTIVE' && activeMov?.isCancelled === false,
      'Test F1 (HTTP/API service integration): GestionPaiements exposes status ACTIVE for active payment'
    );
    assert(
      cancelMov?.status === 'CANCELLED' && cancelMov?.isCancelled === true,
      'Test F2 (HTTP/API service integration): GestionPaiements exposes status CANCELLED for cancelled payment'
    );

    const gestionStats = await gestionPaiementsService.findStats(companyAId, { page: 1, limit: 100 }, null, 'ADMIN');
    assert(
      Number(gestionStats.totalIn) === 2000,
      'Test G (HTTP/API service integration): GestionPaiements stats totalIn excludes cancelled payments (totalIn = 2000 EUR, not 5000)'
    );

    // TEST H: Dashboard recent activity excludes cancelled client payments
    const todayStr = new Date().toISOString().split('T')[0];
    const recentActivity = await dashboardService.getRecentActivity(
      companyAId,
      { preset: 'CE_MOIS', dateDebut: `${todayStr.slice(0, 7)}-01`, dateFin: `${todayStr.slice(0, 7)}-31` },
      null,
      true
    );

    const cancelledInActivity = recentActivity.some((item) => item.activityId === `CLIENT_PAYMENT:${pCancel.id}`);
    const activeInActivity = recentActivity.some((item) => item.activityId === `CLIENT_PAYMENT:${pActive.id}`);

    assert(
      !cancelledInActivity && activeInActivity,
      'Test H (real Prisma/PostgreSQL integration): Dashboard getRecentActivity includes active payment and excludes cancelled client payment'
    );

    // TEST I: PaiementsClients stats still exclude cancelled payments
    const clientStats = await paiementsClientsService.findStats(companyAId);
    assert(
      clientStats.montantTotalRecu === 2000 && clientStats.cancelledCount >= 2,
      'Test I (real Prisma/PostgreSQL integration): PaiementsClients findStats excludes cancelled payments from montantTotalRecu'
    );

    // TEST J: Creance recalculation still excludes cancelled payments
    const creanceG = await prisma.creanceClient.findFirst({ where: { factureId: invG.id } });
    assert(
      Number(creanceG?.montantRecu) === 2000 && Number(creanceG?.solde) === 8000,
      'Test J (real Prisma/PostgreSQL integration): CreanceClient montantRecu equals 2000 EUR (active total only)'
    );

    // TEST K: Supplier payment calculations remain intact
    let supplier = await prisma.fournisseur.findFirst({ where: { companyId: companyAId, nomFournisseur: 'SUPPLIER_P6_A' } });
    if (!supplier) {
      supplier = await prisma.fournisseur.create({
        data: { companyId: companyAId, nomFournisseur: 'SUPPLIER_P6_A' },
      });
    }

    const debt = await dettesFournisseursService.create(companyAId, {
      idFournisseur: supplier.id,
      montantDu: 5000,
      dateDette: '2026-10-01',
      delaiPaiementJours: 30,
    }, userAId);

    const vSupplier = await paiementsFournisseursService.createVersement(debt.id, {
      montant: 2000,
      modePaiement: 'VIREMENT' as any,
      datePaiement: '2026-10-02',
    }, companyAId, userAId);

    const debtAfterPay = await dettesFournisseursService.findOne(debt.id, companyAId);
    assert(
      debtAfterPay.montantPaye === 2000 && debtAfterPay.soldeRestant === 3000,
      'Test K (real Prisma/PostgreSQL integration): Supplier debt calculation intact (paid 2000, solde 3000)'
    );

    // TEST L: Tenant isolation remains intact
    const invCompB = await createTestInvoice(companyBId, clientB.id, 5000);
    const pCompB = await paiementsClientsService.create(companyBId, {
      numeroFacture: invCompB.numeroFacture,
      montantRecu: 1500,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-10-03',
    }, userAId);

    const facturesCompA = await facturesService.findAll(companyAId, { page: 1, limit: 100 });
    const containsCompB = facturesCompA.data.some((f) => f.id === invCompB.id);

    assert(
      !containsCompB,
      'Test L (real Prisma/PostgreSQL integration): Tenant isolation intact (Company A queries do not return Company B invoices)'
    );

    console.log('\n====================================================');
    console.log(`=== TEST SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED ===`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('CRITICAL ERROR IN TEST RUNNER:', err);
  } finally {
    await app.close();
  }
}

runPhase6Tests().catch(console.error);
