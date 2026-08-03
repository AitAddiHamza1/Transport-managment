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
  console.log('=== PHASE 6B PDF HTTP ACCEPTANCE TEST SUITE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  let createdFactureId = null;
  let createdFactureNum = null;
  let originalCompanySettings = null;

  try {
    // 1. Authenticate ADMIN_GENERAL
    console.log('[STEP 1] Logging in as ADMIN_GENERAL...');
    const adminToken = await loginUser('admin@transport.local', 'ChangeMe2025!');
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('  ✓ Admin logged in successfully');

    // Save original company settings for cleanup
    originalCompanySettings = await prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    // 2. Unauthenticated 401 Rejection on PDF Download
    console.log('[STEP 2] Verifying 401 Unauthorized for unauthenticated PDF requests...');
    const res401 = await makeRequest('GET', '/factures/1/pdf');
    if (res401.statusCode === 401) {
      console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');
    } else {
      throw new Error(`FAILED: Expected 401, got ${res401.statusCode}`);
    }

    // 3. Create a valid test invoice from Voyage #2
    console.log('[STEP 3] Preparing test invoice via POST /api/factures...');
    // Ensure Voyage #2 is back to LIVRE state
    await prisma.voyage.update({ where: { idVoyage: 2 }, data: { statut: 'LIVRE' } }).catch(() => {});
    const resCreate = await makeRequest('POST', '/factures', { idVoyage: 2, tauxTva: 20 }, adminAuthHeader);
    if (resCreate.statusCode === 201) {
      createdFactureId = resCreate.body.id;
      createdFactureNum = resCreate.body.numeroFacture;
      console.log(`  ✓ Test invoice N° ${createdFactureNum} created successfully`);
    } else {
      throw new Error(`FAILED: Facture creation returned ${resCreate.statusCode}: ${JSON.stringify(resCreate.body)}`);
    }

    // 4. Test 422 Unprocessable Entity for incomplete company settings
    console.log('[STEP 4] Testing 422 Unprocessable Entity when company settings are incomplete...');
    // temporarily empty nomEntreprise
    await prisma.companySettings.update({
      where: { singletonKey: 'DEFAULT' },
      data: { nomEntreprise: '' },
    });

    const resIncomplete = await makeRequest('GET', `/factures/${createdFactureId}/pdf`, null, adminAuthHeader);
    if (resIncomplete.statusCode === 422) {
      console.log('  ✓ PASSED: PDF download rejected with 422 for incomplete company profile');
    } else {
      throw new Error(`FAILED: Expected 422, got ${resIncomplete.statusCode}`);
    }

    // Restore valid company settings with template CLASSIC_TRANSPORT
    await prisma.companySettings.update({
      where: { singletonKey: 'DEFAULT' },
      data: {
        nomEntreprise: originalCompanySettings.nomEntreprise,
        adresse: originalCompanySettings.adresse,
        telephone: originalCompanySettings.telephone,
        email: originalCompanySettings.email,
        templateFacture: 'CLASSIC_TRANSPORT',
      },
    });

    // 5. Test 200 OK + valid PDF headers for CLASSIC_TRANSPORT without stamp
    console.log('[STEP 5] Testing CLASSIC_TRANSPORT download without stamp...');
    const resClassicNoStamp = await makeRequest('GET', `/factures/${createdFactureId}/pdf?includeStamp=false`, null, adminAuthHeader);
    if (resClassicNoStamp.statusCode === 200 && resClassicNoStamp.headers['content-type'] === 'application/pdf') {
      console.log('  ✓ PASSED: Classic PDF generated successfully with Content-Type application/pdf');
      if (resClassicNoStamp.rawBuffer.toString('utf8', 0, 5) === '%PDF-') {
        console.log('  ✓ PASSED: Magic bytes %PDF- verified');
      } else {
        throw new Error('FAILED: Missing PDF header bytes');
      }
    } else {
      throw new Error(`FAILED: Expected 200/pdf, got ${resClassicNoStamp.statusCode}`);
    }

    // 6. Test 200 OK for CLASSIC_TRANSPORT with stamp
    console.log('[STEP 6] Testing CLASSIC_TRANSPORT download with stamp...');
    const resClassicStamp = await makeRequest('GET', `/factures/${createdFactureId}/pdf?includeStamp=true`, null, adminAuthHeader);
    if (resClassicStamp.statusCode === 200 && resClassicStamp.headers['content-type'] === 'application/pdf') {
      console.log('  ✓ PASSED: Classic PDF with stamp generated successfully');
    } else {
      throw new Error(`FAILED: Expected 200/pdf, got ${resClassicStamp.statusCode}`);
    }

    // 7. Update Company Settings to TRANSPORT_V2
    console.log('[STEP 7] Changing template to TRANSPORT_V2 via PATCH /api/company-settings...');
    const resPatchV2 = await makeRequest('PATCH', '/company-settings', {
      templateFacture: 'TRANSPORT_V2',
    }, adminAuthHeader);
    if (resPatchV2.statusCode === 200) {
      console.log('  ✓ PASSED: Company Settings template updated to TRANSPORT_V2');
    } else {
      throw new Error(`FAILED: Expected 200, got ${resPatchV2.statusCode}: ${JSON.stringify(resPatchV2.body)}`);
    }

    // 8. Test 200 OK for TRANSPORT_V2 without stamp
    console.log('[STEP 8] Testing TRANSPORT_V2 download without stamp...');
    const resV2NoStamp = await makeRequest('GET', `/factures/${createdFactureId}/pdf?includeStamp=false`, null, adminAuthHeader);
    if (resV2NoStamp.statusCode === 200 && resV2NoStamp.headers['content-type'] === 'application/pdf') {
      console.log('  ✓ PASSED: V2 PDF generated successfully');
      if (resV2NoStamp.rawBuffer.toString('utf8', 0, 5) === '%PDF-') {
        console.log('  ✓ PASSED: Magic bytes %PDF- verified for V2');
      } else {
        throw new Error('FAILED: Missing PDF V2 header bytes');
      }
    } else {
      throw new Error(`FAILED: Expected 200/pdf, got ${resV2NoStamp.statusCode}`);
    }

    // 9. Test 200 OK for TRANSPORT_V2 with stamp
    console.log('[STEP 9] Testing TRANSPORT_V2 download with stamp...');
    const resV2Stamp = await makeRequest('GET', `/factures/${createdFactureId}/pdf?includeStamp=true`, null, adminAuthHeader);
    if (resV2Stamp.statusCode === 200 && resV2Stamp.headers['content-type'] === 'application/pdf') {
      console.log('  ✓ PASSED: V2 PDF with stamp generated successfully');
    } else {
      throw new Error(`FAILED: Expected 200/pdf, got ${resV2Stamp.statusCode}`);
    }

    // 10. Test DTO Validation restricts templateFacture values
    console.log('[STEP 10] Testing DTO validation rejecting invalid template names...');
    const resInvalidPatch = await makeRequest('PATCH', '/company-settings', {
      templateFacture: 'INVALID_GARBAGE',
    }, adminAuthHeader);
    if (resInvalidPatch.statusCode === 400) {
      console.log('  ✓ PASSED: PATCH rejected invalid template name with HTTP 400 Bad Request');
    } else {
      throw new Error(`FAILED: Expected 400, got ${resInvalidPatch.statusCode}: ${JSON.stringify(resInvalidPatch.body)}`);
    }

    // 11. Content-Disposition filename check
    console.log('[STEP 11] Checking Content-Disposition header filename sanitization...');
    const contentDisposition = resV2NoStamp.headers['content-disposition'];
    const expectedFilename = `Facture-${createdFactureNum.replace(/\//g, '-')}.pdf`;
    if (contentDisposition && contentDisposition.includes(`filename="${expectedFilename}"`)) {
      console.log(`  ✓ PASSED: Content-Disposition contains sanitized filename: ${contentDisposition}`);
    } else {
      throw new Error(`FAILED: Expected Content-Disposition filename to match "${expectedFilename}", got: ${contentDisposition}`);
    }

    // 12. Non-existent invoice 404
    console.log('[STEP 12] Testing GET /api/factures/999999/pdf returns 404...');
    const res404 = await makeRequest('GET', '/factures/999999/pdf', null, adminAuthHeader);
    if (res404.statusCode === 404) {
      console.log('  ✓ PASSED: Requesting PDF for non-existent invoice returned 404 Not Found');
    } else {
      throw new Error(`FAILED: Expected 404, got ${res404.statusCode}`);
    }

    console.log('\n====================================================');
    console.log('=== ALL 12 HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    process.exit(1);
  } finally {
    // Restore original settings
    if (originalCompanySettings) {
      await prisma.companySettings.update({
        where: { singletonKey: 'DEFAULT' },
        data: {
          nomEntreprise: originalCompanySettings.nomEntreprise,
          nomLegal: originalCompanySettings.nomLegal,
          adresse: originalCompanySettings.adresse,
          ville: originalCompanySettings.ville,
          pays: originalCompanySettings.pays,
          telephone: originalCompanySettings.telephone,
          email: originalCompanySettings.email,
          ice: originalCompanySettings.ice,
          identifiantFiscal: originalCompanySettings.identifiantFiscal,
          registreCommerce: originalCompanySettings.registreCommerce,
          cnss: originalCompanySettings.cnss,
          patente: originalCompanySettings.patente,
          siteWeb: originalCompanySettings.siteWeb,
          nomBanque: originalCompanySettings.nomBanque,
          rib: originalCompanySettings.rib,
          iban: originalCompanySettings.iban,
          swiftBic: originalCompanySettings.swiftBic,
          devise: originalCompanySettings.devise,
          templateFacture: originalCompanySettings.templateFacture,
          textePiedDePage: originalCompanySettings.textePiedDePage,
          noteLegaleTva: originalCompanySettings.noteLegaleTva,
        },
      }).catch(() => {});
    }

    // Cleanup created invoice
    if (createdFactureId) {
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: createdFactureNum } }).catch(() => {});
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: createdFactureNum } }).catch(() => {});
      await prisma.facture.delete({ where: { id: createdFactureId } }).catch(() => {});
      await prisma.voyage.update({ where: { idVoyage: 2 }, data: { statut: 'FACTURE' } }).catch(() => {});
    }

    await prisma.$disconnect();
  }
}

runHttpAcceptanceSuite();
