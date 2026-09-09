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

async function runHttpPaiementsEmployesSuite() {
  console.log('\n================================================================');
  console.log('=== MODULE RH — PAIEMENTS EMPLOYÉS HTTP ACCEPTANCE SUITE (REV 2) ===');
  console.log('================================================================\n');

  const prisma = new PrismaClient();
  let createdEmpId = null;
  let obligationId = null;

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
    const unauthRes = await makeRequest('GET', '/paiements-employes');
    if (unauthRes.statusCode !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.statusCode}`);
    }
    console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');

    // 3. Create test employee fixture
    console.log('[STEP 3] Creating test employee fixture...');
    const empRes = await makeRequest(
      'POST',
      '/employes',
      {
        nom: 'BENJELLOUN',
        prenom: 'Yassine',
        cin: 'CD554433',
        poste: 'Chef d’Atelier',
        dateEmbauche: '2025-01-01',
        typeContrat: 'CDI',
        salaireBase: 12000,
        modePaiement: 'VIREMENT',
        nomBanque: 'Attijariwafa Bank',
        rib: '245780000888888888888888',
      },
      adminAuthHeader,
    );
    if (empRes.statusCode !== 201 && empRes.statusCode !== 200) {
      throw new Error(`Failed creating employee: ${empRes.statusCode}`);
    }
    createdEmpId = empRes.body.id;
    console.log(`  ✓ Created test employee #${createdEmpId}`);

    // 4. GET /api/paiements-employes/stats
    console.log('[STEP 4] Testing GET /api/paiements-employes/stats...');
    const statsRes = await makeRequest('GET', '/paiements-employes/stats', null, adminAuthHeader);
    if (statsRes.statusCode !== 200) {
      throw new Error(`GET /paiements-employes/stats failed with status ${statsRes.statusCode}`);
    }
    console.log(`  ✓ PASSED: GET /paiements-employes/stats returned 200 OK (${JSON.stringify(statsRes.body)})`);

    // 5. POST /api/paiements-employes Creation
    console.log('[STEP 5] Creating payment obligation via POST /api/paiements-employes...');
    const createRes = await makeRequest(
      'POST',
      '/paiements-employes',
      {
        idEmploye: createdEmpId,
        periode: '2026-07',
        montantDu: 12000,
        notes: 'Paiement Juillet 2026',
        initialVersement: {
          montant: 4000,
          dateVersement: '2026-07-10',
          modePaiement: 'VIREMENT',
          referenceExterne: 'VIR-HTTP-001',
        },
      },
      adminAuthHeader,
    );

    if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
      throw new Error(`POST /paiements-employes failed: ${createRes.statusCode} - ${JSON.stringify(createRes.body)}`);
    }
    obligationId = createRes.body.id;
    console.log(`  ✓ PASSED: Obligation created #${obligationId} (${createRes.body.numeroPaiement}), statut=${createRes.body.statut}`);

    // 6. GET /api/paiements-employes List & Search
    console.log('[STEP 6] Testing GET /api/paiements-employes list and search...');
    const listRes = await makeRequest('GET', `/paiements-employes?idEmploye=${createdEmpId}`, null, adminAuthHeader);
    if (listRes.statusCode !== 200 || !Array.isArray(listRes.body.data)) {
      throw new Error(`GET /paiements-employes failed: ${listRes.statusCode}`);
    }
    if (listRes.body.data.length === 0) {
      throw new Error('List returned 0 items');
    }
    console.log(`  ✓ PASSED: List returned ${listRes.body.data.length} matched obligation(s)`);

    // 7. POST /api/paiements-employes/:id/versements
    console.log('[STEP 7] Adding a versement via POST /api/paiements-employes/:id/versements...');
    const versementRes = await makeRequest(
      'POST',
      `/paiements-employes/${obligationId}/versements`,
      {
        montant: 8000,
        dateVersement: '2026-07-25',
        modePaiement: 'CHEQUE',
        referenceExterne: 'CHQ-889900',
      },
      adminAuthHeader,
    );

    if (versementRes.statusCode !== 201 && versementRes.statusCode !== 200) {
      throw new Error(`POST versement failed: ${versementRes.statusCode} - ${JSON.stringify(versementRes.body)}`);
    }
    if (versementRes.body.statut !== 'PAYE' || versementRes.body.soldeRestant !== 0) {
      throw new Error(`Expected PAYE status, got: ${JSON.stringify(versementRes.body)}`);
    }
    console.log('  ✓ PASSED: Versement added, obligation fully paid (PAYE)');

    // 8. POST /api/paiements-employes/:id/versements/:versementId/annuler
    console.log('[STEP 8] Cancelling versement via POST /api/paiements-employes/:id/versements/:versementId/annuler...');
    const versementsList = versementRes.body.versements;
    const lastVersementId = versementsList[versementsList.length - 1].id;

    const cancelRes = await makeRequest(
      'POST',
      `/paiements-employes/${obligationId}/versements/${lastVersementId}/annuler`,
      {
        motifAnnulation: 'Chèque sans provision',
      },
      adminAuthHeader,
    );

    if (cancelRes.statusCode !== 201 && cancelRes.statusCode !== 200) {
      throw new Error(`POST cancel versement failed: ${cancelRes.statusCode} - ${JSON.stringify(cancelRes.body)}`);
    }
    if (cancelRes.body.statut !== 'PARTIELLEMENT_PAYE' || cancelRes.body.soldeRestant !== 8000) {
      throw new Error(`Expected PARTIELLEMENT_PAYE status, got: ${JSON.stringify(cancelRes.body)}`);
    }
    console.log('  ✓ PASSED: Versement cancelled cleanly via HTTP endpoint');

    // Cleanup DB fixtures
    if (obligationId) {
      await prisma.versementEmploye.deleteMany({ where: { idPaiementEmploye: obligationId } });
      await prisma.paiementEmploye.deleteMany({ where: { id: obligationId } });
    }
    if (createdEmpId) {
      await prisma.employe.deleteMany({ where: { id: createdEmpId } });
    }
    console.log('  ✓ Cleaned up HTTP test fixtures');

    console.log('\n================================================================');
    console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('================================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    if (obligationId) {
      await prisma.versementEmploye.deleteMany({ where: { idPaiementEmploye: obligationId } }).catch(() => {});
      await prisma.paiementEmploye.deleteMany({ where: { id: obligationId } }).catch(() => {});
    }
    if (createdEmpId) {
      await prisma.employe.deleteMany({ where: { id: createdEmpId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpPaiementsEmployesSuite();
