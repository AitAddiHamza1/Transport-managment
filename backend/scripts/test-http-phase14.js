const http = require('http');
const https = require('https');
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

const runId = Date.now();
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test credentials
const ADMIN_EMAIL = process.env.PHASE14_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@transport.ma';
const ADMIN_PASSWORD = process.env.PHASE14_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

let adminToken = '';
let restrictedUserToken = '';
let restrictedUserId = null;

let createdClientId = null;
let createdVoyageId = null;
let createdFactureId = null;
let testNumeroFacture = `FAC-${runId.toString().slice(-6)}`;

let passCount = 0;
let failCount = 0;

function logStep(msg) {
  console.log(`\n── ${msg} ──`);
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

function request(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
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

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase14HttpSuite() {
  console.log(`\n======================================================================`);
  console.log(`Phase 14 Facturation Live HTTP Acceptance Suite — runId=${runId}`);
  console.log(`======================================================================\n`);

  try {
    // -------------------------------------------------------------
    // Step 1: Admin Login
    // -------------------------------------------------------------
    logStep('Step 1: Admin Login');
    const loginRes = await request('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(loginRes.status === 200, `Admin login: Status ${loginRes.status}`);
    assert(Boolean(loginRes.body?.accessToken), 'Admin token acquired');
    adminToken = loginRes.body?.accessToken;

    // -------------------------------------------------------------
    // Step 2: Unauthenticated 401 Security Tests
    // -------------------------------------------------------------
    logStep('Step 2: Unauthenticated 401 Security Tests (6 Endpoints)');
    const endpoints401 = [
      { method: 'GET', path: '/factures' },
      { method: 'GET', path: '/factures/stats' },
      { method: 'GET', path: '/factures/1' },
      { method: 'POST', path: '/factures' },
      { method: 'PATCH', path: '/factures/1' },
      { method: 'DELETE', path: '/factures/1' },
    ];

    for (const ep of endpoints401) {
      const res = await request(ep.method, ep.path);
      assert(res.status === 401, `Unauthenticated ${ep.method} ${ep.path} → 401: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 3: Authenticated 403 Security Tests
    // -------------------------------------------------------------
    logStep('Step 3: Authenticated 403 Security Tests (No Factures Permissions)');
    const rolesRes = await request('GET', '/roles', null, adminToken);
    const roles = Array.isArray(rolesRes.body) ? rolesRes.body : rolesRes.body?.data || [];
    const persRole = roles.find((r) => r.code === 'PERSONNALISE' || r.nom === 'PERSONNALISE');
    assert(Boolean(persRole), 'PERSONNALISE role found dynamically');

    const emptyPerms = {};
    if (persRole && persRole.permissions) {
      for (const modKey of Object.keys(persRole.permissions)) {
        emptyPerms[modKey] = {
          voir: false,
          ajouter: false,
          modifier: false,
          supprimer: false,
          exporter: false,
          imprimer: false,
          valider: false,
        };
      }
    }

    const newUserPayload = {
      nom: `RestrictedUser-${runId}`,
      email: `restricted-fac-${runId}@test.ma`,
      motDePasse: 'Password123!',
      idRole: persRole ? persRole.id : 2,
      statut: 'ACTIF',
      permissions: emptyPerms,
    };

    const createUserRes = await request('POST', '/users', newUserPayload, adminToken);
    assert(createUserRes.status === 201, `Create restricted PERSONNALISE user → 201: Status ${createUserRes.status}`);
    restrictedUserId = createUserRes.body?.id;

    const restLoginRes = await request('POST', '/auth/login', {
      email: newUserPayload.email,
      password: newUserPayload.motDePasse,
    });
    assert(restLoginRes.status === 200, `Restricted user login → 200: Status ${restLoginRes.status}`);
    restrictedUserToken = restLoginRes.body?.accessToken;

    const meRes = await request('GET', '/auth/me', null, restrictedUserToken);
    assert(meRes.status === 200, `Restricted user /auth/me status: ${meRes.status}`);
    assert(meRes.body?.permissions?.factures?.voir === false, 'Restricted user permissions.factures.voir is false');

    for (const ep of endpoints401) {
      const res = await request(ep.method, ep.path, ep.method === 'POST' ? {} : null, restrictedUserToken);
      assert(res.status === 403, `Restricted user ${ep.method} ${ep.path} → 403: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 4: Client & Voyage Fixture Creation
    // -------------------------------------------------------------
    logStep('Step 4: Operational Fixture Creation (Client & Voyage)');
    const clientRes = await request('POST', '/clients', {
      nomEntreprise: `Client-FAC-${runId}`,
      telephone: '+212600112233',
    }, adminToken);
    assert(clientRes.status === 201, `Create client fixture → 201: Status ${clientRes.status}`);
    createdClientId = clientRes.body?.id;

    const voyageRes = await request('POST', '/voyages', {
      nomClient: `Client-FAC-${runId}`,
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      montantVoyage: 18000,
      statut: 'PLANIFIE',
    }, adminToken);
    assert(voyageRes.status === 201, `Create voyage fixture → 201: Status ${voyageRes.status}`);
    createdVoyageId = voyageRes.body?.idVoyage;

    // -------------------------------------------------------------
    // Step 5: Facture Creation & Response Contract with Baseline Stats
    // -------------------------------------------------------------
    logStep('Step 5: Facture Creation & Response Contract with Baseline Stats');
    const baselineStatsRes = await request('GET', '/factures/stats', null, adminToken);
    const baselineStats = baselineStatsRes.body;

    const baselineListRes = await request('GET', '/factures', null, adminToken);
    const baselineListTotal = baselineListRes.body?.meta?.total ?? 0;

    const createFacturePayload = {
      numeroFacture: testNumeroFacture,
      nomClient: `Client-FAC-${runId}`,
      idVoyage: createdVoyageId,
      dateFacture: '2026-07-23',
      joursEcheance: 30,
      sousTotal: 15000,
      tauxTva: 20,
      notes: 'Prestation de transport national',
    };

    const createFacRes = await request('POST', '/factures', createFacturePayload, adminToken);
    assert(createFacRes.status === 201, `Create Facture → 201: Status ${createFacRes.status}`);
    createdFactureId = createFacRes.body?.id;
    assert(createFacRes.body?.numeroFacture === testNumeroFacture.toUpperCase(), `NumeroFacture normalized: "${createFacRes.body?.numeroFacture}"`);
    assert(createFacRes.body?.idVoyage === createdVoyageId, `Linked to voyage #${createdVoyageId}`);
    assert(typeof createFacRes.body?.sousTotal === 'number' && createFacRes.body?.sousTotal === 15000, `SousTotal is number primitive: ${createFacRes.body?.sousTotal}`);
    assert(typeof createFacRes.body?.montantTva === 'number' && createFacRes.body?.montantTva === 3000, `Generated montantTva: ${createFacRes.body?.montantTva} MAD`);
    assert(typeof createFacRes.body?.montantTotal === 'number' && createFacRes.body?.montantTotal === 18000, `Generated montantTotal: ${createFacRes.body?.montantTotal} MAD`);
    assert(createFacRes.body?.statut === 'EMISE', `Default status is EMISE: "${createFacRes.body?.statut}"`);

    const postCreateStatsRes = await request('GET', '/factures/stats', null, adminToken);
    assert(postCreateStatsRes.body?.totalFactures === baselineStats.totalFactures + 1, `Post-create totalFactures increased by 1 (${baselineStats.totalFactures} → ${postCreateStatsRes.body?.totalFactures})`);

    const postCreateListRes = await request('GET', '/factures', null, adminToken);
    assert(postCreateListRes.body?.meta?.total === baselineListTotal + 1, `Post-create list total increased by 1 (${baselineListTotal} → ${postCreateListRes.body?.meta?.total})`);

    // -------------------------------------------------------------
    // Step 6: DTO Negative Validation Coverage
    // -------------------------------------------------------------
    logStep('Step 6: DTO Negative Validation Coverage');
    const invalidQueryTests = [
      { page: 0, msg: 'Query page = 0 → 400' },
      { limit: 0, msg: 'Query limit = 0 → 400' },
      { limit: 101, msg: 'Query limit = 101 → 400' },
    ];
    for (const t of invalidQueryTests) {
      const q = new URLSearchParams(t).toString();
      const res = await request('GET', `/factures?${q}`, null, adminToken);
      assert(res.status === 400, `${t.msg}: Status ${res.status}`);
    }

    const invalidCreateTests = [
      { payload: { sousTotal: 10000 }, expectedStatus: 400, msg: 'Missing nomClient → 400' },
      { payload: { nomClient: 'Client', idVoyage: 999999, sousTotal: 10000 }, expectedStatus: 404, msg: 'Non-existent voyage → 404' },
      { payload: { nomClient: 'Client', sousTotal: -5000 }, expectedStatus: 400, msg: 'Negative sousTotal → 400' },
      { payload: { nomClient: 'Client', sousTotal: 10000, tauxTva: -10 }, expectedStatus: 400, msg: 'Negative tauxTva → 400' },
      { payload: { numeroFacture: testNumeroFacture, nomClient: 'Client Doublon', sousTotal: 10000 }, expectedStatus: 409, msg: 'Duplicate numeroFacture → 409' },
      { payload: { nomClient: 'Client', sousTotal: 10000, unknownProp: 'bad' }, expectedStatus: 400, msg: 'Unknown body property → 400' },
    ];
    for (const t of invalidCreateTests) {
      const res = await request('POST', '/factures', t.payload, adminToken);
      assert(res.status === t.expectedStatus, `${t.msg}: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 7: Detail Endpoint & 404 Check
    // -------------------------------------------------------------
    logStep('Step 7: Detail Endpoint & 404 Check');
    const detailRes = await request('GET', `/factures/${createdFactureId}`, null, adminToken);
    assert(detailRes.status === 200, `GET existing facture detail → 200: Status ${detailRes.status}`);
    assert(detailRes.body?.id === createdFactureId, `Detail ID: ${detailRes.body?.id}`);

    const detail404 = await request('GET', '/factures/999999', null, adminToken);
    assert(detail404.status === 404, `GET missing facture detail → 404 Not Found: Status ${detail404.status}`);

    // -------------------------------------------------------------
    // Step 8: List Pagination, Filtering & Search
    // -------------------------------------------------------------
    logStep('Step 8: List Pagination, Filtering & Search');
    const listRes = await request('GET', '/factures?page=1&limit=5', null, adminToken);
    assert(listRes.status === 200, `GET /factures paginated list → 200: Status ${listRes.status}`);
    assert(Array.isArray(listRes.body?.data), 'Response has data array');
    assert(Boolean(listRes.body?.meta), 'Response has meta pagination object');

    const searchRes = await request('GET', `/factures?search=${testNumeroFacture}`, null, adminToken);
    assert(searchRes.status === 200, `Search by numeroFacture → 200: Status ${searchRes.status}`);
    assert(searchRes.body?.data?.length > 0, 'Search returns match');

    // -------------------------------------------------------------
    // Step 9: Stats Endpoint
    // -------------------------------------------------------------
    logStep('Step 9: Stats Endpoint');
    const statsRes = await request('GET', '/factures/stats', null, adminToken);
    assert(statsRes.status === 200, `GET /factures/stats → 200: Status ${statsRes.status}`);
    assert(typeof statsRes.body?.totalFactures === 'number', 'Stats totalFactures is number');
    assert(typeof statsRes.body?.totalSousTotal === 'number', 'Stats totalSousTotal is number');
    assert(typeof statsRes.body?.totalTtc === 'number', 'Stats totalTtc is number');

    // -------------------------------------------------------------
    // Step 10: Update Facture
    // -------------------------------------------------------------
    logStep('Step 10: Update Facture');
    const updateRes = await request('PATCH', `/factures/${createdFactureId}`, {
      sousTotal: 20000,
      tauxTva: 20,
    }, adminToken);
    assert(updateRes.status === 200, `PATCH /factures/${createdFactureId} → 200: Status ${updateRes.status}`);
    assert(updateRes.body?.sousTotal === 20000, `Updated sousTotal: ${updateRes.body?.sousTotal}`);
    assert(updateRes.body?.montantTva === 4000, `Recalculated montantTva: ${updateRes.body?.montantTva} MAD`);
    assert(updateRes.body?.montantTotal === 24000, `Recalculated montantTotal: ${updateRes.body?.montantTotal} MAD`);

    // -------------------------------------------------------------
    // Step 11: Soft Delete & Active Count Consistency Verification
    // -------------------------------------------------------------
    logStep('Step 11: Soft Delete & Active Count Consistency Verification');
    const delRes = await request('DELETE', `/factures/${createdFactureId}`, null, adminToken);
    assert(delRes.status === 200, `Delete facture (soft delete) → 200 OK: Status ${delRes.status}`);

    const postDelCheck = await request('GET', `/factures/${createdFactureId}`, null, adminToken);
    assert(postDelCheck.status === 200, `Soft deleted facture still queryable by ID → 200: Status ${postDelCheck.status}`);
    assert(postDelCheck.body?.statut === 'ANNULEE', `Status is now ANNULEE: "${postDelCheck.body?.statut}"`);

    const postDeleteStatsRes = await request('GET', '/factures/stats', null, adminToken);
    assert(postDeleteStatsRes.body?.totalFactures === baselineStats.totalFactures, `Post-delete totalFactures restored to baseline (${postDeleteStatsRes.body?.totalFactures})`);
    assert(postDeleteStatsRes.body?.annuleesCount === baselineStats.annuleesCount + 1, `Post-delete annuleesCount increased by 1 (${postDeleteStatsRes.body?.annuleesCount})`);

    const postDeleteListRes = await request('GET', '/factures', null, adminToken);
    assert(postDeleteListRes.body?.meta?.total === baselineListTotal, `Post-delete active list total restored to baseline (${postDeleteListRes.body?.meta?.total})`);

  } catch (err) {
    console.error('Unhandled error during test suite execution:', err);
    failCount++;
  } finally {
    logStep('Cleanup Procedure');
    if (createdFactureId) {
      // Hard delete from database via prisma or safe endpoint if needed, or leave soft-deleted record
      console.log(`  🗑️  Facture #${createdFactureId} soft-deleted`);
    }
    if (createdVoyageId) {
      await request('DELETE', `/voyages/${createdVoyageId}`, null, adminToken);
      console.log(`  🗑️  Deleted Voyage #${createdVoyageId}`);
    }
    if (createdClientId) {
      await request('DELETE', `/clients/${createdClientId}`, null, adminToken);
      console.log(`  🗑️  Deleted Client #${createdClientId}`);
    }
    if (restrictedUserId) {
      await request('DELETE', `/users/${restrictedUserId}`, null, adminToken);
      console.log(`  🗑️  Deleted User #${restrictedUserId}`);
    }

    console.log(`\n======================================================================`);
    console.log(`Final Phase 14 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`======================================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runPhase14HttpSuite();
