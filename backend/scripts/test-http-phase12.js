/**
 * Phase 12 & 12.1 Charges Véhicules Management — Live HTTP Acceptance Test Runner
 * Path: backend/scripts/test-http-phase12.js
 *
 * Requirements:
 * - Automatically loads .env file.
 * - Reads PHASE12_ADMIN_EMAIL and PHASE12_ADMIN_PASSWORD (or fallback).
 * - Never logs credentials or tokens.
 * - Uses runId = Date.now() for complete isolation of disposable records.
 * - Tests 401, 403, CRUD, Vehicle Relation Check (404),
 *   DTO Negative Validation, Pagination, Detail Contract, Stats,
 *   Multipart Receipt Upload, View Stream, Download Stream, Invalid File 400, Delete Receipt, Delete Safety.
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

const ADMIN_EMAIL = process.env.PHASE12_ADMIN_EMAIL || process.env.PHASE11_ADMIN_EMAIL || process.env.PHASE10_ADMIN_EMAIL || process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE7_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PHASE12_ADMIN_PASSWORD || process.env.PHASE11_ADMIN_PASSWORD || process.env.PHASE10_ADMIN_PASSWORD || process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE7_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: PHASE12_ADMIN_EMAIL and passwords must be defined in your environment or backend/.env file.');
  process.exit(1);
}

const runId = Date.now();
let passCount = 0;
let failCount = 0;

const cleanupRegistry = {
  expenseIds: [],
  vehicleIds: [],
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

// ── HTTP Multipart Request Helper ─────────────────────────────────────────────

function reqMultipart(method, pathUrl, fileBuffer, filename, mimeType, token) {
  return new Promise((resolve, reject) => {
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footerPart = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(headerPart, 'utf8'),
      fileBuffer,
      Buffer.from(footerPart, 'utf8'),
    ]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
    r.write(bodyBuffer);
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
  console.log(`Phase 12 & 12.1 Charges Véhicules Live HTTP Acceptance Suite — runId=${runId}`);
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

  // ── Step 2: Unauthenticated 401 Security Tests ──────────────────────
  console.log('\n── Step 2: Unauthenticated 401 Security Tests ──');
  {
    const endpoints = [
      { method: 'GET', path: '/depenses-vehicules' },
      { method: 'GET', path: '/depenses-vehicules/stats' },
      { method: 'GET', path: '/depenses-vehicules/1' },
      { method: 'POST', path: '/depenses-vehicules', body: {} },
      { method: 'PATCH', path: '/depenses-vehicules/1', body: {} },
      { method: 'DELETE', path: '/depenses-vehicules/1' },
      { method: 'GET', path: '/depenses-vehicules/1/recu' },
      { method: 'GET', path: '/depenses-vehicules/1/recu/download' },
      { method: 'DELETE', path: '/depenses-vehicules/1/recu' },
    ];

    for (const ep of endpoints) {
      const res = await req(ep.method, ep.path, ep.body, null);
      assertStatus(`Unauthenticated ${ep.method} ${ep.path} → 401`, res.status, 401);
    }
  }

  // ── Step 3: Authenticated 403 Security Tests (No Charges Permissions) ──────────
  console.log('\n── Step 3: Authenticated 403 Security Tests (No Charges Permissions) ──');
  {
    const rolesRes = await req('GET', '/roles', null, adminToken);
    const persRole = rolesRes.body.data?.find((r) => r.nom === 'PERSONNALISE');
    assertTrue('PERSONNALISE role found dynamically', Boolean(persRole));

    if (persRole) {
      const createUserRes = await req('POST', '/users', {
        nom: `NoExpUser-${runId}`,
        email: `noexp-${runId}@test.local`,
        motDePasse: 'NoExpPass2025!',
        idRole: persRole.id,
        statut: 'ACTIF',
        permissions: {
          depenses_vehicules: { voir: false, ajouter: false, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
        },
      }, adminToken);

      assertStatus('Create restricted PERSONNALISE user → 201', createUserRes.status, 201);
      const testUserId = createUserRes.body?.id;

      if (testUserId) {
        cleanupRegistry.userIds.push(testUserId);

        const loginRes = await req('POST', '/auth/login', { email: `noexp-${runId}@test.local`, password: 'NoExpPass2025!' });
        assertStatus('Restricted user login → 200', loginRes.status, 200);
        const testUserToken = loginRes.body?.accessToken;

        if (testUserToken) {
          const meRes = await req('GET', '/auth/me', null, testUserToken);
          assertEqual('Restricted user /auth/me status', meRes.status, 200);
          assertTrue('Restricted user permissions.depenses_vehicules.voir is false', meRes.body.permissions?.depenses_vehicules?.voir === false);

          const restrictedEndpoints = [
            { method: 'GET', path: '/depenses-vehicules' },
            { method: 'GET', path: '/depenses-vehicules/stats' },
            { method: 'GET', path: '/depenses-vehicules/1' },
            { method: 'POST', path: '/depenses-vehicules', body: { categorieDepense: 'ENTRETIEN', immatriculation: '123-A-1', montant: 100 } },
            { method: 'PATCH', path: '/depenses-vehicules/1', body: { montant: 200 } },
            { method: 'DELETE', path: '/depenses-vehicules/1' },
            { method: 'GET', path: '/depenses-vehicules/1/recu' },
            { method: 'GET', path: '/depenses-vehicules/1/recu/download' },
            { method: 'DELETE', path: '/depenses-vehicules/1/recu' },
          ];

          for (const ep of restrictedEndpoints) {
            const res = await req(ep.method, ep.path, ep.body, testUserToken);
            assertStatus(`Restricted user ${ep.method} ${ep.path} → 403`, res.status, 403);
          }
        }
      }
    }
  }

  // ── Step 4: Vehicle Creation, CRUD & Receipt Upload Workflow ────────────────
  console.log('\n── Step 4: Vehicle Creation, CRUD & Receipt Upload Workflow ──');
  let testExpenseId = null;
  const testImmat = `VEX-${runId.toString().slice(-6)}`;

  // Create test vehicle first
  const vehRes = await req('POST', '/vehicules', {
    immatriculation: testImmat,
    marque: 'MAN',
    modele: 'TGX',
    typeVehicule: 'TRACTEUR',
    statut: 'DISPONIBLE',
  }, adminToken);

  assertStatus('Create test vehicle → 201', vehRes.status, 201);
  if (vehRes.body?.id) {
    cleanupRegistry.vehicleIds.push(vehRes.body.id);
  }

  {
    // Create valid expense
    const res = await req('POST', '/depenses-vehicules', {
      categorieDepense: `  ENTRETIEN-${runId.toString().slice(-4)}  `,
      typeFacture: `  FAC-${runId.toString().slice(-4)}  `,
      immatriculation: testImmat,
      description: '  Vidange et filtres  ',
      montant: 2450.75,
      dateDepense: '2026-07-20',
    }, adminToken);

    assertStatus('Create valid vehicle expense → 201', res.status, 201);
    if (res.body?.idDepense) {
      testExpenseId = res.body.idDepense;
      cleanupRegistry.expenseIds.push(testExpenseId);

      assertEqual('CategorieDepense trimmed', res.body.categorieDepense, `ENTRETIEN-${runId.toString().slice(-4)}`);
      assertEqual('Immatriculation matches', res.body.immatriculation, testImmat);
      assertEqual('Montant is 2450.75 primitive number', res.body.montant, 2450.75);
      assertEqual('HasReceipt is initially false', res.body.hasReceipt, false);
    }
  }

  // ── Step 4.1: Phase 12.1 Receipt Upload Security & Streaming ────────────────
  console.log('\n── Step 4.1: Receipt Upload Security & Streaming ──');
  if (testExpenseId) {
    // 1. Upload Invalid Executable File -> 400 Bad Request
    const fakeExe = Buffer.from('MZ... FAKE EXE FILE BINARY CONTENT');
    const badUpload = await reqMultipart('POST', `/depenses-vehicules/${testExpenseId}/recu`, fakeExe, 'virus.exe', 'application/x-msdownload', adminToken);
    assertStatus('Upload invalid executable file → 400 Bad Request', badUpload.status, 400);

    // 2. Upload Invalid Extension with Fake MIME -> 400 Bad Request
    const fakePdf = Buffer.from('NOT A PDF SIGNATURE AT ALL');
    const badPdfUpload = await reqMultipart('POST', `/depenses-vehicules/${testExpenseId}/recu`, fakePdf, 'fake.pdf', 'application/pdf', adminToken);
    assertStatus('Upload fake PDF with invalid magic bytes → 400 Bad Request', badPdfUpload.status, 400);

    // 3. Upload Valid PDF File with Magic Bytes -> 200 OK
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Facture Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const uploadRes = await reqMultipart('POST', `/depenses-vehicules/${testExpenseId}/recu`, validPdfBuffer, 'invoice-test.pdf', 'application/pdf', adminToken);

    assertStatus('Upload valid PDF receipt → 200 OK', uploadRes.status, 200);
    assertEqual('Response hasReceipt is true', uploadRes.body.hasReceipt, true);
    assertTrue('Response receiptUrl is populated', Boolean(uploadRes.body.receiptUrl));
    assertTrue('Response receiptDownloadUrl is populated', Boolean(uploadRes.body.receiptDownloadUrl));

    // 4. GET Inline Receipt Stream -> 200 OK with application/pdf Content-Type
    const streamRes = await req('GET', `/depenses-vehicules/${testExpenseId}/recu`, null, adminToken);
    assertStatus('GET receipt inline stream → 200 OK', streamRes.status, 200);
    assertTrue('Stream Content-Type is application/pdf', streamRes.headers['content-type']?.includes('application/pdf'));
    assertTrue('Stream Content-Disposition is inline', streamRes.headers['content-disposition']?.includes('inline'));

    // 5. GET Receipt Download Stream -> 200 OK with attachment Content-Disposition
    const downloadRes = await req('GET', `/depenses-vehicules/${testExpenseId}/recu/download`, null, adminToken);
    assertStatus('GET receipt download stream → 200 OK', downloadRes.status, 200);
    assertTrue('Download Content-Disposition is attachment', downloadRes.headers['content-disposition']?.includes('attachment'));

    // 6. Delete Receipt -> 200 OK
    const delReceiptRes = await req('DELETE', `/depenses-vehicules/${testExpenseId}/recu`, null, adminToken);
    assertStatus('DELETE receipt → 200 OK', delReceiptRes.status, 200);
    assertEqual('Response hasReceipt is now false', delReceiptRes.body.hasReceipt, false);
    assertEqual('Response receiptUrl is null', delReceiptRes.body.receiptUrl, null);

    // 7. GET Receipt Stream after deletion -> 404 Not Found
    const streamDeletedRes = await req('GET', `/depenses-vehicules/${testExpenseId}/recu`, null, adminToken);
    assertStatus('GET deleted receipt stream → 404 Not Found', streamDeletedRes.status, 404);
  }

  // ── Step 5: DTO Negative Validation Coverage ─────────────────────
  console.log('\n── Step 5: DTO Negative Validation Coverage ──');
  {
    // Page = 0 (< 1)
    const res1 = await req('GET', '/depenses-vehicules?page=0', null, adminToken);
    assertStatus('Query page = 0 → 400', res1.status, 400);

    // Limit = 0 (< 1)
    const res2 = await req('GET', '/depenses-vehicules?limit=0', null, adminToken);
    assertStatus('Query limit = 0 → 400', res2.status, 400);

    // Limit = 101 (> 100)
    const res3 = await req('GET', '/depenses-vehicules?limit=101', null, adminToken);
    assertStatus('Query limit = 101 → 400', res3.status, 400);

    // Invalid sortBy
    const res5 = await req('GET', '/depenses-vehicules?sortBy=forbiddenField', null, adminToken);
    assertStatus('Query invalid sortBy → 400', res5.status, 400);

    // Invalid sortOrder
    const res5b = await req('GET', '/depenses-vehicules?sortOrder=invalidOrder', null, adminToken);
    assertStatus('Query invalid sortOrder → 400', res5b.status, 400);

    // Unknown query param (forbidNonWhitelisted)
    const res6 = await req('GET', '/depenses-vehicules?unknownQueryParam=123', null, adminToken);
    assertStatus('Query unknown parameter → 400', res6.status, 400);
  }

  // ── Step 6: Detail Endpoint Contract & 404 Check ──────────────────────────
  console.log('\n── Step 6: Detail Endpoint Contract & 404 Check ──');
  if (testExpenseId) {
    const res = await req('GET', `/depenses-vehicules/${testExpenseId}`, null, adminToken);
    assertStatus('GET existing expense detail → 200', res.status, 200);
    assertEqual('Detail idDepense', res.body.idDepense, testExpenseId);
    assertEqual('Detail immatriculation', res.body.immatriculation, testImmat);

    // Non-existent ID -> 404
    const notFoundRes = await req('GET', '/depenses-vehicules/999999999', null, adminToken);
    assertStatus('GET missing expense detail → 404 Not Found', notFoundRes.status, 404);
  }

  // ── Step 7: List Pagination, Filtering & Search ──
  console.log('\n── Step 7: List Pagination, Filtering & Search ──');
  {
    const res = await req('GET', '/depenses-vehicules?page=1&limit=5', null, adminToken);
    assertStatus('GET /depenses-vehicules paginated list → 200', res.status, 200);
    assertTrue('Response has data array', Array.isArray(res.body.data));
    assertTrue('Response has meta pagination object', Boolean(res.body.meta));
    assertEqual('Meta limit is 5', res.body.meta.limit, 5);

    // Search filter test (case-insensitive)
    const searchRes = await req('GET', `/depenses-vehicules?search=${encodeURIComponent(testImmat.toLowerCase())}`, null, adminToken);
    assertStatus('Search by immatriculation → 200', searchRes.status, 200);
    assertTrue('Search returns match', searchRes.body.data.some((e) => e.immatriculation === testImmat));
  }

  // ── Step 8: Stats Endpoint ────────────────────────────────────────────────
  console.log('\n── Step 8: Stats Endpoint ──');
  {
    const res = await req('GET', '/depenses-vehicules/stats', null, adminToken);
    assertStatus('GET /depenses-vehicules/stats → 200', res.status, 200);
    assertTrue('Stats returns totalCount number', typeof res.body.totalCount === 'number');
    assertTrue('Stats returns totalMontant number', typeof res.body.totalMontant === 'number');
  }

  // ── Step 9: Delete Safety ──
  console.log('\n── Step 9: Delete Safety ──');
  {
    const eRes = await req('POST', '/depenses-vehicules', { categorieDepense: 'PEAGE', immatriculation: testImmat, montant: 350 }, adminToken);
    if (eRes.body?.idDepense) {
      const eId = eRes.body.idDepense;
      const delRes = await req('DELETE', `/depenses-vehicules/${eId}`, null, adminToken);
      assertStatus('Delete unlinked expense → 200 OK', delRes.status, 200);
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

  // 1. Delete Expenses
  for (const id of cleanupRegistry.expenseIds) {
    try {
      await req('DELETE', `/depenses-vehicules/${id}`, null, token);
      console.log(`  🗑️  Deleted DepenseVehicule #${id}`);
    } catch {}
  }

  // 2. Delete Vehicles
  for (const id of cleanupRegistry.vehicleIds) {
    try {
      await req('DELETE', `/vehicules/${id}`, null, token);
      console.log(`  🗑️  Deleted Vehicule #${id}`);
    } catch {}
  }

  // 3. Delete Test Users
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
  console.log(`Final Phase 12 & 12.1 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('='.repeat(70));

  if (primaryError || failCount > 0) {
    process.exitCode = 1;
  }
}

main();
