import { PrismaClient, Prisma, VoyageStatut, ModeFacturation } from '@prisma/client';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { PrismaService } from './prisma/prisma.service';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';

/**
 * TRANSiVO — Phase 4.10: PostgreSQL Integration Tests for Phase 4.8 Modifications
 *
 * Validates against real local PostgreSQL:
 *   SCENARIO A — RISK-LATENT-DF-01: DettesFournisseursService.create()
 *     A1. Legitimate creation: fournisseur and dette belong to same companyId.
 *     A2. Cross-tenant rejection: supplier belongs to B, caller uses companyId A.
 *     A3. Invalid companyId (undefined, null, 0, -1, NaN, float, string) => UnauthorizedException before any DB query (fail-closed, 0 queries).
 *     A4. No implicit fallback to fournisseur.companyId.
 *     A5. Stored record is strictly bound to the explicitly provided companyId (tenant isolation on findOne).
 *
 *   SCENARIO B — RISK-LATENT-FAC-01: FacturesService.createInvoiceInTx()
 *     B1. Legitimate invoice creation in real transaction: voyage belongs to A, companyId = A.
 *     B2. Cross-tenant rejection: voyage belongs to B, companyId = A (no invoice created).
 *     B3. Invalid companyId (0, undefined, null, -5, NaN, float, string) => UnauthorizedException before any DB query (fail-closed, 0 queries).
 *     B4. No fallback to voyage.companyId when companyId is invalid/0.
 *     B5. Real transaction rollback confirmed in PostgreSQL: uncommitted operations are reverted when createInvoiceInTx fails mid-tx.
 *
 *   SCENARIO C — Cleanup:
 *     - All records created with a unique timestamp-based tag.
 *     - Cleanup runs in `finally`, even on failure.
 *     - Verification that exactly 0 test records remain.
 *     - No pre-existing data is touched.
 *
 * Database: Local Docker PostgreSQL on localhost:5439
 */

async function cleanupCompany(prisma: PrismaClient, companyId: number): Promise<void> {
  if (!companyId) return;
  try {
    // Delete in FK-safe reverse dependency order
    await prisma.paiementClient.deleteMany({ where: { companyId } });
    await prisma.creanceClient.deleteMany({ where: { companyId } });
    await prisma.facture.deleteMany({ where: { companyId } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId } });
    await prisma.voyage.deleteMany({ where: { companyId } });
    await prisma.paiementFournisseur.deleteMany({
      where: { detteFournisseur: { companyId } },
    });
    await prisma.detteFournisseur.deleteMany({ where: { companyId } });
    await prisma.detteFournisseurSequence.deleteMany({ where: { companyId } });
    await prisma.fournisseur.deleteMany({ where: { companyId } });
    await prisma.companySettings.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  } catch (err: any) {
    console.warn(`  [CLEANUP WARNING] company ${companyId}: ${err.message}`);
  }
}

async function runPhase410Integration() {
  console.log('========================================================================');
  console.log('=== TRANSiVO — PHASE 4.10 POSTGRESQL INTEGRATION TEST SUITE          ===');
  console.log('=== Targets: RISK-LATENT-DF-01 & RISK-LATENT-FAC-01 (Phase 4.8)     ===');
  console.log('========================================================================\n');

  const RUN_TAG = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const prisma = new PrismaClient();
  let prismaQueryCount = 0;

  // Intercept every Prisma query to verify fail-closed (0 queries) assertions
  prisma.$use(async (params, next) => {
    prismaQueryCount++;
    return next(params);
  });

  const prismaService = prisma as unknown as PrismaService;

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
    passed++;
    console.log(`  ✓ PASSED: ${message}`);
  }

  let companyAId = 0;
  let companyBId = 0;

  // IDs of all records created by this runner (for cleanup verification)
  const createdDetteIds: number[] = [];
  const createdVoyageIds: number[] = [];
  const createdFactureIds: number[] = [];
  const createdFournisseurIds: number[] = [];

  try {
    // -----------------------------------------------------------------------
    // SAFETY & CONNECTION CHECK: Verify strictly local PostgreSQL
    // -----------------------------------------------------------------------
    console.log('[SAFETY CHECK] Verifying PostgreSQL environment...');
    const dbInfo: any = await prisma.$queryRawUnsafe(
      'SELECT current_database(), current_user, inet_server_addr() as server_ip, inet_server_port() as server_port',
    );
    const dbName = dbInfo[0]?.current_database;
    const dbUser = dbInfo[0]?.current_user;
    const serverPort = dbInfo[0]?.server_port;
    console.log(`  Connected to DB "${dbName}" as user "${dbUser}" on port ${serverPort}`);

    if (dbName !== 'transport_db' && dbName !== 'transport_test') {
      throw new Error(`ABORT: Refusing to run tests against non-local/unexpected database "${dbName}"!`);
    }

    // Create two isolated test companies with unique names
    const companyA = await prisma.company.create({
      data: { nom: `TEST_P410_COMPANY_A_${RUN_TAG}`, statut: 'ACTIF' },
    });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({
      data: { nom: `TEST_P410_COMPANY_B_${RUN_TAG}`, statut: 'ACTIF' },
    });
    companyBId = companyB.id;

    console.log(`  Created Company A (id: ${companyAId}) and Company B (id: ${companyBId})\n`);

    // Instantiate services using real PostgreSQL-backed PrismaService
    const dfService = new DettesFournisseursService(prismaService);
    const creancesService = new CreancesClientsService(prismaService);
    const facturesService = new FacturesService(prismaService, creancesService);

    // =========================================================================
    // SCENARIO A — RISK-LATENT-DF-01: DettesFournisseursService.create()
    // =========================================================================
    console.log('[SCENARIO A] RISK-LATENT-DF-01: DettesFournisseursService.create() in PostgreSQL\n');

    // Create one supplier per tenant with explicit companyId
    const fournA = await prisma.fournisseur.create({
      data: {
        companyId: companyAId,
        nomFournisseur: `FOURNISSEUR_P410_A_${RUN_TAG}`,
        telephone: '0522001001',
      },
    });
    createdFournisseurIds.push(fournA.id);

    const fournB = await prisma.fournisseur.create({
      data: {
        companyId: companyBId,
        nomFournisseur: `FOURNISSEUR_P410_B_${RUN_TAG}`,
        telephone: '0522002002',
      },
    });
    createdFournisseurIds.push(fournB.id);

    // -------------------------------------------------------------------------
    // A1: Legitimate creation — fournisseur and dette belong to Company A
    // -------------------------------------------------------------------------
    console.log('[A1] Legitimate creation: companyId=A, fournisseur belongs to A...');
    const detteA = await dfService.create(companyAId, {
      idFournisseur: fournA.id,
      montantDu: 6000,
      delaiPaiementJours: 30,
      referenceFactureFournisseur: `P410-A1-REF-${RUN_TAG}`,
    });
    createdDetteIds.push(detteA.id);

    assert(detteA.id > 0, 'A1: Debt created successfully with valid id in PostgreSQL');
    assert(detteA.montantDu === 6000, `A1: montantDu is 6000 (got ${detteA.montantDu})`);
    assert(
      detteA.idFournisseur === fournA.id,
      `A1: idFournisseur is ${fournA.id} (Company A supplier)`,
    );

    // Verify in raw DB that companyId is strictly Company A
    const rawDetteA = await prisma.detteFournisseur.findUnique({ where: { id: detteA.id } });
    assert(
      rawDetteA?.companyId === companyAId,
      `A1: Stored companyId is strictly ${companyAId} in PostgreSQL (no fallback applied)`,
    );
    assert(
      rawDetteA?.idFournisseur === fournA.id,
      'A1: Stored fournisseur FK is Company A supplier',
    );

    // -------------------------------------------------------------------------
    // A2: Cross-tenant rejection — fournisseur belongs to B, caller is Company A
    // -------------------------------------------------------------------------
    console.log('\n[A2] Cross-tenant rejection: fournisseur belongs to B, companyId=A...');
    let crossTenantDetteCreated: any = null;
    try {
      crossTenantDetteCreated = await dfService.create(companyAId, {
        idFournisseur: fournB.id, // Supplier belongs to Company B
        montantDu: 9999,
        referenceFactureFournisseur: `P410-A2-FORBIDDEN-${RUN_TAG}`,
      });
      assert(false, 'A2: Should have rejected cross-tenant supplier with NotFoundException');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        `A2: Cross-tenant create() rejected with NotFoundException`,
      );
      assert(
        err.message.includes('introuvable'),
        'A2: Error message is generic (no cross-tenant data leakage)',
      );
    }
    // Confirm no debt was created
    const crossTenantDebt = await prisma.detteFournisseur.findFirst({
      where: {
        companyId: companyAId,
        referenceFactureFournisseur: { contains: 'P410-A2-FORBIDDEN' },
      },
    });
    assert(crossTenantDetteCreated === null, 'A2: create() returned null — no debt object returned');
    assert(crossTenantDebt === null, 'A2: No orphan debt written to PostgreSQL for Company A');

    // -------------------------------------------------------------------------
    // A3: Invalid companyId — fail-closed before ANY Prisma query
    // -------------------------------------------------------------------------
    console.log('\n[A3] Invalid companyId — fail-closed before any DB query...');
    const invalidCids = [
      { val: undefined as any, label: 'undefined' },
      { val: null as any, label: 'null' },
      { val: 0, label: '0' },
      { val: -1, label: '-1' },
      { val: NaN, label: 'NaN' },
      { val: 3.14, label: 'float 3.14' },
      { val: '101' as any, label: 'string "101"' },
    ];

    const detteCountBefore = await prisma.detteFournisseur.count({
      where: { companyId: companyAId },
    });

    for (const { val, label } of invalidCids) {
      const qCountBefore = prismaQueryCount;
      try {
        await dfService.create(val, {
          idFournisseur: fournA.id,
          montantDu: 1000,
        });
        assert(false, `A3: Should have rejected companyId=${label}`);
      } catch (err: any) {
        assert(
          err instanceof UnauthorizedException,
          `A3: companyId=${label} rejected with UnauthorizedException`,
        );
      }
      assert(
        prismaQueryCount === qCountBefore,
        `A3: ZERO Prisma queries dispatched for companyId=${label} (fail-closed before DB access)`,
      );
    }

    const detteCountAfter = await prisma.detteFournisseur.count({
      where: { companyId: companyAId },
    });
    assert(
      detteCountAfter === detteCountBefore,
      `A3: Zero debts written to PostgreSQL for invalid companyIds (before=${detteCountBefore}, after=${detteCountAfter})`,
    );

    // -------------------------------------------------------------------------
    // A4: No implicit fallback to fournisseur.companyId
    // -------------------------------------------------------------------------
    console.log('\n[A4] No implicit fallback to fournisseur.companyId...');
    const detteA2 = await dfService.create(companyAId, {
      idFournisseur: fournA.id,
      montantDu: 2500,
      referenceFactureFournisseur: `P410-A4-REF-${RUN_TAG}`,
    });
    createdDetteIds.push(detteA2.id);
    const rawDetteA2 = await prisma.detteFournisseur.findUnique({ where: { id: detteA2.id } });
    assert(
      rawDetteA2?.companyId === companyAId,
      `A4: companyId in DB is ${companyAId} (explicitly passed tenant, no fallback applied)`,
    );
    assert(
      rawDetteA2?.idFournisseur === fournA.id,
      'A4: Fournisseur FK remains Company A supplier',
    );

    // -------------------------------------------------------------------------
    // A5: Stored records are strictly bound to the explicitly provided companyId
    // -------------------------------------------------------------------------
    console.log('\n[A5] Verify Company B cannot see Company A debts via findOne...');
    try {
      await dfService.findOne(detteA.id, companyBId);
      assert(false, 'A5: Company B should not see Company A debt');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        'A5: Company B findOne on Company A debt returns NotFoundException',
      );
    }
    const foundOwn = await dfService.findOne(detteA.id, companyAId);
    assert(foundOwn.id === detteA.id, 'A5: Company A can find its own debt by id');

    console.log('\n✅ SCENARIO A — All RISK-LATENT-DF-01 checks passed in PostgreSQL\n');

    // =========================================================================
    // SCENARIO B — RISK-LATENT-FAC-01: FacturesService.createInvoiceInTx()
    // =========================================================================
    console.log('[SCENARIO B] RISK-LATENT-FAC-01: FacturesService.createInvoiceInTx() in PostgreSQL\n');

    // Create one voyage per tenant with mandatory fields
    const voyageA = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        nomClient: `Client Tenant A (${RUN_TAG})`,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        montantVoyage: new Prisma.Decimal('8000.00'),
        devise: 'MAD',
        statut: VoyageStatut.LIVRE,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });
    createdVoyageIds.push(voyageA.idVoyage);

    const voyageB = await prisma.voyage.create({
      data: {
        companyId: companyBId,
        nomClient: `Client Tenant B (${RUN_TAG})`,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Agadir',
        montantVoyage: new Prisma.Decimal('12000.00'),
        devise: 'MAD',
        statut: VoyageStatut.LIVRE,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });
    createdVoyageIds.push(voyageB.idVoyage);

    // -------------------------------------------------------------------------
    // B1: Legitimate invoice creation in real transaction — voyage A, companyId A
    // -------------------------------------------------------------------------
    console.log('[B1] Legitimate invoice creation: voyage belongs to A, companyId=A...');
    const factureA = await prisma.$transaction(async (tx) => {
      return facturesService.createInvoiceInTx(tx as any, {
        idVoyage: voyageA.idVoyage,
        companyId: companyAId,
      });
    });
    createdFactureIds.push(factureA.id);

    assert(factureA.id > 0, 'B1: Invoice created with valid id in PostgreSQL transaction');
    assert(Number(factureA.sousTotal) === 8000, `B1: sousTotal is 8000 (got ${factureA.sousTotal})`);
    assert(factureA.nomClient === `Client Tenant A (${RUN_TAG})`, 'B1: nomClient matches voyage A client');

    // Verify in raw DB
    const rawFactureA = await prisma.facture.findUnique({ where: { id: factureA.id } });
    assert(
      rawFactureA?.companyId === companyAId,
      `B1: Stored companyId is ${companyAId} in PostgreSQL`,
    );
    assert(
      rawFactureA?.idVoyage === voyageA.idVoyage,
      `B1: Stored idVoyage is ${voyageA.idVoyage}`,
    );

    // Verify CreanceClient was created with correct companyId
    const creanceA = await prisma.creanceClient.findFirst({
      where: { companyId: companyAId, factureId: factureA.id },
    });
    assert(
      creanceA !== null,
      'B1: CreanceClient auto-created with correct companyId in PostgreSQL',
    );
    assert(
      creanceA?.companyId === companyAId,
      `B1: CreanceClient.companyId is ${companyAId}`,
    );

    // -------------------------------------------------------------------------
    // B2: Cross-tenant rejection — voyage B, companyId A
    // -------------------------------------------------------------------------
    console.log('\n[B2] Cross-tenant rejection: voyage belongs to B, companyId=A...');
    const factureCountBefore = await prisma.facture.count({ where: { companyId: companyAId } });

    let crossFactureCreated: any = null;
    try {
      crossFactureCreated = await prisma.$transaction(async (tx) => {
        return facturesService.createInvoiceInTx(tx as any, {
          idVoyage: voyageB.idVoyage, // Voyage belongs to Company B
          companyId: companyAId,      // Caller claims Company A
        });
      });
      assert(false, 'B2: Should have rejected cross-tenant voyage');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException || err instanceof ForbiddenException,
        `B2: Cross-tenant createInvoiceInTx rejected with NotFoundException/ForbiddenException`,
      );
    }

    const factureCountAfter = await prisma.facture.count({ where: { companyId: companyAId } });
    assert(crossFactureCreated === null, 'B2: No invoice object returned by cross-tenant call');
    assert(
      factureCountAfter === factureCountBefore,
      `B2: Transaction rolled back — no new facture in PostgreSQL for Company A (before=${factureCountBefore}, after=${factureCountAfter})`,
    );

    // Also confirm Company B's voyage was not accidentally invoiced
    const orphanFactureOnB = await prisma.facture.findFirst({
      where: { idVoyage: voyageB.idVoyage, companyId: companyAId },
    });
    assert(
      orphanFactureOnB === null,
      'B2: No orphan facture linking Voyage B to Company A in PostgreSQL',
    );

    // -------------------------------------------------------------------------
    // B3: Invalid companyId — fail-closed before ANY Prisma write/query
    // -------------------------------------------------------------------------
    console.log('\n[B3] Invalid companyId — fail-closed before DB access...');
    const factureCountB3Before = await prisma.facture.count({
      where: { companyId: companyAId },
    });

    const invalidCidsB = [0, undefined as any, null as any, -5, NaN, 3.14, '101' as any];
    for (const inv of invalidCidsB) {
      const qCountBefore = prismaQueryCount;
      try {
        await prisma.$transaction(async (tx) => {
          return facturesService.createInvoiceInTx(tx as any, {
            idVoyage: voyageA.idVoyage,
            companyId: inv,
          });
        });
        assert(false, `B3: Should have rejected companyId=${inv}`);
      } catch (err: any) {
        assert(
          err instanceof UnauthorizedException,
          `B3: companyId=${inv} rejected with UnauthorizedException`,
        );
      }
      assert(
        prismaQueryCount === qCountBefore,
        `B3: ZERO Prisma queries dispatched for companyId=${inv} inside createInvoiceInTx`,
      );
    }

    const factureCountB3After = await prisma.facture.count({
      where: { companyId: companyAId },
    });
    assert(
      factureCountB3After === factureCountB3Before,
      `B3: Zero factures written for invalid companyIds (before=${factureCountB3Before}, after=${factureCountB3After})`,
    );

    // -------------------------------------------------------------------------
    // B4: No fallback to voyage.companyId when companyId is invalid
    // -------------------------------------------------------------------------
    console.log('\n[B4] No fallback to voyage.companyId when companyId=0...');
    const totalFacturesBefore = await prisma.facture.count();
    try {
      await prisma.$transaction(async (tx) => {
        return facturesService.createInvoiceInTx(tx as any, {
          idVoyage: voyageA.idVoyage,
          companyId: 0 as any,
        });
      });
      assert(false, 'B4: companyId=0 should throw UnauthorizedException');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException,
        'B4: companyId=0 strictly rejected with UnauthorizedException (no fallback to voyage.companyId)',
      );
    }
    const totalFacturesAfter = await prisma.facture.count();
    assert(
      totalFacturesAfter === totalFacturesBefore,
      `B4: Zero factures written to any company for companyId=0 (no fallback created one)`,
    );

    // -------------------------------------------------------------------------
    // B5: Real transaction rollback confirmed in PostgreSQL
    // -------------------------------------------------------------------------
    console.log('\n[B5] Real transaction rollback — atomicity verified when createInvoiceInTx fails mid-tx...');
    const rollbackMarkerClient = `P410_ROLLBACK_TEST_${RUN_TAG}`;
    let txVoyageId: number | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Write an operation to DB within this transaction
        const innerVoyage = await tx.voyage.create({
          data: {
            companyId: companyAId,
            nomClient: rollbackMarkerClient,
            lieuChargement: 'Casablanca',
            lieuDechargement: 'Marrakech',
            montantVoyage: new Prisma.Decimal('5500.00'),
            devise: 'MAD',
            statut: VoyageStatut.LIVRE,
            modeFacturation: ModeFacturation.AVEC_FACTURE,
          },
        });
        txVoyageId = innerVoyage.idVoyage;

        // Step 2: Invoke createInvoiceInTx with a foreign voyage (voyageB belongs to Company B)
        // This will throw NotFoundException inside the transaction block
        await facturesService.createInvoiceInTx(tx as any, {
          idVoyage: voyageB.idVoyage, // Foreign voyage
          companyId: companyAId,
        });
      });
      assert(false, 'B5: Transaction should have aborted');
    } catch (err: any) {
      assert(
        err instanceof NotFoundException || err instanceof ForbiddenException,
        `B5: Transaction aborted with NotFoundException/ForbiddenException (${err.message})`,
      );
    }

    // Step 3: Verify PostgreSQL fully reverted the innerVoyage write
    const revertedVoyage = await prisma.voyage.findFirst({
      where: { nomClient: rollbackMarkerClient },
    });
    assert(
      revertedVoyage === null,
      'B5: Inner voyage created before error was 100% rolled back by PostgreSQL (atomicity guaranteed)',
    );

    console.log('\n✅ SCENARIO B — All RISK-LATENT-FAC-01 checks passed in PostgreSQL\n');

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('========================================================================');
    console.log(`=== ALL ${passed}/${total} PHASE 4.10 POSTGRESQL INTEGRATION TESTS PASSED! ===`);
    console.log('=== RISK-LATENT-DF-01 (DettesFournisseursService.create): VALIDATED   ===');
    console.log('=== RISK-LATENT-FAC-01 (FacturesService.createInvoiceInTx): VALIDATED ===');
    console.log('========================================================================');
  } catch (err: any) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err?.message || err);
    throw err;
  } finally {
    // =========================================================================
    // SCENARIO C — CLEANUP & VERIFICATION
    // =========================================================================
    console.log('\n[SCENARIO C — CLEANUP] Cleaning up Phase 4.10 test records...');
    if (companyAId) await cleanupCompany(prisma, companyAId);
    if (companyBId) await cleanupCompany(prisma, companyBId);

    // Verify cleanup: 0 test records remain
    const remainingDettes = await prisma.detteFournisseur.count({
      where: { id: { in: createdDetteIds } },
    });
    const remainingVoyages = await prisma.voyage.count({
      where: { idVoyage: { in: createdVoyageIds } },
    });
    const remainingFactures = await prisma.facture.count({
      where: { id: { in: createdFactureIds } },
    });
    const remainingFournisseurs = await prisma.fournisseur.count({
      where: { id: { in: createdFournisseurIds } },
    });
    const remainingCompanyA = companyAId
      ? await prisma.company.findUnique({ where: { id: companyAId } })
      : null;
    const remainingCompanyB = companyBId
      ? await prisma.company.findUnique({ where: { id: companyBId } })
      : null;

    if (
      remainingDettes === 0 &&
      remainingVoyages === 0 &&
      remainingFactures === 0 &&
      remainingFournisseurs === 0 &&
      !remainingCompanyA &&
      !remainingCompanyB
    ) {
      console.log('  ✓ Verification: Exactly 0 test records remain in PostgreSQL.');
      console.log(`    - Dettes remaining: ${remainingDettes}`);
      console.log(`    - Voyages remaining: ${remainingVoyages}`);
      console.log(`    - Factures remaining: ${remainingFactures}`);
      console.log(`    - Fournisseurs remaining: ${remainingFournisseurs}`);
      console.log(`    - Companies remaining: 0`);
      console.log('  ✓ Pre-existing database records untouched.');
    } else {
      console.warn('  ⚠ Cleanup incomplete! Remaining items:', {
        remainingDettes,
        remainingVoyages,
        remainingFactures,
        remainingFournisseurs,
        remainingCompanyA: !!remainingCompanyA,
        remainingCompanyB: !!remainingCompanyB,
      });
    }

    await prisma.$disconnect();
    console.log('  Phase 4.10 isolated cleanup completed.\n');
  }
}

runPhase410Integration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
