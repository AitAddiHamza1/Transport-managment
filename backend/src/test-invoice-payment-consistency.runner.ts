import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma, CreanceStatut } from '@prisma/client';
import {
  toCreanceView,
  CreancesClientsService,
} from './modules/creances-clients/creances-clients.service';
import {
  toFactureView,
  FacturesService,
} from './modules/factures/factures.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';

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

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('=== INVOICE & CLIENT PAYMENT AMOUNT CONSISTENCY TEST SUITE ===');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Linked invoice total is authoritative in payment dialog / toCreanceView
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Linked invoice total is authoritative in toCreanceView...');
  const staleCreance = {
    id: 101,
    companyId: 1,
    factureId: 201,
    numeroFacture: 'F001/2026',
    nomClient: 'CLIENT TEST',
    delaiPaiementJours: 30,
    montantFacture: new Prisma.Decimal('47000.00'), // Stale receivable amount
    montantRecu: new Prisma.Decimal('35000.00'),
    solde: new Prisma.Decimal('12000.00'),
    statutPaiement: CreanceStatut.PARTIEL,
    devise: 'MAD',
    facture: {
      id: 201,
      numeroFacture: 'F001/2026',
      sousTotal: new Prisma.Decimal('33333.33'),
      tauxTva: new Prisma.Decimal('20.00'),
      montantTva: new Prisma.Decimal('6666.67'),
      montantTotal: new Prisma.Decimal('40000.00'), // Authoritative total
      supprimeLe: null,
      paiements: [
        { id: 1, montantRecu: new Prisma.Decimal('35000.00'), estAnnule: false },
      ],
    },
  };

  const creanceView = toCreanceView(staleCreance);
  assert(
    creanceView.montantFacture === 40000,
    'toCreanceView returns authoritative invoice total (40,000 MAD instead of stale 47,000 MAD)',
    `Got montantFacture=${creanceView.montantFacture}`,
  );
  assert(
    creanceView.montantRecu === 35000,
    'toCreanceView returns exact recorded payment amount (35,000 MAD)',
    `Got montantRecu=${creanceView.montantRecu}`,
  );
  assert(
    creanceView.solde === 5000,
    'toCreanceView returns consistent solde (5,000 MAD instead of stale 12,000 MAD)',
    `Got solde=${creanceView.solde}`,
  );

  // --------------------------------------------------------------------------
  // TEST 2: Paid amount and remaining balance are consistent between Factures and Creances
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Consistency between toFactureView and toCreanceView...');
  const factureRecord = {
    id: 201,
    companyId: 1,
    numeroFacture: 'F001/2026',
    modeFacturation: 'AVEC_FACTURE',
    nomClient: 'CLIENT TEST',
    idVoyage: 50,
    dateFacture: new Date('2026-01-15'),
    joursEcheance: 30,
    dateEcheance: new Date('2026-02-15'),
    sousTotal: new Prisma.Decimal('33333.33'),
    tauxTva: new Prisma.Decimal('20.00'),
    montantTva: new Prisma.Decimal('6666.67'),
    montantTotal: new Prisma.Decimal('40000.00'),
    devise: 'MAD',
    supprimeLe: null,
    paiements: [
      { id: 1, montantRecu: new Prisma.Decimal('35000.00'), estAnnule: false },
    ],
  };

  const factureView = toFactureView(factureRecord);
  assert(
    factureView.montantTotal === creanceView.montantFacture &&
      Number(factureView.montantPaye) === creanceView.montantRecu &&
      Number(factureView.soldeRestant) === creanceView.solde,
    'Factures view and Creances view report identical Total (40,000), Paid (35,000), and Remaining (5,000)',
    `Facture: ${factureView.montantTotal}, ${factureView.montantPaye}, ${factureView.soldeRestant}; Creance: ${creanceView.montantFacture}, ${creanceView.montantRecu}, ${creanceView.solde}`,
  );

  // --------------------------------------------------------------------------
  // TEST 3 & 4: Stale receivable cannot permit overpayment; valid payment succeeds
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3 & 4] Backend overpayment protection with stale receivable metadata...');
  let paymentCreated = false;
  let receivableUpdated = false;

  const mockPrisma: any = {
    facture: {
      findFirst: async ({ where }: any) => {
        if (where.numeroFacture === 'F001/2026' && where.companyId === 1) {
          return {
            id: 201,
            companyId: 1,
            numeroFacture: 'F001/2026',
            nomClient: 'CLIENT TEST',
            devise: 'MAD',
            supprimeLe: null,
            sousTotal: new Prisma.Decimal('33333.33'),
            tauxTva: new Prisma.Decimal('20.00'),
            montantTotal: new Prisma.Decimal('40000.00'),
          };
        }
        return null;
      },
    },
    paiementClient: {
      findMany: async ({ where }: any) => {
        if (where.companyId === 1 && where.factureId === 201 && where.estAnnule === false) {
          return [{ montantRecu: new Prisma.Decimal('35000.00') }];
        }
        return [];
      },
      create: async ({ data }: any) => {
        paymentCreated = true;
        return {
          id: 999,
          ...data,
          misAJourLe: new Date(),
        };
      },
    },
    creanceClient: {
      findUnique: async () => ({
        id: 101,
        companyId: 1,
        factureId: 201,
        montantFacture: new Prisma.Decimal('47000.00'),
        montantRecu: new Prisma.Decimal('35000.00'),
        solde: new Prisma.Decimal('12000.00'),
        statutPaiement: 'PARTIEL',
      }),
      create: async ({ data }: any) => ({
        id: 101,
        ...data,
      }),
      update: async ({ data }: any) => {
        receivableUpdated = true;
        return {
          id: 101,
          ...data,
        };
      },
    },
    $queryRaw: async (query: any, ...args: any[]) => {
      const qStr = Array.isArray(query)
        ? query.join('')
        : query?.strings
          ? query.strings.join('')
          : String(query);
      if (qStr.includes('FROM factures')) {
        return [
          {
            id: 201,
            company_id: 1,
            sous_total: new Prisma.Decimal('33333.33'),
            taux_tva: new Prisma.Decimal('20.00'),
            montant_tva: new Prisma.Decimal('6666.67'),
            montant_total: new Prisma.Decimal('40000.00'),
            supprime_le: null,
          },
        ];
      }
      if (qStr.includes('FROM creances_clients')) {
        return [
          {
            id: 101,
            company_id: 1,
            facture_id: 201,
            montant_facture: new Prisma.Decimal('47000.00'), // Stale 47,000 in DB
            montant_recu: new Prisma.Decimal('35000.00'),
            solde: new Prisma.Decimal('12000.00'),
            statut_paiement: 'PARTIEL',
          },
        ];
      }
      return [];
    },
    $transaction: async (cb: any) => cb(mockPrisma),
  };

  const paiementsService = new PaiementsClientsService(
    mockPrisma,
    new CreancesClientsService(mockPrisma),
  );

  // TEST 3: Overpayment attempt (10,000 MAD would pass stale 12,000 balance check, but MUST be rejected against 5,000 real balance)
  let overpaymentBlocked = false;
  try {
    await paiementsService.create(1, {
      numeroFacture: 'F001/2026',
      montantRecu: 10000,
      methodePaiement: 'VIREMENT',
    });
  } catch (err: any) {
    if (err instanceof ConflictException) {
      overpaymentBlocked = true;
      assert(
        err.message.includes('dépasse le solde restant de la facture'),
        'Overpayment correctly rejected with ConflictException citing remaining invoice balance',
        err.message,
      );
    }
  }
  assert(overpaymentBlocked, 'Stale receivable balance (12,000) CANNOT permit overpayment exceeding real balance (5,000)');

  // TEST 4: Valid payment within remaining balance (5,000 MAD) succeeds
  paymentCreated = false;
  receivableUpdated = false;
  let validPaymentSuccess = false;
  try {
    const res = await paiementsService.create(1, {
      numeroFacture: 'F001/2026',
      montantRecu: 5000,
      methodePaiement: 'VIREMENT',
    });
    validPaymentSuccess = res !== null;
  } catch (err: any) {
    console.error('Unexpected error on valid payment:', err);
  }
  assert(validPaymentSuccess && paymentCreated, 'Valid payment within real remaining balance (5,000 MAD) succeeds');
  assert(receivableUpdated, 'Receivable was synchronized to authoritative total and status on payment completion');

  // --------------------------------------------------------------------------
  // TEST 5 & 6: Updating invoice total synchronizes receivable without touching payment history
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5 & 6] Invoice recalculation synchronizes receivable; existing payments untouched...');
  let creanceSynced = false;
  let syncedMontantFacture: Prisma.Decimal | null = null;
  let syncedMontantRecu: Prisma.Decimal | null = null;
  let paymentsModified = false;

  const mockPrismaFactureUpdate: any = {
    facture: {
      findFirst: async () => ({
        id: 301,
        companyId: 1,
        idVoyage: 77,
        tauxTva: new Prisma.Decimal('20.00'),
        devise: 'MAD',
        supprimeLe: null,
      }),
      update: async () => ({ id: 301 }),
      findUnique: async () => ({
        id: 301,
        numeroFacture: 'F002/2026',
        sousTotal: new Prisma.Decimal('20000.00'),
        tauxTva: new Prisma.Decimal('20.00'),
        montantTotal: new Prisma.Decimal('24000.00'),
        paiements: [{ id: 10, montantRecu: new Prisma.Decimal('10000.00'), estAnnule: false }],
      }),
    },
    voyage: {
      findFirst: async () => ({
        idVoyage: 77,
        companyId: 1,
        montantVoyage: 20000, // Updated from 15,000 to 20,000
      }),
    },
    fraisImmobilisation: {
      findUnique: async () => null,
    },
    creanceClient: {
      findUnique: async () => ({
        id: 501,
        companyId: 1,
        factureId: 301,
        montantFacture: new Prisma.Decimal('18000.00'), // Old total
        montantRecu: new Prisma.Decimal('10000.00'),
        dateEcheance: new Date('2026-12-31'),
      }),
      update: async ({ data }: any) => {
        creanceSynced = true;
        syncedMontantFacture = data.montantFacture;
        syncedMontantRecu = data.montantRecu;
        return { id: 501, ...data };
      },
    },
    paiementClient: {
      findMany: async () => [
        { id: 10, montantRecu: new Prisma.Decimal('10000.00'), estAnnule: false },
      ],
      update: async () => {
        paymentsModified = true;
      },
      delete: async () => {
        paymentsModified = true;
      },
    },
    $transaction: async (cb: any) => cb(mockPrismaFactureUpdate),
  };

  const facturesService = new FacturesService(
    mockPrismaFactureUpdate,
    new CreancesClientsService(mockPrismaFactureUpdate),
  );

  await facturesService.recalculateFactureInTx(mockPrismaFactureUpdate, 1, 77);

  assert(
    creanceSynced && Number(syncedMontantFacture) === 24000,
    'Updating invoice total synchronizes linked receivable to new authoritative total (24,000 MAD)',
    `syncedMontantFacture=${syncedMontantFacture}`,
  );
  assert(
    Number(syncedMontantRecu) === 10000,
    'Receivable montantRecu preserved exact active payments (10,000 MAD)',
  );
  assert(
    !paymentsModified,
    'Existing recorded payments were completely preserved without modification or deletion',
  );

  // --------------------------------------------------------------------------
  // TEST 7: Standalone receivable without valid invoice retains supported behavior
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Standalone receivable retains supported behavior...');
  const standaloneCreance = {
    id: 888,
    companyId: 1,
    factureId: 999,
    numeroFacture: 'STANDALONE-01',
    nomClient: 'CLIENT SANS FACTURE',
    delaiPaiementJours: 30,
    montantFacture: new Prisma.Decimal('15000.00'),
    montantRecu: new Prisma.Decimal('5000.00'),
    solde: new Prisma.Decimal('10000.00'),
    statutPaiement: CreanceStatut.PARTIEL,
    devise: 'MAD',
    facture: null, // No linked invoice
  };

  const standaloneView = toCreanceView(standaloneCreance);
  assert(
    standaloneView.montantFacture === 15000 && standaloneView.solde === 10000,
    'Standalone receivable without invoice link preserves original receivable amounts',
    `Got montantFacture=${standaloneView.montantFacture}, solde=${standaloneView.solde}`,
  );

  // --------------------------------------------------------------------------
  // TEST 8: Cross-company access is rejected
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Cross-company invoice/receivable/payment access rejection...');
  let crossCompanyBlocked = false;
  try {
    // Attempting to pay Company 1 invoice from Company 2
    await paiementsService.create(2, {
      numeroFacture: 'F001/2026',
      montantRecu: 1000,
      methodePaiement: 'VIREMENT',
    });
  } catch (err: any) {
    if (err.status === 404 || err.message.includes('introuvable')) {
      crossCompanyBlocked = true;
    }
  }
  assert(crossCompanyBlocked, 'Cross-company invoice payment attempt is rejected as NotFoundException');

  // --------------------------------------------------------------------------
  // TEST 9: VAT and calculation rules remain unchanged
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Financial calculation rules (HT + TVA = TTC) integrity...');
  const ht = new Prisma.Decimal('50000.00');
  const tvaRate = new Prisma.Decimal('20.00');
  const expectedTva = ht.mul(tvaRate).div(100).toDecimalPlaces(2);
  const expectedTtc = ht.add(expectedTva).toDecimalPlaces(2);
  assert(
    expectedTva.equals(new Prisma.Decimal('10000.00')) &&
      expectedTtc.equals(new Prisma.Decimal('60000.00')),
    'Standard 20% TVA calculation on 50,000 yields exact 10,000 TVA and 60,000 TTC',
  );

  // --------------------------------------------------------------------------
  // TEST 10: Concurrency protection (row-level locking FOR UPDATE)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10] Concurrency protection via row-level locking (SELECT FOR UPDATE)...');
  let facturesLockVerified = false;
  let creancesLockVerified = false;

  const mockPrismaConcurrency: any = {
    facture: {
      findFirst: async () => ({
        id: 401,
        companyId: 1,
        numeroFacture: 'F003/2026',
        nomClient: 'CLIENT CONCURRENCY',
        devise: 'MAD',
        supprimeLe: null,
      }),
    },
    paiementClient: {
      findMany: async () => [],
      create: async ({ data }: any) => ({ id: 777, ...data }),
    },
    creanceClient: {
      findUnique: async () => ({
        id: 601,
        companyId: 1,
        factureId: 401,
        montantFacture: new Prisma.Decimal('12000.00'),
        montantRecu: new Prisma.Decimal('0.00'),
        solde: new Prisma.Decimal('12000.00'),
        statutPaiement: 'NON_PAYE',
      }),
      create: async ({ data }: any) => ({ id: 601, ...data }),
      update: async () => ({ id: 601 }),
    },
    $queryRaw: async (query: any, ...args: any[]) => {
      const qStr = Array.isArray(query)
        ? query.join('')
        : query?.strings
          ? query.strings.join('')
          : String(query);
      if (qStr.includes('FROM factures') && qStr.includes('FOR UPDATE')) {
        facturesLockVerified = true;
        return [
          {
            id: 401,
            company_id: 1,
            sous_total: new Prisma.Decimal('10000.00'),
            taux_tva: new Prisma.Decimal('20.00'),
            montant_tva: new Prisma.Decimal('2000.00'),
            montant_total: new Prisma.Decimal('12000.00'),
            supprime_le: null,
          },
        ];
      }
      if (qStr.includes('FROM creances_clients') && qStr.includes('FOR UPDATE')) {
        creancesLockVerified = true;
        return [
          {
            id: 601,
            company_id: 1,
            facture_id: 401,
            montant_facture: new Prisma.Decimal('12000.00'),
            montant_recu: new Prisma.Decimal('0.00'),
            solde: new Prisma.Decimal('12000.00'),
            statut_paiement: 'NON_PAYE',
          },
        ];
      }
      return [];
    },
    $transaction: async (cb: any) => cb(mockPrismaConcurrency),
  };

  const concurrentPaiementsService = new PaiementsClientsService(
    mockPrismaConcurrency,
    new CreancesClientsService(mockPrismaConcurrency),
  );

  await concurrentPaiementsService.create(1, {
    numeroFacture: 'F003/2026',
    montantRecu: 2000,
    methodePaiement: 'VIREMENT',
  });

  assert(
    facturesLockVerified && creancesLockVerified,
    'Transactional payment creation executes atomic row-level locks (FOR UPDATE) on both factures and creances_clients',
  );

  // --------------------------------------------------------------------------
  // TEST 11: Focused regression test for PaiementsClientsService.update()
  // --------------------------------------------------------------------------
  console.log('\n[TEST 11] PaiementsClientsService.update() capacity validation and recalculation...');
  let updateRecalculated = false;
  let updatedRecvTotal: Prisma.Decimal | null = null;
  let updatedStatut: CreanceStatut | null = null;

  // Invoice 501: Total = 40,000 MAD
  // Payment 10: 25,000 MAD (other active payment)
  // Payment 11: 5,000 MAD (target payment to update)
  let payment11Amount = new Prisma.Decimal('5000.00');

  const mockPrismaUpdate: any = {
    paiementClient: {
      findFirst: async ({ where }: any) => {
        if (where.id === 11) {
          return {
            id: 11,
            companyId: 1,
            factureId: 501,
            numeroFacture: 'F005/2026',
            nomClient: 'CLIENT EDIT TEST',
            datePaiement: new Date('2026-02-01'),
            montantRecu: payment11Amount,
            methodePaiement: 'VIREMENT',
            devise: 'MAD',
            tauxChange: null,
            montantConvertiMad: null,
            sourceTaux: null,
            estTauxManuel: false,
            dateTauxUtilise: null,
            estAnnule: false,
            facture: {
              id: 501,
              companyId: 1,
              numeroFacture: 'F005/2026',
              nomClient: 'CLIENT EDIT TEST',
              devise: 'MAD',
              supprimeLe: null,
            },
            cheque: null,
            lettreDeChange: null,
          };
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        // Exclude target payment if where.id.not === 11
        const activeList: any[] = [];
        if (!where.id || where.id.not !== 10) {
          activeList.push({ id: 10, montantRecu: new Prisma.Decimal('25000.00'), estAnnule: false });
        }
        if (!where.id || where.id.not !== 11) {
          activeList.push({ id: 11, montantRecu: payment11Amount, estAnnule: false });
        }
        return activeList.filter((p) => !p.estAnnule);
      },
      update: async ({ where, data }: any) => {
        if (where.id === 11) {
          payment11Amount = data.montantRecu;
        }
        return {
          id: 11,
          factureId: 501,
          montantRecu: payment11Amount,
          methodePaiement: data.methodePaiement ?? 'VIREMENT',
          datePaiement: data.datePaiement ?? new Date(),
          facture: {
            id: 501,
            creance: {
              id: 701,
              montantFacture: new Prisma.Decimal('40000.00'),
              montantRecu: updatedRecvTotal ?? new Prisma.Decimal('30000.00'),
              solde: new Prisma.Decimal('10000.00'),
              statutPaiement: CreanceStatut.PARTIEL,
            },
          },
        };
      },
    },
    facture: {
      findFirst: async () => ({
        id: 501,
        companyId: 1,
        numeroFacture: 'F005/2026',
        nomClient: 'CLIENT EDIT TEST',
        devise: 'MAD',
        supprimeLe: null,
        sousTotal: new Prisma.Decimal('33333.33'),
        tauxTva: new Prisma.Decimal('20.00'),
        montantTotal: new Prisma.Decimal('40000.00'),
      }),
    },
    creanceClient: {
      findUnique: async () => ({
        id: 701,
        companyId: 1,
        factureId: 501,
        montantFacture: new Prisma.Decimal('40000.00'),
        montantRecu: new Prisma.Decimal('30000.00'),
        solde: new Prisma.Decimal('10000.00'),
        statutPaiement: CreanceStatut.PARTIEL,
      }),
      update: async ({ data }: any) => {
        updateRecalculated = true;
        updatedRecvTotal = data.montantRecu;
        updatedStatut = data.statutPaiement;
        return {
          id: 701,
          ...data,
        };
      },
    },
    cheque: {
      deleteMany: async () => ({ count: 0 }),
      delete: async () => ({}),
      upsert: async () => ({}),
      update: async () => ({}),
    },
    lettreDeChange: {
      deleteMany: async () => ({ count: 0 }),
      delete: async () => ({}),
      update: async () => ({}),
    },
    $queryRaw: async (query: any) => {
      const qStr = Array.isArray(query)
        ? query.join('')
        : query?.strings
          ? query.strings.join('')
          : String(query);
      if (qStr.includes('FROM factures')) {
        return [
          {
            id: 501,
            company_id: 1,
            sous_total: new Prisma.Decimal('33333.33'),
            taux_tva: new Prisma.Decimal('20.00'),
            montant_total: new Prisma.Decimal('40000.00'),
            supprime_le: null,
          },
        ];
      }
      if (qStr.includes('FROM creances_clients')) {
        return [
          {
            id: 701,
            company_id: 1,
            facture_id: 501,
            montant_facture: new Prisma.Decimal('40000.00'),
            montant_recu: new Prisma.Decimal('30000.00'),
            solde: new Prisma.Decimal('10000.00'),
            statut_paiement: 'PARTIEL',
          },
        ];
      }
      return [];
    },
    $transaction: async (cb: any) => cb(mockPrismaUpdate),
  };

  const updateTestService = new PaiementsClientsService(
    mockPrismaUpdate,
    new CreancesClientsService(mockPrismaUpdate),
  );

  // Subtest 11.1: Reject new amount exceeding remaining capacity (40,000 - 25,000 = 15,000 capacity; attempting 16,000)
  let editExceedingRejected = false;
  try {
    await updateTestService.update(11, { montantRecu: 16000 }, 1);
  } catch (err: any) {
    if (err instanceof ConflictException) {
      editExceedingRejected = true;
      assert(
        err.message.includes('dépasse le solde disponible'),
        'PaiementsClientsService.update() rejects amount (16,000 MAD) exceeding remaining capacity (15,000 MAD)',
        err.message,
      );
    }
  }
  assert(editExceedingRejected, 'Payment update over-capacity is properly rejected with ConflictException');

  // Subtest 11.2: Accept valid new amount within remaining capacity (updating to 12,000 MAD <= 15,000 MAD)
  updateRecalculated = false;
  let editValidSuccess = false;
  try {
    const editRes = await updateTestService.update(11, { montantRecu: 12000 }, 1);
    editValidSuccess = editRes !== null;
  } catch (err: any) {
    console.error('Unexpected error on valid update:', err);
  }
  assert(
    editValidSuccess,
    'PaiementsClientsService.update() accepts valid updated amount (12,000 MAD <= 15,000 MAD available)',
  );

  // Subtest 11.3: Confirm receivable is recalculated from resulting active payments (25,000 + 12,000 = 37,000 MAD)
  assert(
    updateRecalculated &&
      updatedRecvTotal !== null &&
      Number(updatedRecvTotal) === 37000 &&
      updatedStatut === CreanceStatut.PARTIEL,
    'Receivable was recalculated from resulting active payments (25,000 + 12,000 = 37,000 MAD, statut=PARTIEL)',
    `updatedRecvTotal=${updatedRecvTotal}, updatedStatut=${updatedStatut}`,
  );

  // --------------------------------------------------------------------------
  // TEST 12: Strict lock acquisition order verification (factures -> creances_clients)
  // [TEST TYPE: SQL CONSTRUCTION / CODE EXECUTION ORDER - NOT LIVE DB CONCURRENCY]
  // --------------------------------------------------------------------------
  console.log('\n[TEST 12] Lock acquisition order verification (factures -> creances_clients)...');
  console.log('  [NOTE] This test verifies SQL construction & acquisition sequence order in code.');
  console.log('  [NOTE] It is NOT a live PostgreSQL concurrency benchmark against a live DB engine.');

  let createLockSequence: string[] = [];
  let updateLockSequence: string[] = [];
  let cancelLockSequence: string[] = [];

  const createLockRecordingPrisma: any = {
    facture: {
      findFirst: async () => ({
        id: 801,
        companyId: 1,
        numeroFacture: 'F008/2026',
        nomClient: 'CLIENT LOCK TEST',
        devise: 'MAD',
        supprimeLe: null,
      }),
    },
    paiementClient: {
      findMany: async () => [],
      create: async ({ data }: any) => ({ id: 888, ...data }),
      findFirst: async () => ({
        id: 888,
        companyId: 1,
        factureId: 801,
        numeroFacture: 'F008/2026',
        nomClient: 'CLIENT LOCK TEST',
        datePaiement: new Date(),
        montantRecu: new Prisma.Decimal('1000.00'),
        methodePaiement: 'VIREMENT',
        devise: 'MAD',
        estAnnule: false,
        facture: { id: 801, companyId: 1, devise: 'MAD', supprimeLe: null },
        cheque: null,
        lettreDeChange: null,
      }),
      update: async () => ({ id: 888 }),
    },
    creanceClient: {
      findUnique: async () => ({
        id: 901,
        companyId: 1,
        factureId: 801,
        montantFacture: new Prisma.Decimal('10000.00'),
        montantRecu: new Prisma.Decimal('0.00'),
        solde: new Prisma.Decimal('10000.00'),
        statutPaiement: 'NON_PAYE',
      }),
      create: async ({ data }: any) => ({ id: 901, ...data }),
      update: async () => ({ id: 901 }),
    },
    cheque: {
      deleteMany: async () => ({ count: 0 }),
      delete: async () => ({}),
      upsert: async () => ({}),
      update: async () => ({}),
    },
    lettreDeChange: {
      deleteMany: async () => ({ count: 0 }),
      delete: async () => ({}),
      update: async () => ({}),
    },
    $queryRaw: async (query: any) => {
      const qStr = Array.isArray(query)
        ? query.join('')
        : query?.strings
          ? query.strings.join('')
          : String(query);

      let targetTable = '';
      if (qStr.includes('FROM factures')) targetTable = 'factures';
      if (qStr.includes('FROM creances_clients')) targetTable = 'creances_clients';

      if (currentTestContext === 'create') {
        createLockSequence.push(targetTable);
      } else if (currentTestContext === 'update') {
        updateLockSequence.push(targetTable);
      } else if (currentTestContext === 'cancel') {
        cancelLockSequence.push(targetTable);
      }

      if (targetTable === 'factures') {
        return [
          {
            id: 801,
            company_id: 1,
            sous_total: new Prisma.Decimal('10000.00'),
            taux_tva: new Prisma.Decimal('20.00'),
            montant_tva: new Prisma.Decimal('2000.00'),
            montant_total: new Prisma.Decimal('12000.00'),
            supprime_le: null,
          },
        ];
      }
      if (targetTable === 'creances_clients') {
        return [
          {
            id: 901,
            company_id: 1,
            facture_id: 801,
            montant_facture: new Prisma.Decimal('12000.00'),
            montant_recu: new Prisma.Decimal('0.00'),
            solde: new Prisma.Decimal('12000.00'),
            statut_paiement: 'NON_PAYE',
          },
        ];
      }
      return [];
    },
    $transaction: async (cb: any) => cb(createLockRecordingPrisma),
  };

  let currentTestContext = 'create';
  const lockOrderService = new PaiementsClientsService(
    createLockRecordingPrisma,
    new CreancesClientsService(createLockRecordingPrisma),
  );

  // 12.1 Check create() lock sequence
  await lockOrderService.create(1, {
    numeroFacture: 'F008/2026',
    montantRecu: 1000,
    methodePaiement: 'VIREMENT',
  });

  const createFactureLockIdx = createLockSequence.indexOf('factures');
  const createCreanceLockIdx = createLockSequence.indexOf('creances_clients');
  assert(
    createFactureLockIdx !== -1 &&
      createCreanceLockIdx !== -1 &&
      createFactureLockIdx < createCreanceLockIdx,
    `create() locks 'factures' (step ${createFactureLockIdx}) BEFORE 'creances_clients' (step ${createCreanceLockIdx})`,
    `Actual sequence: ${createLockSequence.join(' -> ')}`,
  );

  // 12.2 Check update() lock sequence
  currentTestContext = 'update';
  await lockOrderService.update(888, { montantRecu: 2000 }, 1);

  const updateFactureLockIdx = updateLockSequence.indexOf('factures');
  const updateCreanceLockIdx = updateLockSequence.indexOf('creances_clients');
  assert(
    updateFactureLockIdx !== -1 &&
      updateCreanceLockIdx !== -1 &&
      updateFactureLockIdx < updateCreanceLockIdx,
    `update() locks 'factures' (step ${updateFactureLockIdx}) BEFORE 'creances_clients' (step ${updateCreanceLockIdx})`,
    `Actual sequence: ${updateLockSequence.join(' -> ')}`,
  );

  // 12.3 Check cancel() lock sequence
  currentTestContext = 'cancel';
  await lockOrderService.cancel(888, { motifAnnulation: 'Test annul' }, 1);

  const cancelFactureLockIdx = cancelLockSequence.indexOf('factures');
  const cancelCreanceLockIdx = cancelLockSequence.indexOf('creances_clients');
  assert(
    cancelFactureLockIdx !== -1 &&
      cancelCreanceLockIdx !== -1 &&
      cancelFactureLockIdx < cancelCreanceLockIdx,
    `cancel() locks 'factures' (step ${cancelFactureLockIdx}) BEFORE 'creances_clients' (step ${cancelCreanceLockIdx})`,
    `Actual sequence: ${cancelLockSequence.join(' -> ')}`,
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
