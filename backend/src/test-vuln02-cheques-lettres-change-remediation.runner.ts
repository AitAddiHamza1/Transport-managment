import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ChequesLettresChangeService } from './modules/cheques-lettres-change/cheques-lettres-change.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { FournisseursService } from './modules/fournisseurs/fournisseurs.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PaiementMethode, StatutInstrumentBancaire } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import {
  InstrumentType,
  InstrumentSource,
} from './modules/cheques-lettres-change/dto/query-cheques-lettres-change.dto';

async function runVuln02RemediationTests() {
  console.log('========================================================================');
  console.log('=== REGRESSION TEST SUITE: VULN-02 DATABASE-LEVEL TENANT ISOLATION ===');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(ChequesLettresChangeService);
  const paiementsClientsService = app.get(PaiementsClientsService);
  const fournisseursService = app.get(FournisseursService);
  const dettesFournisseursService = app.get(DettesFournisseursService);

  const SUITE_PREFIX = `VULN02_${Date.now()}`;
  let companyAId: number | undefined;
  let companyBId: number | undefined;

  let invoiceA: any = null;
  let invoiceB: any = null;
  let invoiceALc: any = null;
  let invoiceBLc: any = null;

  let paymentClientA: any = null;
  let paymentClientB: any = null;
  let paymentClientALc: any = null;
  let paymentClientBLc: any = null;

  let chqClientA: any = null;
  let chqClientB: any = null;
  let lcClientA: any = null;
  let lcClientB: any = null;

  let fourA: any = null;
  let fourB: any = null;
  let detteA: any = null;
  let detteB: any = null;

  let supplierPaymentAChq: any = null;
  let supplierPaymentBChq: any = null;
  let supplierPaymentALc: any = null;
  let supplierPaymentBLc: any = null;

  let chqSupplierA: any = null;
  let chqSupplierB: any = null;
  let lcSupplierA: any = null;
  let lcSupplierB: any = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision two distinct tenant companies
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning two distinct companies A and B...');
    const compA = await prisma.company.create({
      data: { nom: `${SUITE_PREFIX}_COMPANY_A`, statut: 'ACTIF' },
    });
    companyAId = compA.id;

    const compB = await prisma.company.create({
      data: { nom: `${SUITE_PREFIX}_COMPANY_B`, statut: 'ACTIF' },
    });
    companyBId = compB.id;

    console.log(`  ✓ Company A created (ID: ${companyAId})`);
    console.log(`  ✓ Company B created (ID: ${companyBId})`);

    // -------------------------------------------------------------------------
    // SETUP INSTRUMENTS FOR COMPANY A (2 Cheques, 2 Lettres de Change)
    // -------------------------------------------------------------------------
    console.log('\n[SETUP] Creating instruments for Company A...');
    // Overlapping invoice F001/2026 for Company A
    invoiceA = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F001/2026',
        dateFacture: new Date('2026-01-10'),
        nomClient: 'CLIENT_A_CHQ',
        sousTotal: 10000,
        tauxTva: 20,
      },
    });
    await prisma.creanceClient.create({
      data: {
        companyId: companyAId,
        factureId: invoiceA.id,
        numeroFacture: invoiceA.numeroFacture,
        nomClient: invoiceA.nomClient,
        dateEmission: invoiceA.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 12000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    // 1. Company A Client Cheque (10,000 MAD)
    paymentClientA = await paiementsClientsService.create(companyAId, {
      numeroFacture: invoiceA.numeroFacture,
      montantRecu: 10000,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: `CHQ-A-CLI-${SUITE_PREFIX}`,
      chequeBanque: 'Attijariwafa Bank A',
      chequeDateCheque: '2026-01-15',
      chequeBeneficiaire: 'BENEFICIARY_A',
    });
    chqClientA = await prisma.cheque.findFirst({ where: { idPaiementClient: paymentClientA.id } });

    // 2. Company A Client Lettre de Change (20,000 MAD)
    invoiceALc = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F002/2026',
        dateFacture: new Date('2026-01-12'),
        nomClient: 'CLIENT_A_LC',
        sousTotal: 20000,
        tauxTva: 20,
      },
    });
    await prisma.creanceClient.create({
      data: {
        companyId: companyAId,
        factureId: invoiceALc.id,
        numeroFacture: invoiceALc.numeroFacture,
        nomClient: invoiceALc.nomClient,
        dateEmission: invoiceALc.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 24000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    paymentClientALc = await paiementsClientsService.create(companyAId, {
      numeroFacture: invoiceALc.numeroFacture,
      montantRecu: 20000,
      methodePaiement: PaiementMethode.EFFET,
      lettreNumero: `LC-A-CLI-${SUITE_PREFIX}`,
      lettreDateEcheance: '2026-06-30',
      lettreMontant: 20000,
      lettreBeneficiaire: 'BENEFICIARY_A_LC',
      lettreCause: 'Transport A',
      lettreTireNom: 'Tireur A',
      lettreTireAdresse: 'Casablanca',
    });
    lcClientA = await prisma.lettreDeChange.findFirst({ where: { idPaiementClient: paymentClientALc.id } });

    // 3. Company A Supplier Cheque (5,000 MAD)
    fourA = await fournisseursService.create({ nomFournisseur: `FOUR_A_${SUITE_PREFIX}` }, companyAId);
    detteA = await dettesFournisseursService.create(companyAId, {
      idFournisseur: fourA.id,
      montantDu: 15000,
      delaiPaiementJours: 30,
      dateDette: '2026-01-10',
    });

    supplierPaymentAChq = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-A-CHQ-${SUITE_PREFIX}`,
        idDetteFournisseur: detteA.id,
        montant: 5000,
        datePaiement: new Date('2026-01-18'),
        modePaiement: PaiementMethode.CHEQUE,
      },
    });
    chqSupplierA = await prisma.cheque.create({
      data: {
        idPaiementFournisseur: supplierPaymentAChq.id,
        numero: `CHQ-A-SUP-${SUITE_PREFIX}`,
        banque: 'BMCE Bank A',
        dateCheque: new Date('2026-01-18'),
        beneficiaire: fourA.nomFournisseur,
      },
    });

    // 4. Company A Supplier Lettre de Change (8,000 MAD)
    supplierPaymentALc = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-A-LC-${SUITE_PREFIX}`,
        idDetteFournisseur: detteA.id,
        montant: 8000,
        datePaiement: new Date('2026-01-20'),
        modePaiement: PaiementMethode.EFFET,
      },
    });
    lcSupplierA = await prisma.lettreDeChange.create({
      data: {
        idPaiementFournisseur: supplierPaymentALc.id,
        numero: `LC-A-SUP-${SUITE_PREFIX}`,
        dateEcheance: new Date('2026-07-15'),
        montant: 8000,
        beneficiaire: fourA.nomFournisseur,
        cause: 'Prestation Fournisseur A',
        tireNom: 'Tireur A Supplier',
        tireAdresse: 'Tanger',
      },
    });

    console.log(`  ✓ Company A instruments initialized: 2 Cheques (15,000 MAD), 2 Lettres (28,000 MAD)`);

    // -------------------------------------------------------------------------
    // SETUP INSTRUMENTS FOR COMPANY B (Overlapping Invoices F001/2026, F002/2026)
    // -------------------------------------------------------------------------
    console.log('\n[SETUP] Creating instruments for Company B (with overlapping invoice numbers)...');
    // Overlapping invoice F001/2026 for Company B
    invoiceB = await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: 'F001/2026',
        dateFacture: new Date('2026-01-15'),
        nomClient: 'CLIENT_B_CHQ',
        sousTotal: 30000,
        tauxTva: 20,
      },
    });
    await prisma.creanceClient.create({
      data: {
        companyId: companyBId,
        factureId: invoiceB.id,
        numeroFacture: invoiceB.numeroFacture,
        nomClient: invoiceB.nomClient,
        dateEmission: invoiceB.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 36000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    // 1. Company B Client Cheque (30,000 MAD)
    paymentClientB = await paiementsClientsService.create(companyBId, {
      numeroFacture: invoiceB.numeroFacture,
      montantRecu: 30000,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: `CHQ-B-CLI-${SUITE_PREFIX}`,
      chequeBanque: 'Banque Populaire B',
      chequeDateCheque: '2026-01-20',
      chequeBeneficiaire: 'BENEFICIARY_B',
    });
    chqClientB = await prisma.cheque.findFirst({ where: { idPaiementClient: paymentClientB.id } });

    // 2. Company B Client Lettre de Change (40,000 MAD)
    invoiceBLc = await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: 'F002/2026',
        dateFacture: new Date('2026-01-18'),
        nomClient: 'CLIENT_B_LC',
        sousTotal: 40000,
        tauxTva: 20,
      },
    });
    await prisma.creanceClient.create({
      data: {
        companyId: companyBId,
        factureId: invoiceBLc.id,
        numeroFacture: invoiceBLc.numeroFacture,
        nomClient: invoiceBLc.nomClient,
        dateEmission: invoiceBLc.dateFacture,
        delaiPaiementJours: 30,
        montantFacture: 48000,
        montantRecu: 0,
        statutPaiement: 'NON_PAYE',
      },
    });

    paymentClientBLc = await paiementsClientsService.create(companyBId, {
      numeroFacture: invoiceBLc.numeroFacture,
      montantRecu: 40000,
      methodePaiement: PaiementMethode.EFFET,
      lettreNumero: `LC-B-CLI-${SUITE_PREFIX}`,
      lettreDateEcheance: '2026-08-30',
      lettreMontant: 40000,
      lettreBeneficiaire: 'BENEFICIARY_B_LC',
      lettreCause: 'Transport B',
      lettreTireNom: 'Tireur B',
      lettreTireAdresse: 'Rabat',
    });
    lcClientB = await prisma.lettreDeChange.findFirst({ where: { idPaiementClient: paymentClientBLc.id } });

    // 3. Company B Supplier Cheque (15,000 MAD)
    fourB = await fournisseursService.create({ nomFournisseur: `FOUR_B_${SUITE_PREFIX}` }, companyBId);
    detteB = await dettesFournisseursService.create(companyBId, {
      idFournisseur: fourB.id,
      montantDu: 30000,
      delaiPaiementJours: 30,
      dateDette: '2026-01-12',
    });

    supplierPaymentBChq = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-B-CHQ-${SUITE_PREFIX}`,
        idDetteFournisseur: detteB.id,
        montant: 15000,
        datePaiement: new Date('2026-01-22'),
        modePaiement: PaiementMethode.CHEQUE,
      },
    });
    chqSupplierB = await prisma.cheque.create({
      data: {
        idPaiementFournisseur: supplierPaymentBChq.id,
        numero: `CHQ-B-SUP-${SUITE_PREFIX}`,
        banque: 'CIH Bank B',
        dateCheque: new Date('2026-01-22'),
        beneficiaire: fourB.nomFournisseur,
      },
    });

    // 4. Company B Supplier Lettre de Change (12,000 MAD)
    supplierPaymentBLc = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-B-LC-${SUITE_PREFIX}`,
        idDetteFournisseur: detteB.id,
        montant: 12000,
        datePaiement: new Date('2026-01-25'),
        modePaiement: PaiementMethode.EFFET,
      },
    });
    lcSupplierB = await prisma.lettreDeChange.create({
      data: {
        idPaiementFournisseur: supplierPaymentBLc.id,
        numero: `LC-B-SUP-${SUITE_PREFIX}`,
        dateEcheance: new Date('2026-08-15'),
        montant: 12000,
        beneficiaire: fourB.nomFournisseur,
        cause: 'Prestation Fournisseur B',
        tireNom: 'Tireur B Supplier',
        tireAdresse: 'Agadir',
      },
    });

    console.log(`  ✓ Company B instruments initialized: 2 Cheques (45,000 MAD), 2 Lettres (52,000 MAD)`);

    // -------------------------------------------------------------------------
    // TEST 1: findAll for Company A returns strictly Company A's 4 records
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Verifying findAll(companyAId) returns exclusively Company A records...');
    const resultA = await service.findAll(companyAId, {});
    const companyAIds = resultA.data.map((i) => i.numero);

    if (resultA.meta.total !== 4) {
      throw new Error(`Expected exactly 4 instruments for Company A, got ${resultA.meta.total}`);
    }

    // Verify all 4 instruments belong to Company A
    const expectedANumeros = [
      `CHQ-A-CLI-${SUITE_PREFIX}`,
      `LC-A-CLI-${SUITE_PREFIX}`,
      `CHQ-A-SUP-${SUITE_PREFIX}`,
      `LC-A-SUP-${SUITE_PREFIX}`,
    ];
    for (const num of expectedANumeros) {
      if (!companyAIds.includes(num)) {
        throw new Error(`Missing expected instrument "${num}" in Company A results`);
      }
    }

    // Verify ZERO Company B instruments are returned
    const bNumeros = [
      `CHQ-B-CLI-${SUITE_PREFIX}`,
      `LC-B-CLI-${SUITE_PREFIX}`,
      `CHQ-B-SUP-${SUITE_PREFIX}`,
      `LC-B-SUP-${SUITE_PREFIX}`,
    ];
    for (const num of bNumeros) {
      if (companyAIds.includes(num)) {
        throw new Error(`CRITICAL SECURITY BREACH: Company A result contains Company B instrument "${num}"`);
      }
    }
    console.log(`  ✓ PASSED: Company A findAll returned exactly 4 instruments; zero Company B records leaked.`);

    // -------------------------------------------------------------------------
    // TEST 2: findAll for Company B returns strictly Company B's 4 records
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying findAll(companyBId) returns exclusively Company B records...');
    const resultB = await service.findAll(companyBId, {});
    const companyBIds = resultB.data.map((i) => i.numero);

    if (resultB.meta.total !== 4) {
      throw new Error(`Expected exactly 4 instruments for Company B, got ${resultB.meta.total}`);
    }
    for (const num of bNumeros) {
      if (!companyBIds.includes(num)) {
        throw new Error(`Missing expected instrument "${num}" in Company B results`);
      }
    }
    for (const num of expectedANumeros) {
      if (companyBIds.includes(num)) {
        throw new Error(`CRITICAL SECURITY BREACH: Company B result contains Company A instrument "${num}"`);
      }
    }
    console.log(`  ✓ PASSED: Company B findAll returned exactly 4 instruments; zero Company A records leaked.`);

    // -------------------------------------------------------------------------
    // TEST 3: findStats for Company A computes stats strictly on Company A data
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Verifying findStats(companyAId) aggregations are strictly tenant-isolated...');
    const statsA = await service.findStats(companyAId, {});

    if (statsA.totalChequesCount !== 2) {
      throw new Error(`Expected totalChequesCount=2 for Company A, got ${statsA.totalChequesCount}`);
    }
    if (statsA.totalChequesAmountByCurrency['MAD'] !== 15000) {
      throw new Error(`Expected Cheques MAD amount=15000 for Company A, got ${statsA.totalChequesAmountByCurrency['MAD']}`);
    }
    if (statsA.totalLettresCount !== 2) {
      throw new Error(`Expected totalLettresCount=2 for Company A, got ${statsA.totalLettresCount}`);
    }
    if (statsA.totalLettresAmountByCurrency['MAD'] !== 28000) {
      throw new Error(`Expected Lettres MAD amount=28000 for Company A, got ${statsA.totalLettresAmountByCurrency['MAD']}`);
    }
    if (statsA.bySourceCount['CLIENT'] !== 2 || statsA.bySourceCount['FOURNISSEUR'] !== 2) {
      throw new Error(`Unexpected bySourceCount for Company A: ${JSON.stringify(statsA.bySourceCount)}`);
    }
    console.log(`  ✓ PASSED: Company A stats strictly aggregated (Cheques: 2/15,000 MAD, Lettres: 2/28,000 MAD).`);

    // -------------------------------------------------------------------------
    // TEST 4: findStats for Company B computes stats strictly on Company B data
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Verifying findStats(companyBId) aggregations are strictly tenant-isolated...');
    const statsB = await service.findStats(companyBId, {});

    if (statsB.totalChequesCount !== 2) {
      throw new Error(`Expected totalChequesCount=2 for Company B, got ${statsB.totalChequesCount}`);
    }
    if (statsB.totalChequesAmountByCurrency['MAD'] !== 45000) {
      throw new Error(`Expected Cheques MAD amount=45000 for Company B, got ${statsB.totalChequesAmountByCurrency['MAD']}`);
    }
    if (statsB.totalLettresCount !== 2) {
      throw new Error(`Expected totalLettresCount=2 for Company B, got ${statsB.totalLettresCount}`);
    }
    if (statsB.totalLettresAmountByCurrency['MAD'] !== 52000) {
      throw new Error(`Expected Lettres MAD amount=52000 for Company B, got ${statsB.totalLettresAmountByCurrency['MAD']}`);
    }
    console.log(`  ✓ PASSED: Company B stats strictly aggregated (Cheques: 2/45,000 MAD, Lettres: 2/52,000 MAD). Zero cross-tenant leakage.`);

    // -------------------------------------------------------------------------
    // TEST 4B: findStats internal consistency with source filter (R2 coverage)
    // Verifies that counts, amounts, byStatus and bySource all derive from the
    // same SQL-scoped dataset — no double-filtering or split-dataset asymmetry.
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4B] Verifying findStats internal consistency with source filters (R2)...');

    // 4B.1 — source=CLIENT for Company A: 1 Cheque (10,000 MAD) + 1 Lettre (20,000 MAD)
    const statsAClient = await service.findStats(companyAId, { source: InstrumentSource.CLIENT });
    if (statsAClient.totalChequesCount !== 1) {
      throw new Error(`[R2] source=CLIENT: expected totalChequesCount=1, got ${statsAClient.totalChequesCount}`);
    }
    if (statsAClient.totalChequesAmountByCurrency['MAD'] !== 10000) {
      throw new Error(`[R2] source=CLIENT: expected cheque MAD=10000, got ${statsAClient.totalChequesAmountByCurrency['MAD']}`);
    }
    if (statsAClient.totalLettresCount !== 1) {
      throw new Error(`[R2] source=CLIENT: expected totalLettresCount=1, got ${statsAClient.totalLettresCount}`);
    }
    if (statsAClient.totalLettresAmountByCurrency['MAD'] !== 20000) {
      throw new Error(`[R2] source=CLIENT: expected lettre MAD=20000, got ${statsAClient.totalLettresAmountByCurrency['MAD']}`);
    }
    if (statsAClient.bySourceCount['CLIENT'] !== 2 || statsAClient.bySourceCount['FOURNISSEUR'] !== 0) {
      throw new Error(`[R2] source=CLIENT: bySourceCount mismatch: ${JSON.stringify(statsAClient.bySourceCount)}`);
    }
    console.log(`  ✓ PASSED: findStats(source=CLIENT) — counts, amounts and bySource internally consistent`);

    // 4B.2 — source=FOURNISSEUR for Company A: 1 Cheque (5,000 MAD) + 1 Lettre (8,000 MAD)
    const statsAFournisseur = await service.findStats(companyAId, { source: InstrumentSource.FOURNISSEUR });
    if (statsAFournisseur.totalChequesCount !== 1) {
      throw new Error(`[R2] source=FOURNISSEUR: expected totalChequesCount=1, got ${statsAFournisseur.totalChequesCount}`);
    }
    if (statsAFournisseur.totalChequesAmountByCurrency['MAD'] !== 5000) {
      throw new Error(`[R2] source=FOURNISSEUR: expected cheque MAD=5000, got ${statsAFournisseur.totalChequesAmountByCurrency['MAD']}`);
    }
    if (statsAFournisseur.totalLettresCount !== 1) {
      throw new Error(`[R2] source=FOURNISSEUR: expected totalLettresCount=1, got ${statsAFournisseur.totalLettresCount}`);
    }
    if (statsAFournisseur.totalLettresAmountByCurrency['MAD'] !== 8000) {
      throw new Error(`[R2] source=FOURNISSEUR: expected lettre MAD=8000, got ${statsAFournisseur.totalLettresAmountByCurrency['MAD']}`);
    }
    if (statsAFournisseur.bySourceCount['FOURNISSEUR'] !== 2 || statsAFournisseur.bySourceCount['CLIENT'] !== 0) {
      throw new Error(`[R2] source=FOURNISSEUR: bySourceCount mismatch: ${JSON.stringify(statsAFournisseur.bySourceCount)}`);
    }
    console.log(`  ✓ PASSED: findStats(source=FOURNISSEUR) — counts, amounts and bySource internally consistent`);

    // 4B.3 — No source filter: combined totals must equal the sum of CLIENT + FOURNISSEUR totals
    const statsAAll = await service.findStats(companyAId, {});
    if (statsAAll.totalChequesCount !== statsAClient.totalChequesCount + statsAFournisseur.totalChequesCount) {
      throw new Error(`[R2] no-source: totalChequesCount (${statsAAll.totalChequesCount}) != CLIENT(${statsAClient.totalChequesCount}) + FOURNISSEUR(${statsAFournisseur.totalChequesCount})`);
    }
    if (statsAAll.totalLettresCount !== statsAClient.totalLettresCount + statsAFournisseur.totalLettresCount) {
      throw new Error(`[R2] no-source: totalLettresCount (${statsAAll.totalLettresCount}) != CLIENT(${statsAClient.totalLettresCount}) + FOURNISSEUR(${statsAFournisseur.totalLettresCount})`);
    }
    const expectedTotalChqAmt = (statsAClient.totalChequesAmountByCurrency['MAD'] || 0) + (statsAFournisseur.totalChequesAmountByCurrency['MAD'] || 0);
    if ((statsAAll.totalChequesAmountByCurrency['MAD'] || 0) !== expectedTotalChqAmt) {
      throw new Error(`[R2] no-source: totalChequesAmount MAD (${statsAAll.totalChequesAmountByCurrency['MAD']}) != ${expectedTotalChqAmt}`);
    }
    if (statsAAll.bySourceCount['CLIENT'] !== 2 || statsAAll.bySourceCount['FOURNISSEUR'] !== 2) {
      throw new Error(`[R2] no-source: bySourceCount mismatch: ${JSON.stringify(statsAAll.bySourceCount)}`);
    }
    console.log(`  ✓ PASSED: findStats(no filter) — total counts and amounts equal sum of CLIENT + FOURNISSEUR partitions`);

    // -------------------------------------------------------------------------
    // TEST 5: Search, Filters, and Pagination
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Testing search, filters, and pagination within tenant scope...');

    // 5.1 Type filter CHEQUE
    const chqOnlyA = await service.findAll(companyAId, { type: InstrumentType.CHEQUE });
    if (chqOnlyA.data.length !== 2 || chqOnlyA.data.some((i) => i.instrumentType !== 'CHEQUE')) {
      throw new Error('Type filter CHEQUE failed');
    }
    console.log(`  ✓ PASSED: type=CHEQUE filter returned exactly 2 cheques for Company A`);

    // 5.2 Type filter LETTRE_DE_CHANGE
    const lcOnlyA = await service.findAll(companyAId, { type: InstrumentType.LETTRE_DE_CHANGE });
    if (lcOnlyA.data.length !== 2 || lcOnlyA.data.some((i) => i.instrumentType !== 'LETTRE_DE_CHANGE')) {
      throw new Error('Type filter LETTRE_DE_CHANGE failed');
    }
    console.log(`  ✓ PASSED: type=LETTRE_DE_CHANGE filter returned exactly 2 lettres for Company A`);

    // 5.3 Source filter CLIENT
    const clientOnlyA = await service.findAll(companyAId, { source: InstrumentSource.CLIENT });
    if (clientOnlyA.data.length !== 2 || clientOnlyA.data.some((i) => i.source !== 'CLIENT')) {
      throw new Error('Source filter CLIENT failed');
    }
    console.log(`  ✓ PASSED: source=CLIENT filter returned exactly 2 client instruments`);

    // 5.4 Source filter FOURNISSEUR
    const suppOnlyA = await service.findAll(companyAId, { source: InstrumentSource.FOURNISSEUR });
    if (suppOnlyA.data.length !== 2 || suppOnlyA.data.some((i) => i.source !== 'FOURNISSEUR')) {
      throw new Error('Source filter FOURNISSEUR failed');
    }
    console.log(`  ✓ PASSED: source=FOURNISSEUR filter returned exactly 2 supplier instruments`);

    // 5.5 Cross-tenant search: Company A searches for Company B cheque number
    const crossSearch = await service.findAll(companyAId, { search: `CHQ-B-CLI-${SUITE_PREFIX}` });
    if (crossSearch.data.length !== 0) {
      throw new Error('SECURITY BREACH: Company A search revealed Company B instrument!');
    }
    console.log(`  ✓ PASSED: Cross-tenant search returned 0 results`);

    // 5.6 Pagination
    const page1 = await service.findAll(companyAId, { page: 1, limit: 2 });
    if (page1.data.length !== 2 || page1.meta.totalPages !== 2 || page1.meta.total !== 4) {
      throw new Error('Pagination page 1 failed');
    }
    const page2 = await service.findAll(companyAId, { page: 2, limit: 2 });
    if (page2.data.length !== 2 || page2.meta.page !== 2) {
      throw new Error('Pagination page 2 failed');
    }
    console.log(`  ✓ PASSED: Pagination correctly partitioned 4 items into 2 pages of 2`);

    // -------------------------------------------------------------------------
    // TEST 6: Cross-Tenant Status Updates Rejected with 404 (Fail-Closed)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Testing cross-tenant updateStatutCheque and updateStatutLettre rejection...');

    // Company A attempts to update Company B Cheque
    try {
      await service.updateStatutCheque(companyAId, chqClientB.id, {
        statutBancaire: StatutInstrumentBancaire.DEPOSE_EN_BANQUE,
      });
      throw new Error('SECURITY BREACH: Company A updated Company B Cheque status!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant updateStatutCheque on Cheque #${chqClientB.id} REJECTED with 404 NotFound`);
    }

    // Company A attempts to update Company B Lettre de Change
    try {
      await service.updateStatutLettre(companyAId, lcClientB.id, {
        statutBancaire: StatutInstrumentBancaire.DEPOSE_EN_BANQUE,
      });
      throw new Error('SECURITY BREACH: Company A updated Company B LettreDeChange status!');
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        throw new Error(`Expected NotFoundException (404), got: ${err.message}`);
      }
      console.log(`  ✓ PASSED: Cross-tenant updateStatutLettre on LettreDeChange #${lcClientB.id} REJECTED with 404 NotFound`);
    }

    // Verify Company B instruments remain unchanged
    const bChqDb = await prisma.cheque.findUnique({ where: { id: chqClientB.id } });
    if (bChqDb?.statutBancaire !== StatutInstrumentBancaire.EN_PORTEFEUILLE) {
      throw new Error('Integrity violation: Company B Cheque status was mutated by unauthorized attempt!');
    }
    console.log(`  ✓ PASSED: Company B instruments were completely unmutated.`);

    // -------------------------------------------------------------------------
    // TEST 7: Legitimate Status Updates by Owning Tenant (Company B)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Verifying legitimate status update by owning tenant (Company B)...');
    const updatedChqB = await service.updateStatutCheque(companyBId, chqClientB.id, {
      statutBancaire: StatutInstrumentBancaire.DEPOSE_EN_BANQUE,
    });
    if (updatedChqB.statutBancaire !== StatutInstrumentBancaire.DEPOSE_EN_BANQUE) {
      throw new Error('Legitimate Cheque status update failed');
    }
    console.log(`  ✓ PASSED: Company B successfully updated its own Cheque status to DEPOSE_EN_BANQUE`);

    const updatedLcB = await service.updateStatutLettre(companyBId, lcClientB.id, {
      statutBancaire: StatutInstrumentBancaire.ENCAISSE,
    });
    if (updatedLcB.statutBancaire !== StatutInstrumentBancaire.ENCAISSE) {
      throw new Error('Legitimate LettreDeChange status update failed');
    }
    console.log(`  ✓ PASSED: Company B successfully updated its own LettreDeChange status to ENCAISSE`);

    // -------------------------------------------------------------------------
    // TEST 8: Soft-deleted invoice & Invalid Tenant ID Handling (Fail-Closed)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Verifying soft-deleted invoice handling & invalid tenant IDs...');

    // 8.1 Soft-delete Company A invoiceA
    await prisma.facture.update({
      where: { id: invoiceA.id },
      data: { supprimeLe: new Date() },
    });

    const afterSoftDeleteA = await service.findAll(companyAId, {});
    if (afterSoftDeleteA.meta.total !== 3) {
      throw new Error(`Expected exactly 3 instruments after soft-deleting 1 invoice, got ${afterSoftDeleteA.meta.total}`);
    }
    if (afterSoftDeleteA.data.some((i) => i.numero === `CHQ-A-CLI-${SUITE_PREFIX}`)) {
      throw new Error('Instrument associated with soft-deleted invoice was not excluded!');
    }
    console.log(`  ✓ PASSED: Cheque linked to soft-deleted invoice safely excluded from database results.`);

    // 8.2 Invalid companyId = 0
    const zeroResults = await service.findAll(0, {});
    if (zeroResults.meta.total !== 0 || zeroResults.data.length !== 0) {
      throw new Error('Invalid companyId=0 should return 0 results');
    }
    const zeroStats = await service.findStats(0, {});
    if (zeroStats.totalChequesCount !== 0 || zeroStats.totalLettresCount !== 0) {
      throw new Error('Invalid companyId=0 should return 0 stats');
    }
    console.log(`  ✓ PASSED: Invalid companyId=0 returned 0 items / 0 stats (fail-closed).`);

    // 8.3 Invalid companyId = -1
    const negResults = await service.findAll(-1, {});
    if (negResults.meta.total !== 0 || negResults.data.length !== 0) {
      throw new Error('Invalid companyId=-1 should return 0 results');
    }
    console.log(`  ✓ PASSED: Invalid companyId=-1 returned 0 items (fail-closed).`);

    // -------------------------------------------------------------------------
    // CLEANUP: Scoped cleanup strictly targeting test records
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records from local database...');
    const allChqIds = [chqClientA?.id, chqSupplierA?.id, chqClientB?.id, chqSupplierB?.id].filter(Boolean);
    if (allChqIds.length > 0) {
      await prisma.cheque.deleteMany({ where: { id: { in: allChqIds } } });
    }

    const allLcIds = [lcClientA?.id, lcSupplierA?.id, lcClientB?.id, lcSupplierB?.id].filter(Boolean);
    if (allLcIds.length > 0) {
      await prisma.lettreDeChange.deleteMany({ where: { id: { in: allLcIds } } });
    }

    const allClientPayIds = [paymentClientA?.id, paymentClientALc?.id, paymentClientB?.id, paymentClientBLc?.id].filter(Boolean);
    if (allClientPayIds.length > 0) {
      await prisma.paiementClient.deleteMany({ where: { id: { in: allClientPayIds } } });
    }

    const allSuppPayIds = [supplierPaymentAChq?.id, supplierPaymentALc?.id, supplierPaymentBChq?.id, supplierPaymentBLc?.id].filter(Boolean);
    if (allSuppPayIds.length > 0) {
      await prisma.paiementFournisseur.deleteMany({ where: { id: { in: allSuppPayIds } } });
    }

    const allDetteIds = [detteA?.id, detteB?.id].filter(Boolean);
    if (allDetteIds.length > 0) {
      await prisma.detteFournisseur.deleteMany({ where: { id: { in: allDetteIds } } });
    }

    const allFourIds = [fourA?.id, fourB?.id].filter(Boolean);
    if (allFourIds.length > 0) {
      await prisma.fournisseur.deleteMany({ where: { id: { in: allFourIds } } });
    }

    const compIds = [companyAId, companyBId].filter(Boolean) as number[];
    if (compIds.length > 0) {
      await prisma.creanceClient.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.facture.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.detteFournisseurSequence.deleteMany({ where: { companyId: { in: compIds } } });
      await prisma.company.deleteMany({ where: { id: { in: compIds } } });
    }
    console.log('  ✓ Test cleanup completed successfully.');

    console.log('\n========================================================================');
    console.log('=== ALL REGRESSION SCENARIOS FOR VULN-02 PASSED SUCCESSFULLY! ===');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ VULN-02 REGRESSION TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runVuln02RemediationTests();
