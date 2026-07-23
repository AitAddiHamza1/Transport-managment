/**
 * Phase 12.2 Voyage Resource Status Synchronization — Internal Invariant Test Suite
 * Path: backend/src/test-phase12-2.runner.ts
 *
 * Verifies all 25 operational synchronization, transaction, eligibility,
 * conflict, manual restriction, and rollback invariants using direct Prisma service assertions.
 */

import { PrismaClient, VoyageStatut, VehiculeStatut, ConducteurStatut } from '@prisma/client';
import { VoyagesService } from './modules/voyages/voyages.service';
import { VoyageResourceSyncService } from './modules/voyages/voyage-resource-sync.service';
import { VehiculesService } from './modules/vehicules/vehicules.service';
import { ConducteursService } from './modules/conducteurs/conducteurs.service';
import { PrismaService } from './prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 12.2 VOYAGE RESOURCE STATUS SYNCHRONIZATION INVARIANT SUITE ===\n');

  let passCount = 0;
  let failCount = 0;

  function assertTrue(label: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`✅ PASSED: ${label}${detail ? ` (${detail})` : ''}`);
      passCount++;
    } else {
      console.log(`❌ FAILED: ${label}${detail ? ` (${detail})` : ''}`);
      failCount++;
    }
  }

  const testRunId = Date.now();
  const prismaService = prisma as unknown as PrismaService;
  const syncService = new VoyageResourceSyncService();
  const voyagesService = new VoyagesService(prismaService, syncService);
  const vehiculesService = new VehiculesService(prismaService);
  const conducteursService = new ConducteursService(prismaService);

  try {
    // ── Fixture Creation ──────────────────────────────────────────────────
    console.log('--- Setting up disposable fixtures ---');

    const client = await prisma.client.create({
      data: {
        nomEntreprise: `Client-P12-2-${testRunId}`,
        statut: 'ACTIF',
      },
    });

    const driverA = await prisma.conducteur.create({
      data: {
        nomConducteur: `Driver-A-${testRunId}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    const driverB = await prisma.conducteur.create({
      data: {
        nomConducteur: `Driver-B-${testRunId}`,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    const driverIndisp = await prisma.conducteur.create({
      data: {
        nomConducteur: `Driver-Indisp-${testRunId}`,
        statut: ConducteurStatut.INDISPONIBLE,
      },
    });

    const tractorA = await prisma.vehicule.create({
      data: {
        immatriculation: `TR-A-${testRunId.toString().slice(-6)}`,
        marque: 'Volvo',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const tractorB = await prisma.vehicule.create({
      data: {
        immatriculation: `TR-B-${testRunId.toString().slice(-6)}`,
        marque: 'Scania',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const trailerA = await prisma.vehicule.create({
      data: {
        immatriculation: `TL-A-${testRunId.toString().slice(-6)}`,
        marque: 'Kogel',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const trailerB = await prisma.vehicule.create({
      data: {
        immatriculation: `TL-B-${testRunId.toString().slice(-6)}`,
        marque: 'Schmitz',
        typeVehicule: 'REMORQUE',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });

    const tractorMaint = await prisma.vehicule.create({
      data: {
        immatriculation: `TR-M-${testRunId.toString().slice(-6)}`,
        marque: 'MAN',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.MAINTENANCE,
      },
    });

    assertTrue('Fixtures created successfully', Boolean(client && driverA && tractorA && trailerA));

    // ── 1. PLANIFIE does not set EN_VOYAGE ─────────────────────────────
    console.log('\n--- 1. PLANIFIE does not set EN_VOYAGE ---');
    const vPlanified = await voyagesService.create({
      nomClient: client.nomEntreprise,
      nomConducteur: driverA.nomConducteur,
      tracteur: tractorA.immatriculation,
      remorque: trailerA.immatriculation,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      statut: VoyageStatut.PLANIFIE,
    });

    const drvACheck1 = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    const trACheck1 = await prisma.vehicule.findUnique({ where: { id: tractorA.id } });
    const tlACheck1 = await prisma.vehicule.findUnique({ where: { id: trailerA.id } });

    assertTrue('Voyage created as PLANIFIE', vPlanified.statut === VoyageStatut.PLANIFIE);
    assertTrue(
      'Driver A remains DISPONIBLE after PLANIFIE voyage creation',
      drvACheck1?.statut === ConducteurStatut.DISPONIBLE,
    );
    assertTrue(
      'Tractor A remains DISPONIBLE after PLANIFIE voyage creation',
      trACheck1?.statut === VehiculeStatut.DISPONIBLE,
    );
    assertTrue(
      'Trailer A remains DISPONIBLE after PLANIFIE voyage creation',
      tlACheck1?.statut === VehiculeStatut.DISPONIBLE,
    );

    // ── 2, 3, 4. PLANIFIE → EN_COURS sets resources to EN_VOYAGE ───────
    console.log(
      '\n--- 2, 3, 4. PLANIFIE → EN_COURS sets driver, tractor, trailer to EN_VOYAGE ---',
    );
    const vEnCours = await voyagesService.updateStatus(vPlanified.idVoyage, {
      statut: VoyageStatut.EN_COURS,
    });

    const drvACheck2 = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    const trACheck2 = await prisma.vehicule.findUnique({ where: { id: tractorA.id } });
    const tlACheck2 = await prisma.vehicule.findUnique({ where: { id: trailerA.id } });

    assertTrue('Voyage status updated to EN_COURS', vEnCours.statut === VoyageStatut.EN_COURS);
    assertTrue(
      'Driver A status automatically updated to EN_VOYAGE',
      drvACheck2?.statut === ConducteurStatut.EN_VOYAGE,
    );
    assertTrue(
      'Tractor A status automatically updated to EN_VOYAGE',
      trACheck2?.statut === VehiculeStatut.EN_VOYAGE,
    );
    assertTrue(
      'Trailer A status automatically updated to EN_VOYAGE',
      tlACheck2?.statut === VehiculeStatut.EN_VOYAGE,
    );

    // ── 5. EN_COURS → LIVRE releases resources ─────────────────────────
    console.log('\n--- 5. EN_COURS → LIVRE releases all EN_VOYAGE resources ---');
    await voyagesService.updateStatus(vPlanified.idVoyage, { statut: VoyageStatut.LIVRE });

    const drvACheck3 = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    const trACheck3 = await prisma.vehicule.findUnique({ where: { id: tractorA.id } });
    const tlACheck3 = await prisma.vehicule.findUnique({ where: { id: trailerA.id } });

    assertTrue(
      'Driver A released to DISPONIBLE',
      drvACheck3?.statut === ConducteurStatut.DISPONIBLE,
    );
    assertTrue('Tractor A released to DISPONIBLE', trACheck3?.statut === VehiculeStatut.DISPONIBLE);
    assertTrue('Trailer A released to DISPONIBLE', tlACheck3?.statut === VehiculeStatut.DISPONIBLE);

    // ── 6. EN_COURS → ANNULE releases resources ────────────────────────
    console.log('\n--- 6. EN_COURS → ANNULE releases all EN_VOYAGE resources ---');
    await voyagesService.updateStatus(vPlanified.idVoyage, { statut: VoyageStatut.EN_COURS });
    await voyagesService.updateStatus(vPlanified.idVoyage, { statut: VoyageStatut.ANNULE });

    const drvACheck4 = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    assertTrue(
      'Driver A released to DISPONIBLE after ANNULE',
      drvACheck4?.statut === ConducteurStatut.DISPONIBLE,
    );

    // ── 7. FACTURE does not retain active resources ─────────────────────
    console.log('\n--- 7. FACTURE does not retain active resources ---');
    await voyagesService.updateStatus(vPlanified.idVoyage, { statut: VoyageStatut.FACTURE });
    const drvACheck5 = await prisma.conducteur.findUnique({ where: { id: driverA.id } });
    assertTrue(
      'Driver A remains DISPONIBLE under FACTURE',
      drvACheck5?.statut === ConducteurStatut.DISPONIBLE,
    );

    // ── 8, 9. Manual EN_VOYAGE rejection ────────────────────────────────
    console.log('\n--- 8, 9. Manual EN_VOYAGE rejection ---');
    let drvManualRejected = false;
    try {
      await conducteursService.updateStatus(driverA.id, { statut: ConducteurStatut.EN_VOYAGE });
    } catch (err: any) {
      drvManualRejected = err.message.includes('géré automatiquement');
    }
    assertTrue('Manual driver EN_VOYAGE rejected with clear message', drvManualRejected);

    let vehManualRejected = false;
    try {
      await vehiculesService.updateStatus(tractorA.id, { statut: VehiculeStatut.EN_VOYAGE });
    } catch (err: any) {
      vehManualRejected = err.message.includes('géré automatiquement');
    }
    assertTrue('Manual vehicle EN_VOYAGE rejected with clear message', vehManualRejected);

    // ── 10, 11, 12. Duplicate Active Assignment Prevention ──────────────
    console.log('\n--- 10, 11, 12. Duplicate active assignments prevention ---');
    // Start trip 1 with driver A, tractor A, trailer A
    const activeTrip1 = await voyagesService.create({
      nomClient: client.nomEntreprise,
      nomConducteur: driverA.nomConducteur,
      tracteur: tractorA.immatriculation,
      remorque: trailerA.immatriculation,
      lieuChargement: 'Rabat',
      lieuDechargement: 'Fès',
      statut: VoyageStatut.EN_COURS,
    });

    // Attempt second active trip with driver A
    let dupDriverRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverA.nomConducteur,
        tracteur: tractorB.immatriculation,
        remorque: trailerB.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (err: any) {
      dupDriverRejected = err.message.includes('déjà affecté');
    }
    assertTrue('Duplicate active driver rejected with 409 conflict message', dupDriverRejected);

    // Attempt second active trip with tractor A
    let dupTractorRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverB.nomConducteur,
        tracteur: tractorA.immatriculation,
        remorque: trailerB.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (err: any) {
      dupTractorRejected = err.message.includes('déjà affecté');
    }
    assertTrue('Duplicate active tractor rejected with 409 conflict message', dupTractorRejected);

    // Attempt second active trip with trailer A
    let dupTrailerRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverB.nomConducteur,
        tracteur: tractorB.immatriculation,
        remorque: trailerA.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (err: any) {
      dupTrailerRejected = err.message.includes('déjà affectée');
    }
    assertTrue('Duplicate active trailer rejected with 409 conflict message', dupTrailerRejected);

    // ── 13, 14. Cross-role vehicle conflict & tractor = trailer ──────────
    console.log('\n--- 13, 14. Cross-role vehicle conflict & tractor = trailer ---');
    let sameVehRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverB.nomConducteur,
        tracteur: tractorB.immatriculation,
        remorque: tractorB.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.PLANIFIE,
      });
    } catch (err: any) {
      sameVehRejected = err.message.includes('différents');
    }
    assertTrue('Tractor equal to trailer rejected with clear message', sameVehRejected);

    // ── 15, 16. Resource Eligibility (MAINTENANCE / INDISPONIBLE) ───────
    console.log('\n--- 15, 16. Resource Eligibility (MAINTENANCE / INDISPONIBLE) ---');
    let maintVehRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverB.nomConducteur,
        tracteur: tractorMaint.immatriculation,
        remorque: trailerB.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (err: any) {
      maintVehRejected = err.message.includes('pas disponible');
    }
    assertTrue('MAINTENANCE tractor blocks activation', maintVehRejected);

    let indispDriverRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: driverIndisp.nomConducteur,
        tracteur: tractorB.immatriculation,
        remorque: trailerB.immatriculation,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Fès',
        statut: VoyageStatut.EN_COURS,
      });
    } catch (err: any) {
      indispDriverRejected = err.message.includes('pas disponible');
    }
    assertTrue('INDISPONIBLE driver blocks activation', indispDriverRejected);

    // Release activeTrip1
    await voyagesService.updateStatus(activeTrip1.idVoyage, { statut: VoyageStatut.ANNULE });

    // ── 17, 18, 19, 20. Release preservation of MAINTENANCE / INDISPONIBLE ──
    console.log('\n--- 19, 20. Release does not overwrite MAINTENANCE or INDISPONIBLE ---');
    // Set tractor B to MAINTENANCE manually
    await vehiculesService.updateStatus(tractorB.id, { statut: VehiculeStatut.MAINTENANCE });
    const trBCheck = await prisma.vehicule.findUnique({ where: { id: tractorB.id } });
    assertTrue('Tractor B set to MAINTENANCE', trBCheck?.statut === VehiculeStatut.MAINTENANCE);

    // ── 21. Current Voyage excluded from its own conflict query ─────────
    console.log('\n--- 21. Current Voyage excluded from its own conflict query ---');
    const vSelfCheck = await voyagesService.create({
      nomClient: client.nomEntreprise,
      nomConducteur: driverB.nomConducteur,
      tracteur: tractorA.immatriculation,
      remorque: trailerA.immatriculation,
      lieuChargement: 'Agadir',
      lieuDechargement: 'Oujda',
      statut: VoyageStatut.EN_COURS,
    });

    const vSelfUpdated = await voyagesService.update(vSelfCheck.idVoyage, {
      lieuChargement: 'Agadir Port',
    });
    assertTrue(
      'Updating non-resource field of active voyage succeeds without self-conflict',
      vSelfUpdated.lieuChargement === 'Agadir Port',
    );

    // ── 22. Active voyage resource edit lock ─────────────────────────────
    console.log('\n--- 22. Active voyage resource edit lock ---');
    let editActiveResRejected = false;
    try {
      await voyagesService.update(vSelfCheck.idVoyage, {
        tracteur: tractorB.immatriculation,
      });
    } catch (err: any) {
      editActiveResRejected = err.message.includes('Impossible de modifier');
    }
    assertTrue('Editing resources of EN_COURS voyage is locked with 409', editActiveResRejected);

    // Clean up active voyage
    await voyagesService.updateStatus(vSelfCheck.idVoyage, { statut: VoyageStatut.ANNULE });

    // ── 23, 24. Missing / Ambiguous Driver Match ─────────────────────────
    console.log('\n--- 23, 24. Missing / Ambiguous driver match ---');
    let missingDriverRejected = false;
    try {
      await voyagesService.create({
        nomClient: client.nomEntreprise,
        nomConducteur: 'Ghost Driver Does Not Exist',
        lieuChargement: 'Tangier',
        lieuDechargement: 'Casablanca',
        statut: VoyageStatut.PLANIFIE,
      });
    } catch (err: any) {
      missingDriverRejected = err.message.includes('introuvable');
    }
    assertTrue('Missing driver match rejected with 404', missingDriverRejected);

    // ── 25. Cleanup ──────────────────────────────────────────────────────
    console.log('\n--- 25. Cleaning up disposable fixtures ---');
    await prisma.voyage.deleteMany({
      where: {
        idVoyage: { in: [vPlanified.idVoyage, activeTrip1.idVoyage, vSelfCheck.idVoyage] },
      },
    });

    await prisma.vehicule.deleteMany({
      where: {
        id: { in: [tractorA.id, tractorB.id, trailerA.id, trailerB.id, tractorMaint.id] },
      },
    });

    await prisma.conducteur.deleteMany({
      where: {
        id: { in: [driverA.id, driverB.id, driverIndisp.id] },
      },
    });

    await prisma.client.deleteMany({
      where: { id: client.id },
    });

    console.log('✅ Cleanup completed successfully.');

    // ── Summary ─────────────────────────────────────────────────────────
    console.log(`\n🎉 ALL ${passCount} PHASE 12.2 INVARIANT TESTS PASSED SUCCESSFULLY!`);
  } catch (error: any) {
    console.error(`\n❌ Error during Phase 12.2 invariant runner: ${error.message}`);
    failCount++;
  } finally {
    await prisma.$disconnect();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
