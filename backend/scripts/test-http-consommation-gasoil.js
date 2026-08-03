const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.CONSOMMATION_GASOIL_ADMIN_EMAIL || 'admin@transport.local';
const ADMIN_PASSWORD = process.env.CONSOMMATION_GASOIL_ADMIN_PASSWORD || 'ChangeMe2025!';

async function runHttpAcceptanceTests() {
  console.log('=============================================================================');
  console.log('=== PHASE 6A — CONSOMMATION GASOIL HTTP ACCEPTANCE TEST SUITE =============');
  console.log('=============================================================================\n');

  let token = '';

  try {
    // ── Test 1: 401 Unauthorized ──
    console.log('[HTTP 1] Testing 401 Unauthorized request without token...');
    const unauthRes = await fetch(`${API_BASE}/bons-carburant`);
    if (unauthRes.status === 401) {
      console.log('  ✓ PASSED: GET /api/bons-carburant returned 401 Unauthorized');
    } else {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }

    // ── Test 2: Admin Login ──
    console.log('\n[HTTP 2] Authenticating as Admin...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${errText}`);
    }

    const loginData = await loginRes.json();
    token = loginData.accessToken || loginData.access_token;
    console.log('  ✓ Authenticated successfully.');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // ── Test 3: List & Stats Endpoints ──
    console.log('\n[HTTP 3] Testing GET /api/bons-carburant & GET /api/bons-carburant/stats...');
    const listRes = await fetch(`${API_BASE}/bons-carburant`, { headers: authHeaders });
    if (!listRes.ok) throw new Error(`GET /api/bons-carburant failed (${listRes.status})`);
    const listData = await listRes.json();
    console.log(`  ✓ List Status: ${listRes.status}, Total Items: ${listData.meta.total}`);

    const statsRes = await fetch(`${API_BASE}/bons-carburant/stats`, { headers: authHeaders });
    if (!statsRes.ok) throw new Error(`GET /api/bons-carburant/stats failed (${statsRes.status})`);
    const statsData = await statsRes.json();
    console.log('  ✓ Stats Response:', statsData);
    if (!('litresTotal' in statsData) || !('consommationMoyenneL100' in statsData)) {
      throw new Error('Stats response format invalid');
    }

    // ── Test 4: Excel Export Endpoint ──
    console.log('\n[HTTP 4] Testing GET /api/bons-carburant/export/excel endpoint...');
    const excelRes = await fetch(`${API_BASE}/bons-carburant/export/excel`, { headers: authHeaders });
    if (!excelRes.ok) throw new Error(`GET /api/bons-carburant/export/excel failed (${excelRes.status})`);

    const contentType = excelRes.headers.get('content-type');
    const contentDisp = excelRes.headers.get('content-disposition');
    const excelBuffer = await excelRes.arrayBuffer();

    console.log(`  ✓ Excel Export Status: ${excelRes.status}, Content-Type: ${contentType}, Size: ${excelBuffer.byteLength} bytes`);
    if (!contentType?.includes('spreadsheetml.sheet')) {
      throw new Error(`Invalid Excel content type: ${contentType}`);
    }
    if (!contentDisp?.includes('filename=')) {
      throw new Error('Missing Content-Disposition filename header');
    }
    console.log('  ✓ PASSED: Excel export returned valid spreadsheet stream!');

    console.log('\n=============================================================================');
    console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===============================');
    console.log('=============================================================================\n');
  } catch (err) {
    console.error('❌ HTTP Acceptance Suite Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpAcceptanceTests();
