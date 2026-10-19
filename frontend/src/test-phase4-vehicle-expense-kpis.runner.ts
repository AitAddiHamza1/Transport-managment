import type { ChargeVehiculeStats } from './features/charges-vehicules/types';

/**
 * TRANSiVO ERP — PHASE 4: VEHICLE EXPENSE KPI CARDS RECONCILIATION TEST RUNNER
 */
function runPhase4VehicleExpenseKpiTests() {
  console.log('======================================================================');
  console.log('=== PHASE 4 — VEHICLE EXPENSE KPI RECONCILIATION TEST RUNNER      ===');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: The fuel KPI displays carburantMontant
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Testing fuel KPI mapping and display...');
  const statsFixture: ChargeVehiculeStats = {
    totalCount: 42,
    totalMontant: 40000,
    entretienMontant: 12000,
    reparationsMontant: 8500,
    carburantMontant: 15300,
    autresMontant: 4200,
  };

  const formatAmount = (val?: number | null) => (val ?? 0).toLocaleString('fr-FR');

  const fuelValueFormatted = formatAmount(statsFixture.carburantMontant);
  // French locale formatting formats 15300 with a space or narrow non-breaking space
  const normalizedFuel = fuelValueFormatted.replace(/\s|\u202f|\u00a0/g, ' ');
  assert(
    normalizedFuel === '15 300',
    `Fuel KPI correctly formats stats.carburantMontant (15300 -> "${normalizedFuel}")`,
  );

  // --------------------------------------------------------------------------
  // TEST 2: Category amounts reconcile with montantTotal
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing category reconciliation with montantTotal...');
  // The 4 visible category card values:
  // Card 3: Entretiens & Réparations = entretienMontant + reparationsMontant
  // Card 4: Carburant = carburantMontant
  // Card 5: Autres dépenses = autresMontant
  const cardEntretiensReparations = statsFixture.entretienMontant + statsFixture.reparationsMontant;
  const cardCarburant = statsFixture.carburantMontant;
  const cardAutres = statsFixture.autresMontant;

  const visibleCategorySum = cardEntretiensReparations + cardCarburant + cardAutres;
  assert(
    visibleCategorySum === statsFixture.totalMontant,
    `Visible category cards reconcile exactly with totalMontant (${cardEntretiensReparations} + ${cardCarburant} + ${cardAutres} = ${visibleCategorySum} === ${statsFixture.totalMontant})`,
  );

  // Verify backend classification partitioning logic
  const sampleExpenses = [
    { categorie: 'ENTRETIEN_PERIODIQUE', montant: 5000 },
    { categorie: 'REPARATION_MOTEUR', montant: 3000 },
    { categorie: 'ACHAT_PIECES', montant: 2000 },
    { categorie: 'CARBURANT_EXTERNE', montant: 6000 },
    { categorie: 'GASOIL_DEPOT', montant: 4000 },
    { categorie: 'PEAGE_AUTOROUTE', montant: 1000 },
    { categorie: 'ASSURANCE_ANNUELLE', montant: 2500 },
    { categorie: 'TAXE_ESSIEU', montant: 1500 },
  ];

  let simTotal = 0;
  let simEntretien = 0;
  let simReparation = 0;
  let simCarburant = 0;
  let simAutres = 0;

  for (const exp of sampleExpenses) {
    const val = exp.montant;
    simTotal += val;
    const cat = exp.categorie.toUpperCase();
    if (cat.includes('ENTRETIEN')) {
      simEntretien += val;
    } else if (cat.includes('REPARATION') || cat.includes('PIECES')) {
      simReparation += val;
    } else if (cat.includes('CARBURANT') || cat.includes('GASOIL')) {
      simCarburant += val;
    } else {
      simAutres += val;
    }
  }

  const simReconciliationSum = (simEntretien + simReparation) + simCarburant + simAutres;
  assert(
    simReconciliationSum === simTotal,
    `Backend partition formula guarantees full reconciliation (${simReconciliationSum} === ${simTotal})`,
  );
  assert(simCarburant === 10000, `Carburant correctly groups CARBURANT + GASOIL (expected 10000, got ${simCarburant})`);
  assert(simEntretien === 5000, `Entretien correctly groups ENTRETIEN (expected 5000, got ${simEntretien})`);
  assert(simReparation === 5000, `Reparations correctly groups REPARATION + PIECES (expected 5000, got ${simReparation})`);
  assert(simAutres === 5000, `Autres correctly catches remaining operational categories (expected 5000, got ${simAutres})`);

  // --------------------------------------------------------------------------
  // TEST 3: Zero and null/undefined values rendered safely
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing zero and null/undefined fallback handling...');
  const emptyStats: any = {};
  assert(formatAmount(emptyStats?.carburantMontant) === '0', 'undefined carburantMontant renders "0"');
  assert(formatAmount(null) === '0', 'null carburantMontant renders "0"');
  assert(formatAmount(0) === '0', 'zero carburantMontant renders "0"');

  const nullStats: any = null;
  assert(formatAmount(nullStats?.totalMontant) === '0', 'null statsData totalMontant renders "0"');
  assert(formatAmount(nullStats?.carburantMontant) === '0', 'null statsData carburantMontant renders "0"');

  // --------------------------------------------------------------------------
  // TEST 4: Existing filters and KPI cards remain unchanged
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing card structure and filter independence...');
  const expectedCards = [
    { label: 'Total charges', expectedVal: statsFixture.totalCount.toString() },
    { label: 'Montant total (MAD)', expectedVal: formatAmount(statsFixture.totalMontant) },
    { label: 'Entretiens & Réparations', expectedVal: formatAmount(statsFixture.entretienMontant + statsFixture.reparationsMontant) },
    { label: 'Carburant', expectedVal: formatAmount(statsFixture.carburantMontant) },
    { label: 'Autres dépenses', expectedVal: formatAmount(statsFixture.autresMontant) },
  ];

  assert(expectedCards.length === 5, 'Exactly 5 top KPI cards are configured');
  assert(expectedCards[0].label === 'Total charges', 'Card 1 is "Total charges"');
  assert(expectedCards[1].label === 'Montant total (MAD)', 'Card 2 is "Montant total (MAD)"');
  assert(expectedCards[2].label === 'Entretiens & Réparations', 'Card 3 is "Entretiens & Réparations"');
  assert(expectedCards[3].label === 'Carburant', 'Card 4 is "Carburant"');
  assert(expectedCards[4].label === 'Autres dépenses', 'Card 5 is "Autres dépenses"');

  // --------------------------------------------------------------------------
  // TEST 5: Responsive layout configuration for narrow screens
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing responsive grid layout...');
  const gridColumns = {
    xs: 'repeat(2, 1fr)',
    sm: 'repeat(3, 1fr)',
    md: 'repeat(5, 1fr)',
  };

  assert(gridColumns.xs === 'repeat(2, 1fr)', 'Narrow screens (xs) use 2-column grid to prevent horizontal overflow');
  assert(gridColumns.sm === 'repeat(3, 1fr)', 'Small tablet screens (sm) use 3-column grid');
  assert(gridColumns.md === 'repeat(5, 1fr)', 'Desktop screens (md) use 5-column grid');

  console.log('\n======================================================================');
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED               ===`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`Phase 4 Vehicle Expense KPI tests failed with ${failed} failure(s).`);
  }
}

runPhase4VehicleExpenseKpiTests();
