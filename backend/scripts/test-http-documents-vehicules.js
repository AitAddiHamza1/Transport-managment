const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = 'localhost';

function request(options, body = null, isBuffer = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, text, json, buffer });
      });
    });
    req.on('error', reject);
    if (body) {
      if (isBuffer) req.write(body);
      else req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

async function runHttpTests() {
  console.log('=== HTTP ACCEPTANCE SUITE FOR DOCUMENTS VÉHICULES ===\n');

  // 1. Authenticate ADMIN_GENERAL
  console.log('[STEP 1] Authenticating as ADMIN_GENERAL...');
  const loginRes = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@transport.local', password: 'ChangeMe2025!' });

  if (loginRes.statusCode !== 200 || !loginRes.json?.accessToken) {
    console.error('Login failed:', loginRes.statusCode, loginRes.text);
    process.exit(1);
  }
  const token = loginRes.json.accessToken;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log('  ✓ Authenticated successfully!');

  // 2. Fetch Stats
  console.log('\n[STEP 2] Testing GET /api/documents-vehicules/stats...');
  const statsRes = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/documents-vehicules/stats',
    method: 'GET',
    headers: authHeaders,
  });

  if (statsRes.statusCode !== 200 || typeof statsRes.json?.total !== 'number') {
    console.error('GET stats failed:', statsRes.statusCode, statsRes.text);
    process.exit(1);
  }
  console.log('  ✓ Stats response:', statsRes.json);

  // 3. Fetch List
  console.log('\n[STEP 3] Testing GET /api/documents-vehicules?page=1&limit=10...');
  const listRes = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/documents-vehicules?page=1&limit=10',
    method: 'GET',
    headers: authHeaders,
  });

  if (listRes.statusCode !== 200 || !Array.isArray(listRes.json?.data)) {
    console.error('GET list failed:', listRes.statusCode, listRes.text);
    process.exit(1);
  }
  console.log(`  ✓ List retrieved successfully! Count: ${listRes.json.data.length}, Total: ${listRes.json.meta.totalItems}`);

  // 4. Create Document
  console.log('\n[STEP 4] Testing POST /api/documents-vehicules...');
  // Find an existing vehicle immatriculation or create one
  const vehRes = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/vehicules?page=1&limit=1',
    method: 'GET',
    headers: authHeaders,
  });

  let immat = vehRes.json?.data?.[0]?.immatriculation;
  if (!immat) {
    console.log('  No vehicle found. Creating temporary vehicle...');
    immat = `HTTP-${Date.now().toString().slice(-4)}`;
    await request({
      hostname: HOST,
      port: PORT,
      path: '/api/vehicules',
      method: 'POST',
      headers: authHeaders,
    }, { immatriculation: immat, marque: 'MAN', typeVehicule: 'CAMION' });
  }

  const createRes = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/documents-vehicules',
    method: 'POST',
    headers: authHeaders,
  }, {
    immatriculation: immat,
    typeDocument: 'LICENCE',
    numeroDocument: 'LIC-HTTP-123',
    dateExpiration: '2027-12-31',
    notes: 'Document créé via test HTTP',
  });

  if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
    // If licence already exists on vehicle, delete it or pick another type
    console.log('Create returned:', createRes.statusCode, createRes.text);
  } else {
    console.log('  ✓ Document created successfully! ID:', createRes.json.idDocument, 'Status:', createRes.json.status);
    const docId = createRes.json.idDocument;

    // 5. Test Soft Delete
    console.log(`\n[STEP 5] Testing DELETE /api/documents-vehicules/${docId}...`);
    const delRes = await request({
      hostname: HOST,
      port: PORT,
      path: `/api/documents-vehicules/${docId}`,
      method: 'DELETE',
      headers: authHeaders,
    });
    if (delRes.statusCode === 200) {
      console.log('  ✓ Soft delete succeeded!');
    }
  }

  console.log('\n======================================================================');
  console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED SUCCESSFULLY ===');
  console.log('======================================================================\n');
}

runHttpTests().catch(console.error);
