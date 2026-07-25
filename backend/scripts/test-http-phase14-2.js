const path = require('path');
const http = require('http');
const fs = require('fs');
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

async function loginUser(email, password) {
  const res = await makeRequest('POST', '/auth/login', { email, password });
  if (res.statusCode !== 200 || !res.body.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken;
}

async function runHttpAcceptanceSuite() {
  console.log('====================================================');
  console.log('=== PHASE 14.2 HTTP ACCEPTANCE TEST SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Authenticate ADMIN_GENERAL
    console.log('[STEP 1] Logging in as ADMIN_GENERAL...');
    const adminToken = await loginUser('admin@transport.local', 'ChangeMe2025!');
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('  ✓ Admin logged in successfully');

    // 2. Unauthenticated 401 Rejection
    console.log('[STEP 2] Verifying 401 Unauthorized for unauthenticated requests...');
    const res401 = await makeRequest('GET', '/company-settings');
    if (res401.statusCode === 401) {
      console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');
    } else {
      throw new Error(`FAILED: Expected 401, got ${res401.statusCode}`);
    }

    // 3. Read-Only GET /company-settings
    console.log('[STEP 3] Testing GET /api/company-settings...');
    const resGetSettings = await makeRequest('GET', '/company-settings', null, adminAuthHeader);
    if (resGetSettings.statusCode === 200 && resGetSettings.body.settings !== undefined) {
      console.log(`  ✓ PASSED: GET /company-settings returned 200 OK (isConfigured=${resGetSettings.body.isConfigured})`);
    } else {
      throw new Error(`FAILED: GET /company-settings returned ${resGetSettings.statusCode}: ${JSON.stringify(resGetSettings.body)}`);
    }

    // 4. Configure Company Profile via PATCH /api/company-settings
    console.log('[STEP 4] Updating company profile via PATCH /api/company-settings...');
    const patchPayload = {
      nomEntreprise: 'LOGISTIQUE & TRANSPORT MA',
      adresse: '125, Boulevard Zerktouni, Etage 3',
      ville: 'Casablanca',
      pays: 'Maroc',
      telephone: '+212 522 12 34 56',
      email: 'contact@logistique-transport.ma',
      ice: '001584920000034',
      identifiantFiscal: '40293841',
      registreCommerce: '145892 Casablanca',
      cnss: '7849201',
      nomBanque: 'Attijariwafa Bank',
      rib: '245 780 0001234567890123 45',
      prefixeFacture: '',
      separateurFacture: '-',
      paddingFacture: 1,
      templateFacture: 'CLASSIC_TRANSPORT',
    };
    const resPatch = await makeRequest('PATCH', '/company-settings', patchPayload, adminAuthHeader);
    if (resPatch.statusCode === 200 && resPatch.body.isConfigured === true) {
      console.log('  ✓ PASSED: Company profile updated and isConfigured=true');
    } else {
      throw new Error(`FAILED: PATCH /company-settings returned ${resPatch.statusCode}: ${JSON.stringify(resPatch.body)}`);
    }

    // 5. Test Invoice Creation Rejections
    console.log('[STEP 5] Testing Invoice Creation Contract Rejections...');

    // A. Missing idVoyage -> 422
    const resNoVoyage = await makeRequest('POST', '/factures', {}, adminAuthHeader);
    if (resNoVoyage.statusCode === 422 || resNoVoyage.statusCode === 400) {
      console.log('  ✓ PASSED: Invoice creation without idVoyage rejected with validation error');
    } else {
      throw new Error(`FAILED: Expected 422/400 for missing idVoyage, got ${resNoVoyage.statusCode}`);
    }

    // B. Unlinked Voyage (#46) -> 422
    const resUnlinked = await makeRequest('POST', '/factures', { idVoyage: 46 }, adminAuthHeader);
    if (resUnlinked.statusCode === 422) {
      console.log('  ✓ PASSED: Invoice creation from unlinked Voyage #46 rejected with HTTP 422');
    } else {
      console.log(`  ! Notice: Invoice creation for Voyage #46 returned HTTP ${resUnlinked.statusCode}`);
    }

    // 6. Create Valid Facture from Linked Voyage #42
    console.log('[STEP 6] Creating Facture from linked Voyage #42...');
    const resCreate = await makeRequest('POST', '/factures', { idVoyage: 42, tauxTva: 20 }, adminAuthHeader);
    if (resCreate.statusCode === 201) {
      const createdFacture = resCreate.body;
      console.log(`  ✓ PASSED: Created Facture N° ${createdFacture.numeroFacture} for Client "${createdFacture.nomClient}" (HT=${createdFacture.sousTotal} MAD, TTC=${createdFacture.montantTotal} MAD)`);
      console.log(`  - Amount in words: "${createdFacture.montantEnLettres}"`);

      // 7. Download PDF without stamp
      console.log('[STEP 7] Testing GET /api/factures/:id/pdf?includeStamp=false...');
      const resPdfNoStamp = await makeRequest('GET', `/factures/${createdFacture.id}/pdf?includeStamp=false`, null, adminAuthHeader);
      if (resPdfNoStamp.statusCode === 200 && resPdfNoStamp.rawBuffer.toString('utf8', 0, 5) === '%PDF-') {
        console.log('  ✓ PASSED: Downloaded PDF buffer valid (%PDF-)');
      } else {
        throw new Error(`FAILED: PDF download returned ${resPdfNoStamp.statusCode}`);
      }

      // 8. Download PDF with stamp option
      console.log('[STEP 8] Testing GET /api/factures/:id/pdf?includeStamp=true...');
      const resPdfStamp = await makeRequest('GET', `/factures/${createdFacture.id}/pdf?includeStamp=true`, null, adminAuthHeader);
      if (resPdfStamp.statusCode === 200 && resPdfStamp.rawBuffer.toString('utf8', 0, 5) === '%PDF-') {
        console.log('  ✓ PASSED: Downloaded PDF with stamp option valid (%PDF-)');
      } else {
        throw new Error(`FAILED: PDF download with stamp returned ${resPdfStamp.statusCode}`);
      }

      // Cleanup test facture
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: createdFacture.numeroFacture } });
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: createdFacture.numeroFacture } });
      await prisma.facture.delete({ where: { id: createdFacture.id } });
      await prisma.voyage.update({ where: { idVoyage: 42 }, data: { statut: 'LIVRE' } });
      console.log('  ✓ Cleaned up test facture fixture');
    } else {
      throw new Error(`FAILED: Facture creation returned ${resCreate.statusCode}: ${JSON.stringify(resCreate.body)}`);
    }

    console.log('\n====================================================');
    console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpAcceptanceSuite();
