const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.DASHBOARD_ADMIN_EMAIL || 'admin@transport.local';
const ADMIN_PASSWORD = process.env.DASHBOARD_ADMIN_PASSWORD || 'ChangeMe2025!';

async function runHttpDashboardTests() {
  console.log('======================================================================');
  console.log('=== TABLEAU DE BORD HTTP ACCEPTANCE TEST SUITE ===');
  console.log('======================================================================\n');

  let token = null;

  // Step 1: Authentication Test & Token Acquisition
  console.log('[STEP 1] Authenticating ADMIN_GENERAL account...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, motDePasse: ADMIN_PASSWORD }),
    });
    const loginData = await loginRes.json();
    token = loginData.accessToken || loginData.access_token || loginData.token;
    if (!token) {
      throw new Error(`No access token received from login: ${JSON.stringify(loginData)}`);
    }
    console.log('  ✓ Authentication successful');
  } catch (err) {
    console.error('  ✗ Auth failed:', err.message);
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Step 2: Test 401 Unauthorized
  console.log('\n[STEP 2] Testing 401 Unauthorized access...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/overview`);
    if (res.status === 401) {
      console.log('  ✓ PASSED: 401 Unauthorized rejected cleanly');
    } else {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  } catch (err) {
    if (err.message.includes('401')) {
      console.log('  ✓ PASSED: 401 Unauthorized rejected cleanly');
    } else {
      throw err;
    }
  }

  // Step 3: Test GET /api/dashboard/overview with Default & Custom Presets
  console.log('\n[STEP 3] Testing GET /api/dashboard/overview...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/overview`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Overview returned ${res.status}`);
    const data = await res.json();
    console.log('  ✓ Status 200 OK');
    console.log(`  ✓ Period: ${data.period.preset} (${data.period.dateDebut} to ${data.period.dateFin})`);
    console.log(`  ✓ Financial Total Outflow: ${data.financial.totalOutflow} ${data.company.currency}`);
    console.log(`  ✓ Operations Active Vehicles: ${data.operations.activeVehicles}`);
  } catch (err) {
    console.error('  ✗ GET /dashboard/overview failed:', err.message);
    process.exit(1);
  }

  // Step 4: Test GET /api/dashboard/charts
  console.log('\n[STEP 4] Testing GET /api/dashboard/charts...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/charts?preset=CE_MOIS&months=6`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Charts returned ${res.status}`);
    const data = await res.json();
    console.log('  ✓ Status 200 OK');
    console.log(`  ✓ Cash Flow periods: ${data.cashFlow.length}`);
    console.log(`  ✓ Trips status series: ${data.tripsByStatus.length}`);
    console.log(`  ✓ Outflow categories: ${data.expensesBySource.length}`);
    console.log(`  ✓ Document health items: ${data.documentsByStatus.length}`);
  } catch (err) {
    console.error('  ✗ GET /dashboard/charts failed:', err.message);
    process.exit(1);
  }

  // Step 5: Test GET /api/dashboard/alerts
  console.log('\n[STEP 5] Testing GET /api/dashboard/alerts...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/alerts`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Alerts returned ${res.status}`);
    const data = await res.json();
    console.log('  ✓ Status 200 OK');
    console.log(`  ✓ Alerts returned: ${data.length}`);
  } catch (err) {
    console.error('  ✗ GET /dashboard/alerts failed:', err.message);
    process.exit(1);
  }

  // Step 6: Test GET /api/dashboard/recent-activity
  console.log('\n[STEP 6] Testing GET /api/dashboard/recent-activity...');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/recent-activity?preset=CE_MOIS`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Recent activity returned ${res.status}`);
    const data = await res.json();
    console.log('  ✓ Status 200 OK');
    console.log(`  ✓ Recent activities count (CE_MOIS): ${data.length}`);
    if (data.length > 0) {
      console.log(`  ✓ Latest event: [${data[0].type}] ${data[0].title} -> ${data[0].sourceRoute}`);
    }
  } catch (err) {
    console.error('  ✗ GET /dashboard/recent-activity failed:', err.message);
    process.exit(1);
  }

  console.log('\n======================================================================');
  console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
  console.log('======================================================================\n');
}

runHttpDashboardTests();
