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

async function loginUser(email, password) {
  const res = await makeRequest('POST', '/auth/login', { email, password });
  if (res.statusCode !== 200 || !res.body.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken;
}

async function runHttpAcceptanceSuite() {
  console.log('====================================================');
  console.log('=== PHASE 6C INVOICE BALANCES HTTP ACCEPTANCE ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  let createdFactureId = null;
  let createdFactureNum = null;
  let paymentIds = [];

  try {
    // 1. Authenticate ADMIN_GENERAL
    console.log('[STEP 1] Logging in as ADMIN_GENERAL...');
    const adminToken = await loginUser('admin@transport.local', 'ChangeMe2025!');
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('  ✓ Admin logged in successfully');

    // 2. Unauthenticated 401 Rejection
    console.log('[STEP 2] Verifying 401 Unauthorized for unauthenticated requests...');
    const res401 = await makeRequest('GET', '/factures');
    if (res401.statusCode === 401) {
      console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');
    } else {
      throw new Error(`FAILED: Expected 401, got ${res401.statusCode}`);
    }

    // 3. Create a valid test invoice from Voyage #2
    console.log('[STEP 3] Preparing test invoice via POST /api/factures...');
    await prisma.voyage.update({ where: { idVoyage: 2 }, data: { statut: 'LIVRE' } }).catch(() => {});
    const resCreate = await makeRequest('POST', '/factures', { idVoyage: 2, tauxTva: 20 }, adminAuthHeader);
    if (resCreate.statusCode === 201) {
      createdFactureId = resCreate.body.id;
      createdFactureNum = resCreate.body.numeroFacture;
      console.log(`  ✓ Test invoice #${createdFactureId} (N° ${createdFactureNum}) created successfully`);
    } else {
      throw new Error(`FAILED to create test invoice: ${JSON.stringify(resCreate.body)}`);
    }

    // 4. Verify initial balances
    console.log('[STEP 4] Verifying initial balances (no payments)...');
    const resGet1 = await makeRequest('GET', `/factures/${createdFactureId}`, null, adminAuthHeader);
    if (resGet1.statusCode === 200) {
      const { montantPaye, soldeRestant, montantTotal, statut } = resGet1.body;
      if (montantPaye === '0.00' && Number(soldeRestant) === Number(montantTotal) && statut === 'EMISE') {
        console.log(`  ✓ PASSED: initial paid is "${montantPaye}", remaining is "${soldeRestant}", status is ${statut}`);
      } else {
        throw new Error(`FAILED: expected defaults, got paid=${montantPaye}, remaining=${soldeRestant}, status=${statut}`);
      }
    } else {
      throw new Error(`FAILED to fetch invoice: ${JSON.stringify(resGet1.body)}`);
    }

    // 5. Create partial client payment
    console.log('[STEP 5] Creating partial client payment of 5000.00 MAD...');
    const resPay1 = await makeRequest('POST', '/paiements-clients', {
      numeroFacture: createdFactureNum,
      montantRecu: 5000.00,
      methodePaiement: 'VIREMENT',
    }, adminAuthHeader);
    if (resPay1.statusCode === 201) {
      paymentIds.push(resPay1.body.id);
      console.log(`  ✓ Partial payment created successfully: #${resPay1.body.id}`);
    } else {
      throw new Error(`FAILED to create payment: ${JSON.stringify(resPay1.body)}`);
    }

    // 6. Verify updated partial balances
    console.log('[STEP 6] Verifying updated balances (partial paid)...');
    const resGet2 = await makeRequest('GET', `/factures/${createdFactureId}`, null, adminAuthHeader);
    if (resGet2.statusCode === 200) {
      const { montantPaye, soldeRestant, montantTotal, statut } = resGet2.body;
      const expectedRemaining = (Number(montantTotal) - 5000).toFixed(2);
      if (montantPaye === '5000.00' && soldeRestant === expectedRemaining && statut === 'PARTIELLEMENT_PAYEE') {
        console.log(`  ✓ PASSED: partial paid is "${montantPaye}", remaining is "${soldeRestant}", status is ${statut}`);
      } else {
        throw new Error(`FAILED: got paid=${montantPaye}, remaining=${soldeRestant}, status=${statut}`);
      }
    } else {
      throw new Error(`FAILED to fetch invoice: ${JSON.stringify(resGet2.body)}`);
    }

    // 7. Create final client payment to fully pay the invoice
    console.log('[STEP 7] Creating final client payment for full amount...');
    const currentTotal = resGet2.body.montantTotal;
    const finalAmount = Number((currentTotal - 5000).toFixed(2));
    const resPay2 = await makeRequest('POST', '/paiements-clients', {
      numeroFacture: createdFactureNum,
      montantRecu: finalAmount,
      methodePaiement: 'VIREMENT',
    }, adminAuthHeader);
    if (resPay2.statusCode === 201) {
      paymentIds.push(resPay2.body.id);
      console.log(`  ✓ Final payment created successfully: #${resPay2.body.id}`);
    } else {
      throw new Error(`FAILED to create final payment: ${JSON.stringify(resPay2.body)}`);
    }

    // 8. Verify full payment balances
    console.log('[STEP 8] Verifying updated balances (fully paid)...');
    const resGet3 = await makeRequest('GET', `/factures/${createdFactureId}`, null, adminAuthHeader);
    if (resGet3.statusCode === 200) {
      const { montantPaye, soldeRestant, statut } = resGet3.body;
      if (Number(montantPaye) === Number(currentTotal) && soldeRestant === '0.00' && statut === 'PAYEE') {
        console.log(`  ✓ PASSED: fully paid is "${montantPaye}", remaining is "${soldeRestant}", status is ${statut}`);
      } else {
        throw new Error(`FAILED: got paid=${montantPaye}, remaining=${soldeRestant}, status=${statut}`);
      }
    } else {
      throw new Error(`FAILED to fetch invoice: ${JSON.stringify(resGet3.body)}`);
    }

  } catch (error) {
    console.error('HTTP Acceptance Suite Failed:', error);
    process.exitCode = 1;
  } finally {
    // Clean up created entities
    console.log('\n[CLEANUP] Cleaning up test payments and invoices...');
    if (paymentIds.length > 0) {
      await prisma.paiementClient.deleteMany({
        where: { id: { in: paymentIds } },
      });
      console.log(`  ✓ Deleted ${paymentIds.length} test payments`);
    }
    if (createdFactureId) {
      // Hard delete from database for testing cleanliness
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: createdFactureNum } });
      await prisma.facture.delete({ where: { id: createdFactureId } });
      console.log(`  ✓ Deleted test invoice #${createdFactureId}`);
    }
    // Set Voyage 2 back to LIVRE
    await prisma.voyage.update({ where: { idVoyage: 2 }, data: { statut: 'LIVRE' } }).catch(() => {});
    console.log('  ✓ Set Voyage #2 back to LIVRE state');
    console.log('\n====================================================');
    if (process.exitCode === 1) {
      console.log('=== HTTP SUITE RUN FINISHED WITH ERRORS ===');
    } else {
      console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    }
    console.log('====================================================');
    process.exit(process.exitCode || 0);
  }
}

runHttpAcceptanceSuite();
