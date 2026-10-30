/**
 * Multi-Tenant Duplicate Immatriculation Voyage Creation Test Suite
 * Path: backend/src/test-voyage-duplicate-immat-multi-tenant.runner.ts
 *
 * Verifies:
 * 1. Two separate companies can possess vehicles with the exact same immatriculation.
 * 2. Creating a Voyage in Company A with the shared immatriculation succeeds without Prisma panic.
 * 3. The returned VoyageView contains the vehicle details strictly belonging to Company A (not Company B).
 * 4. Company B's vehicle status remains untouched when Company A creates an active (EN_COURS) voyage.
 * 5. Creating a Voyage without tractor or trailer returns null vehicle views safely.
 */

import {
  PrismaClient,
  VoyageStatut,
  VehiculeStatut,
  ConducteurStatut,
  EmployeStatut,
} from '@prisma/client';
import { VoyagesService } from './modules/voyages/voyages.service';
import { VoyageResourceSyncService } from './modules/voyages/voyage-resource-sync.service';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';
import { PrismaService } from './prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================================');
  console.log('MULTI-TENANT DUPLICATE IMMATRICULATION FULL END-TO-END TEST SUITE');
  console.log('========================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assertTest(id: number, label: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`✅ [PASS #${id}] ${label}${detail ? ` (${detail})` : ''}`);
      passCount++;
    } else {
      console.log(`❌ [FAIL #${id}] ${label}${detail ? ` (${detail})` : ''}`);
      failCount++;
    }
  }

  const testRunId = Date.now();
  const sharedTractorImmat = `TR-${testRunId.toString().slice(-6)}`;
  const sharedTrailerImmat = `REM-${testRunId.toString().slice(-6)}`;

  const prismaService = prisma as unknown as PrismaService;
  const syncService = new VoyageResourceSyncService();
  const creancesService = new CreancesClientsService(prismaService);
  const facturesService = new FacturesService(prismaService, creancesService);
  const voyagesService = new VoyagesService(prismaService, syncService, facturesService);
  const vehiculesService = new VehiculesService(prismaService);

  let companyA: any;
  let companyB: any;
  let clientA: any;
  let tractorA: any;
  let tractorB: any;
  let trailerB: any;
  let empA: any;
  let driverA: any;

  try {
    console.log('--- Step 1: Setting up multi-tenant test fixtures ---');

    companyA = await prisma.company.create({
      data: { nom: `Tenant-A-${testRunId}` },
    });
    companyB = await prisma.company.create({
      data: { nom: `Tenant-B-${testRunId}` },
    });

    clientA = await prisma.client.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: `Client-A-${testRunId}`,
        statut: 'ACTIF',
      },
    });
    await prisma.client.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: `Client-B-${testRunId}`,
        statut: 'ACTIF',
      },
    });

    // Create vehicles with identical immatriculations in both companies
    tractorA = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: sharedTractorImmat,
        typeVehicule: 'TRACTEUR',
        marque: 'VOLVO-TENANT-A',
        modele: 'FH16',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    tractorB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: sharedTractorImmat,
        typeVehicule: 'TRACTEUR',
        marque: 'SCANIA-TENANT-B',
        modele: 'R500',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: sharedTrailerImmat,
        typeVehicule: 'REMORQUE',
        marque: 'CHEROU-TENANT-A',
        modele: 'MAXI',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    trailerB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: sharedTrailerImmat,
        typeVehicule: 'REMORQUE',
        marque: 'SCHMITZ-TENANT-B',
        modele: 'CARGOBULL',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    // Setup active driver for Tenant A
    empA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${testRunId.toString().slice(-6)}`,
        prenom: 'Karim',
        nom: `Driver-${testRunId}`,
        telephone: `06${testRunId.toString().slice(-8)}`,
        poste: 'Conducteur',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
        statut: EmployeStatut.ACTIF,
      },
    });

    driverA = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        idEmploye: empA.id,
        nomConducteur: `${empA.prenom} ${empA.nom}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    console.log(`✅ Fixtures created with shared tractor "${sharedTractorImmat}" and trailer "${sharedTrailerImmat}".\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: Create PLANIFIE Voyage in Company A with shared registration
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- Test 1: Create PLANIFIE Voyage in Company A with shared registration ---');
    const voyage1 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      tracteur: sharedTractorImmat,
      remorque: sharedTrailerImmat,
      statut: VoyageStatut.PLANIFIE,
      montantVoyage: 5000,
    });

    assertTest(
      1,
      'Voyage creation succeeds in Company A without Prisma panic',
      !!voyage1 && voyage1.idVoyage > 0,
      `idVoyage: ${voyage1.idVoyage}`,
    );

    assertTest(
      2,
      'Returned tracteurVehicule belongs strictly to Company A',
      voyage1.tracteurVehicule?.immatriculation === sharedTractorImmat &&
        voyage1.tracteurVehicule?.marque === 'VOLVO-TENANT-A',
      `Tractor Marque: ${voyage1.tracteurVehicule?.marque}`,
    );

    assertTest(
      3,
      'Returned remorqueVehicule belongs strictly to Company A',
      voyage1.remorqueVehicule?.immatriculation === sharedTrailerImmat &&
        voyage1.remorqueVehicule?.marque === 'CHEROU-TENANT-A',
      `Trailer Marque: ${voyage1.remorqueVehicule?.marque}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Create EN_COURS Voyage in Company A with shared registration
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Create EN_COURS Voyage in Company A with shared registration ---');
    const voyage2 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Tanger Med',
      lieuDechargement: 'Agadir',
      tracteur: sharedTractorImmat,
      remorque: sharedTrailerImmat,
      nomConducteur: driverA.nomConducteur,
      statut: VoyageStatut.EN_COURS,
      montantVoyage: 8000,
    });

    assertTest(
      4,
      'Active Voyage creation succeeds and returns EN_VOYAGE status for Company A vehicles',
      voyage2.tracteurVehicule?.statut === VehiculeStatut.EN_VOYAGE &&
        voyage2.remorqueVehicule?.statut === VehiculeStatut.EN_VOYAGE &&
        voyage2.tracteurVehicule?.marque === 'VOLVO-TENANT-A',
      `Tr Statut: ${voyage2.tracteurVehicule?.statut}, Tl Statut: ${voyage2.remorqueVehicule?.statut}`,
    );

    // Verify Company B vehicles were NOT mutated to EN_VOYAGE
    const freshTractorB = await prisma.vehicule.findUnique({ where: { id: tractorB.id } });
    const freshTrailerB = await prisma.vehicule.findUnique({ where: { id: trailerB.id } });

    assertTest(
      5,
      'Company B vehicle with same immatriculation remains DISPONIBLE (isolated tenant)',
      freshTractorB?.statut === VehiculeStatut.DISPONIBLE &&
        freshTrailerB?.statut === VehiculeStatut.DISPONIBLE,
      `Company B Tr: ${freshTractorB?.statut}, Tl: ${freshTrailerB?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Create Voyage without tractor or without trailer (null handling)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Create Voyage without tractor or without trailer ---');
    const voyage3 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      lieuChargement: 'Fès',
      lieuDechargement: 'Oujda',
      tracteur: null,
      remorque: null,
      statut: VoyageStatut.PLANIFIE,
      montantVoyage: 3000,
    });

    assertTest(
      6,
      'Voyage without vehicles returns null tracteurVehicule and remorqueVehicule safely',
      voyage3.tracteurVehicule === null && voyage3.remorqueVehicule === null,
      `Tr: ${voyage3.tracteurVehicule}, Tl: ${voyage3.remorqueVehicule}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: findAll isolates vehicles by tenant in batch
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: findAll isolates vehicles by tenant in batch ---');
    const allVoyagesA = await voyagesService.findAll(companyA.id, { page: 1, limit: 10 });
    const targetVoyageInList = allVoyagesA.data.find((v) => v.idVoyage === voyage1.idVoyage);

    assertTest(
      7,
      'findAll returns correct tenant vehicle and never leaks Company B vehicle',
      targetVoyageInList?.tracteurVehicule?.marque === 'VOLVO-TENANT-A' &&
        targetVoyageInList?.remorqueVehicule?.marque === 'CHEROU-TENANT-A',
      `Tractor: ${targetVoyageInList?.tracteurVehicule?.marque}, Trailer: ${targetVoyageInList?.remorqueVehicule?.marque}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: findOne isolates vehicles by tenant
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: findOne isolates vehicles by tenant ---');
    const singleVoyageA = await voyagesService.findOne(companyA.id, voyage1.idVoyage);

    assertTest(
      8,
      'findOne returns Company A vehicle details without collision',
      singleVoyageA.tracteurVehicule?.marque === 'VOLVO-TENANT-A' &&
        singleVoyageA.tracteurVehicule?.immatriculation === sharedTractorImmat,
      `Marque: ${singleVoyageA.tracteurVehicule?.marque}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: update isolates vehicles by tenant
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: update isolates vehicles by tenant ---');
    const updatedVoyage = await voyagesService.update(companyA.id, voyage1.idVoyage, {
      lieuDechargement: 'Rabat Port',
    });

    assertTest(
      9,
      'update successfully updates and returns Company A vehicle',
      updatedVoyage.lieuDechargement === 'Rabat Port' &&
        updatedVoyage.tracteurVehicule?.marque === 'VOLVO-TENANT-A',
      `Lieu: ${updatedVoyage.lieuDechargement}, Tractor Marque: ${updatedVoyage.tracteurVehicule?.marque}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: updateStatus isolates vehicles by tenant
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: updateStatus isolates vehicles by tenant ---');
    const statusUpdatedVoyage = await voyagesService.updateStatus(companyA.id, voyage1.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    assertTest(
      10,
      'updateStatus sets status to LIVRE with Company A vehicle view',
      statusUpdatedVoyage.statut === VoyageStatut.LIVRE &&
        statusUpdatedVoyage.tracteurVehicule?.marque === 'VOLVO-TENANT-A',
      `Status: ${statusUpdatedVoyage.statut}, Marque: ${statusUpdatedVoyage.tracteurVehicule?.marque}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: VehiculesService.remove counts ONLY voyages within the vehicle company
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: VehiculesService.remove counts ONLY voyages within the vehicle company ---');
    // Tractor B in Company B has the SAME immatriculation used by Company A's voyages.
    // However, Company B has NO voyages. Tractor B MUST be deletable!
    let deleteBSuccess = false;
    try {
      await vehiculesService.remove(tractorB.id, companyB.id);
      deleteBSuccess = true;
    } catch (err: any) {
      deleteBSuccess = false;
    }

    assertTest(
      11,
      'Deleting Company B vehicle succeeds despite Company A having voyages with identical registration',
      deleteBSuccess,
      `Tractor B deleted: ${deleteBSuccess}`,
    );

    // Conversely, Tractor A in Company A HAS voyages in Company A. It must NOT be deletable!
    let deleteAFailedAsExpected = false;
    try {
      await vehiculesService.remove(tractorA.id, companyA.id);
    } catch (err: any) {
      if (err.message && err.message.includes('associé à') && err.message.includes('voyage(s)')) {
        deleteAFailedAsExpected = true;
      }
    }

    assertTest(
      12,
      'Deleting Company A vehicle is blocked when Company A has voyages using it',
      deleteAFailedAsExpected,
      `Blocked with ConflictException: ${deleteAFailedAsExpected}`,
    );
  } catch (error: any) {
    console.error(`\n❌ Error during test run: ${error.message}`);
    failCount++;
  } finally {
    console.log('\n--- Cleaning up test fixtures ---');
    if (companyA && companyB) {
      await prisma.traverseeMaritime.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.voyage.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.vehicule.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.conducteur.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.employe.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.client.deleteMany({
        where: { companyId: { in: [companyA.id, companyB.id] } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: [companyA.id, companyB.id] } },
      });
      console.log('✅ Cleanup completed successfully.');
    }
    await prisma.$disconnect();
  }

  console.log('\n========================================================================');
  console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED OUT OF ${passCount + failCount} INVARIANTS`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
