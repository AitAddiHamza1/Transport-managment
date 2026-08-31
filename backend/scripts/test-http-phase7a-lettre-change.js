const path = require('path');
const http = require('http');
const { PrismaClient } = require(path.join(__dirname, '../node_modules/@prisma/client'));

// Safely load environment variables from backend/.env if available
if (!process.env.PHASE7_ADMIN_EMAIL || !process.env.PHASE7_ADMIN_PASSWORD) {
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

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@transport.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe2025!';

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
  console.log('=== PHASE 7A LETTRE DE CHANGE HTTP ACCEPTANCE TESTS ===');
  console.log('====================================================\n');

  const prisma = new PrismaClient();
  let createdFactureId = null;
  let createdFactureNum = null;
  let createdDetteId = null;
  let createdPaiementId = null;

  try {
    // 1. Authenticate ADMIN_GENERAL
    console.log('[STEP 1] Logging in as ADMIN_GENERAL...');
    const adminToken = await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };
    console.log('  ✓ Admin logged in successfully');

    // 2. Unauthenticated 401 Rejection on payments list
    console.log('[STEP 2] Verifying 401 Unauthorized for unauthenticated payments requests...');
    const res401 = await makeRequest('GET', '/paiements-clients');
    if (res401.statusCode === 401) {
      console.log('  ✓ PASSED: Unauthenticated request returned 401 Unauthorized');
    } else {
      throw new Error(`FAILED: Expected 401, got ${res401.statusCode}`);
    }

    // 3. Create Facture & Creance for testing Client Payment
    console.log('[STEP 3] Preparing test client & invoice/creance...');
    let client = await prisma.client.findFirst();
    if (!client) {
      client = await prisma.client.create({
        data: {
          nomEntreprise: 'HTTP CLIENT 7A',
          ice: '111111111111111',
          deviseFacturation: 'MAD',
        },
      });
    }

    let voyage = await prisma.voyage.create({
      data: {
        idClient: client.id,
        montantVoyage: 3000.00,
        devise: 'MAD',
        statut: 'FACTURE',
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
      },
    });

    createdFactureNum = `FAC-7A-HTTP-${Date.now()}`;
    const invoice = await prisma.facture.create({
      data: {
        numeroFacture: createdFactureNum,
        nomClient: client.nomEntreprise,
        idVoyage: voyage.idVoyage,
        sousTotal: 3000.00,
        tauxTva: 20.00,
        devise: 'MAD',
        creance: {
          create: {
            nomClient: client.nomEntreprise,
            montantFacture: 3600.00,
            montantRecu: 0.00,
            statutPaiement: 'NON_PAYE',
            devise: 'MAD',
          },
        },
      },
    });
    createdFactureId = invoice.id;
    console.log(`  ✓ Test invoice N° ${createdFactureNum} created`);

    // 4. Create Client Payment with Lettre de change (EFFET)
    console.log('[STEP 4] Posting a client payment with Lettre de change metadata...');
    const clientLCDto = {
      numeroFacture: createdFactureNum,
      nomClient: client.nomEntreprise,
      montantRecu: 1500.00,
      methodePaiement: 'EFFET',
      lettreNumero: 'LC-HTTP-999',
      lettreDateEcheance: '2026-11-30',
      lettreMontant: 1500.00,
      lettreBeneficiaire: 'ANTIGRAVITY CARGO S.R.L.',
      lettreCause: 'Transport national',
      lettreTireNom: client.nomEntreprise,
      lettreTireAdresse: 'Industrial Zone, Casablanca',
    };

    const resClientPay = await makeRequest('POST', '/paiements-clients', clientLCDto, adminAuthHeader);
    if (resClientPay.statusCode === 201) {
      console.log('  ✓ PASSED: Client payment with Lettre de change created successfully');
      createdPaiementId = resClientPay.body.id;
      if (resClientPay.body.lettreDeChange && resClientPay.body.lettreDeChange.numero === 'LC-HTTP-999') {
        console.log('  ✓ PASSED: Returned payload contains correct LettreDeChange details');
      } else {
        throw new Error('FAILED: Missing or incorrect LettreDeChange returned in creation response');
      }
    } else {
      throw new Error(`FAILED: Client payment returned ${resClientPay.statusCode}: ${JSON.stringify(resClientPay.body)}`);
    }

    // 5. Retrieve client payment and check structure
    console.log('[STEP 5] Retrieving client payment details...');
    const resGetPay = await makeRequest('GET', `/paiements-clients/${createdPaiementId}`, null, adminAuthHeader);
    if (resGetPay.statusCode === 200) {
      if (resGetPay.body.lettreDeChange && resGetPay.body.lettreDeChange.numero === 'LC-HTTP-999') {
        console.log('  ✓ PASSED: Retrieved payment contains LettreDeChange metadata');
      } else {
        throw new Error('FAILED: Retrieved payment details did not include LettreDeChange');
      }
    } else {
      throw new Error(`FAILED: GET /paiements-clients/:id returned ${resGetPay.statusCode}`);
    }

    // 6. Conditional validation failure test
    console.log('[STEP 6] Testing validation failure for missing Lettre de change fields when mode is EFFET...');
    const invalidDto = {
      numeroFacture: createdFactureNum,
      nomClient: client.nomEntreprise,
      montantRecu: 500.00,
      methodePaiement: 'EFFET',
      // Missing lettreNumero and others
    };
    const resInvalid = await makeRequest('POST', '/paiements-clients', invalidDto, adminAuthHeader);
    if (resInvalid.statusCode === 400) {
      console.log('  ✓ PASSED: Payment creation rejected with 400 Bad Request');
    } else {
      throw new Error(`FAILED: Expected 400 for missing conditional fields, got ${resInvalid.statusCode}`);
    }

    // 7. Create DetteFournisseur and try Supplier payment with Lettre de change
    console.log('[STEP 7] Preparing supplier & debt...');
    let supplier = await prisma.fournisseur.findFirst();
    if (!supplier) {
      supplier = await prisma.fournisseur.create({
        data: {
          nomFournisseur: 'HTTP SUPPLIER 7A',
          ice: '222222222222222',
        },
      });
    }

    const dette = await prisma.detteFournisseur.create({
      data: {
        numeroDette: `DET-7A-HTTP-${Date.now()}`,
        idFournisseur: supplier.id,
        nomFournisseurSnapshot: supplier.nomFournisseur,
        montantDu: 5000.00,
        dateEcheance: new Date(),
      },
    });
    createdDetteId = dette.id;

    console.log('[STEP 8] Creating supplier payment with Lettre de change via POST...');
    const supplierPayDto = {
      montant: 2000.00,
      modePaiement: 'EFFET',
      lettreNumero: 'LC-SUP-HTTP-888',
      lettreDateEcheance: '2026-10-15',
      lettreMontant: 2000.00,
      lettreBeneficiaire: supplier.nomFournisseur,
      lettreCause: 'Service maintenance',
      lettreTireNom: 'ANTIGRAVITY CARGO S.R.L.',
      lettreTireAdresse: '45, Blvd d’Anfa, Casablanca',
    };

    const resSupPay = await makeRequest('POST', `/dettes-fournisseurs/${createdDetteId}/paiements`, supplierPayDto, adminAuthHeader);
    if (resSupPay.statusCode === 201) {
      console.log('  ✓ PASSED: Supplier payment with Lettre de change created successfully');
      // Fetch details through list to confirm
      const resListSup = await makeRequest('GET', `/dettes-fournisseurs/${createdDetteId}/paiements`, null, adminAuthHeader);
      const retrieved = resListSup.body.find(p => p.modePaiement === 'EFFET');
      if (retrieved && retrieved.lettreDeChange && retrieved.lettreDeChange.numero === 'LC-SUP-HTTP-888') {
        console.log('  ✓ PASSED: Retrieved supplier versement contains LettreDeChange metadata');
      } else {
        throw new Error('FAILED: Supplier versement did not preserve LettreDeChange metadata');
      }
    } else {
      throw new Error(`FAILED: Supplier payment returned ${resSupPay.statusCode}: ${JSON.stringify(resSupPay.body)}`);
    }

    console.log('\n====================================================');
    console.log('=== ALL HTTP ACCEPTANCE TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');

  } catch (err) {
    console.error('HTTP Acceptance Test Failed:', err);
    process.exit(1);
  } finally {
    // Cleanup created data
    if (createdFactureNum) {
      await prisma.lettreDeChange.deleteMany({
        where: {
          numero: { in: ['LC-HTTP-999', 'LC-SUP-HTTP-888'] }
        }
      }).catch(() => {});
      await prisma.paiementClient.deleteMany({ where: { numeroFacture: createdFactureNum } }).catch(() => {});
      await prisma.creanceClient.deleteMany({ where: { numeroFacture: createdFactureNum } }).catch(() => {});
      await prisma.facture.delete({ where: { id: createdFactureId } }).catch(() => {});
    }
    if (createdDetteId) {
      await prisma.paiementFournisseur.deleteMany({ where: { idDetteFournisseur: createdDetteId } }).catch(() => {});
      await prisma.detteFournisseur.delete({ where: { id: createdDetteId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runHttpAcceptanceSuite();
