import { PrismaClient, ClientStatut } from '@prisma/client';
import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { GestionPaiementsController } from './modules/gestion-paiements/gestion-paiements.controller';
import { QueryGestionPaiementsDto } from './modules/gestion-paiements/dto/query-gestion-paiements.dto';

const prisma = new PrismaClient();
const service = new GestionPaiementsService(prisma as any);
const controller = new GestionPaiementsController(service);

async function runTests() {
  console.log('=== RUNNING MULTI-TENANT STEP 3B-GESTION PAIEMENTS TEST SUITE ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passCount++;
      console.log(`[PASS] Test ${passCount + failCount}: ${testName}`);
    } else {
      failCount++;
      console.error(
        `[FAIL] Test ${passCount + failCount}: ${testName} ${detail ? `(${detail})` : ''}`,
      );
    }
  }

  const ts = Date.now();

  // 1. Setup Test Companies
  const companyA = await prisma.company.create({
    data: { nom: `GestPaiement Company A ${ts}` },
  });
  const companyB = await prisma.company.create({
    data: { nom: `GestPaiement Company B ${ts}` },
  });
  const companyEmpty = await prisma.company.create({
    data: { nom: `GestPaiement Empty Company ${ts}` },
  });

  const allPermissions = {
    gestion_paiements: true,
    paiements_clients: true,
    paiements_fournisseurs: true,
    paiements_employes: true,
    depenses_administratives: true,
  };
  const emptyQuery: QueryGestionPaiementsDto = {};

  try {
    // 2. Setup CompanySettings
    await prisma.companySettings.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: 'Enterprise GestPaiement A',
        devise: 'MAD',
      },
    });
    await prisma.companySettings.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: 'Enterprise GestPaiement B',
        devise: 'EUR',
      },
    });

    // 3. Setup Client & Invoices & Payments for A and B
    const clientA = await prisma.client.create({
      data: { companyId: companyA.id, nomEntreprise: `Client A ${ts}`, statut: ClientStatut.ACTIF },
    });
    const clientB = await prisma.client.create({
      data: { companyId: companyB.id, nomEntreprise: `Client B ${ts}`, statut: ClientStatut.ACTIF },
    });

    const facA = await prisma.facture.create({
      data: {
        companyId: companyA.id,
        numeroFacture: `FAC-GP-A-${ts}`,
        nomClient: clientA.nomEntreprise,
        sousTotal: 10000,
        tauxTva: 0,
        dateFacture: new Date(),
      },
    });
    const facB = await prisma.facture.create({
      data: {
        companyId: companyB.id,
        numeroFacture: `FAC-GP-B-${ts}`,
        nomClient: clientB.nomEntreprise,
        sousTotal: 5000,
        tauxTva: 0,
        dateFacture: new Date(),
      },
    });

    const payClientA = await prisma.paiementClient.create({
      data: {
        numeroFacture: facA.numeroFacture,
        nomClient: clientA.nomEntreprise,
        montantRecu: 6000,
        methodePaiement: 'VIREMENT',
        datePaiement: new Date(),
      },
    });
    const payClientB = await prisma.paiementClient.create({
      data: {
        numeroFacture: facB.numeroFacture,
        nomClient: clientB.nomEntreprise,
        montantRecu: 2000,
        methodePaiement: 'ESPECES',
        datePaiement: new Date(),
      },
    });

    // 4. Setup Fournisseurs, Dettes, Paiements Fournisseurs for A and B
    const fourA = await prisma.fournisseur.create({
      data: { companyId: companyA.id, nomFournisseur: `Fournisseur GP A ${ts}` },
    });
    const fourB = await prisma.fournisseur.create({
      data: { companyId: companyB.id, nomFournisseur: `Fournisseur GP B ${ts}` },
    });

    const detteA = await prisma.detteFournisseur.create({
      data: {
        companyId: companyA.id,
        numeroDette: `DETTE-GP-A-${ts}`,
        idFournisseur: fourA.id,
        nomFournisseurSnapshot: fourA.nomFournisseur,
        montantDu: 3000,
        dateDette: new Date(),
        dateEcheance: new Date(),
      },
    });
    const detteB = await prisma.detteFournisseur.create({
      data: {
        companyId: companyB.id,
        numeroDette: `DETTE-GP-B-${ts}`,
        idFournisseur: fourB.id,
        nomFournisseurSnapshot: fourB.nomFournisseur,
        montantDu: 1500,
        dateDette: new Date(),
        dateEcheance: new Date(),
      },
    });

    const payFourA = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PAY-FOUR-GP-A-${ts}`,
        idDetteFournisseur: detteA.id,
        montant: 1000,
        modePaiement: 'VIREMENT',
        datePaiement: new Date(),
      },
    });
    const payFourB = await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PAY-FOUR-GP-B-${ts}`,
        idDetteFournisseur: detteB.id,
        montant: 500,
        modePaiement: 'CHEQUE',
        datePaiement: new Date(),
      },
    });

    // 5. Setup Employes, Paiements Employes, Versements for A and B
    const empA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-GP-A-${ts}`,
        nom: 'Dupont',
        prenom: 'Jean',
        poste: 'Logistique',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
      },
    });
    const empB = await prisma.employe.create({
      data: {
        companyId: companyB.id,
        matricule: `EMP-GP-B-${ts}`,
        nom: 'Martin',
        prenom: 'Sophie',
        poste: 'Comptable',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
      },
    });

    const paiEmpA = await prisma.paiementEmploye.create({
      data: {
        numeroPaiement: `PE-GP-A-${ts}`,
        idEmploye: empA.id,
        periode: '2026-09',
        salaireReference: 4000,
        montantDu: 1200,
      },
    });
    const paiEmpB = await prisma.paiementEmploye.create({
      data: {
        numeroPaiement: `PE-GP-B-${ts}`,
        idEmploye: empB.id,
        periode: '2026-09',
        salaireReference: 4500,
        montantDu: 800,
      },
    });

    const versEmpA = await prisma.versementEmploye.create({
      data: {
        idPaiementEmploye: paiEmpA.id,
        montant: 1200,
        modePaiement: 'VIREMENT',
        dateVersement: new Date(),
      },
    });
    const versEmpB = await prisma.versementEmploye.create({
      data: {
        idPaiementEmploye: paiEmpB.id,
        montant: 800,
        modePaiement: 'VIREMENT',
        dateVersement: new Date(),
      },
    });

    // 6. Setup Depenses Administratives for A and B
    const depAdminA = await prisma.depenseAdministrative.create({
      data: {
        companyId: companyA.id,
        categorieDepense: `Fournitures Bureau ${ts}`,
        montant: 300,
        dateDepense: new Date(),
      },
    });
    const depAdminB = await prisma.depenseAdministrative.create({
      data: {
        companyId: companyB.id,
        categorieDepense: `Loyer Bureau ${ts}`,
        montant: 700,
        dateDepense: new Date(),
      },
    });

    // -------------------------------------------------------------
    // Test 1: Tenant A findAll isolation
    // -------------------------------------------------------------
    const resAllA = await controller.findAll(companyA.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      resAllA.data.length === 4 &&
        resAllA.data.every((item) =>
          [
            'CLIENT_PAYMENT',
            'SUPPLIER_PAYMENT',
            'EMPLOYEE_PAYMENT',
            'ADMINISTRATIVE_EXPENSE',
          ].includes(item.sourceType),
        ),
      'Tenant A findAll returns exactly 4 movements for Company A',
    );

    // -------------------------------------------------------------
    // Test 2: Tenant B findAll isolation
    // -------------------------------------------------------------
    const resAllB = await controller.findAll(companyB.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(resAllB.data.length === 4, 'Tenant B findAll returns exactly 4 movements for Company B');

    // -------------------------------------------------------------
    // Test 3: Client payments (IN) isolated through Facture.companyId
    // -------------------------------------------------------------
    const clientPaymentsA = resAllA.data.filter((item) => item.sourceType === 'CLIENT_PAYMENT');
    const clientPaymentsB = resAllB.data.filter((item) => item.sourceType === 'CLIENT_PAYMENT');
    assert(
      clientPaymentsA.length === 1 &&
        clientPaymentsA[0].sourceId === payClientA.id &&
        clientPaymentsB.length === 1 &&
        clientPaymentsB[0].sourceId === payClientB.id,
      'Client payments are strictly isolated per tenant via Facture.companyId',
    );

    // -------------------------------------------------------------
    // Test 4: Supplier payments (OUT) isolated through DetteFournisseur.companyId
    // -------------------------------------------------------------
    const suppPaymentsA = resAllA.data.filter((item) => item.sourceType === 'SUPPLIER_PAYMENT');
    const suppPaymentsB = resAllB.data.filter((item) => item.sourceType === 'SUPPLIER_PAYMENT');
    assert(
      suppPaymentsA.length === 1 &&
        suppPaymentsA[0].sourceId === payFourA.id &&
        suppPaymentsB.length === 1 &&
        suppPaymentsB[0].sourceId === payFourB.id,
      'Supplier payments are strictly isolated per tenant via DetteFournisseur.companyId',
    );

    // -------------------------------------------------------------
    // Test 5: Employee payments (OUT) isolated through Employe.companyId
    // -------------------------------------------------------------
    const empPaymentsA = resAllA.data.filter((item) => item.sourceType === 'EMPLOYEE_PAYMENT');
    const empPaymentsB = resAllB.data.filter((item) => item.sourceType === 'EMPLOYEE_PAYMENT');
    assert(
      empPaymentsA.length === 1 &&
        empPaymentsA[0].sourceId === versEmpA.id &&
        empPaymentsB.length === 1 &&
        empPaymentsB[0].sourceId === versEmpB.id,
      'Employee payments are strictly isolated per tenant via Employe.companyId',
    );

    // -------------------------------------------------------------
    // Test 6: Administrative expenses (OUT) isolated through direct companyId
    // -------------------------------------------------------------
    const adminExpA = resAllA.data.filter((item) => item.sourceType === 'ADMINISTRATIVE_EXPENSE');
    const adminExpB = resAllB.data.filter((item) => item.sourceType === 'ADMINISTRATIVE_EXPENSE');
    assert(
      adminExpA.length === 1 &&
        adminExpA[0].sourceId === depAdminA.idDepense &&
        adminExpB.length === 1 &&
        adminExpB[0].sourceId === depAdminB.idDepense,
      'Administrative expenses are strictly isolated per tenant via direct companyId',
    );

    // -------------------------------------------------------------
    // Test 7: Tenant A stats isolation
    // -------------------------------------------------------------
    // Tenant A: IN = 6000, OUT = 1000 + 1200 + 300 = 2500, Net = 3500
    const statsA = await controller.getStats(companyA.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      statsA.totalIn === '6000.00' &&
        statsA.totalOut === '2500.00' &&
        statsA.netBalance === '3500.00' &&
        statsA.totalCount === 4,
      'Tenant A stats match expected Company A financial totals (In 6000, Out 2500, Net 3500)',
    );

    // -------------------------------------------------------------
    // Test 8: Tenant B stats isolation
    // -------------------------------------------------------------
    // Tenant B: IN = 2000, OUT = 500 + 800 + 700 = 2000, Net = 0
    const statsB = await controller.getStats(companyB.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      statsB.totalIn === '2000.00' &&
        statsB.totalOut === '2000.00' &&
        statsB.netBalance === '0.00' &&
        statsB.totalCount === 4,
      'Tenant B stats match expected Company B financial totals (In 2000, Out 2000, Net 0)',
    );

    // -------------------------------------------------------------
    // Test 9: totalIn isolation
    // -------------------------------------------------------------
    assert(
      statsA.totalIn === '6000.00' && statsB.totalIn === '2000.00',
      'totalIn metric is strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 10: totalOut isolation
    // -------------------------------------------------------------
    assert(
      statsA.totalOut === '2500.00' && statsB.totalOut === '2000.00',
      'totalOut metric is strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 11: netBalance isolation
    // -------------------------------------------------------------
    assert(
      statsA.netBalance === '3500.00' && statsB.netBalance === '0.00',
      'netBalance metric is strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 12: bySourceType breakdown isolation
    // -------------------------------------------------------------
    assert(
      statsA.bySourceType['CLIENT_PAYMENT'] === 1 &&
        statsA.bySourceType['SUPPLIER_PAYMENT'] === 1 &&
        statsA.bySourceType['EMPLOYEE_PAYMENT'] === 1 &&
        statsA.bySourceType['ADMINISTRATIVE_EXPENSE'] === 1,
      'bySourceType breakdown contains counts strictly belonging to Company A',
    );

    // -------------------------------------------------------------
    // Test 13: byPaymentMethod breakdown isolation
    // -------------------------------------------------------------
    // Company A: 3 VIREMENT (Client 6000, Supplier 1000, Employee 1200, AdminExp 300) = 4 VIREMENT
    // Company B: 1 ESPECES (Client 2000), 1 CHEQUE (Supplier 500), 1 VIREMENT (Employee 800), 1 VIREMENT (AdminExp 700) = 2 VIREMENT, 1 ESPECES, 1 CHEQUE
    assert(
      statsA.byPaymentMethod['VIREMENT'] === 4 &&
        statsB.byPaymentMethod['ESPECES'] === 1 &&
        statsB.byPaymentMethod['CHEQUE'] === 1,
      'byPaymentMethod breakdown counts are strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 14: CLIENT_PAYMENT cross-tenant findOne → 404
    // -------------------------------------------------------------
    let crossClient404 = false;
    try {
      await controller.findOne(companyA.id, 'CLIENT_PAYMENT', payClientB.id, {
        user: { permissions: allPermissions },
      } as any);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('not found')) crossClient404 = true;
    }
    assert(
      crossClient404,
      'findOne CLIENT_PAYMENT for Company B record from Company A context throws 404',
    );

    // -------------------------------------------------------------
    // Test 15: SUPPLIER_PAYMENT cross-tenant findOne → 404
    // -------------------------------------------------------------
    let crossSupp404 = false;
    try {
      await controller.findOne(companyA.id, 'SUPPLIER_PAYMENT', payFourB.id, {
        user: { permissions: allPermissions },
      } as any);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('not found')) crossSupp404 = true;
    }
    assert(
      crossSupp404,
      'findOne SUPPLIER_PAYMENT for Company B record from Company A context throws 404',
    );

    // -------------------------------------------------------------
    // Test 16: EMPLOYEE_PAYMENT cross-tenant findOne → 404
    // -------------------------------------------------------------
    let crossEmp404 = false;
    try {
      await controller.findOne(companyA.id, 'EMPLOYEE_PAYMENT', versEmpB.id, {
        user: { permissions: allPermissions },
      } as any);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('not found')) crossEmp404 = true;
    }
    assert(
      crossEmp404,
      'findOne EMPLOYEE_PAYMENT for Company B record from Company A context throws 404',
    );

    // -------------------------------------------------------------
    // Test 17: ADMINISTRATIVE_EXPENSE cross-tenant findOne → 404
    // -------------------------------------------------------------
    let crossAdmin404 = false;
    try {
      await controller.findOne(companyA.id, 'ADMINISTRATIVE_EXPENSE', depAdminB.idDepense, {
        user: { permissions: allPermissions },
      } as any);
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('not found')) crossAdmin404 = true;
    }
    assert(
      crossAdmin404,
      'findOne ADMINISTRATIVE_EXPENSE for Company B record from Company A context throws 404',
    );

    // -------------------------------------------------------------
    // Test 18: Forged companyId cannot override CurrentUser companyId
    // -------------------------------------------------------------
    const forgedQuery: any = { companyId: companyA.id };
    const resForgedB = await controller.findAll(companyB.id, forgedQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      resForgedB.data.every(
        (item) => item.sourceId !== payClientA.id && item.sourceId !== payFourA.id,
      ),
      'Forged companyId in query DTO is ignored and CurrentUser companyId is enforced',
    );

    // -------------------------------------------------------------
    // Test 19: ADMIN_GENERAL remains confined to its company
    // -------------------------------------------------------------
    const adminResA = await controller.findAll(companyA.id, emptyQuery, {
      user: { roleName: 'ADMIN_GENERAL' },
    } as any);
    const adminResB = await controller.findAll(companyB.id, emptyQuery, {
      user: { roleName: 'ADMIN_GENERAL' },
    } as any);
    assert(
      adminResA.data.length === 4 && adminResB.data.length === 4,
      'ADMIN_GENERAL role context remains strictly confined to assigned companyId',
    );

    // -------------------------------------------------------------
    // Test 20: Empty tenant returns empty list
    // -------------------------------------------------------------
    const resEmpty = await controller.findAll(companyEmpty.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      resEmpty.data.length === 0 && resEmpty.meta.total === 0,
      'Empty tenant findAll returns empty data array and total=0',
    );

    // -------------------------------------------------------------
    // Test 21: Empty tenant returns zero statistics
    // -------------------------------------------------------------
    const statsEmpty = await controller.getStats(companyEmpty.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      statsEmpty.totalIn === '0.00' &&
        statsEmpty.totalOut === '0.00' &&
        statsEmpty.netBalance === '0.00' &&
        statsEmpty.totalCount === 0,
      'Empty tenant getStats returns zeroed financial statistics',
    );

    // -------------------------------------------------------------
    // Test 22: CompanySettings currency is tenant-specific
    // -------------------------------------------------------------
    assert(
      resAllA.data[0].currency === 'MAD' && resAllB.data[0].currency === 'EUR',
      'Currency in movements list is derived from tenant-specific CompanySettings',
    );

    // -------------------------------------------------------------
    // Test 23: Date filters remain tenant-scoped
    // -------------------------------------------------------------
    const dateQuery: QueryGestionPaiementsDto = {
      dateDebut: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      dateFin: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    };
    const dateResA = await controller.findAll(companyA.id, dateQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      dateResA.data.length === 4 && dateResA.data.every((item) => item.amount !== undefined),
      'Date filters combine correctly with tenant parameter $1',
    );

    // -------------------------------------------------------------
    // Test 24: Search remains tenant-scoped
    // -------------------------------------------------------------
    const searchQuery: QueryGestionPaiementsDto = { search: 'Dupont' }; // Employe A
    const searchResA = await controller.findAll(companyA.id, searchQuery, {
      user: { permissions: allPermissions },
    } as any);
    const searchResB = await controller.findAll(companyB.id, searchQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      searchResA.data.length === 1 && searchResB.data.length === 0,
      'Search query filter respects tenant boundary and returns zero results for Tenant B',
    );

    // -------------------------------------------------------------
    // Test 25: UNION ALL contains no cross-tenant rows
    // -------------------------------------------------------------
    assert(
      resAllA.data.every(
        (item) =>
          !['FAC-GP-B-', 'DETTE-GP-B-', 'EMP-GP-B-'].some((bRef) => item.reference.includes(bRef)),
      ),
      'UNION ALL query produces zero cross-tenant row leakage',
    );

    // -------------------------------------------------------------
    // Test 26: Cross-tenant rows cannot affect COUNT
    // -------------------------------------------------------------
    assert(
      resAllA.meta.total === 4 && resAllB.meta.total === 4,
      'Total COUNT calculation is strictly isolated per tenant',
    );

    // -------------------------------------------------------------
    // Test 27: Cross-tenant rows cannot affect SUM
    // -------------------------------------------------------------
    assert(
      statsA.totalIn === '6000.00' && statsB.totalIn === '2000.00',
      'Financial SUM totals ignore movements belonging to another tenant',
    );

    // -------------------------------------------------------------
    // Test 28: Cross-tenant rows cannot affect bySourceType/byPaymentMethod
    // -------------------------------------------------------------
    assert(
      statsA.byPaymentMethod['ESPECES'] === undefined && statsB.byPaymentMethod['ESPECES'] === 1,
      'Breakdown statistics exclude payment methods of other tenants',
    );

    // -------------------------------------------------------------
    // Test 29: Same business identifiers in different tenants remain isolated
    // -------------------------------------------------------------
    const findOneA = await controller.findOne(companyA.id, 'CLIENT_PAYMENT', payClientA.id, {
      user: { permissions: allPermissions },
    } as any);
    const findOneB = await controller.findOne(companyB.id, 'CLIENT_PAYMENT', payClientB.id, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      findOneA.party.name === clientA.nomEntreprise &&
        findOneB.party.name === clientB.nomEntreprise,
      'Same business entity structures remain isolated across tenants',
    );

    // -------------------------------------------------------------
    // Test 30: Cancelled movements remain excluded from totals but counted in cancelledCount
    // -------------------------------------------------------------
    await prisma.paiementFournisseur.update({
      where: { id: payFourA.id },
      data: { estAnnule: true, dateAnnulation: new Date(), motifAnnulation: 'Test cancellation' },
    });
    const statsAAfterCancel = await controller.getStats(companyA.id, emptyQuery, {
      user: { permissions: allPermissions },
    } as any);
    assert(
      statsAAfterCancel.totalOut === '1500.00' && // 2500 - 1000 = 1500
        statsAAfterCancel.cancelledCount === 1 &&
        statsAAfterCancel.activeCount === 3,
      'Cancelled movements are excluded from totalOut and properly counted under cancelledCount',
    );

    // Cleanup Test Data
    await prisma.depenseAdministrative.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.versementEmploye.deleteMany({ where: { id: { in: [versEmpA.id, versEmpB.id] } } });
    await prisma.paiementEmploye.deleteMany({ where: { id: { in: [paiEmpA.id, paiEmpB.id] } } });
    await prisma.employe.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.paiementFournisseur.deleteMany({
      where: { id: { in: [payFourA.id, payFourB.id] } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.fournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.paiementClient.deleteMany({
      where: { id: { in: [payClientA.id, payClientB.id] } },
    });
    await prisma.facture.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.client.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.companySettings.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
  } catch (err) {
    console.error('UNHANDLED TEST RUNNER ERROR:', err);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n==================================================`);
  console.log(
    `TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} TESTS`,
  );
  console.log(`==================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
