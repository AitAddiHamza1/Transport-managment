import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { CarnetEntretienService } from './modules/carnet-entretien/carnet-entretien.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { NotificationsScheduler } from './modules/notifications/notifications.scheduler';
import { getCasablancaDateString, parseCalendarDateToUtc } from './modules/notifications/utils/timezone.util';
import { BadRequestException } from '@nestjs/common';

async function runTests() {
  console.log('========================================================================');
  console.log('RUNNING MAINTENANCE END DATE & EXPIRATION NOTIFICATIONS TEST SUITE');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const depensesService = app.get(DepensesVehiculesService);
  const carnetService = app.get(CarnetEntretienService);
  const notificationsService = app.get(NotificationsService);
  const scheduler = app.get(NotificationsScheduler);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> (${detail})` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  let companyAId: number;
  let companyBId: number;
  let vehicleAImmat = `TEST-A-${timestamp.toString().slice(-5)}`;
  let vehicleBImmat = `TEST-B-${timestamp.toString().slice(-5)}`;

  try {
    // -------------------------------------------------------------
    // SETUP: Two distinct tenant companies with admin users
    // -------------------------------------------------------------
    console.log('[SETUP] Initializing test companies and users...');
    const compA = await prisma.company.create({ data: { nom: `Company Maint Test A ${timestamp}` } });
    companyAId = compA.id;
    const compB = await prisma.company.create({ data: { nom: `Company Maint Test B ${timestamp}` } });
    companyBId = compB.id;

    const roleA = await prisma.role.create({ data: { companyId: companyAId, nom: 'ADMINISTRATEUR' } });
    const roleB = await prisma.role.create({ data: { companyId: companyBId, nom: 'ADMINISTRATEUR' } });

    const userA = await prisma.user.create({
      data: {
        companyId: companyAId,
        nom: 'Admin A',
        email: `adminA.${timestamp}@test.ma`,
        motDePasse: 'hash',
        idRole: roleA.id,
      },
    });

    const userB = await prisma.user.create({
      data: {
        companyId: companyBId,
        nom: 'Admin B',
        email: `adminB.${timestamp}@test.ma`,
        motDePasse: 'hash',
        idRole: roleB.id,
      },
    });

    await prisma.vehicule.create({
      data: {
        companyId: companyAId,
        immatriculation: vehicleAImmat,
        marque: 'Volvo',
        modele: 'FH500',
        typeVehicule: 'CAMION',
      },
    });

    await prisma.vehicule.create({
      data: {
        companyId: companyBId,
        immatriculation: vehicleBImmat,
        marque: 'Scania',
        modele: 'R450',
        typeVehicule: 'CAMION',
      },
    });

    const todayStr = getCasablancaDateString(new Date());
    const today = parseCalendarDateToUtc(todayStr);

    const addDays = (d: Date, days: number): string => {
      const copy = new Date(d.getTime());
      copy.setUTCDate(copy.getUTCDate() + days);
      return copy.toISOString().substring(0, 10);
    };

    const dateIn3Days = addDays(today, 3);
    const dateIn5Days = addDays(today, 5);
    const dateIn10Days = addDays(today, 10);
    const dateIn30Days = addDays(today, 30);
    const dateYesterday = addDays(today, -1);

    // =============================================================
    // TEST 1: Creating a maintenance expense with an end date
    // =============================================================
    const exp1 = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 1500,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Révision générale & Filtres',
      kilometrageRealise: 50000,
      intervalleKm: 10000,
      dateFinEntretien: dateIn5Days,
      notesIntervention: 'Entretien garanti jusqu’à la date de fin',
    });

    const intervention1 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp1.idDepense },
    });

    const intervention1EndDateStr = intervention1?.dateFinEntretien
      ? intervention1.dateFinEntretien.toISOString().substring(0, 10)
      : null;

    assert(
      intervention1 !== null &&
        intervention1EndDateStr === dateIn5Days &&
        intervention1.prochainKmEcheance === 60000,
      'Test 1: Création d’une charge d’entretien avec date de fin d’entretien persistée',
      `dateFinEntretien attendue: ${dateIn5Days}, obtenue: ${intervention1EndDateStr}`,
    );

    // Also assert toDepenseVehiculeView exposes the full maintenanceIntervention object
    const exp1View = await depensesService.findOne(companyAId, exp1.idDepense);
    assert(
      exp1View.maintenanceIntervention !== null &&
        exp1View.maintenanceIntervention?.dateFinEntretien === dateIn5Days &&
        exp1View.maintenanceIntervention?.libelle === 'Révision générale & Filtres',
      'Test 1b: toDepenseVehiculeView retourne l’objet maintenanceIntervention complet avec dateFinEntretien',
    );

    // =============================================================
    // TEST 2: Creating a maintenance expense without an end date
    // =============================================================
    const exp2 = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 800,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Remplacement plaquettes de frein',
      kilometrageRealise: 52000,
      intervalleKm: 5000,
      // dateFinEntretien omitted
    });

    const intervention2 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });

    assert(
      intervention2 !== null &&
        intervention2.dateFinEntretien === null &&
        intervention2.prochainKmEcheance === 57000,
      'Test 2: Création d’une charge sans date de fin d’entretien (dateFinEntretien = null)',
    );

    // =============================================================
    // TEST 3: Editing the end date
    // =============================================================
    await depensesService.update(companyAId, exp1.idDepense, {
      isMaintenanceIntervention: true,
      dateFinEntretien: dateIn10Days,
    });

    const intervention1Updated = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp1.idDepense },
    });

    const updatedEndDateStr = intervention1Updated?.dateFinEntretien
      ? intervention1Updated.dateFinEntretien.toISOString().substring(0, 10)
      : null;

    assert(
      updatedEndDateStr === dateIn10Days,
      'Test 3: Modification de la date de fin d’entretien prise en compte',
      `obtenu: ${updatedEndDateStr}, attendu: ${dateIn10Days}`,
    );

    // =============================================================
    // TEST 4: Invalid date handling
    // =============================================================
    let invalidDateFailedGracefully = false;
    try {
      // Trying to pass an invalid date string
      await depensesService.create(companyAId, {
        immatriculation: vehicleAImmat,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'SANS_FACTURE',
        montant: 500,
        isMaintenanceIntervention: true,
        libelleIntervention: 'Contrôle rapide',
        kilometrageRealise: 50000,
        intervalleKm: 2000,
        dateFinEntretien: 'date-invalide-non-iso',
      } as any);
    } catch (e: any) {
      invalidDateFailedGracefully = true;
    }

    assert(
      invalidDateFailedGracefully,
      'Test 4: Rejet approprié d’une date de fin d’entretien invalide',
    );

    // =============================================================
    // TEST 5: Notification generation within approaching window (default 7 days)
    // =============================================================
    // Create an intervention approaching in 3 days
    const expApproaching = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 1200,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Vidange boîte de vitesses',
      kilometrageRealise: 55000,
      intervalleKm: 10000,
      dateFinEntretien: dateIn3Days,
    });

    const notifResA = await notificationsService.scanMaintenanceExpirationsForCompany(companyAId, today);
    assert(
      notifResA.generatedNotifications >= 1,
      `Test 5: Notification générée pour échéance approchant dans le délai (générées: ${notifResA.generatedNotifications})`,
    );

    const createdNotif = await prisma.notification.findFirst({
      where: {
        companyId: companyAId,
        type: 'MAINTENANCE_EXPIRATION',
        titre: { contains: vehicleAImmat },
        dedupKey: { contains: 'UPCOMING' },
      },
      include: { recipients: true },
    });

    assert(
      createdNotif !== null &&
        createdNotif.message.includes(vehicleAImmat) &&
        createdNotif.message.includes(dateIn3Days) &&
        createdNotif.recipients.length > 0,
      'Test 5b: Contenu de notification conforme (immatriculation, libellé, date, destinataires)',
    );

    // =============================================================
    // TEST 6: No notification outside the window (e.g. 30 days away)
    // =============================================================
    const expFarFuture = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 2000,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Changement courroie de distribution',
      kilometrageRealise: 50000,
      intervalleKm: 50000,
      dateFinEntretien: dateIn30Days,
    });

    const farIntervention = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: expFarFuture.idDepense },
    });

    const notifForFar = await prisma.notification.findFirst({
      where: {
        companyId: companyAId,
        entityId: farIntervention!.id,
      },
    });

    assert(
      notifForFar === null,
      'Test 6: Aucune notification générée hors du délai d’alerte (échéance dans 30 jours)',
    );

    // =============================================================
    // TEST 7: No notification when the end date is missing
    // =============================================================
    const notifForNoEndDate = await prisma.notification.findFirst({
      where: {
        companyId: companyAId,
        entityId: intervention2!.id,
      },
    });

    assert(
      notifForNoEndDate === null,
      'Test 7: Aucune notification générée pour un entretien sans date de fin',
    );

    // =============================================================
    // TEST 8: No duplicate notification across repeated executions (Idempotency)
    // =============================================================
    const countBeforeSecondRun = await prisma.notification.count({ where: { companyId: companyAId } });
    const repeatScan = await notificationsService.scanMaintenanceExpirationsForCompany(companyAId, today);
    const countAfterSecondRun = await prisma.notification.count({ where: { companyId: companyAId } });

    assert(
      countBeforeSecondRun === countAfterSecondRun && repeatScan.duplicatesPrevented > 0,
      `Test 8: Idempotence garantie - Aucun doublon généré (doublons évités: ${repeatScan.duplicatesPrevented})`,
    );

    // =============================================================
    // TEST 9: No notification for another company's records (Multi-Tenant Isolation)
    // =============================================================
    // Company B has no maintenance records yet
    const notifResB = await notificationsService.scanMaintenanceExpirationsForCompany(companyBId, today);
    const countB = await prisma.notification.count({ where: { companyId: companyBId } });

    assert(
      notifResB.generatedNotifications === 0 && countB === 0,
      'Test 9: Isolation multi-tenant respectée - Aucune alerte de Company A reçue par Company B',
    );

    // Verify recipient isolation
    const recipientsA = await prisma.notificationRecipient.findMany({
      where: { notification: { companyId: companyAId } },
      include: { user: true },
    });
    const leakToB = recipientsA.some((r) => r.user.companyId !== companyAId);
    assert(!leakToB, 'Test 9b: Destinataires strictement confinés à leur entreprise');

    // =============================================================
    // TEST 10: Correct behavior for expired maintenance records
    // =============================================================
    const expExpired = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 950,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Contrôle technique périodique',
      kilometrageRealise: 50000,
      intervalleKm: 10000,
      dateFinEntretien: dateYesterday,
    });

    await notificationsService.scanMaintenanceExpirationsForCompany(companyAId, today);

    const expiredIntervention = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: expExpired.idDepense },
    });

    const expiredNotif = await prisma.notification.findFirst({
      where: {
        companyId: companyAId,
        entityId: expiredIntervention!.id,
        dedupKey: { contains: 'OVERDUE' },
      },
    });

    assert(
      expiredNotif !== null &&
        expiredNotif.priorite === 'URGENT' &&
        expiredNotif.titre.includes('expiré') &&
        expiredNotif.message.includes(dateYesterday),
      'Test 10: Traitement conforme des échéances expirées (Priorité URGENT, statut OVERDUE)',
    );

    // =============================================================
    // TEST 11: Existing mileage-based maintenance functionality remains unchanged
    // =============================================================
    // Create an expense with mileage interval
    const expMileageOnly = await depensesService.create(companyAId, {
      immatriculation: vehicleAImmat,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 400,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Permutation des pneus',
      kilometrageRealise: 60000,
      intervalleKm: 5000, // Due at 65000
    });

    const mileageIntervention = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: expMileageOnly.idDepense },
    });

    // Add BonCarburant at 65100 km (OVERDUE on mileage)
    await prisma.bonCarburant.create({
      data: {
        immatriculation: vehicleAImmat,
        litres: 100,
        prixParLitre: 12,
        kilometrage: BigInt(65100),
        dateCarburant: new Date(),
      },
    });

    const situation = await carnetService.findOneIntervention(companyAId, mileageIntervention!.id);

    assert(
      situation.prochainKmEcheance === 65000 &&
        situation.currentVehicleMileage === 65100 &&
        situation.remainingKm === -100 &&
        situation.statut === 'OVERDUE',
      'Test 11: Suivi kilométrique existant 100% opérationnel et intact (OVERDUE à 65100 km pour échéance 65000 km)',
    );

    // =============================================================
    // TEST 12: Scheduler integration
    // =============================================================
    const scheduledRun = await scheduler.runScheduledCheck(today);
    assert(
      scheduledRun.maintenance !== undefined &&
        scheduledRun.maintenance.scannedCompanies >= 2,
      'Test 12: Intégration du balayage automatique dans NotificationsScheduler',
    );
  } finally {
    // Cleanup test data
    console.log('\n[CLEANUP] Cleaning up test data...');
    if (companyAId!) {
      await prisma.notificationRecipient.deleteMany({ where: { notification: { companyId: companyAId } } });
      await prisma.notification.deleteMany({ where: { companyId: companyAId } });
      await prisma.maintenanceIntervention.deleteMany({ where: { companyId: companyAId } });
      await prisma.depenseVehicule.deleteMany({ where: { vehicule: { companyId: companyAId } } });
      await prisma.bonCarburant.deleteMany({ where: { vehicule: { companyId: companyAId } } });
      await prisma.vehicule.deleteMany({ where: { companyId: companyAId } });
      await prisma.user.deleteMany({ where: { companyId: companyAId } });
      await prisma.role.deleteMany({ where: { companyId: companyAId } });
      await prisma.company.deleteMany({ where: { id: companyAId } });
    }
    if (companyBId!) {
      await prisma.notificationRecipient.deleteMany({ where: { notification: { companyId: companyBId } } });
      await prisma.notification.deleteMany({ where: { companyId: companyBId } });
      await prisma.maintenanceIntervention.deleteMany({ where: { companyId: companyBId } });
      await prisma.depenseVehicule.deleteMany({ where: { vehicule: { companyId: companyBId } } });
      await prisma.vehicule.deleteMany({ where: { companyId: companyBId } });
      await prisma.user.deleteMany({ where: { companyId: companyBId } });
      await prisma.role.deleteMany({ where: { companyId: companyBId } });
      await prisma.company.deleteMany({ where: { id: companyBId } });
    }
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
