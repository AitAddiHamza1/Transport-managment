/**
 * Comprehensive Voyage Resource Lifecycle & Status Synchronization Regression Test Suite
 * Path: backend/src/test-voyage-resource-lifecycle.runner.ts
 *
 * Verifies all 15 regression test invariants specified in Phase 5:
 *  1. Deleting an active Voyage releases its tractor, trailer, and driver when no other active Voyage uses them.
 *  2. Transitioning EN_COURS -> LIVRE releases eligible resources.
 *  3. Cancellation releases eligible resources.
 *  4. Reassigning a tractor releases the old tractor and synchronizes the new one.
 *  5. Reassigning a trailer releases the old trailer and synchronizes the new one.
 *  6. Reassigning a driver releases the old driver and synchronizes the new one.
 *  7. Clearing an assignment releases the resource when appropriate.
 *  8. A resource used by another active Voyage remains unavailable.
 *  9. A vehicle in MAINTENANCE or HORS_SERVICE does not become DISPONIBLE after a Voyage ends.
 * 10. An inactive or otherwise ineligible driver does not become DISPONIBLE after release.
 * 11. A failed transaction leaves both the Voyage and resource states unchanged.
 * 12. Company A cannot alter or release resources belonging to Company B.
 * 13. Editing a Voyage without changing its assignments does not corrupt resource statuses.
 * 14. Repeated completion, cancellation, or deletion requests behave safely according to the existing API contract.
 * 15. Dashboard counts reflect the updated resource state after successful mutations.
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
import { ConducteursService } from './modules/conducteurs/conducteurs.service';
import { PrismaService } from './prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================================');
  console.log('VOYAGE RESOURCE LIFECYCLE & SYNCHRONIZATION REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assertTest(id: number, label: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`✅ [PASS #${id}] ${label}${detail ? ` (${detail})` : ''} [Real Service]`);
      passCount++;
    } else {
      console.log(`❌ [FAIL #${id}] ${label}${detail ? ` (${detail})` : ''} [Real Service]`);
      failCount++;
    }
  }

  const testRunId = Date.now();
  const prismaService = prisma as unknown as PrismaService;
  const syncService = new VoyageResourceSyncService();
  const creancesService = new CreancesClientsService(prismaService);
  const facturesService = new FacturesService(prismaService, creancesService);
  const voyagesService = new VoyagesService(prismaService, syncService, facturesService);
  const vehiculesService = new VehiculesService(prismaService);
  const conducteursService = new ConducteursService(prismaService);

  try {
    console.log('--- Setting up isolated company fixtures ---');

    // Tenant A
    const companyA = await prisma.company.create({
      data: {
        nom: `Tenant-A-${testRunId}`,
      },
    });

    // Tenant B (for multi-tenant isolation test)
    const companyB = await prisma.company.create({
      data: {
        nom: `Tenant-B-${testRunId}`,
      },
    });

    // Client for Tenant A
    const clientA = await prisma.client.create({
      data: {
        companyId: companyA.id,
        nomEntreprise: `Client-A-${testRunId}`,
        statut: 'ACTIF',
      },
    });

    // Client for Tenant B
    const clientB = await prisma.client.create({
      data: {
        companyId: companyB.id,
        nomEntreprise: `Client-B-${testRunId}`,
        statut: 'ACTIF',
      },
    });

    // Active Employees & Conducteurs for Tenant A
    const emp1 = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP1-${testRunId.toString().slice(-4)}`,
        nom: `Nom1-${testRunId.toString().slice(-4)}`,
        prenom: 'DriverOne',
        poste: 'Conducteur',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
        statut: EmployeStatut.ACTIF,
      },
    });
    const driver1 = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        idEmploye: emp1.id,
        nomConducteur: `${emp1.prenom} ${emp1.nom}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    const emp2 = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP2-${testRunId.toString().slice(-4)}`,
        nom: `Nom2-${testRunId.toString().slice(-4)}`,
        prenom: 'DriverTwo',
        poste: 'Conducteur',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
        statut: EmployeStatut.ACTIF,
      },
    });
    const driver2 = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        idEmploye: emp2.id,
        nomConducteur: `${emp2.prenom} ${emp2.nom}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    // Inactive Employee & Conducteur for Tenant A
    const empInactive = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMPIN-${testRunId.toString().slice(-4)}`,
        nom: `NomInact-${testRunId.toString().slice(-4)}`,
        prenom: 'DriverInactive',
        poste: 'Conducteur',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
        statut: EmployeStatut.INACTIF,
      },
    });
    const driverInactive = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        idEmploye: empInactive.id,
        nomConducteur: `${empInactive.prenom} ${empInactive.nom}`,
        statut: ConducteurStatut.EN_VOYAGE, // Initially stuck in EN_VOYAGE to test release logic
      },
    });

    // Vehicles for Tenant A
    const tractor1 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TR1-${testRunId.toString().slice(-5)}`,
        marque: 'Volvo',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const tractor2 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TR2-${testRunId.toString().slice(-5)}`,
        marque: 'Scania',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const trailer1 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TL1-${testRunId.toString().slice(-5)}`,
        marque: 'Kogel',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const trailer2 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TL2-${testRunId.toString().slice(-5)}`,
        marque: 'Schmitz',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    // Vehicle in MAINTENANCE
    const tractorMaint = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `TRM-${testRunId.toString().slice(-5)}`,
        marque: 'Renault',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.MAINTENANCE,
      },
    });

    // Tenant B fixtures
    const empB = await prisma.employe.create({
      data: {
        companyId: companyB.id,
        matricule: `EMPB-${testRunId.toString().slice(-4)}`,
        nom: `NomB-${testRunId.toString().slice(-4)}`,
        prenom: 'DriverB',
        poste: 'Conducteur',
        typeContrat: 'CDI',
        dateEmbauche: new Date(),
        statut: EmployeStatut.ACTIF,
      },
    });
    const driverB = await prisma.conducteur.create({
      data: {
        companyId: companyB.id,
        idEmploye: empB.id,
        nomConducteur: `${empB.prenom} ${empB.nom}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });
    const tractorB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: `TRB-${testRunId.toString().slice(-5)}`,
        marque: 'MAN',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    console.log('✅ Fixtures initialized.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: Deleting an active Voyage releases its tractor, trailer, and driver
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- Test 1: Deleting an active Voyage releases assigned resources ---');
    const v1 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      statut: VoyageStatut.EN_COURS,
    });

    // Verify resources acquired
    const tr1Active = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const tl1Active = await prisma.vehicule.findUnique({ where: { id: trailer1.id } });
    const dr1Active = await prisma.conducteur.findUnique({ where: { id: driver1.id } });
    const v1Acquired =
      tr1Active?.statut === VehiculeStatut.EN_VOYAGE &&
      tl1Active?.statut === VehiculeStatut.EN_VOYAGE &&
      dr1Active?.statut === ConducteurStatut.EN_VOYAGE;

    // Delete active voyage via real service
    await voyagesService.remove(companyA.id, v1.idVoyage);

    const tr1Released = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const tl1Released = await prisma.vehicule.findUnique({ where: { id: trailer1.id } });
    const dr1Released = await prisma.conducteur.findUnique({ where: { id: driver1.id } });

    assertTest(
      1,
      'Deleting active voyage releases tractor, trailer, and driver to DISPONIBLE',
      Boolean(
        v1Acquired &&
          tr1Released?.statut === VehiculeStatut.DISPONIBLE &&
          tl1Released?.statut === VehiculeStatut.DISPONIBLE &&
          dr1Released?.statut === ConducteurStatut.DISPONIBLE,
      ),
      `Tr: ${tr1Released?.statut}, Tl: ${tl1Released?.statut}, Dr: ${dr1Released?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Transitioning EN_COURS -> LIVRE releases eligible resources
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Transitioning EN_COURS -> LIVRE releases eligible resources ---');
    const v2 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Rabat',
      lieuDechargement: 'Marrakech',
      statut: VoyageStatut.EN_COURS,
    });

    await voyagesService.updateStatus(companyA.id, v2.idVoyage, { statut: VoyageStatut.LIVRE });

    const tr1Livre = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const tl1Livre = await prisma.vehicule.findUnique({ where: { id: trailer1.id } });
    const dr1Livre = await prisma.conducteur.findUnique({ where: { id: driver1.id } });

    assertTest(
      2,
      'EN_COURS -> LIVRE releases eligible resources to DISPONIBLE',
      Boolean(
        tr1Livre?.statut === VehiculeStatut.DISPONIBLE &&
          tl1Livre?.statut === VehiculeStatut.DISPONIBLE &&
          dr1Livre?.statut === ConducteurStatut.DISPONIBLE,
      ),
      `Tr: ${tr1Livre?.statut}, Tl: ${tl1Livre?.statut}, Dr: ${dr1Livre?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Cancellation releases eligible resources
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Cancellation releases eligible resources ---');
    const v3 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Fes',
      lieuDechargement: 'Agadir',
      statut: VoyageStatut.EN_COURS,
    });

    await voyagesService.updateStatus(companyA.id, v3.idVoyage, { statut: VoyageStatut.ANNULE });

    const tr1Annule = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const tl1Annule = await prisma.vehicule.findUnique({ where: { id: trailer1.id } });
    const dr1Annule = await prisma.conducteur.findUnique({ where: { id: driver1.id } });

    assertTest(
      3,
      'Cancellation (EN_COURS -> ANNULE) releases eligible resources to DISPONIBLE',
      Boolean(
        tr1Annule?.statut === VehiculeStatut.DISPONIBLE &&
          tl1Annule?.statut === VehiculeStatut.DISPONIBLE &&
          dr1Annule?.statut === ConducteurStatut.DISPONIBLE,
      ),
      `Tr: ${tr1Annule?.statut}, Tl: ${tl1Annule?.statut}, Dr: ${dr1Annule?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Reassigning a tractor releases the old tractor and synchronizes the new one
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Reassigning a tractor on active voyage ---');
    const v4 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Tanger Med',
      lieuDechargement: 'Casablanca',
      statut: VoyageStatut.EN_COURS,
    });

    // Reassign tractor1 -> tractor2
    await voyagesService.update(companyA.id, v4.idVoyage, {
      tracteur: tractor2.immatriculation,
    });

    const oldTractorCheck = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const newTractorCheck = await prisma.vehicule.findUnique({ where: { id: tractor2.id } });

    assertTest(
      4,
      'Reassigning tractor releases old tractor to DISPONIBLE and sets new tractor to EN_VOYAGE',
      Boolean(
        oldTractorCheck?.statut === VehiculeStatut.DISPONIBLE &&
          newTractorCheck?.statut === VehiculeStatut.EN_VOYAGE,
      ),
      `Old Tr: ${oldTractorCheck?.statut}, New Tr: ${newTractorCheck?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Reassigning a trailer releases the old trailer and synchronizes the new one
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Reassigning a trailer on active voyage ---');
    // Reassign trailer1 -> trailer2 on v4
    await voyagesService.update(companyA.id, v4.idVoyage, {
      remorque: trailer2.immatriculation,
    });

    const oldTrailerCheck = await prisma.vehicule.findUnique({ where: { id: trailer1.id } });
    const newTrailerCheck = await prisma.vehicule.findUnique({ where: { id: trailer2.id } });

    assertTest(
      5,
      'Reassigning trailer releases old trailer to DISPONIBLE and sets new trailer to EN_VOYAGE',
      Boolean(
        oldTrailerCheck?.statut === VehiculeStatut.DISPONIBLE &&
          newTrailerCheck?.statut === VehiculeStatut.EN_VOYAGE,
      ),
      `Old Tl: ${oldTrailerCheck?.statut}, New Tl: ${newTrailerCheck?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: Reassigning a driver releases the old driver and synchronizes the new one
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: Reassigning a driver on active voyage ---');
    // Reassign driver1 -> driver2 on v4
    await voyagesService.update(companyA.id, v4.idVoyage, {
      nomConducteur: driver2.nomConducteur,
    });

    const oldDriverCheck = await prisma.conducteur.findUnique({ where: { id: driver1.id } });
    const newDriverCheck = await prisma.conducteur.findUnique({ where: { id: driver2.id } });

    assertTest(
      6,
      'Reassigning driver releases old driver to DISPONIBLE and sets new driver to EN_VOYAGE',
      Boolean(
        oldDriverCheck?.statut === ConducteurStatut.DISPONIBLE &&
          newDriverCheck?.statut === ConducteurStatut.EN_VOYAGE,
      ),
      `Old Dr: ${oldDriverCheck?.statut}, New Dr: ${newDriverCheck?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: Clearing an assignment releases the resource when appropriate
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Clearing trailer assignment on active voyage ---');
    // Clear trailer on v4 (remorque: null)
    await voyagesService.update(companyA.id, v4.idVoyage, {
      remorque: null,
    });

    const clearedTrailerCheck = await prisma.vehicule.findUnique({ where: { id: trailer2.id } });
    assertTest(
      7,
      'Clearing trailer assignment releases trailer to DISPONIBLE',
      clearedTrailerCheck?.statut === VehiculeStatut.DISPONIBLE,
      `Status: ${clearedTrailerCheck?.statut}`,
    );

    // Clean up v4
    await voyagesService.updateStatus(companyA.id, v4.idVoyage, { statut: VoyageStatut.LIVRE });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: A resource used by another active Voyage remains unavailable
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: Resource used by another active Voyage remains unavailable ---');
    // Create active trip with driver1 and tractor1
    const vMulti1 = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Settat',
      statut: VoyageStatut.EN_COURS,
    });

    // In a multi-assignment scenario, if another active trip exists with the same driver or vehicle,
    // releasing one does not free it if another active trip legitimately retains it.
    // We simulate by having a second voyage in DB pointing to tractor1
    const vMulti2 = await prisma.voyage.create({
      data: {
        companyId: companyA.id,
        idClient: clientA.id,
        tracteur: tractor1.immatriculation,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Berrechid',
        statut: VoyageStatut.EN_COURS,
      },
    });

    // Complete vMulti1 - tractor1 should remain EN_VOYAGE because vMulti2 is still EN_COURS
    await voyagesService.updateStatus(companyA.id, vMulti1.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    const tractorMultiCheck = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    assertTest(
      8,
      'Resource used by another active Voyage remains EN_VOYAGE after one Voyage completes',
      tractorMultiCheck?.statut === VehiculeStatut.EN_VOYAGE,
      `Tractor status: ${tractorMultiCheck?.statut}`,
    );

    // Clean up vMulti2
    await prisma.voyage.delete({ where: { idVoyage: vMulti2.idVoyage } });
    await syncService.releaseResources(
      prisma as any,
      { tracteurImmat: tractor1.immatriculation },
      companyA.id,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 9: A vehicle in MAINTENANCE does not become DISPONIBLE after Voyage ends
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 9: Vehicle in MAINTENANCE does not become DISPONIBLE ---');
    // Set tractor1 to MAINTENANCE
    await prisma.vehicule.update({
      where: { id: tractor1.id },
      data: { statut: VehiculeStatut.MAINTENANCE },
    });

    // Run releaseResources for tractor1
    await syncService.releaseResources(
      prisma as any,
      { tracteurImmat: tractor1.immatriculation },
      companyA.id,
    );

    const maintPreserved = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    assertTest(
      9,
      'Vehicle in MAINTENANCE preserves its state and is NOT overwritten to DISPONIBLE',
      maintPreserved?.statut === VehiculeStatut.MAINTENANCE,
      `Status: ${maintPreserved?.statut}`,
    );

    // Reset tractor1 to DISPONIBLE
    await prisma.vehicule.update({
      where: { id: tractor1.id },
      data: { statut: VehiculeStatut.DISPONIBLE },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 10: An inactive or ineligible driver does not become DISPONIBLE after release
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 10: Inactive driver does not become DISPONIBLE on release ---');
    // driverInactive has employee with statut: INACTIF and driver statut: EN_VOYAGE
    await syncService.releaseResources(
      prisma as any,
      { nomConducteur: driverInactive.nomConducteur },
      companyA.id,
    );

    const inactiveDriverCheck = await prisma.conducteur.findUnique({
      where: { id: driverInactive.id },
    });
    assertTest(
      10,
      'Driver with INACTIF employee is released to INACTIF, not DISPONIBLE',
      inactiveDriverCheck?.statut === ConducteurStatut.INACTIF,
      `Status: ${inactiveDriverCheck?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 11: A failed transaction leaves both Voyage and resource states unchanged
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 11: Transaction rollback on failure leaves state unchanged ---');
    const vRollback = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Rabat',
      lieuDechargement: 'Tanger',
      statut: VoyageStatut.PLANIFIE,
    });

    // Verify initial state: DISPONIBLE
    const trBeforeRollback = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });

    // Attempt invalid transition: activating with tractorMaint which is in MAINTENANCE
    let rollbackThrew = false;
    try {
      await voyagesService.update(companyA.id, vRollback.idVoyage, {
        statut: VoyageStatut.EN_COURS,
        tracteur: tractorMaint.immatriculation,
      });
    } catch (err: any) {
      rollbackThrew = true;
    }

    const vAfterRollback = await prisma.voyage.findUnique({ where: { idVoyage: vRollback.idVoyage } });
    const trAfterRollback = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });

    assertTest(
      11,
      'Failed transition rolls back Voyage and resource changes atomically',
      Boolean(
        rollbackThrew &&
          vAfterRollback?.statut === VoyageStatut.PLANIFIE &&
          trAfterRollback?.statut === VehiculeStatut.DISPONIBLE,
      ),
      `Voyage: ${vAfterRollback?.statut}, Tractor: ${trAfterRollback?.statut}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 12: Company A cannot alter or release resources belonging to Company B
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 12: Multi-tenant boundary protection ---');
    // Put Tenant B's tractor in EN_VOYAGE
    await prisma.vehicule.update({
      where: { id: tractorB.id },
      data: { statut: VehiculeStatut.EN_VOYAGE },
    });

    // Attempt release from Tenant A
    await syncService.releaseResources(
      prisma as any,
      { tracteurImmat: tractorB.immatriculation },
      companyA.id, // Scoped to Company A
    );

    const tractorBAfterA = await prisma.vehicule.findUnique({ where: { id: tractorB.id } });
    assertTest(
      12,
      'Tenant A release query does NOT alter or release Tenant B resources',
      tractorBAfterA?.statut === VehiculeStatut.EN_VOYAGE,
      `Tenant B tractor status: ${tractorBAfterA?.statut}`,
    );

    // Clean up Tenant B
    await prisma.vehicule.update({
      where: { id: tractorB.id },
      data: { statut: VehiculeStatut.DISPONIBLE },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 13: Editing a Voyage without changing assignments does not corrupt resources
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 13: Editing Voyage non-resource fields preserves status ---');
    const vNonResource = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Fes Port',
      lieuDechargement: 'Tanger Port',
      statut: VoyageStatut.EN_COURS,
    });

    // Update non-resource fields
    await voyagesService.update(companyA.id, vNonResource.idVoyage, {
      lieuChargement: 'Fes Centre',
      montantVoyage: 5000,
    });

    const trUncorrupted = await prisma.vehicule.findUnique({ where: { id: tractor1.id } });
    const drUncorrupted = await prisma.conducteur.findUnique({ where: { id: driver1.id } });

    assertTest(
      13,
      'Updating non-resource fields on active voyage preserves EN_VOYAGE statuses',
      Boolean(
        trUncorrupted?.statut === VehiculeStatut.EN_VOYAGE &&
          drUncorrupted?.statut === ConducteurStatut.EN_VOYAGE,
      ),
      `Tr: ${trUncorrupted?.statut}, Dr: ${drUncorrupted?.statut}`,
    );

    await voyagesService.updateStatus(companyA.id, vNonResource.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Test 14: Repeated completion, cancellation, or deletion behaves safely
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 14: Idempotent API operations behave safely ---');
    // Complete vNonResource again (already LIVRE)
    const repeatedLivre = await voyagesService.updateStatus(companyA.id, vNonResource.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    let repeatedDeleteThrew = false;
    await voyagesService.remove(companyA.id, vNonResource.idVoyage);
    try {
      await voyagesService.remove(companyA.id, vNonResource.idVoyage);
    } catch (err: any) {
      repeatedDeleteThrew = err.message.includes('introuvable');
    }

    assertTest(
      14,
      'Repeated status update is idempotent; repeated delete returns 404',
      Boolean(repeatedLivre.statut === VoyageStatut.LIVRE && repeatedDeleteThrew),
      `Status: ${repeatedLivre.statut}, Delete 404: ${repeatedDeleteThrew}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Test 15: Dashboard counts reflect the updated resource state after mutations
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 15: Dashboard counts reflect accurate operational states ---');
    const vDash = await voyagesService.create(companyA.id, {
      idClient: clientA.id,
      tracteur: tractor1.immatriculation,
      remorque: trailer1.immatriculation,
      nomConducteur: driver1.nomConducteur,
      lieuChargement: 'Oujda',
      lieuDechargement: 'Nador',
      statut: VoyageStatut.EN_COURS,
    });

    const statsDuring = await voyagesService.findStats(companyA.id);
    const vehStatsDuring = await vehiculesService.findStats(companyA.id);
    const drvStatsDuring = await conducteursService.findStats(companyA.id);

    // Complete trip
    await voyagesService.updateStatus(companyA.id, vDash.idVoyage, {
      statut: VoyageStatut.LIVRE,
    });

    const statsAfter = await voyagesService.findStats(companyA.id);
    const vehStatsAfter = await vehiculesService.findStats(companyA.id);
    const drvStatsAfter = await conducteursService.findStats(companyA.id);

    const enCoursDecremented = statsDuring.enCours === 1 && statsAfter.enCours === 0;
    const livresIncremented = statsAfter.livres === statsDuring.livres + 1;
    const vehEnVoyageDecremented = vehStatsDuring.enVoyage >= 2 && vehStatsAfter.enVoyage === 0;
    const drvEnVoyageDecremented = drvStatsDuring.enVoyage >= 1 && drvStatsAfter.enVoyage === 0;

    assertTest(
      15,
      'Voyage, vehicle, and driver stats accurately reflect state mutations in real time',
      Boolean(
        enCoursDecremented &&
          livresIncremented &&
          vehEnVoyageDecremented &&
          drvEnVoyageDecremented,
      ),
      `Voyages enCours: ${statsDuring.enCours}->${statsAfter.enCours}, Veh enVoyage: ${vehStatsDuring.enVoyage}->${vehStatsAfter.enVoyage}, Drv enVoyage: ${drvStatsDuring.enVoyage}->${drvStatsAfter.enVoyage}`,
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Cleanup disposable test fixtures
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up test fixtures ---');
    await prisma.voyage.deleteMany({
      where: {
        idVoyage: { in: [v2.idVoyage, v3.idVoyage, v4.idVoyage, vRollback.idVoyage, vDash.idVoyage] },
      },
    });

    await prisma.voyage.deleteMany({
      where: {
        companyId: { in: [companyA.id, companyB.id] },
      },
    });

    await prisma.vehicule.deleteMany({
      where: {
        id: {
          in: [tractor1.id, tractor2.id, trailer1.id, trailer2.id, tractorMaint.id, tractorB.id],
        },
      },
    });

    await prisma.conducteur.deleteMany({
      where: {
        id: { in: [driver1.id, driver2.id, driverInactive.id, driverB.id] },
      },
    });

    await prisma.employe.deleteMany({
      where: {
        id: { in: [emp1.id, emp2.id, empInactive.id, empB.id] },
      },
    });

    await prisma.client.deleteMany({
      where: { id: { in: [clientA.id, clientB.id] } },
    });

    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });

    console.log('✅ Cleanup completed successfully.');

    // ──────────────────────────────────────────────────────────────────────────
    // Summary
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n========================================================================');
    console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED OUT OF ${passCount + failCount} INVARIANTS`);
    console.log('========================================================================\n');
  } catch (error: any) {
    console.error(`\n❌ Error during regression suite: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
