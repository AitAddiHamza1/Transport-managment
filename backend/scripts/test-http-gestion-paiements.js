const jwt = require('jsonwebtoken');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'change_me_access_secret';

async function runHttpAcceptanceSuite() {
  console.log('====================================================================');
  console.log('=== GESTION DES PAIEMENTS HTTP ACCEPTANCE TEST SUITE ===');
  console.log('====================================================================\n');

  try {
    // Generate valid JWT token for ADMIN_GENERAL
    const payload = {
      sub: 1,
      id: 1,
      email: 'admin@transport.local',
      idRole: 1,
      role: 'ADMIN_GENERAL',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // -------------------------------------------------------------
    // Step 1: 401 Unauthenticated Protection
    // -------------------------------------------------------------
    console.log('[STEP 1] Testing 401 Unauthenticated Protection...');
    const unauthRes = await fetch(`${BASE_URL}/gestion-paiements`);
    if (unauthRes.status === 401) {
      console.log('  ✓ PASSED: GET /gestion-paiements without token rejected with 401 Unauthorized');
    } else {
      throw new Error(`FAILED: GET without token returned ${unauthRes.status}`);
    }

    // -------------------------------------------------------------
    // Step 2: GET /gestion-paiements?page=1&limit=10 (200 OK)
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Testing GET /gestion-paiements?page=1&limit=10...');
    const listRes = await fetch(`${BASE_URL}/gestion-paiements?page=1&limit=10`, { headers: authHeaders });
    const listData = await listRes.json();
    if (listRes.status !== 200 || !Array.isArray(listData.data)) {
      throw new Error(`Invalid list response (status ${listRes.status}): ${JSON.stringify(listData)}`);
    }
    console.log(`  ✓ PASSED: GET /gestion-paiements returned 200 OK (${listData.data.length} items, Total: ${listData.meta.total})`);

    // -------------------------------------------------------------
    // Step 3: GET /gestion-paiements/stats (200 OK)
    // -------------------------------------------------------------
    console.log('\n[STEP 3] Testing GET /gestion-paiements/stats...');
    const statsRes = await fetch(`${BASE_URL}/gestion-paiements/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();
    if (statsRes.status !== 200 || statsData.totalIn === undefined) {
      throw new Error(`Invalid stats response (status ${statsRes.status}): ${JSON.stringify(statsData)}`);
    }
    console.log(
      `  ✓ PASSED: GET /gestion-paiements/stats returned 200 OK (totalIn=${statsData.totalIn}, totalOut=${statsData.totalOut}, netBalance=${statsData.netBalance} MAD)`,
    );

    // -------------------------------------------------------------
    // Step 4: GET /gestion-paiements/stats with ignored pagination query params (200 OK)
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Testing GET /gestion-paiements/stats?page=1&limit=10...');
    const statsWithPageRes = await fetch(`${BASE_URL}/gestion-paiements/stats?page=1&limit=10`, { headers: authHeaders });
    const statsWithPageData = await statsWithPageRes.json();
    if (statsWithPageRes.status !== 200 || statsWithPageData.totalIn === undefined) {
      throw new Error(`Invalid stats response with pagination params (status ${statsWithPageRes.status}): ${JSON.stringify(statsWithPageData)}`);
    }
    console.log('  ✓ PASSED: GET /gestion-paiements/stats?page=1&limit=10 returned 200 OK without DTO validation failure');

    console.log('\n====================================================================');
    console.log('=== ALL GESTION DES PAIEMENTS HTTP ACCEPTANCE TESTS PASSED ===');
    console.log('====================================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Suite Error:', err.message);
    process.exit(1);
  }
}

runHttpAcceptanceSuite();
