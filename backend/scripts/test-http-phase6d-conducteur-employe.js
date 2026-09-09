const path = require('path');
const http = require('http');
const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));
const bcrypt = require(path.join(__dirname, '../node_modules/bcrypt'));

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
  console.log('\n=============================================================');
  console.log('=== PHASE 6D — CONDUCTEURS ↔ EMPLOYÉS HTTP ACCEPTANCE TEST ===');
  console.log('=============================================================\n');

  const prisma = new PrismaClient();
  let createdEmpId = null;
  let restrictedUserId = null;

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
    const adminAuthHeader = { Authorization: `Bearer ${token}` };
    console.log('  ✓ Admin logged in successfully');

    // 2. Create Employee with Driver Profile atomically
    console.log('[STEP 2] Creating Employee with Conducteur profile toggled...');
    const empRes = await makeRequest(
      'POST',
      '/employes',
      {
        nom: 'Alami',
        prenom: 'Youssef',
        cin: 'BK112233',
        poste: 'Conducteur',
        dateEmbauche: '2026-08-01',
        typeContrat: 'CDI',
        salaireBase: 6500,
        profilConducteur: true,
      },
      adminAuthHeader,
    );

    if (empRes.statusCode !== 201 && empRes.statusCode !== 200) {
      throw new Error(`Failed to create employee: ${empRes.statusCode} - ${JSON.stringify(empRes.body)}`);
    }
    createdEmpId = empRes.body.id;
    console.log(`  ✓ Employee created successfully (ID: ${createdEmpId}, Matricule: ${empRes.body.matricule})`);
    console.log(`  ✓ Driver badge summary check: ${JSON.stringify(empRes.body.conducteur)}`);

    if (!empRes.body.conducteur) {
      throw new Error('Driver profile was not created atomically');
    }

    const driverId = empRes.body.conducteur.id;

    // 3. GET /api/conducteurs/:id detail view
    console.log('[STEP 3] Fetching driver details as admin...');
    const condRes = await makeRequest('GET', `/conducteurs/${driverId}`, null, adminAuthHeader);
    if (condRes.statusCode !== 200) {
      throw new Error(`Failed to fetch conducteur: ${condRes.statusCode}`);
    }
    console.log(`  ✓ Driver fetched successfully. Linked employee: ${JSON.stringify(condRes.body.employe)}`);
    if (!condRes.body.employe || condRes.body.employe.nom !== 'Alami' || Number(condRes.body.employe.salaireBase) !== 6500) {
      throw new Error('Linked employee details or salary missing/incorrect in driver response');
    }

    // 4. Update Employee name and verify driver name snapshot sync
    console.log('[STEP 4] Updating employee name and verifying driver snapshot sync...');
    const updateRes = await makeRequest(
      'PATCH',
      `/employes/${createdEmpId}`,
      {
        nom: 'Alami Mod',
      },
      adminAuthHeader,
    );
    if (updateRes.statusCode !== 200 || updateRes.body.nom !== 'Alami Mod') {
      throw new Error('Failed to update employee name');
    }

    // Fetch driver again to verify snapshot sync
    const condRes2 = await makeRequest('GET', `/conducteurs/${driverId}`, null, adminAuthHeader);
    if (condRes2.body.nomConducteur !== 'Youssef Alami Mod') {
      throw new Error(`Driver snapshot name did not sync, got: ${condRes2.body.nomConducteur}`);
    }
    console.log(`  ✓ Driver snapshot name synchronized successfully: ${condRes2.body.nomConducteur}`);

    // 5. Privilege isolation: log in as a restricted user who doesn't have employes.voir but has conducteurs.voir
    console.log('[STEP 5] Setting up a restricted user...');
    // Find or create a custom role/user
    const exploitantRole = await prisma.role.findFirst({
      where: { nom: 'EXPLOITANT' }
    });
    
    const hashedPassword = await bcrypt.hash('RestrictedPwd123!', 10);
    const restUser = await prisma.user.create({
      data: {
        nom: 'Exploitant Test',
        email: 'exploitant.test@transport.local',
        motDePasse: hashedPassword,
        idRole: exploitantRole.id,
        statut: 'ACTIF',
      }
    });
    restrictedUserId = restUser.id;

    // Login as restricted user
    const restLoginRes = await makeRequest('POST', '/auth/login', {
      email: restUser.email,
      password: 'RestrictedPwd123!',
    });
    const restToken = restLoginRes.body.access_token || restLoginRes.body.accessToken || restLoginRes.body.token;
    const restAuthHeader = { Authorization: `Bearer ${restToken}` };

    console.log('[STEP 6] Fetching driver details as restricted user (Privilege Isolation)...');
    const condResRest = await makeRequest('GET', `/conducteurs/${driverId}`, null, restAuthHeader);
    if (condResRest.statusCode !== 200) {
      throw new Error(`Restricted user could not view driver: ${condResRest.statusCode}`);
    }
    console.log(`  ✓ Driver fetched successfully by restricted user.`);
    console.log(`  ✓ Salary isolation check (salaireBase): ${condResRest.body.employe ? condResRest.body.employe.salaireBase : 'null'}`);
    if (condResRest.body.employe && condResRest.body.employe.salaireBase !== null) {
      throw new Error('SECURITY VIOLATION: Restricted user leaked employee salary base!');
    }
    console.log('  ✓ PASSED: Restricted user did not leak employee salary base.');

    // Cleanup
    console.log('[CLEANUP] Cleaning up test records...');
    await prisma.conducteur.deleteMany({ where: { idEmploye: createdEmpId } });
    await prisma.employe.deleteMany({ where: { id: createdEmpId } });
    await prisma.user.deleteMany({ where: { id: restrictedUserId } });
    console.log('  ✓ Cleaned up HTTP test records successfully.');

    console.log('\n=============================================================');
    console.log('=== ALL PHASE 6D HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    if (createdEmpId) {
      await prisma.conducteur.deleteMany({ where: { idEmploye: createdEmpId } }).catch(() => {});
      await prisma.employe.deleteMany({ where: { id: createdEmpId } }).catch(() => {});
    }
    if (restrictedUserId) {
      await prisma.user.deleteMany({ where: { id: restrictedUserId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpAcceptanceSuite();
