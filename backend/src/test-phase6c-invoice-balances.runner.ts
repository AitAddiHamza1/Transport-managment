import { Prisma } from '@prisma/client';
import { toFactureView } from './modules/factures/factures.service';

async function run() {
  console.log('=== RUNNING PHASE 6C INVOICE BALANCES UNIT TESTS ===');
  let passed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
    passed++;
    console.log(`✓ ${msg}`);
  }

  // 1. Mocking inputs for toFactureView
  const mockFactureBase = {
    id: 9991,
    numeroFacture: 'TEST-F6C-001',
    nomClient: 'TEST CLIENT',
    sousTotal: new Prisma.Decimal('1000.00'),
    tauxTva: new Prisma.Decimal('20.00'),
    montantTva: new Prisma.Decimal('200.00'),
    montantTotal: new Prisma.Decimal('1200.00'),
    devise: 'MAD',
    dateFacture: new Date(),
    joursEcheance: 30,
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    supprimeLe: null,
    paiements: [],
  };

  // Test Case 1: No Payment
  const view1 = toFactureView(mockFactureBase);
  assert(view1.montantPaye === '0.00', 'Test 1: montantPaye defaults to "0.00"');
  assert(view1.soldeRestant === '1200.00', 'Test 1: soldeRestant defaults to total TTC');
  assert(view1.statut === 'EMISE', 'Test 1: Status is EMISE');

  // Test Case 2: Partial Payment
  const mockFacturePartial = {
    ...mockFactureBase,
    paiements: [{ montantRecu: new Prisma.Decimal('400.00') }],
  };
  const view2 = toFactureView(mockFacturePartial);
  assert(view2.montantPaye === '400.00', 'Test 2: montantPaye records partial payment of 400.00');
  assert(view2.soldeRestant === '800.00', 'Test 2: soldeRestant drops to 800.00');
  assert(view2.statut === 'PARTIELLEMENT_PAYEE', 'Test 2: Status is PARTIELLEMENT_PAYEE');

  // Test Case 3: Multiple Payments
  const mockFactureMultiple = {
    ...mockFactureBase,
    paiements: [
      { montantRecu: new Prisma.Decimal('400.00') },
      { montantRecu: new Prisma.Decimal('350.50') },
    ],
  };
  const view3 = toFactureView(mockFactureMultiple);
  assert(view3.montantPaye === '750.50', 'Test 3: sums multiple payments');
  assert(view3.soldeRestant === '449.50', 'Test 3: remaining correct');

  // Test Case 4: Full Payment
  const mockFactureFull = {
    ...mockFactureBase,
    paiements: [{ montantRecu: new Prisma.Decimal('1200.00') }],
  };
  const view4 = toFactureView(mockFactureFull);
  assert(view4.montantPaye === '1200.00', 'Test 4: paid equal to total');
  assert(view4.soldeRestant === '0.00', 'Test 4: remaining is "0.00"');
  assert(view4.statut === 'PAYEE', 'Test 4: Status is PAYEE');

  // Test Case 5: Overpayment
  const mockFactureOver = {
    ...mockFactureBase,
    paiements: [{ montantRecu: new Prisma.Decimal('1350.00') }],
  };
  const view5 = toFactureView(mockFactureOver);
  assert(view5.montantPaye === '1350.00', 'Test 5: paid records overpaid amount without clamping');
  assert(view5.soldeRestant === '0.00', 'Test 5: remaining clamped to "0.00"');
  assert(view5.statut === 'PAYEE', 'Test 5: Status remains PAYEE');

  // Test Case 6: Soft deleted invoice terminal status
  const mockFactureSoftDel = {
    ...mockFactureBase,
    supprimeLe: new Date(),
    paiements: [{ montantRecu: new Prisma.Decimal('1200.00') }],
  };
  const view6 = toFactureView(mockFactureSoftDel);
  assert(view6.statut === 'ANNULEE', 'Test 6: Soft-deleted invoice preserves ANNULEE even if paid');

  // Test Case 7: Decimal values exact checks
  const mockFactureDec = {
    ...mockFactureBase,
    montantTotal: new Prisma.Decimal('1250.55'),
    paiements: [
      { montantRecu: new Prisma.Decimal('500.20') },
      { montantRecu: new Prisma.Decimal('250.10') },
    ],
  };
  const view7 = toFactureView(mockFactureDec);
  assert(view7.montantPaye === '750.30', 'Test 7: Paid sum is exact: 750.30');
  assert(view7.soldeRestant === '500.25', 'Test 7: Remaining balance is exact: 500.25');

  console.log(`\n=== ALL ${passed} UNIT TESTS PASSED ===\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
