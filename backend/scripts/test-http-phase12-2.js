/**
 * Phase 12.2 Voyage Resource Status Synchronization — Live HTTP Acceptance Test Runner
 * Path: backend/scripts/test-http-phase12-2.js
 *
 * Command: npm run test:phase12-2:http
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

// Safely load environment variables from backend/.env if available
if (!process.env.PHASE12_ADMIN_EMAIL || !process.env.PHASE12_ADMIN_PASSWORD) {
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

const ADMIN_EMAIL =
  process.env.PHASE12_ADMIN_EMAIL ||
  process.env.PHASE11_ADMIN_EMAIL ||
  process.env.PHASE10_ADMIN_EMAIL ||
  process.env.PHASE9_ADMIN_EMAIL ||
  process.env.PHASE8_ADMIN_EMAIL ||
  process.env.PHASE7_ADMIN_EMAIL;

const ADMIN_PASSWORD =
  process.env.PHASE12_ADMIN_PASSWORD ||
  process.env.PHASE11_ADMIN_PASSWORD ||
  process.env.PHASE10_ADMIN_PASSWORD ||
  process.env.PHASE9_ADMIN_PASSWORD ||
  process.env.PHASE8_ADMIN_PASSWORD ||
  process.env.PHASE7_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'ERROR: PHASE12_ADMIN_EMAIL and passwords must be defined in your environment or backend/.env file.',
  );
  process.exit(1);
}

const runId = Date.now();
let passCount = 0;
let failCount = 0;

const cleanupRegistry = {
  voyageIds: [],
  driverIds: [],
  vehicleIds: [],
  clientIds: [],
  userIds: [],
};

// ── HTTP Request Helper (JSON) ───────────────────────────────────────────────

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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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
    console.log(
      `  ❌ ${label}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
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
  console.log(`Phase 12.2 Voyage Resource Status Sync Live HTTP Suite — runId=${runId}`);
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
      throw new Error(`Admin login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  }

  // ── Step 2: Unauthenticated 401 Security Tests ────────────────────────────
  console.log('\n── Step 2: Unauthenticated 401 Security Tests ──');
  {
    const endpoints = [
      { method: 'GET', path: '/voyages' },
      { method: 'GET', path: '/voyages/stats' },
      { method: 'GET', path: '/voyages/1' },
      { method: 'POST', path: '/voyages', body: {} },
      { method: 'PATCH', path: '/voyages/1', body: {} },
      { method: 'PATCH', path: '/voyages/1/status', body: { statut: 'EN_COURS' } },
      { method: 'DELETE', path: '/voyages/1' },
    ];

    for (const ep of endpoints) {
      const res = await req(ep.method, ep.path, ep.body, null);
      assertStatus(`Unauthenticated ${ep.method} ${ep.path} → 401`, res.status, 401);
    }
  }

  // ── Step 3: Authenticated 403 Security Tests (No Permissions) ────────────
  console.log('\n── Step 3: Authenticated 403 Security Tests (No Permissions) ──');
  {
    const rolesRes = await req('GET', '/roles', null, adminToken);
    const persRole = rolesRes.body.data?.find((r) => r.nom === 'PERSONNALISE');
    assertTrue('PERSONNALISE role found dynamically', Boolean(persRole));

    if (persRole) {
      const createUserRes = await req('POST', '/users', {
        nom: `NoVoyUser-${runId}`,
        email: `novoy-${runId}@test.local`,
        motDePasse: 'NoVoyPass2025!',
        idRole: persRole.id,
        statut: 'ACTIF',
        permissions: {
          voyages: { voir: false, ajouter: false, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
        },
      }, adminToken);

      assertStatus('Create restricted PERSONNALISE user → 201', createUserRes.status, 201);
      const testUserId = createUserRes.body?.id;

      if (testUserId) {
        cleanupRegistry.userIds.push(testUserId);

        const loginRes = await req('POST', '/auth/login', { email: `novoy-${runId}@test.local`, password: 'NoVoyPass2025!' });
        assertStatus('Restricted user login → 200', loginRes.status, 200);
        const testUserToken = loginRes.body?.accessToken;

        if (testUserToken) {
          const restrictedEndpoints = [
            { method: 'GET', path: '/voyages' },
            { method: 'POST', path: '/voyages', body: { lieuChargement: 'A', lieuDechargement: 'B' } },
            { method: 'PATCH', path: '/voyages/1', body: { lieuChargement: 'A2' } },
            { method: 'PATCH', path: '/voyages/1/status', body: { statut: 'EN_COURS' } },
            { method: 'DELETE', path: '/voyages/1' },
          ];

          for (const ep of restrictedEndpoints) {
            const res = await req(ep.method, ep.path, ep.body, testUserToken);
            assertStatus(`Restricted user ${ep.method} ${ep.path} → 403`, res.status, 403);
          }
        }
      }
    }
  }

  // ── Step 4: Operational Fixture Creation ──────────────────────────────────
  console.log('\n── Step 4: Operational Fixture Creation ──');
  const clientName = `Client-HTTP-${runId}`;
  const driverAName = `Driver-HA-${runId}`;
  const driverBName = `Driver-HB-${runId}`;
  const tractorAImmat = `THA-${runId.toString().slice(-5)}`;
  const tractorBImmat = `THB-${runId.toString().slice(-5)}`;
  const trailerAImmat = `TLA-${runId.toString().slice(-5)}`;
  const trailerBImmat = `TLB-${runId.toString().slice(-5)}`;

  let clientObj, driverAObj, driverBObj, tractorAObj, tractorBObj, trailerAObj, trailerBObj;

  {
    const cRes = await req('POST', '/clients', { nomEntreprise: clientName }, adminToken);
    assertStatus('Create client fixture → 201', cRes.status, 201);
    if (cRes.body?.id) cleanupRegistry.clientIds.push(cRes.body.id);

    const dA = await req('POST', '/conducteurs', { nomConducteur: driverAName }, adminToken);
    assertStatus('Create Driver A fixture → 201', dA.status, 201);
    if (dA.body?.id) { driverAObj = dA.body; cleanupRegistry.driverIds.push(dA.body.id); }

    const dB = await req('POST', '/conducteurs', { nomConducteur: driverBName }, adminToken);
    assertStatus('Create Driver B fixture → 201', dB.status, 201);
    if (dB.body?.id) { driverBObj = dB.body; cleanupRegistry.driverIds.push(dB.body.id); }

    const tA = await req('POST', '/vehicules', { immatriculation: tractorAImmat, marque: 'Volvo', typeVehicule: 'TRACTEUR' }, adminToken);
    assertStatus('Create Tractor A fixture → 201', tA.status, 201);
    if (tA.body?.id) { tractorAObj = tA.body; cleanupRegistry.vehicleIds.push(tA.body.id); }

    const tB = await req('POST', '/vehicules', { immatriculation: tractorBImmat, marque: 'Scania', typeVehicule: 'TRACTEUR' }, adminToken);
    assertStatus('Create Tractor B fixture → 201', tB.status, 201);
    if (tB.body?.id) { tractorBObj = tB.body; cleanupRegistry.vehicleIds.push(tB.body.id); }

    const tlA = await req('POST', '/vehicules', { immatriculation: trailerAImmat, marque: 'Kogel', typeVehicule: 'REMORQUE' }, adminToken);
    assertStatus('Create Trailer A fixture → 201', tlA.status, 201);
    if (tlA.body?.id) { trailerAObj = tlA.body; cleanupRegistry.vehicleIds.push(tlA.body.id); }

    const tlB = await req('POST', '/vehicules', { immatriculation: trailerBImmat, marque: 'Schmitz', typeVehicule: 'REMORQUE' }, adminToken);
    assertStatus('Create Trailer B fixture → 201', tlB.status, 201);
    if (tlB.body?.id) { trailerBObj = tlB.body; cleanupRegistry.vehicleIds.push(tlB.body.id); }
  }

  // ── Step 5: PLANIFIE Voyage Creation & Resource Invariant ───────────────
  console.log('\n── Step 5: PLANIFIE Voyage Creation & Resource Invariant ──');
  let testVoyage1Id = null;
  {
    const vRes = await req('POST', '/voyages', {
      nomClient: clientName,
      nomConducteur: driverAName,
      tracteur: tractorAImmat,
      remorque: trailerAImmat,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      statut: 'PLANIFIE',
    }, adminToken);

    assertStatus('Create PLANIFIE voyage → 201', vRes.status, 201);
    if (vRes.body?.idVoyage) {
      testVoyage1Id = vRes.body.idVoyage;
      cleanupRegistry.voyageIds.push(testVoyage1Id);

      // Verify resources remain DISPONIBLE
      const dCheck = await req('GET', `/conducteurs/${driverAObj.id}`, null, adminToken);
      assertEqual('Driver A status is DISPONIBLE under PLANIFIE', dCheck.body.statut, 'DISPONIBLE');

      const tCheck = await req('GET', `/vehicules/${tractorAObj.id}`, null, adminToken);
      assertEqual('Tractor A status is DISPONIBLE under PLANIFIE', tCheck.body.statut, 'DISPONIBLE');

      const tlCheck = await req('GET', `/vehicules/${trailerAObj.id}`, null, adminToken);
      assertEqual('Trailer A status is DISPONIBLE under PLANIFIE', tlCheck.body.statut, 'DISPONIBLE');
    }
  }

  // ── Step 6: Start Voyage Synchronization (PLANIFIE → EN_COURS) ────────────
  console.log('\n── Step 6: Start Voyage Synchronization (PLANIFIE → EN_COURS) ──');
  if (testVoyage1Id) {
    const sRes = await req('PATCH', `/voyages/${testVoyage1Id}/status`, { statut: 'EN_COURS' }, adminToken);
    assertStatus('Transition PLANIFIE → EN_COURS → 200', sRes.status, 200);
    assertEqual('Voyage status is now EN_COURS', sRes.body.statut, 'EN_COURS');

    // Verify driver and vehicles automatically updated to EN_VOYAGE
    const dCheck = await req('GET', `/conducteurs/${driverAObj.id}`, null, adminToken);
    assertEqual('Driver A automatically updated to EN_VOYAGE', dCheck.body.statut, 'EN_VOYAGE');

    const tCheck = await req('GET', `/vehicules/${tractorAObj.id}`, null, adminToken);
    assertEqual('Tractor A automatically updated to EN_VOYAGE', tCheck.body.statut, 'EN_VOYAGE');

    const tlCheck = await req('GET', `/vehicules/${trailerAObj.id}`, null, adminToken);
    assertEqual('Trailer A automatically updated to EN_VOYAGE', tlCheck.body.statut, 'EN_VOYAGE');
  }

  // ── Step 7: Active Trip Conflicts & Resource Locks (409) ─────────────────
  console.log('\n── Step 7: Active Trip Conflicts & Resource Locks (409) ──');
  {
    // Duplicate driver conflict
    const dupDriverRes = await req('POST', '/voyages', {
      nomClient: clientName,
      nomConducteur: driverAName,
      tracteur: tractorBImmat,
      remorque: trailerBImmat,
      lieuChargement: 'Fès',
      lieuDechargement: 'Meknès',
      statut: 'EN_COURS',
    }, adminToken);
    assertStatus('Create active voyage with busy driver → 409 Conflict', dupDriverRes.status, 409);

    // Duplicate tractor conflict
    const dupTractorRes = await req('POST', '/voyages', {
      nomClient: clientName,
      nomConducteur: driverBName,
      tracteur: tractorAImmat,
      remorque: trailerBImmat,
      lieuChargement: 'Fès',
      lieuDechargement: 'Meknès',
      statut: 'EN_COURS',
    }, adminToken);
    assertStatus('Create active voyage with busy tractor → 409 Conflict', dupTractorRes.status, 409);

    // Duplicate trailer conflict
    const dupTrailerRes = await req('POST', '/voyages', {
      nomClient: clientName,
      nomConducteur: driverBName,
      tracteur: tractorBImmat,
      remorque: trailerAImmat,
      lieuChargement: 'Fès',
      lieuDechargement: 'Meknès',
      statut: 'EN_COURS',
    }, adminToken);
    assertStatus('Create active voyage with busy trailer → 409 Conflict', dupTrailerRes.status, 409);

    // Tractor = Trailer conflict
    const sameVehRes = await req('POST', '/voyages', {
      nomClient: clientName,
      nomConducteur: driverBName,
      tracteur: tractorBImmat,
      remorque: tractorBImmat,
      lieuChargement: 'Fès',
      lieuDechargement: 'Meknès',
      statut: 'PLANIFIE',
    }, adminToken);
    assertStatus('Tractor equals trailer → 409 Conflict', sameVehRes.status, 409);

    // Editing active voyage resource locked
    if (testVoyage1Id) {
      const editActiveRes = await req('PATCH', `/voyages/${testVoyage1Id}`, { tracteur: tractorBImmat }, adminToken);
      assertStatus('Edit active voyage resources → 409 Conflict', editActiveRes.status, 409);

      // Active voyage deletion locked
      const delActiveRes = await req('DELETE', `/voyages/${testVoyage1Id}`, null, adminToken);
      assertStatus('Delete active voyage → 409 Conflict', delActiveRes.status, 409);
    }
  }

  // ── Step 8: Manual Status Restriction (EN_VOYAGE) ─────────────────────────
  console.log('\n── Step 8: Manual Status Restriction (EN_VOYAGE) ──');
  {
    const manDriverRes = await req('PATCH', `/conducteurs/${driverBObj.id}/status`, { statut: 'EN_VOYAGE' }, adminToken);
    assertStatus('Manual driver EN_VOYAGE → 400 Bad Request', manDriverRes.status, 400);

    const manVehRes = await req('PATCH', `/vehicules/${tractorBObj.id}/status`, { statut: 'EN_VOYAGE' }, adminToken);
    assertStatus('Manual vehicle EN_VOYAGE → 400 Bad Request', manVehRes.status, 400);
  }

  // ── Step 9: Finish Voyage Release (EN_COURS → LIVRE) ──────────────────────
  console.log('\n── Step 9: Finish Voyage Release (EN_COURS → LIVRE) ──');
  if (testVoyage1Id) {
    const fRes = await req('PATCH', `/voyages/${testVoyage1Id}/status`, { statut: 'LIVRE' }, adminToken);
    assertStatus('Transition EN_COURS → LIVRE → 200', fRes.status, 200);

    // Verify driver and vehicles released back to DISPONIBLE
    const dCheck = await req('GET', `/conducteurs/${driverAObj.id}`, null, adminToken);
    assertEqual('Driver A released to DISPONIBLE on completion', dCheck.body.statut, 'DISPONIBLE');

    const tCheck = await req('GET', `/vehicules/${tractorAObj.id}`, null, adminToken);
    assertEqual('Tractor A released to DISPONIBLE on completion', tCheck.body.statut, 'DISPONIBLE');

    const tlCheck = await req('GET', `/vehicules/${trailerAObj.id}`, null, adminToken);
    assertEqual('Trailer A released to DISPONIBLE on completion', tlCheck.body.statut, 'DISPONIBLE');
  }

  // ── Step 10: Cancel Voyage Release (EN_COURS → ANNULE) ───────────────────
  console.log('\n── Step 10: Cancel Voyage Release (EN_COURS → ANNULE) ──');
  if (testVoyage1Id) {
    await req('PATCH', `/voyages/${testVoyage1Id}/status`, { statut: 'EN_COURS' }, adminToken);
    const cRes = await req('PATCH', `/voyages/${testVoyage1Id}/status`, { statut: 'ANNULE' }, adminToken);
    assertStatus('Transition EN_COURS → ANNULE → 200', cRes.status, 200);

    const dCheck = await req('GET', `/conducteurs/${driverAObj.id}`, null, adminToken);
    assertEqual('Driver A released to DISPONIBLE on cancellation', dCheck.body.statut, 'DISPONIBLE');
  }
}

// ── Cleanup Procedure ────────────────────────────────────────────────────────

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

  for (const id of cleanupRegistry.voyageIds) {
    try {
      await req('PATCH', `/voyages/${id}/status`, { statut: 'ANNULE' }, token);
      await req('DELETE', `/voyages/${id}`, null, token);
      console.log(`  🗑️  Deleted Voyage #${id}`);
    } catch {}
  }

  for (const id of cleanupRegistry.vehicleIds) {
    try {
      await req('DELETE', `/vehicules/${id}`, null, token);
      console.log(`  🗑️  Deleted Vehicule #${id}`);
    } catch {}
  }

  for (const id of cleanupRegistry.driverIds) {
    try {
      await req('DELETE', `/conducteurs/${id}`, null, token);
      console.log(`  🗑️  Deleted Conducteur #${id}`);
    } catch {}
  }

  for (const id of cleanupRegistry.clientIds) {
    try {
      await req('DELETE', `/clients/${id}`, null, token);
      console.log(`  🗑️  Deleted Client #${id}`);
    } catch {}
  }

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
  console.log(`Final Phase 12.2 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('='.repeat(70));

  if (primaryError || failCount > 0) {
    process.exitCode = 1;
  }
}

main();
