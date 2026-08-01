const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Load environment variables dynamically
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const runId = Date.now();
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test credentials
const ADMIN_EMAIL = process.env.PHASE14_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@transport.ma';
const ADMIN_PASSWORD = process.env.PHASE14_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

let adminToken = '';
let restrictedUserToken = '';
let restrictedUserId = null;

let createdClientId = null;
let createdVoyageId = null;
let createdFactureId = null;
let testNumeroFacture = `FAC-P141-${runId.toString().slice(-4)}`;

let passCount = 0;
let failCount = 0;

function logStep(msg) {
  console.log(`\n── ${msg} ──`);
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

function requestBuffer(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {},
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        if (res.headers['content-type']?.includes('application/json')) {
          try {
            parsed = JSON.parse(buffer.toString('utf8'));
          } catch {
            parsed = buffer.toString('utf8');
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, buffer, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase14_1HttpSuite() {
  console.log(`\n======================================================================`);
  console.log(`Phase 14.1 Invoice PDF Generation HTTP Acceptance Suite — runId=${runId}`);
  console.log(`======================================================================\n`);

  try {
    // -------------------------------------------------------------
    // Step 1: Admin Login
    // -------------------------------------------------------------
    logStep('Step 1: Admin Login');
    const loginRes = await requestBuffer('POST', '/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(loginRes.status === 200, `Admin login: Status ${loginRes.status}`);
    assert(Boolean(loginRes.body?.accessToken), 'Admin token acquired');
    adminToken = loginRes.body?.accessToken;

    // -------------------------------------------------------------
    // Step 2: Unauthenticated 401 Security Test
    // -------------------------------------------------------------
    logStep('Step 2: Unauthenticated 401 Security Test');
    const unauthRes = await requestBuffer('GET', '/factures/1/pdf');
    assert(unauthRes.status === 401, `Unauthenticated GET /factures/1/pdf → 401: Status ${unauthRes.status}`);

    // -------------------------------------------------------------
    // Step 3: Authenticated 403 Security Test (No Factures Permissions)
    // -------------------------------------------------------------
    logStep('Step 3: Authenticated 403 Security Test (No Factures Permissions)');
    const rolesRes = await requestBuffer('GET', '/roles', null, adminToken);
    const roles = Array.isArray(rolesRes.body) ? rolesRes.body : rolesRes.body?.data || [];
    const persRole = roles.find((r) => r.code === 'PERSONNALISE' || r.nom === 'PERSONNALISE');
    assert(Boolean(persRole), 'PERSONNALISE role found dynamically');

    const emptyPerms = {};
    if (persRole && persRole.permissions) {
      for (const modKey of Object.keys(persRole.permissions)) {
        emptyPerms[modKey] = {
          voir: false,
          ajouter: false,
          modifier: false,
          supprimer: false,
          exporter: false,
          imprimer: false,
          valider: false,
        };
      }
    }

    const newUserPayload = {
      nom: `RestrictedUser-${runId}`,
      email: `restricted-pdf-${runId}@test.ma`,
      motDePasse: 'Password123!',
      idRole: persRole ? persRole.id : 2,
      statut: 'ACTIF',
      permissions: emptyPerms,
    };

    const createUserRes = await requestBuffer('POST', '/users', newUserPayload, adminToken);
    assert(createUserRes.status === 201, `Create restricted user → 201: Status ${createUserRes.status}`);
    restrictedUserId = createUserRes.body?.id;

    const restLoginRes = await requestBuffer('POST', '/auth/login', {
      email: newUserPayload.email,
      password: newUserPayload.motDePasse,
    });
    assert(restLoginRes.status === 200, `Restricted user login → 200: Status ${restLoginRes.status}`);
    restrictedUserToken = restLoginRes.body?.accessToken;

    const forbiddenPdfRes = await requestBuffer('GET', '/factures/1/pdf', null, restrictedUserToken);
    assert(forbiddenPdfRes.status === 403, `Restricted user GET /factures/1/pdf → 403: Status ${forbiddenPdfRes.status}`);

    // -------------------------------------------------------------
    // Step 4: Invalid ID & Missing Invoice Rejection (400 & 404)
    // -------------------------------------------------------------
    logStep('Step 4: Invalid ID & Missing Invoice Rejection (400 & 404)');
    const invalidIdRes = await requestBuffer('GET', '/factures/abc/pdf', null, adminToken);
    assert(invalidIdRes.status === 400, `Invalid ID /factures/abc/pdf → 400: Status ${invalidIdRes.status}`);

    const missingRes = await requestBuffer('GET', '/factures/999999/pdf', null, adminToken);
    assert(missingRes.status === 404, `Missing invoice /factures/999999/pdf → 404: Status ${missingRes.status}`);

    // -------------------------------------------------------------
    // Step 5: Fixtures Creation (Client, Voyage, Facture)
    // -------------------------------------------------------------
    logStep('Step 5: Fixtures Creation (Client, Voyage, Facture)');
    const clientRes = await requestBuffer('POST', '/clients', {
      nomEntreprise: `Client-PDF-${runId}`,
      adresse: 'Zone Logistique Mohammedia',
      telephone: '+212600889900',
    }, adminToken);
    assert(clientRes.status === 201, `Create client fixture → 201: Status ${clientRes.status}`);
    createdClientId = clientRes.body?.id;

    const voyageRes = await requestBuffer('POST', '/voyages', {
      nomClient: `Client-PDF-${runId}`,
      lieuChargement: 'Tangermed Terminal 2',
      lieuDechargement: 'Agadir Souss',
      montantVoyage: 22000,
      statut: 'PLANIFIE',
    }, adminToken);
    assert(voyageRes.status === 201, `Create voyage fixture → 201: Status ${voyageRes.status}`);
    createdVoyageId = voyageRes.body?.idVoyage;

    const factureRes = await requestBuffer('POST', '/factures', {
      numeroFacture: testNumeroFacture,
      nomClient: `Client-PDF-${runId}`,
      idVoyage: createdVoyageId,
      dateFacture: '2026-07-23',
      joursEcheance: 30,
      sousTotal: 22000,
      tauxTva: 20,
      notes: 'Transport de marchandiseAgadir',
    }, adminToken);
    assert(factureRes.status === 201, `Create facture fixture → 201: Status ${factureRes.status}`);
    createdFactureId = factureRes.body?.id;

    // -------------------------------------------------------------
    // Step 6: Valid Invoice PDF Download & Response Inspection
    // -------------------------------------------------------------
    logStep('Step 6: Valid Invoice PDF Download & Response Inspection');
    const pdfRes = await requestBuffer('GET', `/factures/${createdFactureId}/pdf`, null, adminToken);
    assert(pdfRes.status === 200, `GET /factures/${createdFactureId}/pdf → 200 OK: Status ${pdfRes.status}`);

    const contentType = pdfRes.headers['content-type'];
    assert(contentType && contentType.includes('application/pdf'), `Content-Type is application/pdf: "${contentType}"`);

    const contentDisposition = pdfRes.headers['content-disposition'];
    assert(contentDisposition && contentDisposition.includes('attachment; filename='), `Content-Disposition is attachment: "${contentDisposition}"`);

    const cacheControl = pdfRes.headers['cache-control'];
    assert(cacheControl && cacheControl.includes('no-store'), `Cache-Control is private, no-store: "${cacheControl}"`);

    const pdfSig = pdfRes.buffer.slice(0, 5).toString('ascii');
    assert(pdfSig.startsWith('%PDF-'), `Response payload signature is PDF magic bytes: "${pdfSig}"`);
    assert(pdfRes.buffer.length > 500, `PDF payload is non-empty (${pdfRes.buffer.length} bytes)`);

    const pdfStr = pdfRes.buffer.toString('binary');
    const pageMatches = pdfStr.match(/\/Type\s*\/Page\b/g);
    const pdfPageCount = pageMatches ? pageMatches.length : 0;
    assert(pdfPageCount === 1, `Generated PDF contains exactly 1 page: ${pdfPageCount} page(s)`);

    // -------------------------------------------------------------
    // Step 7: Soft Delete Invoice & PDF Rejection
    // -------------------------------------------------------------
    logStep('Step 7: Soft Delete Invoice & PDF Rejection');
    const delRes = await requestBuffer('DELETE', `/factures/${createdFactureId}`, null, adminToken);
    assert(delRes.status === 200, `Soft delete facture → 200 OK: Status ${delRes.status}`);

    const softDeletedPdfRes = await requestBuffer('GET', `/factures/${createdFactureId}/pdf`, null, adminToken);
    assert(softDeletedPdfRes.status === 404, `Soft-deleted invoice PDF request → 404 Not Found: Status ${softDeletedPdfRes.status}`);

  } catch (err) {
    console.error('Unhandled error during test suite execution:', err);
    failCount++;
  } finally {
    logStep('Cleanup Procedure');
    if (createdFactureId) {
      console.log(`  🗑️  Facture #${createdFactureId} soft-deleted`);
    }
    if (createdVoyageId) {
      await requestBuffer('DELETE', `/voyages/${createdVoyageId}`, null, adminToken);
      console.log(`  🗑️  Deleted Voyage #${createdVoyageId}`);
    }
    if (createdClientId) {
      await requestBuffer('DELETE', `/clients/${createdClientId}`, null, adminToken);
      console.log(`  🗑️  Deleted Client #${createdClientId}`);
    }
    if (restrictedUserId) {
      await requestBuffer('DELETE', `/users/${restrictedUserId}`, null, adminToken);
      console.log(`  🗑️  Deleted User #${restrictedUserId}`);
    }

    console.log(`\n======================================================================`);
    console.log(`Final Phase 14.1 Live HTTP Results: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`======================================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runPhase14_1HttpSuite();
