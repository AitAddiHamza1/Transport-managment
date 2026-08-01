const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables dynamically
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.PHASE15_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@transport.ma';
const ADMIN_PASSWORD = process.env.PHASE15_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

function request(method, routePath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + routePath);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runHttpTests() {
  console.log('====================================================');
  console.log('  HTTP ACCEPTANCE TEST RUNNER — PHASE 15');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  let adminToken = null;
  let createdFactureId = null;
  const testNumFacture = `HTTP-P15-${Date.now()}`;

  try {
    // 1. Authenticate Admin
    console.log('[Step 1] Authenticate Admin User');
    const authRes = await request('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = authRes.body?.accessToken || authRes.body?.access_token;
    assert(authRes.status === 200 && Boolean(token), 'Admin login successful');
    adminToken = token;

    // 2. 401 Unauthorized Matrix
    console.log('\n[Step 2] 401 Unauthorized Matrix');
    const unauthCreances = await request('GET', '/creances-clients');
    assert(unauthCreances.status === 401, 'GET /creances-clients rejected with 401 without token');

    const unauthPaiements = await request('GET', '/paiements-clients');
    assert(unauthPaiements.status === 401, 'GET /paiements-clients rejected with 401 without token');

    const unauthPostPaiement = await request('POST', '/paiements-clients', {
      numeroFacture: 'DUMMY',
      montantRecu: 100,
      methodePaiement: 'ESPECES',
    });
    assert(unauthPostPaiement.status === 401, 'POST /paiements-clients rejected with 401 without token');

    // 3. Fetch Initial Lists & Stats (Read-Only Side-Effect Free Check)
    console.log('\n[Step 3] Fetch Creances & Stats (Read-Only)');
    const creancesRes = await request('GET', '/creances-clients', null, adminToken);
    assert(creancesRes.status === 200 && Array.isArray(creancesRes.body.data), 'GET /creances-clients returns 200 OK');

    const creanceStatsRes = await request('GET', '/creances-clients/stats', null, adminToken);
    assert(creanceStatsRes.status === 200 && typeof creanceStatsRes.body.totalCreances === 'number', 'GET /creances-clients/stats returns 200 OK');

    // 4. Create Invoice -> Verify Creance Auto-Created
    console.log('\n[Step 4] Create Invoice via HTTP -> Auto Creance');
    const createFactureRes = await request('POST', '/factures', {
      numeroFacture: testNumFacture,
      nomClient: 'Client HTTP Phase 15 SARL',
      sousTotal: 2000,
      tauxTva: 0,
    }, adminToken);
    assert(createFactureRes.status === 201 && Boolean(createFactureRes.body.id), 'POST /factures created invoice (201 Created)');
    createdFactureId = createFactureRes.body.id;

    const findCreanceRes = await request('GET', `/creances-clients?search=${testNumFacture}`, null, adminToken);
    assert(findCreanceRes.status === 200 && findCreanceRes.body.data.length === 1, 'Auto-created CreanceClient returned via HTTP API');
    const creanceItem = findCreanceRes.body.data[0];
    assert(creanceItem.montantFacture === 2000, 'Creance montantFacture equals 2000 MAD');
    assert(creanceItem.solde === 2000, 'Creance initial solde equals 2000 MAD');
    assert(creanceItem.statutPaiement === 'NON_PAYE', 'Initial statutPaiement is NON_PAYE');

    // 5. Partial Payment (1200 MAD on 2000 MAD balance)
    console.log('\n[Step 5] Register Partial Payment (1200 MAD)');
    const partialRes = await request('POST', '/paiements-clients', {
      numeroFacture: testNumFacture,
      montantRecu: 1200,
      methodePaiement: 'VIREMENT',
    }, adminToken);
    assert(partialRes.status === 201, 'POST /paiements-clients registered partial payment (201 Created)');
    assert(partialRes.body.creance.solde === 800, 'Creance solde updated to 800 MAD');
    assert(partialRes.body.creance.statutPaiement === 'PARTIEL', 'Creance status updated to PARTIEL');

    // 6. Overpayment Rejection (800.01 MAD against 800 MAD remaining solde) -> HTTP 409
    console.log('\n[Step 6] Overpayment Rejection (800.01 MAD against 800 MAD solde)');
    const overpayRes = await request('POST', '/paiements-clients', {
      numeroFacture: testNumFacture,
      montantRecu: 800.01,
      methodePaiement: 'VIREMENT',
    }, adminToken);
    assert(overpayRes.status === 409, 'Overpayment 800.01 MAD rejected with HTTP 409 Conflict');

    // 7. Exact Final Payment (800 MAD on 800 MAD solde) -> 201 Created & PAYE
    console.log('\n[Step 7] Register Exact Final Payment (800 MAD)');
    const finalRes = await request('POST', '/paiements-clients', {
      numeroFacture: testNumFacture,
      montantRecu: 800,
      methodePaiement: 'CHEQUE',
    }, adminToken);
    assert(finalRes.status === 201, 'POST /paiements-clients registered final payment (201 Created)');
    assert(finalRes.body.creance.solde === 0, 'Creance solde updated to 0 MAD');
    assert(finalRes.body.creance.statutPaiement === 'PAYE', 'Creance status updated to PAYE');

    // 8. Payment on Fully Paid Invoice -> HTTP 409 Conflict
    console.log('\n[Step 8] Payment on Fully Paid Invoice Rejection');
    const paidAgainRes = await request('POST', '/paiements-clients', {
      numeroFacture: testNumFacture,
      montantRecu: 50,
      methodePaiement: 'ESPECES',
    }, adminToken);
    assert(paidAgainRes.status === 409, 'Payment on fully paid invoice rejected with HTTP 409 Conflict');

    // 9. Fetch Payments List & Stats
    console.log('\n[Step 9] Fetch Payments List & Stats');
    const paiementsListRes = await request('GET', `/paiements-clients?search=${testNumFacture}`, null, adminToken);
    assert(paiementsListRes.status === 200 && paiementsListRes.body.data.length === 2, 'GET /paiements-clients returned 2 payments for test invoice');

    const paiementsStatsRes = await request('GET', '/paiements-clients/stats', null, adminToken);
    assert(paiementsStatsRes.status === 200 && typeof paiementsStatsRes.body.totalPaiements === 'number', 'GET /paiements-clients/stats returned 200 OK');

    // 10. Clean up test invoice
    console.log('\n[Step 10] Cleanup Test Invoice & Data');
    if (createdFactureId) {
      const delRes = await request('DELETE', `/factures/${createdFactureId}`, null, adminToken);
      assert(delRes.status === 200, 'Test invoice deleted (soft deleted) via HTTP API');
    }

  } catch (err) {
    console.error('Fatal error during HTTP acceptance tests:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  HTTP RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHttpTests();
