const path = require('path');
const http = require('http');
const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));

const API_BASE = 'http://localhost:3000/api';

function makeRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(rawBuffer.toString('utf8'));
        } catch (_) {
          parsed = rawBuffer.toString('utf8');
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBuffer,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runHttpAcceptanceSuite() {
  console.log('\n====================================================');
  console.log('=== MODULE RH — EMPLOYÉS HTTP ACCEPTANCE TEST SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  let createdEmpId = null;

  try {
    // 1. Admin Login
    console.log('[STEP 1] Logging in as ADMIN_GENERAL...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'admin@transport.local',
      password: 'ChangeMe2025!',
    });

    if (loginRes.statusCode !== 201 && loginRes.statusCode !== 200) {
      throw new Error(`Admin login failed: ${loginRes.statusCode} - ${JSON.stringify(loginRes.body)}`);
    }

    const token = loginRes.body.access_token || loginRes.body.accessToken || loginRes.body.token;
    if (!token) {
      throw new Error('Access token missing from login response');
    }
    const adminAuthHeader = { Authorization: `Bearer ${token}` };
    console.log('  ✓ Admin logged in successfully');

    // 2. Unauthenticated 401 Rejection
    console.log('[STEP 2] Verifying 401 Unauthorized for unauthenticated requests...');
    const unauthRes = await makeRequest('GET', '/employes');
    if (unauthRes.statusCode !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.statusCode}`);
    }
    console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');

    // 3. GET /api/employes/stats
    console.log('[STEP 3] Testing GET /api/employes/stats...');
    const statsRes = await makeRequest('GET', '/employes/stats', null, adminAuthHeader);
    if (statsRes.statusCode !== 200) {
      throw new Error(`GET /employes/stats failed with status ${statsRes.statusCode}`);
    }
    console.log(`  ✓ PASSED: GET /employes/stats returned 200 OK (${JSON.stringify(statsRes.body)})`);

    // 4. POST /api/employes Creation
    console.log('[STEP 4] Creating new Employee via POST /api/employes...');
    const createRes = await makeRequest(
      'POST',
      '/employes',
      {
        nom: 'KABBAGE',
        prenom: 'Sofia',
        cin: 'BK998877',
        poste: 'Responsable RH',
        departement: 'Ressources Humaines',
        dateEmbauche: '2026-01-10',
        typeContrat: 'CDI',
        salaireBase: 15000,
        modePaiement: 'VIREMENT',
        nomBanque: 'BMCE Bank',
        rib: '111222333444555666777888',
      },
      adminAuthHeader,
    );

    if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
      throw new Error(`POST /employes failed: ${createRes.statusCode} - ${JSON.stringify(createRes.body)}`);
    }
    createdEmpId = createRes.body.id;
    console.log(`  ✓ PASSED: Employee created #${createdEmpId} with matricule "${createRes.body.matricule}"`);

    // 5. GET /api/employes List
    console.log('[STEP 5] Testing GET /api/employes list pagination & search...');
    const listRes = await makeRequest('GET', '/employes?search=KABBAGE', null, adminAuthHeader);
    if (listRes.statusCode !== 200 || !Array.isArray(listRes.body.data)) {
      throw new Error(`GET /employes failed: ${listRes.statusCode}`);
    }
    if (listRes.body.data.length === 0) {
      throw new Error('Search for "KABBAGE" returned 0 items');
    }
    console.log(`  ✓ PASSED: List returned ${listRes.body.data.length} matched employee(s)`);

    // 6. PATCH /api/employes/:id Update
    console.log('[STEP 6] Testing PATCH /api/employes/:id...');
    const patchRes = await makeRequest(
      'PATCH',
      `/employes/${createdEmpId}`,
      {
        poste: 'Directrice RH',
        salaireBase: 18000,
      },
      adminAuthHeader,
    );

    if (patchRes.statusCode !== 200 || patchRes.body.poste !== 'Directrice RH') {
      throw new Error(`PATCH /employes/${createdEmpId} failed: ${patchRes.statusCode}`);
    }
    console.log('  ✓ PASSED: Employee updated successfully');

    // 7. DELETE /api/employes/:id Soft Delete
    console.log('[STEP 7] Testing DELETE /api/employes/:id soft delete...');
    const delRes = await makeRequest('DELETE', `/employes/${createdEmpId}`, null, adminAuthHeader);
    if (delRes.statusCode !== 200) {
      throw new Error(`DELETE /employes/${createdEmpId} failed: ${delRes.statusCode}`);
    }
    console.log('  ✓ PASSED: Employee soft deleted successfully');

    // Cleanup DB fixture
    if (createdEmpId) {
      await prisma.employe.deleteMany({ where: { id: createdEmpId } });
      console.log('  ✓ Cleaned up HTTP test fixture');
    }

    console.log('\n====================================================');
    console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    if (createdEmpId) {
      await prisma.employe.deleteMany({ where: { id: createdEmpId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpAcceptanceSuite();
