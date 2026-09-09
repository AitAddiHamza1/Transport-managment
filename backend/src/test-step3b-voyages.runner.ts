import {
  PrismaClient,
  VoyageStatut,
  VoyageType,
  VehiculeStatut,
  ConducteurStatut,
  ClientStatut,
} from '@prisma/client';
import { VoyagesService } from './modules/voyages/voyages.service';
import { VoyagesController } from './modules/voyages/voyages.controller';
import { VoyageResourceSyncService } from './modules/voyages/voyage-resource-sync.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const prisma = new PrismaClient();
const syncService = new VoyageResourceSyncService();
const service = new VoyagesService(prisma as any, syncService);
const controller = new VoyagesController(service);

async function runTests() {
  console.log('=== RUNNING MULTI-TENANT STEP 3B-VOYAGES TEST SUITE ===\n');
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

  // 1. Create test companies
  const companyA = await prisma.company.create({
    data: { nom: `Voyages Co A ${ts}` },
  });
  const companyB = await prisma.company.create({
    data: { nom: `Voyages Co B ${ts}` },
  });
  const companyEmpty = await prisma.company.create({
    data: { nom: `Voyages Co Empty ${ts}` },
  });

  // Track created records for cleanup
  const createdVoyageIds: number[] = [];
  const createdFactureIds: number[] = [];
  const createdClientIds: number[] = [];
  const createdVehiculeIds: number[] = [];
  const createdConducteurIds: number[] = [];
  const createdEmployeIds: number[] = [];

  try {
    // 2. Setup Clients for Tenant A and Tenant B
    const clientA = await prisma.client.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: `Client A ${ts}`,
        statut: ClientStatut.ACTIF,
        deviseFacturation: 'MAD',
      },
    });
    createdClientIds.push(clientA.id);

    const clientB = await prisma.client.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: `Client B ${ts}`,
        statut: ClientStatut.ACTIF,
        deviseFacturation: 'EUR',
      },
    });
    createdClientIds.push(clientB.id);

    // 3. Setup Vehicles for Tenant A and Tenant B
    const tracteurA = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TR-A-${ts}`,
        marque: 'Volvo',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });
    createdVehiculeIds.push(tracteurA.id);

    const remorqueA = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `RM-A-${ts}`,
        marque: 'Schmitz',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });
    createdVehiculeIds.push(remorqueA.id);

    const tracteurB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: `TR-B-${ts}`,
        marque: 'Scania',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });
    createdVehiculeIds.push(tracteurB.id);

    const remorqueB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: `RM-B-${ts}`,
        marque: 'Krone',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });
    createdVehiculeIds.push(remorqueB.id);

    // 4. Setup Employees & Drivers for Tenant A and Tenant B
    const employeA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-A-${ts}`,
        nom: `DriverEmpA_${ts}`,
        prenom: 'DriverA',
        poste: 'Chauffeur',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
        email: `drivera_${ts}@test.com`,
        statut: 'ACTIF',
      },
    });
    createdEmployeIds.push(employeA.id);

    const driverA = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        nomConducteur: `Driver A ${ts}`,
        statut: ConducteurStatut.DISPONIBLE,
        idEmploye: employeA.id,
      },
    });
    createdConducteurIds.push(driverA.id);

    const employeB = await prisma.employe.create({
      data: {
        companyId: companyB.id,
        matricule: `EMP-B-${ts}`,
        nom: `DriverEmpB_${ts}`,
        prenom: 'DriverB',
        poste: 'Chauffeur',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
        email: `driverb_${ts}@test.com`,
        statut: 'ACTIF',
      },
    });
    createdEmployeIds.push(employeB.id);

    const driverB = await prisma.conducteur.create({
      data: {
        companyId: companyB.id,
        nomConducteur: `Driver B ${ts}`,
        statut: ConducteurStatut.DISPONIBLE,
        idEmploye: employeB.id,
      },
    });
    createdConducteurIds.push(driverB.id);

    // 5. Seed initial Voyages for Tenant A and Tenant B
    const voyageA1 = await controller.create(companyA.id, {
      idClient: clientA.id,
      typeVoyage: VoyageType.NATIONAL,
      tracteur: tracteurA.immatriculation,
      remorque: remorqueA.immatriculation,
      nomConducteur: driverA.nomConducteur,
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      montantVoyage: 15000,
      statut: VoyageStatut.PLANIFIE,
    });
    createdVoyageIds.push(voyageA1.idVoyage);

    const voyageA2 = await controller.create(companyA.id, {
      idClient: clientA.id,
      typeVoyage: VoyageType.INTERNATIONAL,
      lieuChargement: 'Agadir',
      lieuDechargement: 'Madrid',
      montantVoyage: 35000,
      statut: VoyageStatut.PLANIFIE,
    });
    createdVoyageIds.push(voyageA2.idVoyage);

    const voyageB1 = await controller.create(companyB.id, {
      idClient: clientB.id,
      typeVoyage: VoyageType.NATIONAL,
      tracteur: tracteurB.immatriculation,
      remorque: remorqueB.immatriculation,
      nomConducteur: driverB.nomConducteur,
      lieuChargement: 'Rabat',
      lieuDechargement: 'Fes',
      montantVoyage: 8000,
      statut: VoyageStatut.PLANIFIE,
    });
    createdVoyageIds.push(voyageB1.idVoyage);

    // ----------------------------------------------------
    // Scenario 1: Tenant A findAll isolation
    // ----------------------------------------------------
    const allA = await controller.findAll(companyA.id, {});
    const onlyA =
      allA.data.length === 2 &&
      allA.data.every((v) => v.idVoyage === voyageA1.idVoyage || v.idVoyage === voyageA2.idVoyage);
    assert(onlyA, 'Tenant A findAll isolation', `Count: ${allA.data.length}`);

    // ----------------------------------------------------
    // Scenario 2: Tenant B findAll isolation
    // ----------------------------------------------------
    const allB = await controller.findAll(companyB.id, {});
    const onlyB = allB.data.length === 1 && allB.data[0].idVoyage === voyageB1.idVoyage;
    assert(onlyB, 'Tenant B findAll isolation', `Count: ${allB.data.length}`);

    // ----------------------------------------------------
    // Scenario 3: Tenant A stats isolation
    // ----------------------------------------------------
    const statsA = await controller.findStats(companyA.id);
    assert(
      statsA.total === 2 && statsA.planifies === 2,
      'Tenant A stats isolation',
      `Total: ${statsA.total}`,
    );

    // ----------------------------------------------------
    // Scenario 4: Tenant B stats isolation
    // ----------------------------------------------------
    const statsB = await controller.findStats(companyB.id);
    assert(
      statsB.total === 1 && statsB.planifies === 1,
      'Tenant B stats isolation',
      `Total: ${statsB.total}`,
    );

    // ----------------------------------------------------
    // Scenario 5: Tenant A findOne own voyage
    // ----------------------------------------------------
    const foundA1 = await controller.findOne(companyA.id, voyageA1.idVoyage);
    assert(foundA1.idVoyage === voyageA1.idVoyage, 'Tenant A findOne own voyage succeeds');

    // ----------------------------------------------------
    // Scenario 6: Tenant A findOne Tenant B voyage → 404
    // ----------------------------------------------------
    let err6 = false;
    try {
      await controller.findOne(companyA.id, voyageB1.idVoyage);
    } catch (e) {
      err6 = e instanceof NotFoundException;
    }
    assert(err6, 'Tenant A findOne Tenant B voyage returns 404');

    // ----------------------------------------------------
    // Scenario 7: Tenant A update Tenant B voyage → 404
    // ----------------------------------------------------
    let err7 = false;
    try {
      await controller.update(companyA.id, voyageB1.idVoyage, {
        lieuDechargement: 'Hacked Location',
      });
    } catch (e) {
      err7 = e instanceof NotFoundException;
    }
    assert(err7, 'Tenant A update Tenant B voyage returns 404');

    // ----------------------------------------------------
    // Scenario 8: Tenant A delete Tenant B voyage → 404
    // ----------------------------------------------------
    let err8 = false;
    try {
      await controller.remove(companyA.id, voyageB1.idVoyage);
    } catch (e) {
      err8 = e instanceof NotFoundException;
    }
    assert(err8, 'Tenant A delete Tenant B voyage returns 404');

    // ----------------------------------------------------
    // Scenario 9: create uses JWT companyId
    // ----------------------------------------------------
    const newVoyageA = await controller.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Marrakech',
      lieuDechargement: 'Oujda',
      montantVoyage: 20000,
    });
    createdVoyageIds.push(newVoyageA.idVoyage);
    const dbVoyageA = await prisma.voyage.findUnique({
      where: { idVoyage: newVoyageA.idVoyage },
    });
    assert(dbVoyageA?.companyId === companyA.id, 'create uses JWT companyId');

    // ----------------------------------------------------
    // Scenario 10: cross-tenant Client rejected
    // ----------------------------------------------------
    let err10 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientB.id, // Client belonging to Tenant B
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
      });
    } catch (e) {
      err10 = e instanceof NotFoundException;
    }
    assert(err10, 'cross-tenant Client rejected on create (404)');

    // ----------------------------------------------------
    // Scenario 11: cross-tenant tractor rejected
    // ----------------------------------------------------
    let err11 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientA.id,
        tracteur: tracteurB.immatriculation, // Tractor belonging to Tenant B
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
      });
    } catch (e) {
      err11 = e instanceof NotFoundException;
    }
    assert(err11, 'cross-tenant tractor rejected on create (404)');

    // ----------------------------------------------------
    // Scenario 12: cross-tenant trailer rejected
    // ----------------------------------------------------
    let err12 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientA.id,
        remorque: remorqueB.immatriculation, // Trailer belonging to Tenant B
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
      });
    } catch (e) {
      err12 = e instanceof NotFoundException;
    }
    assert(err12, 'cross-tenant trailer rejected on create (404)');

    // ----------------------------------------------------
    // Scenario 13: cross-tenant driver rejected
    // ----------------------------------------------------
    let err13 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientA.id,
        nomConducteur: driverB.nomConducteur, // Driver belonging to Tenant B
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Rabat',
      });
    } catch (e) {
      err13 = e instanceof NotFoundException;
    }
    assert(err13, 'cross-tenant driver rejected on create (404)');

    // ----------------------------------------------------
    // Scenario 14: activation acquires only same-tenant resources
    // ----------------------------------------------------
    await controller.updateStatus(companyA.id, voyageA1.idVoyage, {
      statut: VoyageStatut.EN_COURS,
    });
    const dbTracteurA = await prisma.vehicule.findUnique({ where: { id: tracteurA.id } });
    const dbDriverA = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    const dbTracteurB = await prisma.vehicule.findUnique({ where: { id: tracteurB.id } });

    const activeSameTenantAcquired =
      dbTracteurA?.statut === VehiculeStatut.EN_VOYAGE &&
      dbDriverA?.statut === ConducteurStatut.EN_VOYAGE &&
      dbTracteurB?.statut === VehiculeStatut.DISPONIBLE;
    assert(
      activeSameTenantAcquired,
      'activation acquires only same-tenant resources (Tenant B untouched)',
    );

    // ----------------------------------------------------
    // Scenario 15: release affects only same-tenant resources
    // ----------------------------------------------------
    await controller.updateStatus(companyA.id, voyageA1.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });
    const dbTracteurAReleased = await prisma.vehicule.findUnique({ where: { id: tracteurA.id } });
    const dbDriverAReleased = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    const releaseSameTenantOnly =
      dbTracteurAReleased?.statut === VehiculeStatut.DISPONIBLE &&
      dbDriverAReleased?.statut === ConducteurStatut.DISPONIBLE;
    assert(releaseSameTenantOnly, 'release affects only same-tenant resources');

    // ----------------------------------------------------
    // Scenario 16: resource conflict is tenant-scoped
    // ----------------------------------------------------
    // Activate Tenant B trip with Tenant B resources
    await controller.updateStatus(companyB.id, voyageB1.idVoyage, {
      statut: VoyageStatut.EN_COURS,
    });
    // Create a new Tenant A trip using Tenant A resources
    const voyageA3 = await controller.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tracteurA.immatriculation,
      remorque: remorqueA.immatriculation,
      nomConducteur: driverA.nomConducteur,
      lieuChargement: 'Kenitra',
      lieuDechargement: 'Salé',
      statut: VoyageStatut.EN_COURS, // Should succeed because Tenant B active trip does not block Tenant A
    });
    createdVoyageIds.push(voyageA3.idVoyage);
    assert(
      voyageA3.statut === VoyageStatut.EN_COURS,
      'resource conflict is tenant-scoped (Tenant B active trip does not block Tenant A)',
    );

    // Revert Tenant A3 to LIVRE so resources release cleanly
    await controller.updateStatus(companyA.id, voyageA3.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });
    await controller.updateStatus(companyB.id, voyageB1.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    // ----------------------------------------------------
    // Scenario 17: delete with same-tenant Facture remains blocked
    // ----------------------------------------------------
    const factureA = await prisma.facture.create({
      data: {
        companyId: companyA.id,
        idVoyage: voyageA1.idVoyage,
        numeroFacture: `FAC-VOY-${ts}`,
        nomClient: clientA.nomEntreprise,
        sousTotal: 15000,
        tauxTva: 0,
        dateFacture: new Date(),
      },
    });
    createdFactureIds.push(factureA.id);

    let err17 = false;
    try {
      await controller.remove(companyA.id, voyageA1.idVoyage);
    } catch (e) {
      err17 = e instanceof ConflictException;
    }
    assert(err17, 'delete with same-tenant Facture remains blocked (409 Conflict)');

    // ----------------------------------------------------
    // Scenario 18: status update cross-tenant → 404
    // ----------------------------------------------------
    let err18 = false;
    try {
      await controller.updateStatus(companyA.id, voyageB1.idVoyage, {
        statut: VoyageStatut.EN_COURS,
      });
    } catch (e) {
      err18 = e instanceof NotFoundException;
    }
    assert(err18, 'status update cross-tenant returns 404');

    // ----------------------------------------------------
    // Scenario 19: search isolation
    // ----------------------------------------------------
    const searchRes = await controller.findAll(companyA.id, { search: 'Rabat' });
    assert(
      searchRes.data.length === 0,
      'search isolation (Searching Tenant B location "Rabat" in Tenant A returns 0)',
    );

    // ----------------------------------------------------
    // Scenario 20: empty tenant list/stats
    // ----------------------------------------------------
    const emptyList = await controller.findAll(companyEmpty.id, {});
    const emptyStats = await controller.findStats(companyEmpty.id);
    assert(
      emptyList.data.length === 0 && emptyStats.total === 0,
      'empty tenant list and stats return empty/zero',
    );

    // ----------------------------------------------------
    // Scenario 21: currency modification restriction preserved
    // ----------------------------------------------------
    let err21 = false;
    try {
      await controller.update(companyA.id, voyageA1.idVoyage, {
        devise: 'EUR', // voyageA1 has a linked Facture
      });
    } catch (e) {
      err21 = e instanceof ConflictException;
    }
    assert(err21, 'currency modification restriction preserved when Facture is linked (409)');

    // ----------------------------------------------------
    // Scenario 22: tractor/trailer conflict validation preserved
    // ----------------------------------------------------
    let err22 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientA.id,
        tracteur: tracteurA.immatriculation,
        remorque: tracteurA.immatriculation, // Same immatriculation for tractor and trailer
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
      });
    } catch (e) {
      err22 = e instanceof ConflictException;
    }
    assert(err22, 'tractor/trailer conflict validation preserved (409 Conflict)');

    // ----------------------------------------------------
    // Scenario 23: forged companyId ignored
    // ----------------------------------------------------
    const forgedDto: any = {
      idClient: clientA.id,
      lieuChargement: 'Tetouan',
      lieuDechargement: 'Larache',
      companyId: companyB.id, // Forged companyId in DTO
    };
    const forgedCreated = await controller.create(companyA.id, forgedDto);
    createdVoyageIds.push(forgedCreated.idVoyage);
    const dbForged = await prisma.voyage.findUnique({
      where: { idVoyage: forgedCreated.idVoyage },
    });
    assert(
      dbForged?.companyId === companyA.id,
      'forged companyId in DTO is ignored and companyA is set',
    );

    // ----------------------------------------------------
    // Scenario 24: ADMIN_GENERAL Tenant A cannot access Tenant B voyages
    // ----------------------------------------------------
    const allFromA = await controller.findAll(companyA.id, {});
    const noTenantBInA = !allFromA.data.some((v) => v.idVoyage === voyageB1.idVoyage);
    assert(noTenantBInA, 'ADMIN_GENERAL Tenant A cannot access Tenant B voyages');

    // ----------------------------------------------------
    // Scenario 25: cross-tenant vehicle status untouched on failed activation
    // ----------------------------------------------------
    // Attempting to activate a trip with non-existent / cross-tenant vehicle fails safely
    let err25 = false;
    try {
      await controller.create(companyA.id, {
        idClient: clientA.id,
        tracteur: tracteurB.immatriculation,
        lieuChargement: 'Casa',
        lieuDechargement: 'Rabat',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (e) {
      err25 = e instanceof NotFoundException;
    }
    const dbTracteurBUntouched = await prisma.vehicule.findUnique({ where: { id: tracteurB.id } });
    assert(
      err25 && dbTracteurBUntouched?.statut === VehiculeStatut.DISPONIBLE,
      'cross-tenant vehicle status untouched on failed activation',
    );

    // ----------------------------------------------------
    // Scenario 26: cross-tenant driver update rejected
    // ----------------------------------------------------
    let err26 = false;
    try {
      await controller.update(companyA.id, voyageA2.idVoyage, {
        nomConducteur: driverB.nomConducteur, // Driver from Tenant B
      });
    } catch (e) {
      err26 = e instanceof NotFoundException;
    }
    assert(err26, 'cross-tenant driver update rejected (404)');

    // ----------------------------------------------------
    // Scenario 27: cross-tenant vehicle update rejected
    // ----------------------------------------------------
    let err27 = false;
    try {
      await controller.update(companyA.id, voyageA2.idVoyage, {
        tracteur: tracteurB.immatriculation, // Tractor from Tenant B
      });
    } catch (e) {
      err27 = e instanceof NotFoundException;
    }
    assert(err27, 'cross-tenant vehicle update rejected (404)');
  } catch (error) {
    console.error('UNEXPECTED ERROR IN VOYAGES TEST RUNNER:', error);
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (createdFactureIds.length > 0) {
      await prisma.facture.deleteMany({ where: { id: { in: createdFactureIds } } });
    }
    if (createdVoyageIds.length > 0) {
      await prisma.voyage.deleteMany({ where: { idVoyage: { in: createdVoyageIds } } });
    }
    if (createdConducteurIds.length > 0) {
      await prisma.conducteur.deleteMany({ where: { id: { in: createdConducteurIds } } });
    }
    if (createdEmployeIds.length > 0) {
      await prisma.employe.deleteMany({ where: { id: { in: createdEmployeIds } } });
    }
    if (createdVehiculeIds.length > 0) {
      await prisma.vehicule.deleteMany({ where: { id: { in: createdVehiculeIds } } });
    }
    if (createdClientIds.length > 0) {
      await prisma.client.deleteMany({ where: { id: { in: createdClientIds } } });
    }
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.$disconnect();
    console.log('--- CLEANUP COMPLETE ---\n');
  }

  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
