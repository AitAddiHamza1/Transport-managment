/**
 * Phase 9 Clients Management — Live HTTP Acceptance Test Runner
 * Path: backend/scripts/test-http-phase9.js
 *
 * Requirements:
 * - Automatically loads .env file.
 * - Reads PHASE9_ADMIN_EMAIL and PHASE9_ADMIN_PASSWORD (or PHASE8/PHASE7 fallback).
 * - Never logs credentials or tokens.
 * - Uses runId = Date.now() for complete isolation of disposable records.
 * - Robust try/finally cleanup that preserves primary assertion errors.
 * - Tests 401, 403, CRUD, Normalization, ICE Unique Conflict (409),
 *   DTO Negative Validation, Pagination, Detail Contract, Stats, Delete Safety.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

// Safely load environment variables from backend/.env if available
if (!process.env.PHASE9_ADMIN_EMAIL || !process.env.PHASE9_ADMIN_PASSWORD) {
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

const ADMIN_EMAIL = process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE7_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE7_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: PHASE9_ADMIN_EMAIL/PHASE8_ADMIN_EMAIL and passwords must be defined in your environment or backend/.env file.');
  process.exit(1);
}

const runId = Date.now();
let passCount = 0;
let failCount = 0;

const cleanupRegistry = {
  clientIds: [],
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
  console.log(`Phase 9 Clients Live HTTP Acceptance Suite — runId=${runId}`);
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
      { method: 'GET', path: '/clients' },
      { method: 'GET', path: '/clients/stats' },
      { method: 'GET', path: '/clients/1' },
      { method: 'POST', path: '/clients', body: {} },
      { method: 'PATCH', path: '/clients/1', body: {} },
      { method: 'PATCH', path: '/clients/1/status', body: { statut: 'ACTIF' } },
      { method: 'DELETE', path: '/clients/1' },
    ];

    for (const ep of endpoints) {
      const res = await req(ep.method, ep.path, ep.body, null);
      assertStatus(`Unauthenticated ${ep.method} ${ep.path} → 401`, res.status, 401);
    }
  }

  // ── Step 3: Authenticated 403 Security Tests (Empty Clients Permissions) ──────────
  console.log('\n── Step 3: Authenticated 403 Security Tests (No Clients Permissions) ──');
  {
    const rolesRes = await req('GET', '/roles', null, adminToken);
    const persRole = rolesRes.body.data?.find((r) => r.nom === 'PERSONNALISE');
    assertTrue('PERSONNALISE role found dynamically', Boolean(persRole));

    if (persRole) {
      const createUserRes = await req('POST', '/users', {
        nom: `NoClientUser-${runId}`,
        email: `noclient-${runId}@test.local`,
        motDePasse: 'NoClientPass2025!',
        idRole: persRole.id,
        statut: 'ACTIF',
        permissions: {
          clients: { voir: false, ajouter: false, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
        },
      }, adminToken);

      assertStatus('Create restricted PERSONNALISE user → 201', createUserRes.status, 201);
      const testUserId = createUserRes.body?.id;

      if (testUserId) {
        cleanupRegistry.userIds.push(testUserId);

        const loginRes = await req('POST', '/auth/login', { email: `noclient-${runId}@test.local`, password: 'NoClientPass2025!' });
        assertStatus('Restricted user login → 200', loginRes.status, 200);
        const testUserToken = loginRes.body?.accessToken;

        if (testUserToken) {
          const meRes = await req('GET', '/auth/me', null, testUserToken);
          assertEqual('Restricted user /auth/me status', meRes.status, 200);
          assertTrue('Restricted user permissions.clients.voir is false', meRes.body.permissions?.clients?.voir === false);

          const restrictedEndpoints = [
            { method: 'GET', path: '/clients' },
            { method: 'GET', path: '/clients/stats' },
            { method: 'GET', path: '/clients/1' },
            { method: 'POST', path: '/clients', body: { nomEntreprise: 'Test Client' } },
            { method: 'PATCH', path: '/clients/1', body: { telephone: '+212522000000' } },
            { method: 'PATCH', path: '/clients/1/status', body: { statut: 'ACTIF' } },
            { method: 'DELETE', path: '/clients/1' },
          ];

          for (const ep of restrictedEndpoints) {
            const res = await req(ep.method, ep.path, ep.body, testUserToken);
            assertStatus(`Restricted user ${ep.method} ${ep.path} → 403`, res.status, 403);
          }
        }
      }
    }
  }

  // ── Step 4: Normalization, ICE Unique Conflict & CRUD ─────────────────────
  console.log('\n── Step 4: Normalization, ICE Conflict & CRUD ──');
  let testClientId = null;
  const rawName = `  Maghreb Transport-${runId.toString().slice(-4)}  `;
  const expectedName = `Maghreb Transport-${runId.toString().slice(-4)}`;
  const testIce = `00${runId.toString().slice(-13)}`;

  {
    const res = await req('POST', '/clients', {
      nomEntreprise: rawName,
      ice: `  ${testIce.toLowerCase()}  `,
      telephone: '  +212522112233  ',
      email: '  CONTACT@MAGHREB.MA  ',
      adresse: '  Casablanca  ',
      delaiPaiementJours: 45,
      limiteCredit: 100000,
      statut: 'ACTIF',
    }, adminToken);

    assertStatus('Create client with space-padded & mixed-case inputs → 201', res.status, 201);
    if (res.body?.id) {
      testClientId = res.body.id;
      cleanupRegistry.clientIds.push(testClientId);

      assertEqual('NomEntreprise trimmed', res.body.nomEntreprise, expectedName);
      assertEqual('ICE normalized to UPPERCASE', res.body.ice, testIce.toUpperCase());
      assertEqual('Email normalized to lowercase', res.body.email, 'contact@maghreb.ma');
      assertEqual('Telephone trimmed', res.body.telephone, '+212522112233');
      assertEqual('Adresse trimmed', res.body.adresse, 'Casablanca');
      assertEqual('DelaiPaiementJours is 45', res.body.delaiPaiementJours, 45);
      assertEqual('LimiteCredit is 100000 primitive number', res.body.limiteCredit, 100000);
      assertEqual('Statut is ACTIF', res.body.statut, 'ACTIF');
    }

    // Duplicate ICE conflict test → 409 Conflict
    const dupRes = await req('POST', '/clients', {
      nomEntreprise: `Another Comp-${runId}`,
      ice: testIce,
    }, adminToken);
    assertStatus('Duplicate ICE create → 409 Conflict', dupRes.status, 409);
  }

  // ── Step 5: DTO Negative Validation Coverage ─────────────────────
  console.log('\n── Step 5: DTO Negative Validation Coverage ──');
  {
    // Page = 0 (< 1)
    const res1 = await req('GET', '/clients?page=0', null, adminToken);
    assertStatus('Query page = 0 → 400', res1.status, 400);

    // Limit = 0 (< 1)
    const res2 = await req('GET', '/clients?limit=0', null, adminToken);
    assertStatus('Query limit = 0 → 400', res2.status, 400);

    // Limit = 101 (> 100)
    const res3 = await req('GET', '/clients?limit=101', null, adminToken);
    assertStatus('Query limit = 101 → 400', res3.status, 400);

    // Invalid statut query
    const res4 = await req('GET', '/clients?statut=INVALID_STATUS', null, adminToken);
    assertStatus('Query invalid statut → 400', res4.status, 400);

    // Invalid sortBy
    const res5 = await req('GET', '/clients?sortBy=forbiddenField', null, adminToken);
    assertStatus('Query invalid sortBy → 400', res5.status, 400);

    // Invalid sortOrder
    const res5b = await req('GET', '/clients?sortOrder=invalidOrder', null, adminToken);
    assertStatus('Query invalid sortOrder → 400', res5b.status, 400);

    // Unknown query param (forbidNonWhitelisted)
    const res6 = await req('GET', '/clients?unknownQueryParam=123', null, adminToken);
    assertStatus('Query unknown parameter → 400', res6.status, 400);

    // Create DTO: Missing nomEntreprise
    const res7 = await req('POST', '/clients', { telephone: '+212522000000' }, adminToken);
    assertStatus('Create missing nomEntreprise → 400', res7.status, 400);

    // Create DTO: Empty nomEntreprise
    const res7b = await req('POST', '/clients', { nomEntreprise: '   ' }, adminToken);
    assertStatus('Create empty nomEntreprise → 400', res7b.status, 400);

    // Create DTO: NomEntreprise too long (> 150)
    const res8 = await req('POST', '/clients', { nomEntreprise: 'A'.repeat(151) }, adminToken);
    assertStatus('Create nomEntreprise > 150 chars → 400', res8.status, 400);

    // Create DTO: Invalid email format
    const res9 = await req('POST', '/clients', { nomEntreprise: 'Valid Name', email: 'invalid-email-format' }, adminToken);
    assertStatus('Create invalid email → 400', res9.status, 400);

    // Create DTO: Negative limiteCredit
    const res10 = await req('POST', '/clients', { nomEntreprise: 'Valid Name', limiteCredit: -500 }, adminToken);
    assertStatus('Create negative limiteCredit → 400', res10.status, 400);

    // Create DTO: Unknown body property (forbidNonWhitelisted)
    const res11 = await req('POST', '/clients', { nomEntreprise: 'Valid Name', unknownProp: 'foo' }, adminToken);
    assertStatus('Create unknown body property → 400', res11.status, 400);
  }

  // ── Step 6: Detail Endpoint Contract & 404 Check ──────────────────────────
  console.log('\n── Step 6: Detail Endpoint Contract & 404 Check ──');
  if (testClientId) {
    const res = await req('GET', `/clients/${testClientId}`, null, adminToken);
    assertStatus('GET existing client detail → 200', res.status, 200);
    assertEqual('Detail ID', res.body.id, testClientId);
    assertEqual('Detail nomEntreprise', res.body.nomEntreprise, expectedName);
    assertEqual('Detail ICE', res.body.ice, testIce.toUpperCase());

    // Non-existent ID -> 404
    const notFoundRes = await req('GET', '/clients/999999999', null, adminToken);
    assertStatus('GET missing client detail → 404 Not Found', notFoundRes.status, 404);
  }

  // ── Step 7: List Pagination, Filtering & Search ──
  console.log('\n── Step 7: List Pagination, Filtering & Search ──');
  {
    const res = await req('GET', '/clients?page=1&limit=5', null, adminToken);
    assertStatus('GET /clients paginated list → 200', res.status, 200);
    assertTrue('Response has data array', Array.isArray(res.body.data));
    assertTrue('Response has meta pagination object', Boolean(res.body.meta));
    assertEqual('Meta limit is 5', res.body.meta.limit, 5);

    // Search filter test (case-insensitive)
    const searchRes = await req('GET', `/clients?search=${encodeURIComponent(expectedName.toLowerCase())}`, null, adminToken);
    assertStatus('Search by nomEntreprise → 200', searchRes.status, 200);
    assertTrue('Search returns match', searchRes.body.data.some((c) => c.nomEntreprise === expectedName));

    // Statut filter test
    const statutRes = await req('GET', '/clients?statut=ACTIF', null, adminToken);
    assertStatus('Filter by statut=ACTIF → 200', statutRes.status, 200);
    assertTrue('All returned items have statut ACTIF', statutRes.body.data.every((c) => c.statut === 'ACTIF'));
  }

  // ── Step 8: Stats Endpoint ────────────────────────────────────────────────
  console.log('\n── Step 8: Stats Endpoint ──');
  {
    const res = await req('GET', '/clients/stats', null, adminToken);
    assertStatus('GET /clients/stats → 200', res.status, 200);
    assertTrue('Stats returns total number', typeof res.body.total === 'number');
    assertTrue('Stats returns actifs number', typeof res.body.actifs === 'number');
    assertTrue('Stats returns inactifs number', typeof res.body.inactifs === 'number');
    assertTrue('Stats returns bloques number', typeof res.body.bloques === 'number');
  }

  // ── Step 9: Delete Safety ──
  console.log('\n── Step 9: Delete Safety ──');
  {
    const cRes = await req('POST', '/clients', { nomEntreprise: `CleanClient-${runId.toString().slice(-4)}` }, adminToken);
    if (cRes.body?.id) {
      const cId = cRes.body.id;
      const delRes = await req('DELETE', `/clients/${cId}`, null, adminToken);
      assertStatus('Delete unlinked client → 200 OK', delRes.status, 200);
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

  // 1. Delete Clients
  for (const id of cleanupRegistry.clientIds) {
    try {
      await req('DELETE', `/clients/${id}`, null, token);
      console.log(`  🗑️  Deleted Client #${id}`);
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
  console.log(`Final Phase 9 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('='.repeat(70));

  if (primaryError || failCount > 0) {
    process.exitCode = 1;
  }
}

main();
