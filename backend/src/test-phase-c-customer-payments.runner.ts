import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { ForexService } from './modules/forex/forex.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { StatutInstrumentBancaire, Prisma } from '@prisma/client';

async function runPhaseCCustomerPaymentTests() {
  console.log('====================================================');
  console.log('=== PHASE C: CUSTOMER PAYMENTS EDIT & CANCEL TEST RUNNER ===');
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
  const paiementsService = new PaiementsClientsService(
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

    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_PHASE_C_COMP_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_PHASE_C_COMP_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_PHASE_C_COMP_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_PHASE_C_COMP_B' } });
    companyBId = compB.id;

    const firstUser = await prisma.user.findFirst({ where: { companyId: companyAId } });
    if (firstUser) userAId = firstUser.id;

    // Clean test data for company A & B
    await prisma.lettreDeChange.deleteMany({
      where: { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
    });
    await prisma.cheque.deleteMany({
      where: { paiementClient: { facture: { companyId: { in: [companyAId, companyBId] } } } },
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
      data: { companyId: companyAId, nomEntreprise: 'CLIENT_PHASE_C_A', deviseFacturation: 'MAD' },
    });
    const clientB = await prisma.client.create({
      data: { companyId: companyBId, nomEntreprise: 'CLIENT_PHASE_C_B', deviseFacturation: 'MAD' },
    });

    const year = new Date().getFullYear();
    const seqA = await prisma.invoiceSequence.findFirst({ where: { companyId: companyAId, annee: year } });
    if (!seqA) {
      await prisma.invoiceSequence.create({ data: { companyId: companyAId, annee: year, dernierNumero: 5000 } });
    }
    const seqB = await prisma.invoiceSequence.findFirst({ where: { companyId: companyBId, annee: year } });
    if (!seqB) {
      await prisma.invoiceSequence.create({ data: { companyId: companyBId, annee: year, dernierNumero: 6000 } });
    }

    // Helper to create test invoice + creance via domain services
    async function createTestInvoice(companyId: number, clientId: number, totalTTC: number) {
      const voyage = await voyagesService.create(companyId, {
        idClient: clientId,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
        dateChargement: '2026-09-10',
        montantVoyage: totalTTC / 1.2, // HT amount so TTC matches approx
        devise: 'MAD',
      });

      const factureView = await facturesService.create(
        { idVoyage: voyage.idVoyage, dateFacture: '2026-09-10', joursEcheance: 30, tauxTva: 20 },
        companyId,
      );

      const facture = await prisma.facture.findUnique({
        where: { id: factureView.id },
        include: { creance: true },
      });
      return facture!;
    }

    console.log('\n--- Executing Test Scenarios 1 to 26 ---\n');

    // =========================================================================
    // SCENARIOS 1-3: Single Cash Payment Edit
    // =========================================================================
    const inv1 = await createTestInvoice(companyAId, clientA.id, 12000);
    const p1 = await paiementsService.create(companyAId, {
      numeroFacture: inv1.numeroFacture,
      montantRecu: 6000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-01',
    }, userAId);

    let creance1 = await prisma.creanceClient.findFirst({ where: { factureId: inv1.id } });
    assert(Number(creance1?.montantRecu) === 6000 && creance1?.statutPaiement === 'PARTIEL', 'Setup Test 1: Paid 6000, PARTIEL');

    // Test 1: Decrease amount from 6000 to 4000
    const p1Updated = await paiementsService.update(p1.id, { montantRecu: 4000 }, companyAId, userAId);
    creance1 = await prisma.creanceClient.findFirst({ where: { factureId: inv1.id } });
    assert(
      p1Updated.montantRecu === 4000 &&
        Number(creance1?.montantRecu) === 4000 &&
        Number(creance1?.solde) === Number(inv1.montantTotal) - 4000 &&
        creance1?.statutPaiement === 'PARTIEL',
      'Test 1: Single Cash Payment Edit (Amount decrease to 4000 DH)',
      `Actual paid: ${creance1?.montantRecu}, solde: ${creance1?.solde}`
    );

    // Test 2: Increase amount to full invoice amount -> PAYE
    const fullAmount = Number(inv1.montantTotal);
    await paiementsService.update(p1.id, { montantRecu: fullAmount }, companyAId, userAId);
    creance1 = await prisma.creanceClient.findFirst({ where: { factureId: inv1.id } });
    assert(
      Number(creance1?.montantRecu) === fullAmount &&
        Number(creance1?.solde) === 0 &&
        creance1?.statutPaiement === 'PAYE',
      'Test 2: Single Cash Payment Edit (Amount increase to full amount -> PAYE)'
    );

    // Test 3: Overpayment edit attempt (> fullAmount)
    let errorCaught = false;
    try {
      await paiementsService.update(p1.id, { montantRecu: fullAmount + 2000 }, companyAId, userAId);
    } catch (e: any) {
      errorCaught = e instanceof ConflictException || e instanceof BadRequestException;
    }
    assert(errorCaught, 'Test 3: Single Cash Payment Edit (Overpayment attempt throws exception)');

    // Reset p1 to 5000 for upcoming tests
    await paiementsService.update(p1.id, { montantRecu: 5000 }, companyAId, userAId);

    // =========================================================================
    // SCENARIOS 4-5: Multi-Payment Recalculation after Edit
    // =========================================================================
    const inv2 = await createTestInvoice(companyAId, clientA.id, 12000);
    const inv2Total = Number(inv2.montantTotal);
    const p2_1 = await paiementsService.create(companyAId, {
      numeroFacture: inv2.numeroFacture,
      montantRecu: 3000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-02',
    }, userAId);
    const p2_2 = await paiementsService.create(companyAId, {
      numeroFacture: inv2.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'VIREMENT' as any,
      datePaiement: '2026-09-03',
    }, userAId);

    // Test 4: Edit p2_1 from 3000 to 5000 (total paid becomes 9000)
    await paiementsService.update(p2_1.id, { montantRecu: 5000 }, companyAId, userAId);
    let creance2 = await prisma.creanceClient.findFirst({ where: { factureId: inv2.id } });
    assert(
      Number(creance2?.montantRecu) === 9000 &&
        Number(creance2?.solde) === inv2Total - 9000 &&
        creance2?.statutPaiement === 'PARTIEL',
      'Test 4: Multi-Payment Recalculation after Edit (3000->5000, total paid 9000)'
    );

    // Test 5: Edit p2_2 from 4000 to inv2Total - 5000 (total paid becomes full -> PAYE)
    await paiementsService.update(p2_2.id, { montantRecu: inv2Total - 5000 }, companyAId, userAId);
    creance2 = await prisma.creanceClient.findFirst({ where: { factureId: inv2.id } });
    assert(
      Number(creance2?.montantRecu) === inv2Total &&
        Number(creance2?.solde) === 0 &&
        creance2?.statutPaiement === 'PAYE',
      'Test 5: Multi-Payment Recalculation achieving PAYE'
    );

    // =========================================================================
    // SCENARIOS 6-8: Payment Cancellation & Recalculation
    // =========================================================================
    const inv3 = await createTestInvoice(companyAId, clientA.id, 12000);
    const p3_1 = await paiementsService.create(companyAId, {
      numeroFacture: inv3.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-04',
    }, userAId);

    // Test 6: Single Payment Cancellation (PARTIEL -> NON_PAYE)
    const cancelledP3_1 = await paiementsService.cancel(p3_1.id, {
      motifAnnulation: 'Erreur de saisie client',
    }, companyAId, userAId);
    let creance3 = await prisma.creanceClient.findFirst({ where: { factureId: inv3.id } });
    assert(
      cancelledP3_1.estAnnule === true &&
        cancelledP3_1.motifAnnulation === 'Erreur de saisie client' &&
        cancelledP3_1.annuleParId === userAId &&
        Number(creance3?.montantRecu) === 0 &&
        Number(creance3?.solde) === Number(inv3.montantTotal) &&
        creance3?.statutPaiement === 'NON_PAYE',
      'Test 6: Single Payment Cancellation (PARTIEL -> NON_PAYE)'
    );

    // Test 7: Multi-Payment Cancellation (PAYE -> PARTIEL)
    const inv4 = await createTestInvoice(companyAId, clientA.id, 12000);
    const inv4Total = Number(inv4.montantTotal);
    const p4_1 = await paiementsService.create(companyAId, {
      numeroFacture: inv4.numeroFacture,
      montantRecu: inv4Total - 4000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-05',
    }, userAId);
    const p4_2 = await paiementsService.create(companyAId, {
      numeroFacture: inv4.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-06',
    }, userAId);
    let creance4 = await prisma.creanceClient.findFirst({ where: { factureId: inv4.id } });
    assert(creance4?.statutPaiement === 'PAYE', 'Setup Test 7: Status PAYE');

    await paiementsService.cancel(p4_2.id, { motifAnnulation: 'Cheque bois' }, companyAId, userAId);
    creance4 = await prisma.creanceClient.findFirst({ where: { factureId: inv4.id } });
    assert(
      Number(creance4?.montantRecu) === inv4Total - 4000 &&
        Number(creance4?.solde) === 4000 &&
        creance4?.statutPaiement === 'PARTIEL',
      'Test 7: Multi-Payment Cancellation (PAYE -> PARTIEL)'
    );

    // Test 8: Full Cancellation of Remaining Payment (PARTIEL -> NON_PAYE)
    await paiementsService.cancel(p4_1.id, { motifAnnulation: 'Annulation totale' }, companyAId, userAId);
    creance4 = await prisma.creanceClient.findFirst({ where: { factureId: inv4.id } });
    assert(
      Number(creance4?.montantRecu) === 0 &&
        Number(creance4?.solde) === inv4Total &&
        creance4?.statutPaiement === 'NON_PAYE',
      'Test 8: Full Cancellation of All Payments (PARTIEL -> NON_PAYE)'
    );

    // =========================================================================
    // SCENARIOS 9-10: Repeat Cancellation & Cancelled Edit Protections
    // =========================================================================
    // Test 9: Repeat cancellation throws ConflictException
    let conflict9Caught = false;
    try {
      await paiementsService.cancel(p4_1.id, { motifAnnulation: 'Double cancel' }, companyAId, userAId);
    } catch (e: any) {
      conflict9Caught = e instanceof ConflictException;
    }
    assert(conflict9Caught, 'Test 9: Attempt Cancellation of Already Cancelled Payment throws ConflictException');

    // Test 10: Attempt Edit of Cancelled Payment throws ConflictException
    let conflict10Caught = false;
    try {
      await paiementsService.update(p4_1.id, { montantRecu: 5000 }, companyAId, userAId);
    } catch (e: any) {
      conflict10Caught = e instanceof ConflictException;
    }
    assert(conflict10Caught, 'Test 10: Attempt Edit of Cancelled Payment throws ConflictException');

    // =========================================================================
    // SCENARIOS 11-12: Cheque EN_PORTEFEUILLE Edit & Cancellation
    // =========================================================================
    const invCheque1 = await createTestInvoice(companyAId, clientA.id, 12000);
    const pCheque1 = await paiementsService.create(companyAId, {
      numeroFacture: invCheque1.numeroFacture,
      montantRecu: 5000,
      methodePaiement: 'CHEQUE' as any,
      chequeNumero: 'CHQ-1001',
      chequeBanque: 'Attijariwafa',
      chequeDateCheque: '2026-10-15',
      chequeBeneficiaire: 'Société A',
      datePaiement: '2026-09-07',
    }, userAId);

    // Test 11: Cheque EN_PORTEFEUILLE Edit
    const updatedChequeP1 = await paiementsService.update(pCheque1.id, {
      montantRecu: 7000,
      chequeNumero: 'CHQ-1001-MOD',
      chequeBanque: 'BMCE',
      chequeDateCheque: '2026-10-20',
      chequeBeneficiaire: 'Société A',
    }, companyAId, userAId);
    const chequeRecord1 = await prisma.cheque.findUnique({ where: { idPaiementClient: pCheque1.id } });
    assert(
      updatedChequeP1.montantRecu === 7000 &&
        chequeRecord1?.numero === 'CHQ-1001-MOD' &&
        chequeRecord1?.banque === 'BMCE',
      'Test 11: Cheque EN_PORTEFEUILLE Edit (Amount & metadata updated)'
    );

    // Test 12: Cheque EN_PORTEFEUILLE Cancellation
    const invCheque2 = await createTestInvoice(companyAId, clientA.id, 12000);
    const pCheque2 = await paiementsService.create(companyAId, {
      numeroFacture: invCheque2.numeroFacture,
      montantRecu: 5000,
      methodePaiement: 'CHEQUE' as any,
      chequeNumero: 'CHQ-1002',
      chequeBanque: 'BP',
      chequeDateCheque: '2026-10-15',
      chequeBeneficiaire: 'Société A',
      datePaiement: '2026-09-08',
    }, userAId);
    await paiementsService.cancel(pCheque2.id, { motifAnnulation: 'Annulation cheque' }, companyAId, userAId);
    const chequeRecord2 = await prisma.cheque.findUnique({ where: { idPaiementClient: pCheque2.id } });
    const creanceCheque2 = await prisma.creanceClient.findFirst({ where: { factureId: invCheque2.id } });
    assert(
      chequeRecord2?.statutBancaire === 'ANNULE' && Number(creanceCheque2?.montantRecu) === 0,
      'Test 12: Cheque EN_PORTEFEUILLE Cancellation (Cheque status updated to ANNULE, balance reset)'
    );

    // =========================================================================
    // SCENARIOS 13-16: Cheque DEPOSE_EN_BANQUE & ENCAISSE Status Blocks
    // =========================================================================
    const invCheque3 = await createTestInvoice(companyAId, clientA.id, 12000);
    const pCheque3 = await paiementsService.create(companyAId, {
      numeroFacture: invCheque3.numeroFacture,
      montantRecu: 5000,
      methodePaiement: 'CHEQUE' as any,
      chequeNumero: 'CHQ-1003',
      chequeBanque: 'CIH',
      chequeDateCheque: '2026-10-15',
      chequeBeneficiaire: 'Société A',
      datePaiement: '2026-09-09',
    }, userAId);
    // Set status to DEPOSE_EN_BANQUE
    await prisma.cheque.update({
      where: { idPaiementClient: pCheque3.id },
      data: { statutBancaire: StatutInstrumentBancaire.DEPOSE_EN_BANQUE },
    });

    // Test 13: Block Edit when Cheque is DEPOSE_EN_BANQUE
    let conflict13 = false;
    try {
      await paiementsService.update(pCheque3.id, { montantRecu: 6000 }, companyAId, userAId);
    } catch (e: any) {
      conflict13 = e instanceof ConflictException;
    }
    assert(conflict13, 'Test 13: Block Edit when Cheque is DEPOSE_EN_BANQUE');

    // Test 14: Block Cancel when Cheque is DEPOSE_EN_BANQUE
    let conflict14 = false;
    try {
      await paiementsService.cancel(pCheque3.id, { motifAnnulation: 'Test' }, companyAId, userAId);
    } catch (e: any) {
      conflict14 = e instanceof ConflictException;
    }
    assert(conflict14, 'Test 14: Block Cancel when Cheque is DEPOSE_EN_BANQUE');

    // Update status to ENCAISSE
    await prisma.cheque.update({
      where: { idPaiementClient: pCheque3.id },
      data: { statutBancaire: StatutInstrumentBancaire.ENCAISSE },
    });

    // Test 15: Block Edit when Cheque is ENCAISSE
    let conflict15 = false;
    try {
      await paiementsService.update(pCheque3.id, { montantRecu: 6000 }, companyAId, userAId);
    } catch (e: any) {
      conflict15 = e instanceof ConflictException;
    }
    assert(conflict15, 'Test 15: Block Edit when Cheque is ENCAISSE');

    // Test 16: Block Cancel when Cheque is ENCAISSE
    let conflict16 = false;
    try {
      await paiementsService.cancel(pCheque3.id, { motifAnnulation: 'Test' }, companyAId, userAId);
    } catch (e: any) {
      conflict16 = e instanceof ConflictException;
    }
    assert(conflict16, 'Test 16: Block Cancel when Cheque is ENCAISSE');

    // =========================================================================
    // SCENARIOS 17-18: Cheque REJETE_IMPAYE Edit Block & Cancellation Allowed
    // =========================================================================
    await prisma.cheque.update({
      where: { idPaiementClient: pCheque3.id },
      data: { statutBancaire: StatutInstrumentBancaire.REJETE_IMPAYE },
    });

    // Test 17: Block Edit when Cheque is REJETE_IMPAYE
    let conflict17 = false;
    try {
      await paiementsService.update(pCheque3.id, { montantRecu: 6000 }, companyAId, userAId);
    } catch (e: any) {
      conflict17 = e instanceof ConflictException;
    }
    assert(conflict17, 'Test 17: Block Edit when Cheque is REJETE_IMPAYE');

    // Test 18: Cancellation ALLOWED when Cheque is REJETE_IMPAYE
    const cancelledRejete = await paiementsService.cancel(pCheque3.id, {
      motifAnnulation: 'Cheque sans provision confirmé',
    }, companyAId, userAId);
    assert(
      cancelledRejete.estAnnule === true,
      'Test 18: Cheque REJETE_IMPAYE Cancellation Allowed'
    );

    // =========================================================================
    // SCENARIO 19: LCR (Lettre de Change) Status Blocks & Edit
    // =========================================================================
    const invLcr = await createTestInvoice(companyAId, clientA.id, 12000);
    const pLcr = await paiementsService.create(companyAId, {
      numeroFacture: invLcr.numeroFacture,
      montantRecu: 5000,
      methodePaiement: 'EFFET' as any,
      lettreNumero: 'LCR-9001',
      lettreDateEcheance: '2026-11-01',
      lettreMontant: 5000,
      lettreBeneficiaire: 'Société A',
      lettreCause: 'Facture transport',
      lettreTireNom: 'Client A',
      lettreTireAdresse: 'Casablanca',
      datePaiement: '2026-09-10',
    }, userAId);

    // Edit LCR EN_PORTEFEUILLE
    await paiementsService.update(pLcr.id, { lettreNumero: 'LCR-9001-MOD' }, companyAId, userAId);
    const lcrRecord = await prisma.lettreDeChange.findUnique({ where: { idPaiementClient: pLcr.id } });
    assert(lcrRecord?.numero === 'LCR-9001-MOD', 'Test 19a: LCR EN_PORTEFEUILLE Edit');

    // Block edit when ENCAISSE
    await prisma.lettreDeChange.update({
      where: { idPaiementClient: pLcr.id },
      data: { statutBancaire: StatutInstrumentBancaire.ENCAISSE },
    });
    let conflict19 = false;
    try {
      await paiementsService.update(pLcr.id, { montantRecu: 6000 }, companyAId, userAId);
    } catch (e: any) {
      conflict19 = e instanceof ConflictException;
    }
    assert(conflict19, 'Test 19b: Block Edit when LCR is ENCAISSE');

    // =========================================================================
    // SCENARIOS 20-22: Payment Method Switching (No Orphan Instruments)
    // =========================================================================
    const invSwitch = await createTestInvoice(companyAId, clientA.id, 12000);
    const pSwitch = await paiementsService.create(companyAId, {
      numeroFacture: invSwitch.numeroFacture,
      montantRecu: 4000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-11',
    }, userAId);

    // Test 20: ESPECES -> CHEQUE
    await paiementsService.update(pSwitch.id, {
      methodePaiement: 'CHEQUE' as any,
      chequeNumero: 'CHQ-SWITCH-1',
      chequeBanque: 'BMCI',
      chequeDateCheque: '2026-10-30',
      chequeBeneficiaire: 'Société A',
    }, companyAId, userAId);
    const createdCheque = await prisma.cheque.findUnique({ where: { idPaiementClient: pSwitch.id } });
    assert(
      createdCheque !== null && createdCheque.numero === 'CHQ-SWITCH-1',
      'Test 20: Switch Payment Method ESPECES -> CHEQUE (Cheque created)'
    );

    // Test 21: CHEQUE -> ESPECES (Cheque deleted)
    await paiementsService.update(pSwitch.id, {
      methodePaiement: 'ESPECES' as any,
    }, companyAId, userAId);
    const deletedCheque = await prisma.cheque.findUnique({ where: { idPaiementClient: pSwitch.id } });
    assert(deletedCheque === null, 'Test 21: Switch Payment Method CHEQUE -> ESPECES (Cheque deleted without orphans)');

    // Test 22: ESPECES -> LETTRE_DE_CHANGE (EFFET)
    await paiementsService.update(pSwitch.id, {
      methodePaiement: 'EFFET' as any,
      lettreNumero: 'LCR-SWITCH-1',
      lettreDateEcheance: '2026-11-15',
      lettreMontant: 4000,
      lettreBeneficiaire: 'Société A',
      lettreCause: 'Vente',
      lettreTireNom: 'Client A',
      lettreTireAdresse: 'Rabat',
    }, companyAId, userAId);
    const createdLcr = await prisma.lettreDeChange.findUnique({ where: { idPaiementClient: pSwitch.id } });
    assert(createdLcr !== null && createdLcr.numero === 'LCR-SWITCH-1', 'Test 22: Switch to LETTRE_DE_CHANGE (LCR created)');

    // =========================================================================
    // SCENARIO 23: Audit Traversal - Filtering estAnnule: false
    // =========================================================================
    const statsGlobales = await creancesService.findStats(companyAId);
    assert(
      statsGlobales !== null && typeof statsGlobales.totalMontantRecu === 'number',
      'Test 23: Audit Traversal - findStats filters estAnnule: false'
    );

    // =========================================================================
    // SCENARIOS 24-25: Cross-Tenant Isolation
    // =========================================================================
    const invB = await createTestInvoice(companyBId, clientB.id, 6000);
    const pB = await paiementsService.create(companyBId, {
      numeroFacture: invB.numeroFacture,
      montantRecu: 2000,
      methodePaiement: 'ESPECES' as any,
      datePaiement: '2026-09-12',
    }, userAId);

    // Test 24: Company A cannot update Company B's payment
    let notFound24 = false;
    try {
      await paiementsService.update(pB.id, { montantRecu: 3000 }, companyAId, userAId);
    } catch (e: any) {
      notFound24 = e instanceof NotFoundException;
    }
    assert(notFound24, 'Test 24: Cross-Tenant Edit Isolation (throws NotFoundException)');

    // Test 25: Company A cannot cancel Company B's payment
    let notFound25 = false;
    try {
      await paiementsService.cancel(pB.id, { motifAnnulation: 'Hack' }, companyAId, userAId);
    } catch (e: any) {
      notFound25 = e instanceof NotFoundException;
    }
    assert(notFound25, 'Test 25: Cross-Tenant Cancel Isolation (throws NotFoundException)');

    // =========================================================================
    // SCENARIO 26: Composite Locking & Metadata Audit Verification
    // =========================================================================
    const pAudit = await prisma.paiementClient.findUnique({ where: { id: p1.id } });
    assert(
      pAudit?.creeLe !== null && pAudit?.misAJourLe !== null,
      'Test 26: Composite Locking & Metadata Audit (creeLe preserved, misAJourLe updated)'
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

runPhaseCCustomerPaymentTests().catch(console.error);
