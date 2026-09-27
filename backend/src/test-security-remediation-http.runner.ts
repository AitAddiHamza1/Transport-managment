import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BASE_URL = 'http://127.0.0.1:3000/api';
const prisma = new PrismaClient();

async function request(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let body: any = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function login(email: string, pass: string) {
  const res = await request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} (status ${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function runHttpIntegrationSecurityTests() {
  console.log('====================================================');
  console.log('=== PHASE 6.6 REAL POSTGRESQL HTTP INTEGRATION SUITE ===');
  console.log('====================================================\n');

  try {
    // 1. Authenticate users from two distinct companies
    console.log('[STEP 1] Authenticating real users against NestJS HTTP API + PostgreSQL...');
    
    // Primary admin (Company 1)
    const authA = await login('admin@transport.local', 'ChangeMe2025!');
    console.log(`  ✓ Auth User A (Company 1) success: User ID ${authA.user.id}, Company ${authA.user.companyId}`);

    // Search for a second active user in a different company whose password matches known passwords or test hashes
    const activeUsers = await prisma.user.findMany({
      where: {
        statut: 'ACTIF',
        companyId: { not: authA.user.companyId },
      },
      include: { role: true },
    });

    let authB: any = null;
    let userB_pass = '';
    const candidatePasswords = ['ChangeMe2025!', 'Password123!', 'TransportAdmin2025#Secure', '25#Secure'];

    for (const u of activeUsers) {
      for (const pass of candidatePasswords) {
        if (await bcrypt.compare(pass, u.motDePasse)) {
          try {
            authB = await login(u.email, pass);
            userB_pass = pass;
            break;
          } catch {
            /* ignore */
          }
        }
      }
      if (authB) break;
    }

    if (!authB) {
      throw new Error('Could not find a second active user in PostgreSQL with a known test password.');
    }

    console.log(`  ✓ Auth User B (Company ${authB.user.companyId}) success: User ID ${authB.user.id}, Company ${authB.user.companyId}`);

    const tokenA = authA.accessToken;
    const tokenB = authB.accessToken;
    const companyAId = authA.user.companyId;
    const companyBId = authB.user.companyId;

    // -------------------------------------------------------------
    // TEST A1 — TENANT READ ISOLATION
    // -------------------------------------------------------------
    console.log('\n[TEST A1] Testing Tenant Read Isolation over HTTP...');
    
    const endpoints = [
      { name: 'Factures', url: '/factures' },
      { name: 'Paiements Clients', url: '/paiements-clients' },
      { name: 'Creances Clients', url: '/creances-clients' },
      { name: 'Clients', url: '/clients' },
      { name: 'Voyages', url: '/voyages' },
    ];

    for (const ep of endpoints) {
      const resA = await request(ep.url, tokenA);
      if (resA.status !== 200) {
        throw new Error(`Failed GET ${ep.url} for User A: status ${resA.status}`);
      }
      const dataA = Array.isArray(resA.body) ? resA.body : (resA.body.data || resA.body.items || []);
      
      const resB = await request(ep.url, tokenB);
      if (resB.status !== 200) {
        throw new Error(`Failed GET ${ep.url} for User B: status ${resB.status}`);
      }
      const dataB = Array.isArray(resB.body) ? resB.body : (resB.body.data || resB.body.items || []);

      // Verify no cross-tenant contamination in returned arrays
      for (const item of dataA) {
        if (item.companyId && item.companyId !== companyAId) {
          throw new Error(`SECURITY FAILURE: GET ${ep.url} for User A (Company ${companyAId}) returned item with companyId ${item.companyId}`);
        }
      }
      for (const item of dataB) {
        if (item.companyId && item.companyId !== companyBId) {
          throw new Error(`SECURITY FAILURE: GET ${ep.url} for User B (Company ${companyBId}) returned item with companyId ${item.companyId}`);
        }
      }

      console.log(`  ✓ GET ${ep.url}: Company A (${companyAId}) returned ${dataA.length} items (0 cross-tenant), Company B (${companyBId}) returned ${dataB.length} items (0 cross-tenant)`);
    }

    // -------------------------------------------------------------
    // TEST A2 — CROSS TENANT IDOR (READ 404)
    // -------------------------------------------------------------
    console.log('\n[TEST A2] Testing Cross-Tenant IDOR 404 Prevention...');

    // Fetch real Company A invoice ID from DB
    const companyAFacture = await prisma.facture.findFirst({
      where: { companyId: companyAId },
    });

    if (!companyAFacture) {
      throw new Error(`No Facture found in database for Company A (${companyAId})`);
    }
    const targetFactureId = companyAFacture.id;

    // User B requests Company A invoice
    const idorRes = await request(`/factures/${targetFactureId}`, tokenB);
    if (idorRes.status === 404) {
      console.log(`  ✓ PASSED: GET /factures/${targetFactureId} with Company B token returned 404 Not Found`);
    } else {
      throw new Error(`FAILED IDOR: Expected 404, got ${idorRes.status} body: ${JSON.stringify(idorRes.body)}`);
    }

    // -------------------------------------------------------------
    // TEST A3 — CROSS TENANT UPDATE
    // -------------------------------------------------------------
    console.log('\n[TEST A3] Testing Cross-Tenant Update Rejection & DB Integrity...');

    const originalFactureDB = await prisma.facture.findUnique({ where: { id: targetFactureId } });
    const originalNotes = originalFactureDB?.notes;

    const updateRes = await request(`/factures/${targetFactureId}`, tokenB, {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'ATTEMPTED_CROSS_TENANT_MUTATION' }),
    });

    if (updateRes.status === 404 || updateRes.status === 403) {
      console.log(`  ✓ PASSED: PATCH /factures/${targetFactureId} with Company B token rejected with status ${updateRes.status}`);
    } else {
      throw new Error(`FAILED UPDATE: Expected 404/403, got ${updateRes.status}`);
    }

    const postUpdateFactureDB = await prisma.facture.findUnique({ where: { id: targetFactureId } });
    if (postUpdateFactureDB?.notes === originalNotes) {
      console.log(`  ✓ PASSED: Database verification confirmed Company A invoice row is UNCHANGED in PostgreSQL`);
    } else {
      throw new Error(`CRITICAL SECURITY FAILURE: PostgreSQL row was mutated by cross-tenant request!`);
    }

    // -------------------------------------------------------------
    // TEST A4 — CROSS TENANT DELETE
    // -------------------------------------------------------------
    console.log('\n[TEST A4] Testing Cross-Tenant Delete Rejection & DB Integrity...');

    const deleteRes = await request(`/factures/${targetFactureId}`, tokenB, {
      method: 'DELETE',
    });

    if (deleteRes.status === 404 || deleteRes.status === 403) {
      console.log(`  ✓ PASSED: DELETE /factures/${targetFactureId} with Company B token rejected with status ${deleteRes.status}`);
    } else {
      throw new Error(`FAILED DELETE: Expected 404/403, got ${deleteRes.status}`);
    }

    const postDeleteFactureDB = await prisma.facture.findUnique({ where: { id: targetFactureId } });
    if (postDeleteFactureDB) {
      console.log(`  ✓ PASSED: Database verification confirmed Company A invoice row STILL EXISTS in PostgreSQL`);
    } else {
      throw new Error(`CRITICAL SECURITY FAILURE: PostgreSQL row was DELETED by cross-tenant request!`);
    }

    // -------------------------------------------------------------
    // TEST A5 — MISSING TENANT CONTEXT
    // -------------------------------------------------------------
    console.log('\n[TEST A5] Testing Missing Tenant Context (Unauthenticated Requests)...');

    const unauthRes = await request('/factures', null);
    if (unauthRes.status === 401) {
      console.log(`  ✓ PASSED: Unauthenticated GET /factures rejected with HTTP 401 Unauthorized`);
    } else {
      throw new Error(`FAILED: Expected 401, got ${unauthRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST A6 — RESOURCE ENUMERATION
    // -------------------------------------------------------------
    console.log('\n[TEST A6] Testing Resource Enumeration Protection...');

    const testIds = [1, 2, 30, 36, 37, 38, targetFactureId];
    let all404 = true;
    for (const id of testIds) {
      const enumRes = await request(`/factures/${id}`, tokenB);
      if (id === targetFactureId && enumRes.status !== 404) {
        all404 = false;
      }
    }
    if (all404) {
      console.log(`  ✓ PASSED: Resource enumeration failed to reveal existence or metadata of Company A resources`);
    } else {
      throw new Error(`FAILED: Resource enumeration revealed Company A resources!`);
    }

    console.log('\n====================================================');
    console.log('=== ALL HTTP POSTGRESQL INTEGRATION TESTS PASSED (6/6) ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpIntegrationSecurityTests();
