import { DashboardService } from './modules/dashboard/dashboard.service';
import { toFactureView } from './modules/factures/factures.service';
import { toCreanceView } from './modules/creances-clients/creances-clients.service';
import { toPaiementView } from './modules/paiements-clients/paiements-clients.service';
import { CreanceStatut, Prisma } from '@prisma/client';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`✗ [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ [PASS] ${msg}`);
}

async function runPhase7FinancialRegressionSuite() {
  console.log('========================================================================');
  console.log('=== PHASE 7 — FINANCIAL FIXES & RECONCILIATION REGRESSION RUNNER     ===');
  console.log('========================================================================\n');

  const companyA = 10;
  const companyB = 20;

  // --------------------------------------------------------------------------
  // Mock datasets for DashboardService
  // --------------------------------------------------------------------------
  const mockCompanySettings = [
    { companyId: companyA, nomEntreprise: 'TRANSiVO Logistics SARL', devise: 'MAD' },
    { companyId: companyB, nomEntreprise: 'Autre Entreprise', devise: 'MAD' },
  ];

  const mockFactures: any[] = [
    // Company A: Invoices in May 2026
    { id: 1, companyId: companyA, numeroFacture: 'FA-2026-001', montantTotal: new Prisma.Decimal(10000), dateFacture: new Date('2026-05-05'), devise: 'MAD', supprimeLe: null },
    { id: 2, companyId: companyA, numeroFacture: 'FA-2026-002', montantTotal: new Prisma.Decimal(5000), dateFacture: new Date('2026-05-15'), devise: 'EUR', supprimeLe: null },
    // Company A: Invoice in April 2026 (outside May 2026)
    { id: 3, companyId: companyA, numeroFacture: 'FA-2026-003', montantTotal: new Prisma.Decimal(20000), dateFacture: new Date('2026-04-10'), devise: 'MAD', supprimeLe: null },
    // Company A: Deleted invoice
    { id: 4, companyId: companyA, numeroFacture: 'FA-2026-004', montantTotal: new Prisma.Decimal(8000), dateFacture: new Date('2026-05-12'), devise: 'MAD', supprimeLe: new Date('2026-05-14') },
    // Company B: Multi-tenant invoice
    { id: 5, companyId: companyB, numeroFacture: 'FA-2026-005', montantTotal: new Prisma.Decimal(15000), dateFacture: new Date('2026-05-10'), devise: 'MAD', supprimeLe: null },
  ];

  const mockPaiementsClients: any[] = [
    // 1. MAD payment without conversion value in May 2026
    { id: 1, factureId: 1, montantRecu: new Prisma.Decimal(4000), datePaiement: new Date('2026-05-10'), devise: 'MAD', montantConvertiMad: null, estAnnule: false },
    // 2. EUR payment with valid conversion value in May 2026
    { id: 2, factureId: 2, montantRecu: new Prisma.Decimal(2000), datePaiement: new Date('2026-05-18'), devise: 'EUR', montantConvertiMad: new Prisma.Decimal(21700), estAnnule: false },
    // 3. Foreign payment without valid conversion in May 2026 (must NOT be added as MAD)
    { id: 3, factureId: 2, montantRecu: new Prisma.Decimal(500), datePaiement: new Date('2026-05-20'), devise: 'USD', montantConvertiMad: null, estAnnule: false },
    // 4. Cancelled payment in May 2026 (must be excluded)
    { id: 4, factureId: 1, montantRecu: new Prisma.Decimal(3000), datePaiement: new Date('2026-05-12'), devise: 'MAD', montantConvertiMad: null, estAnnule: true },
    // 5. Payment in April 2026 (outside May 2026)
    { id: 5, factureId: 3, montantRecu: new Prisma.Decimal(5000), datePaiement: new Date('2026-04-15'), devise: 'MAD', montantConvertiMad: null, estAnnule: false },
    // 6. Company B payment
    { id: 6, factureId: 5, montantRecu: new Prisma.Decimal(7000), datePaiement: new Date('2026-05-10'), devise: 'MAD', montantConvertiMad: null, estAnnule: false },
  ];

  const mockDettesFournisseurs: any[] = [
    { id: 101, companyId: companyA, montantDu: new Prisma.Decimal(10000), dateDette: new Date('2026-05-02'), supprimeLe: null },
    { id: 102, companyId: companyA, montantDu: new Prisma.Decimal(15000), dateDette: new Date('2026-05-03'), supprimeLe: null }, // Unpaid debt
    { id: 201, companyId: companyB, montantDu: new Prisma.Decimal(5000), dateDette: new Date('2026-05-02'), supprimeLe: null },
  ];

  const mockPaiementsFournisseurs: any[] = [
    // Paid debt 101 in May 2026
    { id: 1, idDetteFournisseur: 101, montant: new Prisma.Decimal(10000), datePaiement: new Date('2026-05-20'), estAnnule: false },
    // Cancelled supplier payment
    { id: 2, idDetteFournisseur: 101, montant: new Prisma.Decimal(2000), datePaiement: new Date('2026-05-15'), estAnnule: true },
    // Company B supplier payment
    { id: 3, idDetteFournisseur: 201, montant: new Prisma.Decimal(5000), datePaiement: new Date('2026-05-20'), estAnnule: false },
  ];

  const mockVehicules: any[] = [
    { immatriculation: '1234-A-50', companyId: companyA },
    { immatriculation: '5678-B-60', companyId: companyB },
  ];

  const mockDepensesVehicules: any[] = [
    // 1. Vehicle expense with supplier debt (AVEC_FACTURE) -> idDetteFournisseur != null
    { idDepense: 1, immatriculation: '1234-A-50', montant: new Prisma.Decimal(10000), dateDepense: new Date('2026-05-02'), idDetteFournisseur: 101, categorieDepense: 'REPARATION' },
    // 2. Vehicle expense with unpaid supplier debt -> idDetteFournisseur != null
    { idDepense: 2, immatriculation: '1234-A-50', montant: new Prisma.Decimal(15000), dateDepense: new Date('2026-05-03'), idDetteFournisseur: 102, categorieDepense: 'ENTRETIEN' },
    // 3. Cash-only vehicle expense (SANS_FACTURE) -> idDetteFournisseur == null
    { idDepense: 3, immatriculation: '1234-A-50', montant: new Prisma.Decimal(800), dateDepense: new Date('2026-05-08'), idDetteFournisseur: null, categorieDepense: 'LAVAGE' },
    // 4. Independent cash-only fuel expense in depenses_vehicules -> idDetteFournisseur == null
    { idDepense: 4, immatriculation: '1234-A-50', montant: new Prisma.Decimal(1200), dateDepense: new Date('2026-05-12'), idDetteFournisseur: null, categorieDepense: 'CARBURANT' },
    // 5. Company B cash vehicle expense
    { idDepense: 5, immatriculation: '5678-B-60', montant: new Prisma.Decimal(900), dateDepense: new Date('2026-05-08'), idDetteFournisseur: null, categorieDepense: 'LAVAGE' },
  ];

  const mockBonsCarburant: any[] = [
    { idBon: 1, immatriculation: '1234-A-50', montantTotal: new Prisma.Decimal(3500), dateCarburant: new Date('2026-05-15') },
  ];

  const mockPrisma: any = {
    companySettings: {
      findFirst: async ({ where }: any) => mockCompanySettings.find((c) => c.companyId === where.companyId) || null,
    },
    facture: {
      findMany: async ({ where, select }: any) => {
        return mockFactures.filter((f) => {
          if (where.companyId !== undefined && f.companyId !== where.companyId) return false;
          if (where.supprimeLe === null && f.supprimeLe !== null) return false;
          if (where.dateFacture) {
            const fTime = f.dateFacture.getTime();
            if (where.dateFacture.gte && fTime < where.dateFacture.gte.getTime()) return false;
            if (where.dateFacture.lte && fTime > where.dateFacture.lte.getTime()) return false;
          }
          return true;
        }).map((f) => {
          const res: any = { id: f.id, montantTotal: f.montantTotal, devise: f.devise };
          if (select?.paiements) {
            const onlyActive = select.paiements.where?.estAnnule === false;
            res.paiements = mockPaiementsClients.filter((p) => p.factureId === f.id && (!onlyActive || !p.estAnnule));
          }
          return res;
        });
      },
    },
    paiementClient: {
      findMany: async ({ where }: any) => {
        return mockPaiementsClients.filter((p) => {
          const facture = mockFactures.find((f) => f.id === p.factureId);
          if (!facture) return false;
          if (where.facture?.companyId !== undefined && facture.companyId !== where.facture.companyId) return false;
          if (where.estAnnule !== undefined && p.estAnnule !== where.estAnnule) return false;
          if (where.datePaiement) {
            const pTime = p.datePaiement.getTime();
            if (where.datePaiement.gte && pTime < where.datePaiement.gte.getTime()) return false;
            if (where.datePaiement.lte && pTime > where.datePaiement.lte.getTime()) return false;
          }
          return true;
        });
      },
    },
    paiementFournisseur: {
      aggregate: async ({ where }: any) => {
        const filtered = mockPaiementsFournisseurs.filter((p) => {
          const dette = mockDettesFournisseurs.find((d) => d.id === p.idDetteFournisseur);
          if (!dette) return false;
          if (where.detteFournisseur?.companyId !== undefined && dette.companyId !== where.detteFournisseur.companyId) return false;
          if (where.estAnnule !== undefined && p.estAnnule !== where.estAnnule) return false;
          if (where.datePaiement) {
            const pTime = p.datePaiement.getTime();
            if (where.datePaiement.gte && pTime < where.datePaiement.gte.getTime()) return false;
            if (where.datePaiement.lte && pTime > where.datePaiement.lte.getTime()) return false;
          }
          return true;
        });
        const sum = filtered.reduce((acc, p) => acc.add(p.montant), new Prisma.Decimal(0));
        return { _sum: { montant: filtered.length > 0 ? sum : null } };
      },
    },
    versementEmploye: {
      aggregate: async () => ({ _sum: { montant: null } }),
    },
    depenseAdministrative: {
      aggregate: async () => ({ _sum: { montant: null } }),
    },
    depenseVehicule: {
      aggregate: async ({ where }: any) => {
        const filtered = mockDepensesVehicules.filter((dv) => {
          const v = mockVehicules.find((veh) => veh.immatriculation === dv.immatriculation);
          if (!v) return false;
          if (where.vehicule?.companyId !== undefined && v.companyId !== where.vehicule.companyId) return false;
          if (where.idDetteFournisseur === null && dv.idDetteFournisseur !== null) return false;
          if (where.dateDepense) {
            const dTime = dv.dateDepense.getTime();
            if (where.dateDepense.gte && dTime < where.dateDepense.gte.getTime()) return false;
            if (where.dateDepense.lte && dTime > where.dateDepense.lte.getTime()) return false;
          }
          return true;
        });
        const sum = filtered.reduce((acc, dv) => acc.add(dv.montant), new Prisma.Decimal(0));
        return { _sum: { montant: filtered.length > 0 ? sum : null } };
      },
    },
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      // Mock fuel raw query
      if (sql.includes('bons_carburant')) {
        const cId = params[0];
        const filtered = mockBonsCarburant.filter((b) => {
          const v = mockVehicules.find((veh) => veh.immatriculation === b.immatriculation);
          return v && v.companyId === cId;
        });
        const sum = filtered.reduce((acc, b) => acc.add(b.montantTotal), new Prisma.Decimal(0));
        return [{ total: sum.toString() }];
      }
      return [];
    },
    voyage: { count: async () => 0 },
    vehicule: { count: async () => 1 },
    conducteur: { count: async () => 1 },
    documentVehicule: { findMany: async () => [] },
  };

  const dashboardService = new DashboardService(mockPrisma);

  const queryMay = {
    preset: 'PERSONNALISE' as any,
    dateDebut: '2026-05-01',
    dateFin: '2026-05-31',
  };

  const overviewCompanyA = await dashboardService.getOverview(companyA, queryMay, {}, true);

  // --------------------------------------------------------------------------
  // TEST 1: Invoiced vehicle expense + supplier payment counted ONCE in cash outflows
  // --------------------------------------------------------------------------
  // Debt 101 was 10,000 MAD. Paid 10,000 MAD via supplier payment.
  // vehicleExpenseOutflow must NOT count it again!
  assert(
    overviewCompanyA.financial.supplierOutflow === '10000.00',
    `1. Supplier payment of 10,000 MAD for settled vehicle expense is counted under supplierOutflow [received: ${overviewCompanyA.financial.supplierOutflow}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 2: Unpaid supplier debt (15,000 MAD) is NOT counted as cash disbursement
  // --------------------------------------------------------------------------
  // Expense 2 (15,000 MAD) has unpaid debt 102.
  // Cash-only vehicle expenses are only Expense 3 (800) + Expense 4 (1200) = 2,000 MAD.
  assert(
    overviewCompanyA.financial.vehicleExpenseOutflow === '2000.00',
    `2 & 3. Unpaid debt (15,000 MAD) is excluded from cash outflow, while cash-only vehicle expenses (800 + 1200 = 2000 MAD) are counted [received: ${overviewCompanyA.financial.vehicleExpenseOutflow}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 4: Cash-only fuel expense in depenses_vehicules remains counted
  // --------------------------------------------------------------------------
  // Expense 4 is CARBURANT 1,200 MAD with idDetteFournisseur == null. It is included in the 2,000 MAD total above.
  assert(
    Number(overviewCompanyA.financial.vehicleExpenseOutflow) >= 1200,
    `4. Independent cash-only fuel expense (1,200 MAD) remains counted in direct vehicle expenses`,
  );

  // --------------------------------------------------------------------------
  // TEST 5: Cancelled payments excluded
  // --------------------------------------------------------------------------
  // Payment 2 in supplier payments (2,000 MAD cancelled) is excluded from supplierOutflow (which is 10,000, not 12,000).
  // Payment 4 in client payments (3,000 MAD cancelled) is excluded from clientReceipts.
  assert(
    overviewCompanyA.financial.supplierOutflow === '10000.00',
    `5a. Cancelled supplier payment (2,000 MAD) excluded from outflows`,
  );

  // --------------------------------------------------------------------------
  // TEST 6: Foreign currency client receipts use stored MAD conversion
  // --------------------------------------------------------------------------
  // Payment 2: 2,000 EUR with stored conversion 21,700 MAD.
  // Payment 1: 4,000 MAD.
  // Expected client receipts in MAD = 4,000 + 21,700 = 25,700 MAD.
  assert(
    overviewCompanyA.financial.clientReceipts === '25700.00',
    `6 & 7. Client receipts uses stored conversion for EUR (21,700 MAD) + MAD receipt (4,000 MAD) = 25,700.00 MAD [received: ${overviewCompanyA.financial.clientReceipts}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 8: Foreign receipt without conversion (500 USD) never silently added as MAD
  // --------------------------------------------------------------------------
  // If 500 USD had been silently added, clientReceipts would be 26,200. It is 25,700.
  assert(
    overviewCompanyA.financial.clientReceipts === '25700.00',
    `8. Foreign-currency receipt without valid MAD conversion is never silently added to MAD receipts`,
  );

  // --------------------------------------------------------------------------
  // TEST 9: Invoices reported in MAD, foreign currency isolated in foreignTotals
  // --------------------------------------------------------------------------
  // In May 2026: Facture 1 = 10,000 MAD. Facture 2 = 5,000 EUR.
  // totalInvoiced must be 10,000 MAD. EUR invoice must NOT be added to MAD!
  assert(
    overviewCompanyA.financial.totalInvoiced === '10000.00',
    `9a. Invoiced total in MAD reflects only MAD invoices (10,000.00 MAD) [received: ${overviewCompanyA.financial.totalInvoiced}]`,
  );
  assert(
    overviewCompanyA.metadata.hasForeignCurrency === true &&
    overviewCompanyA.financial.foreignTotals?.EUR?.invoiced === '5000.00',
    `9b. EUR invoice (5,000.00 EUR) is reported cleanly in foreignTotals without conflating currencies [received: ${JSON.stringify(overviewCompanyA.financial.foreignTotals)}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 10: Partial foreign invoice balance preserved in original currency
  // --------------------------------------------------------------------------
  // Facture 2 is 5,000 EUR. Received 2,000 EUR payment. Remaining balance = 3,000 EUR.
  assert(
    overviewCompanyA.financial.foreignTotals?.EUR?.outstanding === '3000.00',
    `10. Partial foreign invoice balance is maintained accurately in original currency (5,000 - 2,000 = 3,000.00 EUR) [received: ${overviewCompanyA.financial.foreignTotals?.EUR?.outstanding}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 11: Partially paid overdue invoice keeps PARTIELLEMENT_PAYEE and estEnRetard=true
  // --------------------------------------------------------------------------
  const pastDue = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
  const futureDue = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

  const partialOverdueInvoice = {
    id: 10,
    numeroFacture: 'FA-TEST-01',
    montantTotal: new Prisma.Decimal(10000),
    sousTotal: new Prisma.Decimal(10000),
    dateEcheance: pastDue,
    supprimeLe: null,
    paiements: [{ montantRecu: new Prisma.Decimal(3000), estAnnule: false }],
  };
  const viewPartialOverdue = toFactureView(partialOverdueInvoice);
  assert(
    viewPartialOverdue.statut === 'PARTIELLEMENT_PAYEE' && viewPartialOverdue.estEnRetard === true,
    `11. Partially paid overdue invoice retains primary status PARTIELLEMENT_PAYEE and sets estEnRetard: true [received statut: ${viewPartialOverdue.statut}, estEnRetard: ${viewPartialOverdue.estEnRetard}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 12: Partially paid not-overdue invoice: PARTIELLEMENT_PAYEE and estEnRetard=false
  // --------------------------------------------------------------------------
  const partialNotOverdueInvoice = {
    id: 11,
    numeroFacture: 'FA-TEST-02',
    montantTotal: new Prisma.Decimal(10000),
    sousTotal: new Prisma.Decimal(10000),
    dateEcheance: futureDue,
    supprimeLe: null,
    paiements: [{ montantRecu: new Prisma.Decimal(3000), estAnnule: false }],
  };
  const viewPartialNotOverdue = toFactureView(partialNotOverdueInvoice);
  assert(
    viewPartialNotOverdue.statut === 'PARTIELLEMENT_PAYEE' && viewPartialNotOverdue.estEnRetard === false,
    `12. Partially paid not-overdue invoice retains PARTIELLEMENT_PAYEE and sets estEnRetard: false`,
  );

  // --------------------------------------------------------------------------
  // TEST 13: Fully paid and cancelled invoice status handling
  // --------------------------------------------------------------------------
  const fullyPaidInvoice = {
    id: 12,
    numeroFacture: 'FA-TEST-03',
    montantTotal: new Prisma.Decimal(10000),
    sousTotal: new Prisma.Decimal(10000),
    dateEcheance: pastDue,
    supprimeLe: null,
    paiements: [{ montantRecu: new Prisma.Decimal(10000), estAnnule: false }],
  };
  const viewFullyPaid = toFactureView(fullyPaidInvoice);
  assert(
    viewFullyPaid.statut === 'PAYEE' && viewFullyPaid.estEnRetard === false,
    `13a. Fully paid invoice past due date sets statut: PAYEE and estEnRetard: false`,
  );

  const cancelledInvoice = {
    id: 13,
    numeroFacture: 'FA-TEST-04',
    montantTotal: new Prisma.Decimal(10000),
    sousTotal: new Prisma.Decimal(10000),
    dateEcheance: pastDue,
    supprimeLe: new Date(),
    paiements: [],
  };
  const viewCancelled = toFactureView(cancelledInvoice);
  assert(
    viewCancelled.statut === 'ANNULEE' && viewCancelled.estEnRetard === false,
    `13b. Cancelled invoice past due date sets statut: ANNULEE and estEnRetard: false`,
  );

  // --------------------------------------------------------------------------
  // TEST 13c: Unpaid overdue invoice preserves compatible EN_RETARD
  // --------------------------------------------------------------------------
  const unpaidOverdueInvoice = {
    id: 14,
    numeroFacture: 'FA-TEST-05',
    montantTotal: new Prisma.Decimal(10000),
    sousTotal: new Prisma.Decimal(10000),
    dateEcheance: pastDue,
    supprimeLe: null,
    paiements: [],
  };
  const viewUnpaidOverdue = toFactureView(unpaidOverdueInvoice);
  assert(
    viewUnpaidOverdue.statut === 'EN_RETARD' && viewUnpaidOverdue.estEnRetard === true,
    `13c. Unpaid overdue invoice preserves statut: EN_RETARD and sets estEnRetard: true`,
  );

  // --------------------------------------------------------------------------
  // TEST 14: Historical outstanding balance independent of selected dashboard period
  // --------------------------------------------------------------------------
  const queryApril = {
    preset: 'PERSONNALISE' as any,
    dateDebut: '2026-04-01',
    dateFin: '2026-04-30',
  };
  const overviewCompanyAApril = await dashboardService.getOverview(companyA, queryApril, {}, true);

  // Facture 1 (10000 - 4000 = 6000) + Facture 3 (20000 - 5000 = 15000) = 21,000 MAD.
  assert(
    overviewCompanyA.financial.outstandingAmount === '21000.00' &&
    overviewCompanyAApril.financial.outstandingAmount === '21000.00',
    `14. Historical outstanding balance is identical across different query periods (21,000.00 MAD) [May: ${overviewCompanyA.financial.outstandingAmount}, April: ${overviewCompanyAApril.financial.outstandingAmount}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 15: Tenant / Company isolation
  // --------------------------------------------------------------------------
  const overviewCompanyB = await dashboardService.getOverview(companyB, queryMay, {}, true);
  assert(
    overviewCompanyB.financial.totalInvoiced === '15000.00' &&
    overviewCompanyB.financial.supplierOutflow === '5000.00' &&
    overviewCompanyB.financial.vehicleExpenseOutflow === '900.00',
    `15. Complete company/tenant isolation verified for Company B [invoiced: ${overviewCompanyB.financial.totalInvoiced}, supplierOutflow: ${overviewCompanyB.financial.supplierOutflow}]`,
  );

  // --------------------------------------------------------------------------
  // TEST 16: Dashboard KPI / Chart reconciliation & Outflow consistency
  // --------------------------------------------------------------------------
  // For Company A in May:
  // totalOutflow = supplierOutflow (10000) + vehicleExpenseOutflow (2000) + fuelOutflow (3500) = 15,500.00 MAD.
  assert(
    overviewCompanyA.financial.totalOutflow === '15500.00',
    `16a. totalOutflow reconciles exactly across components (10,000 + 2,000 + 3,500 = 15,500.00 MAD) [received: ${overviewCompanyA.financial.totalOutflow}]`,
  );

  const chartsCompanyA = await dashboardService.getCharts(companyA, queryMay, {}, true);
  const vehicleExpenseSource = chartsCompanyA.expensesBySource.find((s) => s.source === 'VEHICLE_EXPENSE');
  assert(
    vehicleExpenseSource?.amount === '2000.00',
    `16b. expensesBySource vehicle expense slice reconciles with overview vehicleExpenseOutflow (2,000.00 MAD) [received: ${vehicleExpenseSource?.amount}]`,
  );

  console.log('\n========================================================================');
  console.log('ALL 16/16 PHASE 7 FINANCIAL REGRESSION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

runPhase7FinancialRegressionSuite().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
