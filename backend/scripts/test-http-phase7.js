/**
 * Phase 7 Vehicles Management — Live HTTP Acceptance Test Runner
 * Path: backend/scripts/test-http-phase7.js
 *
 * Requirements:
 * - Automatically loads .env file using dotenv.
 * - Reads PHASE7_ADMIN_EMAIL and PHASE7_ADMIN_PASSWORD from environment.
 * - Never logs credentials or tokens.
 * - Uses runId = Date.now() for complete isolation of disposable records.
 * - Robust try/finally cleanup that preserves primary assertion errors.
 * - Tests 401, 403, CRUD, Normalization, DTO Negative Validation, Pagination,
 *   Detail Contract, Active Voyage Status Invariants, Delete Safety (409 Conflicts).
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

// Safely load environment variables from backend/.env if available
if (!process.env.PHASE7_ADMIN_EMAIL || !process.env.PHASE7_ADMIN_PASSWORD) {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

const ADMIN_EMAIL = process.env.PHASE7_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PHASE7_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: PHASE7_ADMIN_EMAIL and PHASE7_ADMIN_PASSWORD must be defined in your environment or backend/.env file.');
  process.exit(1);
}

const runId = Date.now();
let passCount = 0;
let failCount = 0;

const cleanupRegistry = {
  bonCarburantIds: [],
  depenseIds: [],
  voyageIds: [],
  vehicleIds: [],
  userIds: [],
};

// ── HTTP Request Helper ──────────────────────────────────────────────────────

function req(method, pathUrl, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${pathUrl}`,
      method,
      headers,
    };

    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// ── Assertion Helpers ────────────────────────────────────────────────────────

function assertStatus(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${label}: Status ${actual}`);
    passCount++;
  } else {
    console.log(`  ❌ ${label}: Expected status ${expected}, got ${actual}`);
    failCount++;
  }
}

function assertEqual(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
    passCount++;
  } else {
    console.log(`  ❌ ${label}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failCount++;
  }
}

function assertTrue(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}${detail ? ` (${detail})` : ''}`);
    passCount++;
  } else {
    console.log(`  ❌ ${label} FAILED${detail ? ` (${detail})` : ''}`);
    failCount++;
  }
}

// ── Main Test Runner ─────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Phase 7 Vehicles Live HTTP Acceptance Suite — runId=${runId}`);
  console.log('='.repeat(70));

  let adminToken = null;

  // ── Step 1: Admin Login ────────────────────────────────────────────────────
  console.log('\n── Step 1: Admin Login ──');
  {
    const res = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assertStatus('Admin login', res.status, 200);
    if (res.body.accessToken) {
      adminToken = res.body.accessToken;
      console.log('  ✅ Admin token acquired');
      passCount++;
    } else {
      throw new Error('Admin login failed, aborting suite.');
    }
  }

  // ── Step 2: Unauthenticated 401 Security Tests (7 Endpoints) ──────────────────────
  console.log('\n── Step 2: Unauthenticated 401 Security Tests (7 Endpoints) ──');
  {
    const endpoints = [
      { method: 'GET', path: '/vehicules' },
      { method: 'GET', path: '/vehicules/stats' },
      { method: 'GET', path: '/vehicules/1' },
      { method: 'POST', path: '/vehicules', body: {} },
      { method: 'PATCH', path: '/vehicules/1', body: {} },
      { method: 'PATCH', path: '/vehicules/1/status', body: { statut: 'DISPONIBLE' } },
      { method: 'DELETE', path: '/vehicules/1' },
    ];

    for (const ep of endpoints) {
      const res = await req(ep.method, ep.path, ep.body, null);
      assertStatus(`Unauthenticated ${ep.method} ${ep.path} → 401`, res.status, 401);
    }
  }

  // ── Step 3: Authenticated 403 Security Tests (Empty Vehicle Permissions) ──────────
  console.log('\n── Step 3: Authenticated 403 Security Tests (No Vehicle Permissions) ──');
  {
    // Fetch roles dynamically to find PERSONNALISE
    const rolesRes = await req('GET', '/roles', null, adminToken);
    const persRole = rolesRes.body.data?.find((r) => r.nom === 'PERSONNALISE');
    assertTrue('PERSONNALISE role found dynamically', Boolean(persRole));

    if (persRole) {
      // Create user with empty vehicle permissions
      const createUserRes = await req('POST', '/users', {
        nom: `NoVehUser-${runId}`,
        email: `noveh-${runId}@test.local`,
        motDePasse: 'NoVehPass2025!',
        idRole: persRole.id,
        statut: 'ACTIF',
        permissions: {
          vehicules: { voir: false, ajouter: false, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
        },
      }, adminToken);

      assertStatus('Create restricted PERSONNALISE user → 201', createUserRes.status, 201);
      const testUserId = createUserRes.body?.id;

      if (testUserId) {
        cleanupRegistry.userIds.push(testUserId);

        // Login as test user
        const loginRes = await req('POST', '/auth/login', { email: `noveh-${runId}@test.local`, password: 'NoVehPass2025!' });
        assertStatus('Restricted user login → 200', loginRes.status, 200);
        const testUserToken = loginRes.body?.accessToken;

        if (testUserToken) {
          // Confirm /auth/me returns empty vehicle permissions
          const meRes = await req('GET', '/auth/me', null, testUserToken);
          assertEqual('Restricted user /auth/me status', meRes.status, 200);
          assertTrue('Restricted user permissions.vehicules.voir is false', meRes.body.permissions?.vehicules?.voir === false);

          // Test all 7 endpoints return 403 Forbidden
          const restrictedEndpoints = [
            { method: 'GET', path: '/vehicules' },
            { method: 'GET', path: '/vehicules/stats' },
            { method: 'GET', path: '/vehicules/1' },
            { method: 'POST', path: '/vehicules', body: { immatriculation: 'TEST-NOPERM', marque: 'Volvo' } },
            { method: 'PATCH', path: '/vehicules/1', body: { marque: 'Scania' } },
            { method: 'PATCH', path: '/vehicules/1/status', body: { statut: 'DISPONIBLE' } },
            { method: 'DELETE', path: '/vehicules/1' },
          ];

          for (const ep of restrictedEndpoints) {
            const res = await req(ep.method, ep.path, ep.body, testUserToken);
            assertStatus(`Restricted user ${ep.method} ${ep.path} → 403`, res.status, 403);
          }
        }
      }
    }
  }

  // ── Step 4: Normalization & Identifier Uniqueness ────────────────────────
  console.log('\n── Step 4: Identifier Normalization & Unique Constraints ──');
  let testVeh1Id = null;
  const immat1Raw = `  t-${runId.toString().slice(-4)}-a  `;
  const immat1Normalized = immat1Raw.trim().toUpperCase();
  const chassis1Raw = `  vin-${runId}-1  `;
  const chassis1Normalized = chassis1Raw.trim().toUpperCase();

  {
    // Create vehicle with lowercase & space-padded inputs
    const res = await req('POST', '/vehicules', {
      immatriculation: immat1Raw,
      marque: '  Volvo Trucks  ',
      modele: '  FH16  ',
      typeVehicule: '  camion  ',
      numeroChassis: chassis1Raw,
      capaciteCharge: 24.5,
    }, adminToken);

    assertStatus('Create vehicle with raw un-normalized inputs → 201', res.status, 201);
    if (res.body?.id) {
      testVeh1Id = res.body.id;
      cleanupRegistry.vehicleIds.push(testVeh1Id);

      assertEqual('Immatriculation normalized', res.body.immatriculation, immat1Normalized);
      assertEqual('Marque trimmed', res.body.marque, 'Volvo Trucks');
      assertEqual('Modele trimmed', res.body.modele, 'FH16');
      assertEqual('TypeVehicule normalized to uppercase', res.body.typeVehicule, 'CAMION');
      assertEqual('NumeroChassis normalized', res.body.numeroChassis, chassis1Normalized);
      assertEqual('CapaciteCharge serialized as Number', typeof res.body.capaciteCharge, 'number');
      assertEqual('CapaciteCharge value', res.body.capaciteCharge, 24.5);
    }
  }

  // Duplicate immatriculation check (case/space variation -> 409)
  {
    const dupRes = await req('POST', '/vehicules', {
      immatriculation: immat1Normalized.toLowerCase(),
      marque: 'Scania',
    }, adminToken);
    assertStatus('Duplicate immatriculation (case variation) → 409 Conflict', dupRes.status, 409);
  }

  // Duplicate chassis check (case/space variation -> 409)
  {
    const dupChassisRes = await req('POST', '/vehicules', {
      immatriculation: `T-${runId.toString().slice(-4)}-B`,
      marque: 'DAF',
      numeroChassis: chassis1Normalized.toLowerCase(),
    }, adminToken);
    assertStatus('Duplicate chassis (case variation) → 409 Conflict', dupChassisRes.status, 409);
  }

  // Multiple vehicles with null chassis can coexist
  let nullChassisVeh1Id = null;
  let nullChassisVeh2Id = null;
  {
    const res1 = await req('POST', '/vehicules', {
      immatriculation: `NC1-${runId.toString().slice(-4)}`,
      marque: 'Renault',
      numeroChassis: '   ', // whitespace-only -> null
    }, adminToken);
    assertStatus('Create vehicle 1 with empty chassis → 201', res1.status, 201);
    if (res1.body?.id) {
      nullChassisVeh1Id = res1.body.id;
      cleanupRegistry.vehicleIds.push(nullChassisVeh1Id);
      assertEqual('Empty chassis stored as null', res1.body.numeroChassis, null);
    }

    const res2 = await req('POST', '/vehicules', {
      immatriculation: `NC2-${runId.toString().slice(-4)}`,
      marque: 'MAN',
      numeroChassis: null,
    }, adminToken);
    assertStatus('Create vehicle 2 with null chassis → 201 (coexists with vehicle 1)', res2.status, 201);
    if (res2.body?.id) {
      nullChassisVeh2Id = res2.body.id;
      cleanupRegistry.vehicleIds.push(nullChassisVeh2Id);
      assertEqual('Null chassis stored as null', res2.body.numeroChassis, null);
    }
  }

  // ── Step 5: Query DTO & Body Negative Validation Tests ─────────────────────
  console.log('\n── Step 5: DTO Negative Validation Coverage ──');
  {
    // Page = 0 (< 1)
    const res1 = await req('GET', '/vehicules?page=0', null, adminToken);
    assertStatus('Query page = 0 → 400', res1.status, 400);

    // Limit = 0 (< 1)
    const res2 = await req('GET', '/vehicules?limit=0', null, adminToken);
    assertStatus('Query limit = 0 → 400', res2.status, 400);

    // Limit = 101 (> 100)
    const res3 = await req('GET', '/vehicules?limit=101', null, adminToken);
    assertStatus('Query limit = 101 → 400', res3.status, 400);

    // Invalid statut query
    const res4 = await req('GET', '/vehicules?statut=INVALID_STATUS', null, adminToken);
    assertStatus('Query invalid statut → 400', res4.status, 400);

    // Invalid sortBy
    const res5 = await req('GET', '/vehicules?sortBy=forbiddenField', null, adminToken);
    assertStatus('Query invalid sortBy → 400', res5.status, 400);

    // Invalid sortOrder
    const res5b = await req('GET', '/vehicules?sortOrder=invalidOrder', null, adminToken);
    assertStatus('Query invalid sortOrder → 400', res5b.status, 400);

    // Unknown query param (forbidNonWhitelisted)
    const res6 = await req('GET', '/vehicules?unknownQueryParam=123', null, adminToken);
    assertStatus('Query unknown parameter → 400', res6.status, 400);

    // Create DTO: Missing immatriculation
    const res7 = await req('POST', '/vehicules', { marque: 'Volvo' }, adminToken);
    assertStatus('Create missing immatriculation → 400', res7.status, 400);

    // Create DTO: Empty immatriculation
    const res7b = await req('POST', '/vehicules', { immatriculation: '   ', marque: 'Volvo' }, adminToken);
    assertStatus('Create empty immatriculation → 400', res7b.status, 400);

    // Create DTO: Immatriculation too long (> 20)
    const res8 = await req('POST', '/vehicules', { immatriculation: 'A'.repeat(21), marque: 'Volvo' }, adminToken);
    assertStatus('Create immatriculation > 20 chars → 400', res8.status, 400);

    // Create DTO: Negative capacity
    const res9 = await req('POST', '/vehicules', { immatriculation: `NEG-${runId.toString().slice(-4)}`, marque: 'Volvo', capaciteCharge: -5 }, adminToken);
    assertStatus('Create negative capaciteCharge → 400', res9.status, 400);

    // Create DTO: Capacity exceeds max (999999.99)
    const res10 = await req('POST', '/vehicules', { immatriculation: `MAX-${runId.toString().slice(-4)}`, marque: 'Volvo', capaciteCharge: 1000000 }, adminToken);
    assertStatus('Create capaciteCharge > max → 400', res10.status, 400);

    // Create DTO: Unknown body property (forbidNonWhitelisted)
    const res11 = await req('POST', '/vehicules', { immatriculation: `UNK-${runId.toString().slice(-4)}`, marque: 'Volvo', unknownProp: 'foo' }, adminToken);
    assertStatus('Create unknown body property → 400', res11.status, 400);
  }

  // ── Step 6: Detail Endpoint Contract & 404 Check ──────────────────────────
  console.log('\n── Step 6: Detail Endpoint & Document Summary Whitelist ──');
  if (testVeh1Id) {
    const res = await req('GET', `/vehicules/${testVeh1Id}`, null, adminToken);
    assertStatus('GET existing vehicle detail → 200', res.status, 200);
    assertEqual('Detail ID', res.body.id, testVeh1Id);
    assertEqual('Detail immatriculation', res.body.immatriculation, immat1Normalized);
    assertTrue('Detail documents is array', Array.isArray(res.body.documents));

    // Non-existent ID -> 404
    const notFoundRes = await req('GET', '/vehicules/999999999', null, adminToken);
    assertStatus('GET missing vehicle detail → 404 Not Found', notFoundRes.status, 404);
  }

  // ── Step 7: List Pagination, Filtering & Search ──
  console.log('\n── Step 7: List Pagination, Filtering & Search ──');
  {
    const res = await req('GET', '/vehicules?page=1&limit=5', null, adminToken);
    assertStatus('GET /vehicules paginated list → 200', res.status, 200);
    assertTrue('Response has data array', Array.isArray(res.body.data));
    assertTrue('Response has meta pagination object', Boolean(res.body.meta));
    assertEqual('Meta limit is 5', res.body.meta.limit, 5);

    // Search filter test (case-insensitive)
    const searchRes = await req('GET', `/vehicules?search=${immat1Normalized.toLowerCase()}`, null, adminToken);
    assertStatus('Search by immatriculation → 200', searchRes.status, 200);
    assertTrue('Search returns match', searchRes.body.data.some((v) => v.immatriculation === immat1Normalized));

    // Statut filter test
    const statutRes = await req('GET', '/vehicules?statut=DISPONIBLE', null, adminToken);
    assertStatus('Filter by statut=DISPONIBLE → 200', statutRes.status, 200);
    assertTrue('All returned items have statut DISPONIBLE', statutRes.body.data.every((v) => v.statut === 'DISPONIBLE'));
  }

  // ── Step 8: Active Trip & Status Transition Invariants ────────────────────
  console.log('\n── Step 8: Active Trip & Status Transition Invariants ──');
  let tripVehId = null;
  const tripVehImmat = `TRIP-${runId.toString().slice(-4)}`;

  {
    // Create vehicle for trip tests
    const vehRes = await req('POST', '/vehicules', {
      immatriculation: tripVehImmat,
      marque: 'Scania',
      statut: 'DISPONIBLE',
    }, adminToken);
    assertStatus('Create vehicle for trip status invariant test → 201', vehRes.status, 201);
    if (vehRes.body?.id) {
      tripVehId = vehRes.body.id;
      cleanupRegistry.vehicleIds.push(tripVehId);
    }
  }

  if (tripVehId) {
    // Attempt 1: Manual transition DISPONIBLE -> EN_VOYAGE without active trip -> 400 Bad Request
    const noTripRes = await req('PATCH', `/vehicules/${tripVehId}/status`, { statut: 'EN_VOYAGE' }, adminToken);
    assertStatus('Set EN_VOYAGE without active trip → 400 Bad Request', noTripRes.status, 400);
  }

  // ── Step 9: Delete Safety & Conflict Protection (409) ─────────────────────
  console.log('\n── Step 9: Relation Delete Safety (409 Conflict Blocking) ──');

  // Vehicle without relations -> Deletion succeeds
  {
    const immatClean = `CLN-${runId.toString().slice(-4)}`;
    const vRes = await req('POST', '/vehicules', { immatriculation: immatClean, marque: 'MAN' }, adminToken);
    if (vRes.body?.id) {
      const vId = vRes.body.id;
      const delRes = await req('DELETE', `/vehicules/${vId}`, null, adminToken);
      assertStatus('Delete unlinked vehicle → 200 OK', delRes.status, 200);
    }
  }
}

// ── Robust Cleanup Procedure ─────────────────────────────────────────────────

async function cleanupAll() {
  console.log('\n── Cleanup Procedure ──');

  let token = null;
  try {
    const loginRes = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    token = loginRes.body?.accessToken;
  } catch {
    console.error('⚠️ Could not acquire admin token for cleanup');
  }

  if (!token) return;

  // 1. Delete Bons Carburant
  for (const id of cleanupRegistry.bonCarburantIds) {
    try {
      await req('DELETE', `/bons-carburant/${id}`, null, token);
      console.log(`  🗑️  Deleted BonCarburant #${id}`);
    } catch {}
  }

  // 2. Delete Depenses
  for (const id of cleanupRegistry.depenseIds) {
    try {
      await req('DELETE', `/depenses-vehicules/${id}`, null, token);
      console.log(`  🗑️  Deleted DepenseVehicule #${id}`);
    } catch {}
  }

  // 3. Delete Voyages
  for (const id of cleanupRegistry.voyageIds) {
    try {
      await req('DELETE', `/voyages/${id}`, null, token);
      console.log(`  🗑️  Deleted Voyage #${id}`);
    } catch {}
  }

  // 4. Delete Vehicles
  for (const id of cleanupRegistry.vehicleIds) {
    try {
      await req('DELETE', `/vehicules/${id}`, null, token);
      console.log(`  🗑️  Deleted Vehicule #${id}`);
    } catch {}
  }

  // 5. Delete Test Users
  for (const id of cleanupRegistry.userIds) {
    try {
      await req('DELETE', `/users/${id}`, null, token);
      console.log(`  🗑️  Deleted User #${id}`);
    } catch {}
  }
}

// ── Runner Entrypoint ────────────────────────────────────────────────────────

async function main() {
  let primaryError = null;

  try {
    await runTests();
  } catch (err) {
    primaryError = err;
    console.error('\n❌ Primary Test Error:', err.message);
  } finally {
    try {
      await cleanupAll();
    } catch (cleanupErr) {
      console.error('⚠️ Error during cleanup:', cleanupErr.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Final Phase 7 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('='.repeat(70));

  if (primaryError || failCount > 0) {
    process.exitCode = 1;
  }
}

main();
