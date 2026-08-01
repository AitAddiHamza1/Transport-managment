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
const ADMIN_EMAIL = process.env.PHASE13_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@transport.ma';
const ADMIN_PASSWORD = process.env.PHASE13_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

let adminToken = '';
let restrictedUserToken = '';
let restrictedUserId = null;
let createdVehiculeImmat = `V-F13-${runId.toString().slice(-4)}`;
let createdVehiculeId = null;
let createdBonId = null;

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

async function runPhase13HttpSuite() {
  console.log(`\n======================================================================`);
  console.log(`Phase 13 Consommation Gasoil / Bons Carburant Live HTTP Suite — runId=${runId}`);
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
      { method: 'GET', path: '/bons-carburant' },
      { method: 'GET', path: '/bons-carburant/stats' },
      { method: 'GET', path: '/bons-carburant/1' },
      { method: 'POST', path: '/bons-carburant' },
      { method: 'PATCH', path: '/bons-carburant/1' },
      { method: 'DELETE', path: '/bons-carburant/1' },
    ];

    for (const ep of endpoints401) {
      const res = await request(ep.method, ep.path);
      assert(res.status === 401, `Unauthenticated ${ep.method} ${ep.path} → 401: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 3: Authenticated 403 Security Tests
    // -------------------------------------------------------------
    logStep('Step 3: Authenticated 403 Security Tests (No Bons Carburant Permissions)');
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
      email: `restricted-fuel-${runId}@test.ma`,
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
    assert(meRes.body?.permissions?.bons_carburant?.voir === false, 'Restricted user permissions.bons_carburant.voir is false');

    for (const ep of endpoints401) {
      const res = await request(ep.method, ep.path, ep.method === 'POST' ? {} : null, restrictedUserToken);
      assert(res.status === 403, `Restricted user ${ep.method} ${ep.path} → 403: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 4: Vehicle Fixture Creation
    // -------------------------------------------------------------
    logStep('Step 4: Vehicle Fixture Creation');
    const createVehRes = await request('POST', '/vehicules', {
      immatriculation: createdVehiculeImmat,
      marque: 'Volvo',
      modele: 'FH16',
      typeVehicule: 'TRACTEUR',
      capaciteCharge: 24.5,
    }, adminToken);
    assert(createVehRes.status === 201, `Create vehicle fixture → 201: Status ${createVehRes.status}`);
    createdVehiculeId = createVehRes.body?.id;

    // -------------------------------------------------------------
    // Step 5: BonCarburant Creation & Response Contract
    // -------------------------------------------------------------
    logStep('Step 5: BonCarburant Creation & Response Contract');
    const createBonPayload = {
      immatriculation: `  ${createdVehiculeImmat.toLowerCase()}  `,
      nomConducteur: '  Mohamed Amine  ',
      nomStation: '  Afriquia Oasis  ',
      litres: 180.5,
      prixParLitre: 12.5,
      dateCarburant: '2026-07-23',
    };

    const createBonRes = await request('POST', '/bons-carburant', createBonPayload, adminToken);
    assert(createBonRes.status === 201, `Create BonCarburant → 201: Status ${createBonRes.status}`);
    createdBonId = createBonRes.body?.idBon;
    assert(createBonRes.body?.immatriculation === createdVehiculeImmat.toUpperCase(), `Immatriculation normalized uppercase: "${createBonRes.body?.immatriculation}"`);
    assert(createBonRes.body?.nomConducteur === 'Mohamed Amine', 'NomConducteur trimmed');
    assert(createBonRes.body?.nomStation === 'Afriquia Oasis', 'NomStation trimmed');
    assert(typeof createBonRes.body?.litres === 'number' && createBonRes.body?.litres === 180.5, `Litres is number primitive: ${createBonRes.body?.litres}`);
    assert(typeof createBonRes.body?.prixParLitre === 'number' && createBonRes.body?.prixParLitre === 12.5, `PrixParLitre is number primitive: ${createBonRes.body?.prixParLitre}`);
    assert(typeof createBonRes.body?.montantTotal === 'number' && createBonRes.body?.montantTotal === 2256.25, `Generated montantTotal calculated correctly: ${createBonRes.body?.montantTotal} MAD`);

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
      const res = await request('GET', `/bons-carburant?${q}`, null, adminToken);
      assert(res.status === 400, `${t.msg}: Status ${res.status}`);
    }

    const invalidCreateTests = [
      { payload: { litres: 100, prixParLitre: 12 }, expectedStatus: 400, msg: 'Missing immatriculation → 400' },
      { payload: { immatriculation: 'INVALID-VEH-999', litres: 100, prixParLitre: 12 }, expectedStatus: 404, msg: 'Non-existent vehicle → 404' },
      { payload: { immatriculation: createdVehiculeImmat, litres: -50, prixParLitre: 12 }, expectedStatus: 400, msg: 'Negative litres → 400' },
      { payload: { immatriculation: createdVehiculeImmat, litres: 100, prixParLitre: -10 }, expectedStatus: 400, msg: 'Negative prixParLitre → 400' },
      { payload: { immatriculation: createdVehiculeImmat, litres: 100, prixParLitre: 12, dateCarburant: 'invalid-date' }, expectedStatus: 400, msg: 'Malformed dateCarburant → 400' },
      { payload: { immatriculation: createdVehiculeImmat, litres: 100, prixParLitre: 12, unknownProp: 'bad' }, expectedStatus: 400, msg: 'Unknown body property → 400' },
    ];
    for (const t of invalidCreateTests) {
      const res = await request('POST', '/bons-carburant', t.payload, adminToken);
      assert(res.status === t.expectedStatus, `${t.msg}: Status ${res.status}`);
    }

    // -------------------------------------------------------------
    // Step 7: Detail Endpoint & 404 Check
    // -------------------------------------------------------------
    logStep('Step 7: Detail Endpoint & 404 Check');
    const detailRes = await request('GET', `/bons-carburant/${createdBonId}`, null, adminToken);
    assert(detailRes.status === 200, `GET existing bon detail → 200: Status ${detailRes.status}`);
    assert(detailRes.body?.idBon === createdBonId, `Detail ID: ${detailRes.body?.idBon}`);

    const detail404 = await request('GET', '/bons-carburant/999999', null, adminToken);
    assert(detail404.status === 404, `GET missing bon detail → 404 Not Found: Status ${detail404.status}`);

    // -------------------------------------------------------------
    // Step 8: List Pagination, Filtering & Search
    // -------------------------------------------------------------
    logStep('Step 8: List Pagination, Filtering & Search');
    const listRes = await request('GET', '/bons-carburant?page=1&limit=5', null, adminToken);
    assert(listRes.status === 200, `GET /bons-carburant paginated list → 200: Status ${listRes.status}`);
    assert(Array.isArray(listRes.body?.data), 'Response has data array');
    assert(Boolean(listRes.body?.meta), 'Response has meta pagination object');

    const searchRes = await request('GET', `/bons-carburant?search=${createdVehiculeImmat}`, null, adminToken);
    assert(searchRes.status === 200, `Search by immatriculation → 200: Status ${searchRes.status}`);
    assert(searchRes.body?.data?.length > 0, 'Search returns match');

    // -------------------------------------------------------------
    // Step 9: Stats Endpoint
    // -------------------------------------------------------------
    logStep('Step 9: Stats Endpoint');
    const statsRes = await request('GET', '/bons-carburant/stats', null, adminToken);
    assert(statsRes.status === 200, `GET /bons-carburant/stats → 200: Status ${statsRes.status}`);
    assert(typeof statsRes.body?.totalCount === 'number', 'Stats totalCount is number');
    assert(typeof statsRes.body?.totalLitres === 'number', 'Stats totalLitres is number');
    assert(typeof statsRes.body?.totalMontant === 'number', 'Stats totalMontant is number');

    // -------------------------------------------------------------
    // Step 10: Update BonCarburant
    // -------------------------------------------------------------
    logStep('Step 10: Update BonCarburant');
    const updateRes = await request('PATCH', `/bons-carburant/${createdBonId}`, {
      litres: 200,
      prixParLitre: 13.0,
    }, adminToken);
    assert(updateRes.status === 200, `PATCH /bons-carburant/${createdBonId} → 200: Status ${updateRes.status}`);
    assert(updateRes.body?.litres === 200, `Updated litres: ${updateRes.body?.litres}`);
    assert(updateRes.body?.prixParLitre === 13.0, `Updated prixParLitre: ${updateRes.body?.prixParLitre}`);
    assert(updateRes.body?.montantTotal === 2600, `Recalculated generated montantTotal: ${updateRes.body?.montantTotal} MAD`);

    // -------------------------------------------------------------
    // Step 11: Delete BonCarburant
    // -------------------------------------------------------------
    logStep('Step 11: Delete BonCarburant');
    const delRes = await request('DELETE', `/bons-carburant/${createdBonId}`, null, adminToken);
    assert(delRes.status === 200, `Delete bon → 200 OK: Status ${delRes.status}`);
    createdBonId = null;

  } catch (err) {
    console.error('Unhandled error during test suite execution:', err);
    failCount++;
  } finally {
    logStep('Cleanup Procedure');
    if (createdBonId) {
      await request('DELETE', `/bons-carburant/${createdBonId}`, null, adminToken);
      console.log(`  🗑️  Deleted BonCarburant #${createdBonId}`);
    }
    if (createdVehiculeId) {
      await request('DELETE', `/vehicules/${createdVehiculeId}`, null, adminToken);
      console.log(`  🗑️  Deleted Vehicule #${createdVehiculeId}`);
    }
    if (restrictedUserId) {
      await request('DELETE', `/users/${restrictedUserId}`, null, adminToken);
      console.log(`  🗑️  Deleted User #${restrictedUserId}`);
    }

    console.log(`\n======================================================================`);
    console.log(`Final Phase 13 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`======================================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runPhase13HttpSuite();
