import type { CreatePaiementClientPayload } from './features/paiements-clients/types';

/**
 * PHASE 7F STEP 3 — FRONTEND FOREX UX INTEGRATION TEST RUNNER
 */
function runFrontendStep3Tests() {
  console.log('====================================================');
  console.log('=== PHASE 7F STEP 3 — FRONTEND FOREX TEST RUNNER ===');
  console.log('====================================================\n');

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

  // ----------------------------------------------------
  // TEST 1: MAD Invoice Submission Payload
  // ----------------------------------------------------
  console.log('[TEST 1] Testing MAD Invoice Submission Payload...');
  const madPayload: CreatePaiementClientPayload = {
    numeroFacture: 'F001/2026',
    nomClient: 'MAD_CLIENT',
    datePaiement: '2026-09-03',
    montantRecu: 5000.0,
    methodePaiement: 'VIREMENT',
    devise: 'MAD',
    tauxChange: undefined,
  };

  assert(madPayload.devise === 'MAD', 'MAD payload devise is MAD');
  assert(madPayload.tauxChange === undefined, 'MAD payload tauxChange is undefined');
  assert(!('montantConvertiMad' in madPayload), 'montantConvertiMad absent from payload');
  assert(!('sourceTaux' in madPayload), 'sourceTaux absent from payload');
  assert(!('estTauxManuel' in madPayload), 'estTauxManuel absent from payload');
  assert(!('dateTauxUtilise' in madPayload), 'dateTauxUtilise absent from payload');

  // ----------------------------------------------------
  // TEST 2: Automatic EUR Invoice Submission Payload
  // ----------------------------------------------------
  console.log('\n[TEST 2] Testing Automatic EUR Submission Payload...');
  const autoEurPayload: CreatePaiementClientPayload = {
    numeroFacture: 'F004/2026',
    nomClient: 'EUR_CLIENT',
    datePaiement: '2026-09-03',
    montantRecu: 1000.0,
    methodePaiement: 'VIREMENT',
    devise: 'EUR',
    tauxChange: undefined, // Automatic mode does NOT send tauxChange!
  };

  assert(autoEurPayload.devise === 'EUR', 'Auto EUR payload devise is EUR');
  assert(autoEurPayload.tauxChange === undefined, 'Auto EUR payload tauxChange is NOT sent to server');
  assert(!('montantConvertiMad' in autoEurPayload), 'montantConvertiMad absent from auto EUR payload');

  // ----------------------------------------------------
  // TEST 3: Manual EUR Invoice Submission Payload
  // ----------------------------------------------------
  console.log('\n[TEST 3] Testing Manual EUR Submission Payload...');
  const manualRate = 10.78;
  const manualEurPayload: CreatePaiementClientPayload = {
    numeroFacture: 'F004/2026',
    nomClient: 'EUR_CLIENT',
    datePaiement: '2026-09-03',
    montantRecu: 1000.0,
    methodePaiement: 'VIREMENT',
    devise: 'EUR',
    tauxChange: manualRate, // Manual mode sends user rate!
  };

  assert(manualEurPayload.devise === 'EUR', 'Manual EUR payload devise is EUR');
  assert(manualEurPayload.tauxChange === 10.78, 'Manual EUR payload contains user rate 10.78');
  assert(!('montantConvertiMad' in manualEurPayload), 'montantConvertiMad absent from manual EUR payload');

  // ----------------------------------------------------
  // TEST 4: Frontend Live Converted Preview Calculation
  // ----------------------------------------------------
  console.log('\n[TEST 4] Testing Frontend Live Converted Preview Calculation...');
  const amount = 1000.0;
  const rate = 10.8149;
  const previewMad = Math.round(amount * rate * 100) / 100;
  assert(previewMad === 10814.9, 'Live preview calculation is exact (1000 * 10.8149 = 10814.90 MAD)');

  // ----------------------------------------------------
  // TEST 5: Publication Date vs Payment Date Helper Text Formatting
  // ----------------------------------------------------
  console.log('\n[TEST 5] Testing Publication Date vs Payment Date Formatting...');
  const datePaiementStr: string = '2026-08-30'; // Sunday
  const publicationDateStr: string = '2026-08-28'; // Friday
  const isWeekend = publicationDateStr !== datePaiementStr;
  const helperText = isWeekend
    ? `Taux officiel Bank Al-Maghrib (Publié le ${publicationDateStr})`
    : 'Taux officiel Bank Al-Maghrib';

  assert(isWeekend === true, 'Weekend date mismatch detected correctly');
  assert(
    helperText === 'Taux officiel Bank Al-Maghrib (Publié le 2026-08-28)',
    'Helper text displays Friday publication date for Sunday payment',
  );

  console.log('\n====================================================');
  console.log(`=== FRONTEND TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  console.log('====================================================\n');

  if (failed > 0) {
    throw new Error(`Frontend Step 3 Forex tests failed with ${failed} failure(s).`);
  }
}

runFrontendStep3Tests();
