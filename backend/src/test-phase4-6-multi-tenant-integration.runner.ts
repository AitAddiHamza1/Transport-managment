import { PrismaClient, PaiementMethode, Prisma } from '@prisma/client';
import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { PrismaService } from './prisma/prisma.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

/**
 * TRANSiVO — Phase 4.6: Real PostgreSQL Multi-Tenant Integration Test Runner
 * 
 * Targets local PostgreSQL (localhost:5439) with STRICT ISOLATION:
 * - Creates 2 dedicated, isolated test companies: `TEST_COMPANY_P46_A` and `TEST_COMPANY_P46_B`.
 * - Tests the 4 remediated vulnerabilities directly against real PostgreSQL:
 *   1. VULN-GP-01: Jointure SQL client payment / factures with identical invoice numbers across tenants.
 *   2. VULN-DASH-01: getRecentActivity SQL union query with identical invoice numbers.
 *   3. VULN-DV-01: depenses-vehicules findAll with exact and partial immatriculation filters.
 *   4. SUSP-DF-01: findOne, update, remove on dettes-fournisseurs enforcing companyId.
 *   5. Financial aggregations and statistics per company.
 *   6. Verification that mutations on Company A cannot affect Company B.
 * - Cleanup: STRICTLY scoped to the records created by this runner.
 */

async function runPostgresMultiTenantIntegration() {
  console.log('========================================================================');
  console.log('=== TRANSiVO — PHASE 4.6 REAL POSTGRESQL INTEGRATION TEST SUITE       ===');
  console.log('========================================================================\n');

  const prisma = new PrismaClient();
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

  let companyAId: number = 0;
  let companyBId: number = 0;

  // Track created entity IDs for strict, isolated cleanup
  const createdIds = {
    companies: [] as number[],
    users: [] as number[],
    factures: [] as number[],
    paiementsClients: [] as number[],
    vehicules: [] as string[],
    depensesVehicules: [] as number[],
    fournisseurs: [] as number[],
    dettesFournisseurs: [] as number[],
  };

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create two isolated test companies
    // ------------------------------------------------------------------------
    console.log('[SETUP] Connecting to PostgreSQL and creating isolated test tenants...');
    const dbInfo: any = await prisma.$queryRawUnsafe('SELECT current_database(), current_user, version()');
    console.log(`  Connected to DB "${dbInfo[0].current_database}" as user "${dbInfo[0].current_user}"`);

    // Clean any previous runs with these specific names
    const existingOldA = await prisma.company.findFirst({ where: { nom: 'TEST_P46_COMPANY_A' } });
    const existingOldB = await prisma.company.findFirst({ where: { nom: 'TEST_P46_COMPANY_B' } });
    if (existingOldA) {
      await cleanupCompany(prisma, existingOldA.id);
    }
    if (existingOldB) {
      await cleanupCompany(prisma, existingOldB.id);
    }

    const companyA = await prisma.company.create({
      data: {
        nom: 'TEST_P46_COMPANY_A',
        statut: 'ACTIF',
      },
    });
    companyAId = companyA.id;
    createdIds.companies.push(companyAId);

    const companyB = await prisma.company.create({
      data: {
        nom: 'TEST_P46_COMPANY_B',
        statut: 'ACTIF',
      },
    });
    companyBId = companyB.id;
    createdIds.companies.push(companyBId);

    console.log(`  Created Company A (id: ${companyAId}) and Company B (id: ${companyBId})\n`);

    // Instantiate services
    const gpService = new GestionPaiementsService(prismaService);
    const dashService = new DashboardService(prismaService);
    const dvService = new DepensesVehiculesService(prismaService, {} as any);
    const dfService = new DettesFournisseursService(prismaService);

    // ------------------------------------------------------------------------
    // SCENARIO 1 (VULN-GP-01): Identical invoice number across tenants
    // ------------------------------------------------------------------------
    console.log('[SCENARIO 1] VULN-GP-01: Identical Invoice Number in Real PostgreSQL...');
    const duplicateInvoiceNumber = `FAC-P46-DUP-${Date.now()}`;

    // Company A: Facture + PaiementClient
    const factureA = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: duplicateInvoiceNumber,
        nomClient: 'Client Société A (CONFIDENTIEL)',
        sousTotal: new Prisma.Decimal('5000.00'),
        tauxTva: new Prisma.Decimal('20.00'),
      },
    });
    createdIds.factures.push(factureA.id);

    const pcA = await prisma.paiementClient.create({
      data: {
        companyId: companyAId,
        factureId: factureA.id,
        numeroFacture: duplicateInvoiceNumber,
        nomClient: 'Client Société A (CONFIDENTIEL)',
        montantRecu: new Prisma.Decimal('5000.00'),
        methodePaiement: PaiementMethode.VIREMENT,
        datePaiement: new Date('2026-06-01'),
      },
    });
    createdIds.paiementsClients.push(pcA.id);

    // Company B: Facture + PaiementClient with the SAME invoice number
    const factureB = await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: duplicateInvoiceNumber,
        nomClient: 'Client Société B (CONFIDENTIEL)',
        sousTotal: new Prisma.Decimal('9000.00'),
        tauxTva: new Prisma.Decimal('20.00'),
      },
    });
    createdIds.factures.push(factureB.id);

    const pcB = await prisma.paiementClient.create({
      data: {
        companyId: companyBId,
        factureId: factureB.id,
        numeroFacture: duplicateInvoiceNumber,
        nomClient: 'Client Société B (CONFIDENTIEL)',
        montantRecu: new Prisma.Decimal('9000.00'),
        methodePaiement: PaiementMethode.CHEQUE,
        datePaiement: new Date('2026-06-02'),
      },
    });
    createdIds.paiementsClients.push(pcB.id);

    // Query GestionPaiementsService for Company A
    const gpResultA = await gpService.findAll(companyAId, {
      sourceType: 'CLIENT_PAYMENT' as any,
    });
    assert(gpResultA.data.length === 1, 'Company A receives exactly 1 payment record from real PostgreSQL');
    assert(gpResultA.data[0].sourceId === pcA.id, 'Payment returned is Company A payment');
    assert(gpResultA.data[0].party.name === 'Client Société A (CONFIDENTIEL)', 'Client name is Société A');
    assert(gpResultA.data[0].amount === '5000.00', 'Amount is 5000.00');
    assert(
      !gpResultA.data.some((p) => p.sourceId === pcB.id || p.party.name.includes('Société B')),
      'Company A query does NOT leak Company B payment or client name',
    );

    // Query GestionPaiementsService for Company B
    const gpResultB = await gpService.findAll(companyBId, {
      sourceType: 'CLIENT_PAYMENT' as any,
    });
    assert(gpResultB.data.length === 1, 'Company B receives exactly 1 payment record from real PostgreSQL');
    assert(gpResultB.data[0].sourceId === pcB.id, 'Payment returned is Company B payment');
    assert(gpResultB.data[0].party.name === 'Client Société B (CONFIDENTIEL)', 'Client name is Société B');
    assert(gpResultB.data[0].amount === '9000.00', 'Amount is 9000.00');
    assert(
      !gpResultB.data.some((p) => p.sourceId === pcA.id || p.party.name.includes('Société A')),
      'Company B query does NOT leak Company A payment or client name',
    );

    // ------------------------------------------------------------------------
    // SCENARIO 2 (VULN-DASH-01): Dashboard getRecentActivity in PostgreSQL
    // ------------------------------------------------------------------------
    console.log('\n[SCENARIO 2] VULN-DASH-01: Dashboard Recent Activities in Real PostgreSQL...');

    const dashActsA = await dashService.getRecentActivity(
      companyAId,
      {
        preset: 'PERSONNALISE' as any,
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
      },
      { factures: true, paiements_clients: true },
      false,
    );

    const clientPayActsA = dashActsA.filter((a) => a.type === 'CLIENT_PAYMENT_RECEIVED');
    assert(clientPayActsA.length === 1, 'Dashboard A receives exactly 1 client payment activity');
    assert(clientPayActsA[0].activityId === `CLIENT_PAYMENT:${pcA.id}`, 'Activity corresponds to payment A');
    assert(clientPayActsA[0].description.includes('Client Société A'), 'Activity describes Client Société A');
    assert(
      !clientPayActsA.some((a) => a.activityId === `CLIENT_PAYMENT:${pcB.id}` || a.description.includes('Société B')),
      'Dashboard A receives ZERO events or descriptions from Company B',
    );

    const dashActsB = await dashService.getRecentActivity(
      companyBId,
      {
        preset: 'PERSONNALISE' as any,
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
      },
      { factures: true, paiements_clients: true },
      false,
    );

    const clientPayActsB = dashActsB.filter((a) => a.type === 'CLIENT_PAYMENT_RECEIVED');
    assert(clientPayActsB.length === 1, 'Dashboard B receives exactly 1 client payment activity');
    assert(clientPayActsB[0].activityId === `CLIENT_PAYMENT:${pcB.id}`, 'Activity corresponds to payment B');
    assert(clientPayActsB[0].description.includes('Client Société B'), 'Activity describes Client Société B');
    assert(
      !clientPayActsB.some((a) => a.activityId === `CLIENT_PAYMENT:${pcA.id}` || a.description.includes('Société A')),
      'Dashboard B receives ZERO events or descriptions from Company A',
    );

    // ------------------------------------------------------------------------
    // SCENARIO 3 (VULN-DV-01): Vehicle Expenses with Shared Prefix in PostgreSQL
    // ------------------------------------------------------------------------
    console.log('\n[SCENARIO 3] VULN-DV-01: Vehicle Expenses Isolation in Real PostgreSQL...');
    const immatA = `77777-A-50`;
    const immatB = `77777-B-50`;

    await prisma.vehicule.create({
      data: {
        companyId: companyAId,
        immatriculation: immatA,
        marque: 'Renault Trucks',
        modele: 'T-High',
      },
    });
    createdIds.vehicules.push(immatA);

    await prisma.vehicule.create({
      data: {
        companyId: companyBId,
        immatriculation: immatB,
        marque: 'DAF',
        modele: 'XF',
      },
    });
    createdIds.vehicules.push(immatB);

    const depA = await prisma.depenseVehicule.create({
      data: {
        immatriculation: immatA,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        montant: new Prisma.Decimal('1800.00'),
        dateDepense: new Date('2026-07-01'),
        description: 'Révision 100k Renault Company A',
      },
    });
    createdIds.depensesVehicules.push(depA.idDepense);

    const depB = await prisma.depenseVehicule.create({
      data: {
        immatriculation: immatB,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        montant: new Prisma.Decimal('3200.00'),
        dateDepense: new Date('2026-07-02'),
        description: 'Freinage DAF Company B',
      },
    });
    createdIds.depensesVehicules.push(depB.idDepense);

    // 3.1 Query without filter
    const dvAllA = await dvService.findAll(companyAId, {});
    assert(dvAllA.data.length === 1 && dvAllA.data[0].idDepense === depA.idDepense, 'Company A gets its own vehicle expense');
    assert(!dvAllA.data.some((d) => d.idDepense === depB.idDepense), 'Company A does NOT receive Company B expense');

    // 3.2 Query with shared partial immatriculation '77777'
    const dvFilteredA = await dvService.findAll(companyAId, { immatriculation: '77777' });
    assert(dvFilteredA.data.length === 1 && dvFilteredA.data[0].idDepense === depA.idDepense, 'Searching "77777" in Company A returns expense A');
    assert(!dvFilteredA.data.some((d) => d.idDepense === depB.idDepense), 'Searching "77777" in Company A does NOT leak expense B');

    // 3.3 Probe targeting Company B vehicle directly
    const dvProbeA = await dvService.findAll(companyAId, { immatriculation: immatB });
    assert(dvProbeA.data.length === 0, 'Company A querying Company B immatriculation receives 0 records');
    assert(dvProbeA.meta.total === 0, 'Meta total is 0');

    // ------------------------------------------------------------------------
    // SCENARIO 4 (SUSP-DF-01): Dettes Fournisseurs Hardening in PostgreSQL
    // ------------------------------------------------------------------------
    console.log('\n[SCENARIO 4] SUSP-DF-01: Supplier Debts Hardening in Real PostgreSQL...');

    const fournA = await prisma.fournisseur.create({
      data: {
        companyId: companyAId,
        nomFournisseur: 'Fournisseur Pièces A',
        telephone: '0522111111',
      },
    });
    createdIds.fournisseurs.push(fournA.id);

    const fournB = await prisma.fournisseur.create({
      data: {
        companyId: companyBId,
        nomFournisseur: 'Fournisseur Pièces B',
        telephone: '0522222222',
      },
    });
    createdIds.fournisseurs.push(fournB.id);

    const detteA = await dfService.create(companyAId, {
      idFournisseur: fournA.id,
      montantDu: 4500.0,
      delaiPaiementJours: 30,
      referenceFactureFournisseur: 'REF-DF-A-01',
    });
    createdIds.dettesFournisseurs.push(detteA.id);

    const detteB = await dfService.create(companyBId, {
      idFournisseur: fournB.id,
      montantDu: 8500.0,
      delaiPaiementJours: 30,
      referenceFactureFournisseur: 'REF-DF-B-01',
    });
    createdIds.dettesFournisseurs.push(detteB.id);

    // 4.1 findOne authorization
    const foundA = await dfService.findOne(detteA.id, companyAId);
    assert(foundA.id === detteA.id, 'Company A can find its own debt');

    // 4.2 findOne cross-tenant rejection
    try {
      await dfService.findOne(detteB.id, companyAId);
      assert(false, 'Company A should not find Company B debt');
    } catch (err: any) {
      assert(err instanceof NotFoundException, 'Cross-tenant findOne returns 404 in PostgreSQL');
    }

    // 4.3 update cross-tenant rejection
    try {
      await dfService.update(detteB.id, companyAId, { remarques: 'Tentative de hack' });
      assert(false, 'Company A should not update Company B debt');
    } catch (err: any) {
      assert(err instanceof NotFoundException, 'Cross-tenant update returns 404 in PostgreSQL');
    }

    // 4.4 remove cross-tenant rejection
    try {
      await dfService.remove(detteB.id, companyAId);
      assert(false, 'Company A should not delete Company B debt');
    } catch (err: any) {
      assert(err instanceof NotFoundException, 'Cross-tenant remove returns 404 in PostgreSQL');
    }

    // Confirm Debt B in PostgreSQL is untouched
    const checkDebtB = await prisma.detteFournisseur.findUnique({ where: { id: detteB.id } });
    assert(checkDebtB?.supprimeLe === null, 'Debt B supprimeLe remains null');
    assert(checkDebtB?.remarques !== 'Tentative de hack', 'Debt B remarques unchanged');

    // 4.5 update authorized for owner tenant
    const updatedA = await dfService.update(detteA.id, companyAId, { remarques: 'Remarque autorisee' });
    assert(updatedA.remarques === 'Remarque autorisee', 'Company A successfully updated its own debt');

    // 4.6 Runtime companyId validation
    try {
      await dfService.findOne(detteA.id, 0);
      assert(false, 'companyId=0 should be rejected');
    } catch (err: any) {
      assert(err instanceof UnauthorizedException, 'companyId=0 rejected with UnauthorizedException');
    }

    // ------------------------------------------------------------------------
    // SCENARIO 5: Financial Statistics and Aggregations
    // ------------------------------------------------------------------------
    console.log('\n[SCENARIO 5] Financial Statistics and Aggregations in PostgreSQL...');
    const statsA = await dfService.findStats(companyAId);
    const statsB = await dfService.findStats(companyBId);
    assert(Number(statsA.totalDu) === 4500.0, `Company A totalDu is 4500.0 (got ${statsA.totalDu})`);
    assert(Number(statsB.totalDu) === 8500.0, `Company B totalDu is 8500.0 (got ${statsB.totalDu})`);

    const dvStatsA = await dvService.findStats(companyAId);
    assert(dvStatsA.totalMontant === 1800.0, `Company A vehicle expenses total is 1800.0 (got ${dvStatsA.totalMontant})`);

    console.log('\n========================================================================');
    console.log(`=== ALL ${passed}/${total} POSTGRESQL INTEGRATION TESTS PASSED!         ===`);
    console.log('========================================================================');
  } catch (err: any) {
    console.error('\n❌ POSTGRESQL INTEGRATION ERROR:', err);
    throw err;
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: STRICTLY scoped to the records created by this runner
    // ------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records strictly by ID...');
    if (companyAId) await cleanupCompany(prisma, companyAId);
    if (companyBId) await cleanupCompany(prisma, companyBId);
    await prisma.$disconnect();
    console.log('  Isolated cleanup completed successfully.');
  }
}

async function cleanupCompany(prisma: PrismaClient, companyId: number) {
  try {
    // 1. Paiements Clients
    await prisma.paiementClient.deleteMany({ where: { companyId } });
    // 2. Factures
    await prisma.facture.deleteMany({ where: { companyId } });
    // 3. Depenses Vehicules
    const vehicules = await prisma.vehicule.findMany({ where: { companyId }, select: { immatriculation: true } });
    const imms = vehicules.map((v) => v.immatriculation);
    if (imms.length > 0) {
      await prisma.depenseVehicule.deleteMany({ where: { immatriculation: { in: imms } } });
      await prisma.vehicule.deleteMany({ where: { companyId } });
    }
    // 4. Dettes & Paiements Fournisseurs
    await prisma.paiementFournisseur.deleteMany({ where: { detteFournisseur: { companyId } } });
    await prisma.detteFournisseur.deleteMany({ where: { companyId } });
    await prisma.fournisseur.deleteMany({ where: { companyId } });
    // 5. Sequences, Settings & Company
    await prisma.detteFournisseurSequence.deleteMany({ where: { companyId } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId } });
    await prisma.paiementFournisseurSequence.deleteMany({ where: { companyId } });
    await prisma.employeSequence.deleteMany({ where: { companyId } });
    await prisma.paiementEmployeSequence.deleteMany({ where: { companyId } });
    await prisma.companySettings.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  } catch (err: any) {
    console.warn(`  Warning during cleanup of company ${companyId}: ${err.message}`);
  }
}

runPostgresMultiTenantIntegration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
