/**
 * Phase 11 Voyages Management — Live HTTP Acceptance Test Runner
 * Path: backend/scripts/test-http-phase11.js
 *
 * Requirements:
 * - Automatically loads .env file.
 * - Reads PHASE11_ADMIN_EMAIL and PHASE11_ADMIN_PASSWORD (or fallback).
 * - Never logs credentials or tokens.
 * - Uses runId = Date.now() for complete isolation of disposable records.
 * - Robust try/finally cleanup that preserves primary assertion errors.
 * - Tests 401, 403, CRUD, Normalization, Status Lifecycle,
 *   DTO Negative Validation, Pagination, Detail Contract, Stats, Delete Safety.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

// Safely load environment variables from backend/.env if available
if (!process.env.PHASE11_ADMIN_EMAIL || !process.env.PHASE11_ADMIN_PASSWORD) {
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

const ADMIN_EMAIL = process.env.PHASE11_ADMIN_EMAIL || process.env.PHASE10_ADMIN_EMAIL || process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE7_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PHASE11_ADMIN_PASSWORD || process.env.PHASE10_ADMIN_PASSWORD || process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE7_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: PHASE11_ADMIN_EMAIL and passwords must be defined in your environment or backend/.env file.');
  process.exit(1);
}

const runId = Date.now();
let passCount = 0;
let failCount = 0;

const cleanupRegistry = {
  voyageIds: [],
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
  console.log(`Phase 11 Voyages Live HTTP Acceptance Suite — runId=${runId}`);
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

  // ── Step 2: Unauthenticated 401 Security Tests (7 Endpoints) ──────────────────────
  console.log('\n── Step 2: Unauthenticated 401 Security Tests (7 Endpoints) ──');
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

  // ── Step 3: Authenticated 403 Security Tests (Empty Voyages Permissions) ──────────
  console.log('\n── Step 3: Authenticated 403 Security Tests (No Voyages Permissions) ──');
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
          const meRes = await req('GET', '/auth/me', null, testUserToken);
          assertEqual('Restricted user /auth/me status', meRes.status, 200);
          assertTrue('Restricted user permissions.voyages.voir is false', meRes.body.permissions?.voyages?.voir === false);

          const restrictedEndpoints = [
            { method: 'GET', path: '/voyages' },
            { method: 'GET', path: '/voyages/stats' },
            { method: 'GET', path: '/voyages/1' },
            { method: 'POST', path: '/voyages', body: { lieuChargement: 'A', lieuDechargement: 'B' } },
            { method: 'PATCH', path: '/voyages/1', body: { lieuChargement: 'C' } },
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

  // ── Step 4: Normalization & CRUD & Status Lifecycle ─────────────────────
  console.log('\n── Step 4: Normalization & CRUD & Status Lifecycle ──');
  let testVoyageId = null;
  const rawChargement = `  Casablanca Port-${runId.toString().slice(-4)}  `;
  const rawDechargement = `  Tanger Med-${runId.toString().slice(-4)}  `;
  const expectedChargement = `Casablanca Port-${runId.toString().slice(-4)}`;
  const expectedDechargement = `Tanger Med-${runId.toString().slice(-4)}`;

  {
    const res = await req('POST', '/voyages', {
      typeVoyage: 'NATIONAL',
      lieuChargement: rawChargement,
      lieuDechargement: rawDechargement,
      dateChargement: '2026-08-15',
      numeroCmr: `  CMR-${runId.toString().slice(-6)}  `,
      statut: 'PLANIFIE',
      montantVoyage: 15000,
    }, adminToken);

    assertStatus('Create voyage with space-padded inputs → 201', res.status, 201);
    if (res.body?.idVoyage) {
      testVoyageId = res.body.idVoyage;
      cleanupRegistry.voyageIds.push(testVoyageId);

      assertEqual('LieuChargement trimmed', res.body.lieuChargement, expectedChargement);
      assertEqual('LieuDechargement trimmed', res.body.lieuDechargement, expectedDechargement);
      assertEqual('NumeroCmr trimmed', res.body.numeroCmr, `CMR-${runId.toString().slice(-6)}`);
      assertEqual('DateChargement format', res.body.dateChargement, '2026-08-15');
      assertEqual('MontantVoyage is 15000 primitive number', res.body.montantVoyage, 15000);
      assertEqual('Statut is PLANIFIE', res.body.statut, 'PLANIFIE');
    }

    // Status Transition -> EN_COURS
    if (testVoyageId) {
      const statusRes = await req('PATCH', `/voyages/${testVoyageId}/status`, { statut: 'EN_COURS' }, adminToken);
      assertStatus('Update status PLANIFIE → EN_COURS → 200', statusRes.status, 200);
      assertEqual('Updated status is EN_COURS', statusRes.body.statut, 'EN_COURS');
    }
  }

  // ── Step 5: DTO Negative Validation Coverage ─────────────────────
  console.log('\n── Step 5: DTO Negative Validation Coverage ──');
  {
    // Page = 0 (< 1)
    const res1 = await req('GET', '/voyages?page=0', null, adminToken);
    assertStatus('Query page = 0 → 400', res1.status, 400);

    // Limit = 0 (< 1)
    const res2 = await req('GET', '/voyages?limit=0', null, adminToken);
    assertStatus('Query limit = 0 → 400', res2.status, 400);

    // Limit = 101 (> 100)
    const res3 = await req('GET', '/voyages?limit=101', null, adminToken);
    assertStatus('Query limit = 101 → 400', res3.status, 400);

    // Invalid statut query
    const res4 = await req('GET', '/voyages?statut=INVALID_STATUS', null, adminToken);
    assertStatus('Query invalid statut → 400', res4.status, 400);

    // Invalid typeVoyage query
    const res4b = await req('GET', '/voyages?typeVoyage=INVALID_TYPE', null, adminToken);
    assertStatus('Query invalid typeVoyage → 400', res4b.status, 400);

    // Invalid sortBy
    const res5 = await req('GET', '/voyages?sortBy=forbiddenField', null, adminToken);
    assertStatus('Query invalid sortBy → 400', res5.status, 400);

    // Invalid sortOrder
    const res5b = await req('GET', '/voyages?sortOrder=invalidOrder', null, adminToken);
    assertStatus('Query invalid sortOrder → 400', res5b.status, 400);

    // Unknown query param (forbidNonWhitelisted)
    const res6 = await req('GET', '/voyages?unknownQueryParam=123', null, adminToken);
    assertStatus('Query unknown parameter → 400', res6.status, 400);

    // Create DTO: Missing lieuChargement
    const res7 = await req('POST', '/voyages', { lieuDechargement: 'Tanger' }, adminToken);
    assertStatus('Create missing lieuChargement → 400', res7.status, 400);

    // Create DTO: Empty lieuChargement
    const res7b = await req('POST', '/voyages', { lieuChargement: '   ', lieuDechargement: 'Tanger' }, adminToken);
    assertStatus('Create empty lieuChargement → 400', res7b.status, 400);

    // Create DTO: Missing lieuDechargement
    const res8 = await req('POST', '/voyages', { lieuChargement: 'Casablanca' }, adminToken);
    assertStatus('Create missing lieuDechargement → 400', res8.status, 400);

    // Create DTO: Negative montantVoyage
    const res9 = await req('POST', '/voyages', { lieuChargement: 'Casa', lieuDechargement: 'Tanger', montantVoyage: -500 }, adminToken);
    assertStatus('Create negative montantVoyage → 400', res9.status, 400);

    // Create DTO: Unknown body property (forbidNonWhitelisted)
    const res10 = await req('POST', '/voyages', { lieuChargement: 'Casa', lieuDechargement: 'Tanger', unknownProp: 'foo' }, adminToken);
    assertStatus('Create unknown body property → 400', res10.status, 400);
  }

  // ── Step 6: Detail Endpoint Contract & 404 Check ──────────────────────────
  console.log('\n── Step 6: Detail Endpoint Contract & 404 Check ──');
  if (testVoyageId) {
    const res = await req('GET', `/voyages/${testVoyageId}`, null, adminToken);
    assertStatus('GET existing voyage detail → 200', res.status, 200);
    assertEqual('Detail idVoyage', res.body.idVoyage, testVoyageId);
    assertEqual('Detail lieuChargement', res.body.lieuChargement, expectedChargement);
    assertEqual('Detail lieuDechargement', res.body.lieuDechargement, expectedDechargement);

    // Non-existent ID -> 404
    const notFoundRes = await req('GET', '/voyages/999999999', null, adminToken);
    assertStatus('GET missing voyage detail → 404 Not Found', notFoundRes.status, 404);
  }

  // ── Step 7: List Pagination, Filtering & Search ──
  console.log('\n── Step 7: List Pagination, Filtering & Search ──');
  {
    const res = await req('GET', '/voyages?page=1&limit=5', null, adminToken);
    assertStatus('GET /voyages paginated list → 200', res.status, 200);
    assertTrue('Response has data array', Array.isArray(res.body.data));
    assertTrue('Response has meta pagination object', Boolean(res.body.meta));
    assertEqual('Meta limit is 5', res.body.meta.limit, 5);

    // Search filter test (case-insensitive)
    const searchRes = await req('GET', `/voyages?search=${encodeURIComponent(expectedChargement.toLowerCase())}`, null, adminToken);
    assertStatus('Search by lieuChargement → 200', searchRes.status, 200);
    assertTrue('Search returns match', searchRes.body.data.some((v) => v.lieuChargement === expectedChargement));

    // Statut filter test
    const statutRes = await req('GET', '/voyages?statut=EN_COURS', null, adminToken);
    assertStatus('Filter by statut=EN_COURS → 200', statutRes.status, 200);
    assertTrue('All returned items have statut EN_COURS', statutRes.body.data.every((v) => v.statut === 'EN_COURS'));
  }

  // ── Step 8: Stats Endpoint ────────────────────────────────────────────────
  console.log('\n── Step 8: Stats Endpoint ──');
  {
    const res = await req('GET', '/voyages/stats', null, adminToken);
    assertStatus('GET /voyages/stats → 200', res.status, 200);
    assertTrue('Stats returns total number', typeof res.body.total === 'number');
    assertTrue('Stats returns planifies number', typeof res.body.planifies === 'number');
    assertTrue('Stats returns enCours number', typeof res.body.enCours === 'number');
    assertTrue('Stats returns livres number', typeof res.body.livres === 'number');
    assertTrue('Stats returns annules number', typeof res.body.annules === 'number');
    assertTrue('Stats returns factures number', typeof res.body.factures === 'number');
  }

  // ── Step 9: Delete Safety ──
  console.log('\n── Step 9: Delete Safety ──');
  {
    const vRes = await req('POST', '/voyages', { lieuChargement: `CleanA-${runId.toString().slice(-4)}`, lieuDechargement: `CleanB-${runId.toString().slice(-4)}` }, adminToken);
    if (vRes.body?.idVoyage) {
      const vId = vRes.body.idVoyage;
      const delRes = await req('DELETE', `/voyages/${vId}`, null, adminToken);
      assertStatus('Delete unlinked voyage → 200 OK', delRes.status, 200);
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

  // 1. Delete Voyages
  for (const id of cleanupRegistry.voyageIds) {
    try {
      await req('DELETE', `/voyages/${id}`, null, token);
      console.log(`  🗑️  Deleted Voyage #${id}`);
    } catch {}
  }

  // 2. Delete Test Users
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
  console.log(`Final Phase 11 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('='.repeat(70));

  if (primaryError || failCount > 0) {
    process.exitCode = 1;
  }
}

main();
