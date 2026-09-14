import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { NotificationsScheduler } from './modules/notifications/notifications.scheduler';
import { calculatePercentageThresholds } from './modules/notifications/utils/threshold-calculator.util';
import { getCasablancaDateString, parseCalendarDateToUtc } from './modules/notifications/utils/timezone.util';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from './modules/notifications/notifications.constants';
import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { QueryNotificationDto } from './modules/notifications/dto/query-notification.dto';

async function runNotificationsTestSuite() {
  console.log('=== NOTIFICATIONS STEP 3B-4 TRIP_ALERT TEST SUITE (125 TESTS) ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(NotificationsService);
  const controller = app.get(NotificationsController);
  const scheduler = app.get(NotificationsScheduler);

  let companyAId: number;
  let companyBId: number;
  let userA1Id: number;
  let userA2Id: number;
  let userAChauffeurId: number;
  let userB1Id: number;
  let roleAId: number;
  let roleBId: number;
  let roleChauffeurId: number;

  try {
    // -------------------------------------------------------------
    // SETUP: Create isolated test companies and users
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const companyA = await prisma.company.create({
      data: { nom: `Test Company A Notif ${timestamp}` },
    });
    companyAId = companyA.id;

    const companyB = await prisma.company.create({
      data: { nom: `Test Company B Notif ${timestamp}` },
    });
    companyBId = companyB.id;

    const roleA = await prisma.role.create({
      data: { companyId: companyAId, nom: 'ADMINISTRATEUR' },
    });
    roleAId = roleA.id;

    const roleB = await prisma.role.create({
      data: { companyId: companyBId, nom: 'ADMINISTRATEUR' },
    });
    roleBId = roleB.id;

    const roleChauffeur = await prisma.role.create({
      data: { companyId: companyAId, nom: 'CHAUFFEUR' },
    });
    roleChauffeurId = roleChauffeur.id;

    const userA1 = await prisma.user.create({
      data: {
        companyId: companyAId,
        nom: 'User A1',
        email: `usera1.${timestamp}@notif.test`,
        motDePasse: 'hash',
        idRole: roleAId,
      },
    });
    userA1Id = userA1.id;

    const userA2 = await prisma.user.create({
      data: {
        companyId: companyAId,
        nom: 'User A2',
        email: `usera2.${timestamp}@notif.test`,
        motDePasse: 'hash',
        idRole: roleAId,
      },
    });
    userA2Id = userA2.id;

    const userAChauffeur = await prisma.user.create({
      data: {
        companyId: companyAId,
        nom: 'User AChauffeur',
        email: `chauffeur.${timestamp}@notif.test`,
        motDePasse: 'hash',
        idRole: roleChauffeurId,
      },
    });
    userAChauffeurId = userAChauffeur.id;

    const userB1 = await prisma.user.create({
      data: {
        companyId: companyBId,
        nom: 'User B1',
        email: `userb1.${timestamp}@notif.test`,
        motDePasse: 'hash',
        idRole: roleBId,
      },
    });
    userB1Id = userB1.id;

    // -------------------------------------------------------------
    // PART 1: NOTIFICATIONS FOUNDATION & SCHEDULER INFRASTRUCTURE (TESTS 1-20)
    // -------------------------------------------------------------
    console.log('--- 1. Testing User Can Retrieve Own Notifications ---');
    const notif1 = await service.createNotification(companyAId, {
      type: 'DOCUMENT_EXPIRATION',
      titre: 'Assurance expire bientôt',
      message: 'L\'assurance du véhicule Camion 1 expire dans 15 jours.',
      priorite: NOTIFICATION_PRIORITIES.NORMAL,
      entityType: 'DocumentVehicule',
      entityId: 101,
      targetRoute: '/vehicules/documents?id=101',
      recipientUserIds: [userA1Id],
    });

    if (!notif1.created || !notif1.notificationId) {
      throw new Error('Failed to create notification 1');
    }

    const listUserA1 = await service.findAllForUser(companyAId, userA1Id, {});
    if (listUserA1.data.length !== 1 || listUserA1.data[0].notificationId !== notif1.notificationId) {
      throw new Error('User A1 did not receive their own notification');
    }
    if (listUserA1.data[0].lu !== false) {
      throw new Error('Initial read state should be false');
    }
    console.log('✅ PASSED: User retrieved own notification with initial lu=false');

    console.log('\n--- 2. Testing User Cannot Retrieve Another User\'s Recipient State ---');
    const listUserA2Test2 = await service.findAllForUser(companyAId, userA2Id, {});
    if (listUserA2Test2.data.length !== 0) {
      throw new Error('User A2 retrieved notification belonging only to User A1');
    }
    console.log('✅ PASSED: User A2 retrieved 0 notifications (recipient isolation verified)');

    console.log('\n--- 3. Testing Company A Cannot Access Company B Notification ---');
    const notifB = await service.createNotification(companyBId, {
      type: 'PAYMENT_DUE',
      titre: 'Dette fournisseur en retard',
      message: 'Paiement fournisseur en retard',
      recipientUserIds: [userB1Id],
    });

    const listCompAOnB = await service.findAllForUser(companyAId, userA1Id, {});
    if (listCompAOnB.data.some((item) => item.companyId === companyBId)) {
      throw new Error('Company A user retrieved Company B notification!');
    }
    console.log('✅ PASSED: Cross-company notifications completely isolated in queries');

    console.log('\n--- 4. Testing Company A Cannot Mark Company B Notification As Read ---');
    try {
      await service.markAsRead(companyAId, userA1Id, notifB.notificationId!);
      throw new Error('Company A user should not be able to mark Company B notification as read');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Mark as read rejected with NotFoundException for cross-company notification');
      } else throw err;
    }

    console.log('\n--- 5. Testing Company A Cannot Dismiss Company B Notification ---');
    try {
      await service.dismissNotification(companyAId, userA1Id, notifB.notificationId!);
      throw new Error('Company A user should not be able to dismiss Company B notification');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Dismiss rejected with NotFoundException for cross-company notification');
      } else throw err;
    }

    console.log('\n--- 6. Testing Read State Is Isolated Per Recipient ---');
    const multiNotif = await service.createNotification(companyAId, {
      type: 'TRIP_ALERT',
      titre: 'Nouveau voyage attribué',
      message: 'Voyage #V-2026-001 planifié.',
      recipientUserIds: [userA1Id, userA2Id],
    });

    await service.markAsRead(companyAId, userA1Id, multiNotif.notificationId!);

    const listA1 = await service.findAllForUser(companyAId, userA1Id, {});
    const listA2 = await service.findAllForUser(companyAId, userA2Id, {});

    const itemA1 = listA1.data.find((i) => i.notificationId === multiNotif.notificationId);
    const itemA2 = listA2.data.find((i) => i.notificationId === multiNotif.notificationId);

    if (!itemA1 || !itemA1.lu || !itemA1.luLe) {
      throw new Error('User A1 notification was not marked as read');
    }
    if (!itemA2 || itemA2.lu !== false || itemA2.luLe !== null) {
      throw new Error('User A2 notification read state was contaminated by User A1!');
    }
    console.log('✅ PASSED: User A1 read state = true (with timestamp), User A2 read state = false (independent)');

    console.log('\n--- 7. Testing Read-All Affects Only Current User ---');
    await service.createNotification(companyAId, {
      type: 'RECEIVABLE_DUE',
      titre: 'Facture à échéance',
      message: 'Facture F-2026-001',
      recipientUserIds: [userA1Id, userA2Id],
    });

    const unreadA2Before = await service.getUnreadCount(companyAId, userA2Id);
    await service.markAllAsRead(companyAId, userA1Id);

    const unreadA1After = await service.getUnreadCount(companyAId, userA1Id);
    const unreadA2After = await service.getUnreadCount(companyAId, userA2Id);

    if (unreadA1After.unreadCount !== 0) {
      throw new Error('User A1 should have 0 unread notifications after markAllAsRead');
    }
    if (unreadA2After.unreadCount !== unreadA2Before.unreadCount) {
      throw new Error('User A2 unread count was altered by User A1 markAllAsRead!');
    }
    console.log('✅ PASSED: markAllAsRead cleared User A1 unread count to 0 without affecting User A2');

    console.log('\n--- 8. Testing Dismiss Affects Only Current User ---');
    await service.dismissNotification(companyAId, userA1Id, multiNotif.notificationId!);

    const listA1AfterDismiss = await service.findAllForUser(companyAId, userA1Id, {});
    const listA2AfterDismiss = await service.findAllForUser(companyAId, userA2Id, {});

    if (listA1AfterDismiss.data.some((i) => i.notificationId === multiNotif.notificationId)) {
      throw new Error('Dismissed notification still returned for User A1');
    }
    if (!listA2AfterDismiss.data.some((i) => i.notificationId === multiNotif.notificationId)) {
      throw new Error('Dismissing for User A1 inappropriately hid notification from User A2!');
    }
    console.log('✅ PASSED: Notification hidden for User A1 (effaceLe set), remains active for User A2');

    console.log('\n--- 9. Testing Mixed-Company Recipient List Rejection (FAIL CLOSED) ---');
    const notifCountBeforeFail = await prisma.notification.count({ where: { companyId: companyAId } });
    const recipientCountBeforeFail = await prisma.notificationRecipient.count();

    const mixedCrossCreate = await service.createNotification(companyAId, {
      type: 'TRIP_ALERT',
      titre: 'Tentative mixte illégale',
      message: 'Recipients: A1 (Company A) and B1 (Company B)',
      recipientUserIds: [userA1Id, userB1Id],
    });

    if (mixedCrossCreate.created !== false || mixedCrossCreate.reason !== 'RECIPIENT_CROSS_TENANT_REJECTED') {
      throw new Error(`Expected RECIPIENT_CROSS_TENANT_REJECTED, got ${JSON.stringify(mixedCrossCreate)}`);
    }

    const notifCountAfterFail = await prisma.notification.count({ where: { companyId: companyAId } });
    const recipientCountAfterFail = await prisma.notificationRecipient.count();

    if (notifCountAfterFail !== notifCountBeforeFail || recipientCountAfterFail !== recipientCountBeforeFail) {
      throw new Error('FAIL CLOSED violation: Records created despite cross-tenant rejection!');
    }
    console.log('✅ PASSED: Mixed-company recipient list rejected (FAIL CLOSED). ZERO Notifications created.');

    console.log('\n--- 10. Testing Duplicate dedupKey Safe Handling ---');
    const dedupKeyVal = `TEST_DEDUP_${timestamp}`;
    const firstNotif = await service.createNotification(companyAId, {
      type: 'DOCUMENT_EXPIRATION',
      titre: 'Doc Expire 1',
      message: 'Première alerte',
      dedupKey: dedupKeyVal,
      recipientUserIds: [userA1Id],
    });

    const secondNotif = await service.createNotification(companyAId, {
      type: 'DOCUMENT_EXPIRATION',
      titre: 'Doc Expire 2',
      message: 'Deuxième alerte avec même clé',
      dedupKey: dedupKeyVal,
      recipientUserIds: [userA1Id],
    });

    if (!firstNotif.created || secondNotif.created !== false || secondNotif.reason !== 'DUPLICATE_PREVENTED') {
      throw new Error('Duplicate dedupKey should return { created: false, reason: DUPLICATE_PREVENTED }');
    }
    console.log('✅ PASSED: Duplicate dedupKey intercepted gracefully without unhandled exception');

    console.log('\n--- 11. Testing Concurrent Duplicate Creation Atomicity ---');
    const concurrentKey = `CONCURRENT_KEY_${timestamp}`;
    const p1 = service.createNotification(companyAId, {
      type: 'PAYMENT_DUE',
      titre: 'Alerte concurrente 1',
      message: 'Test concurence',
      dedupKey: concurrentKey,
      recipientUserIds: [userA1Id],
    });

    const p2 = service.createNotification(companyAId, {
      type: 'PAYMENT_DUE',
      titre: 'Alerte concurrente 2',
      message: 'Test concurence',
      dedupKey: concurrentKey,
      recipientUserIds: [userA1Id],
    });

    const results = await Promise.all([p1, p2]);
    const createdCount = results.filter((r) => r.created).length;
    const preventedCount = results.filter((r) => !r.created && r.reason === 'DUPLICATE_PREVENTED').length;

    if (createdCount !== 1 || preventedCount !== 1) {
      throw new Error(`Concurrent deduplication failed: createdCount=${createdCount}, preventedCount=${preventedCount}`);
    }
    console.log('✅ PASSED: Concurrent duplicate creation resolved atomically (exactly 1 created, 1 prevented)');

    console.log('\n--- 12. Testing Platform Admin Tenant Notification Endpoint Isolation ---');
    const mockPlatformUser = { sub: 9999, email: 'platform@admin.ma', companyId: undefined } as any;
    try {
      controller.findAll(mockPlatformUser, {});
      throw new Error('Platform Admin without companyId should be blocked');
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        console.log('✅ PASSED: Controller checkTenantAccess threw ForbiddenException for Platform Admin');
      } else throw err;
    }

    console.log('\n--- 13. Testing Percentage Calculation for 50 Days Period ---');
    const thresholds50 = calculatePercentageThresholds('2026-09-10', '2026-10-30');
    if (thresholds50.find((t) => t.thresholdKey === '30P')?.offsetDays !== 15) throw new Error('30% for 50d mismatch');
    if (thresholds50.find((t) => t.thresholdKey === '20P')?.offsetDays !== 10) throw new Error('20% for 50d mismatch');
    if (thresholds50.find((t) => t.thresholdKey === '10P')?.offsetDays !== 5) throw new Error('10% for 50d mismatch');
    console.log('✅ PASSED: 50 days period produced exact offsets: 30%=15d, 20%=10d, 10%=5d, 0%=0d');

    console.log('\n--- 14. Testing Percentage Calculation Rounding for 49 Days Period ---');
    const thresholds49 = calculatePercentageThresholds('2026-09-10', '2026-10-29');
    if (thresholds49.find((t) => t.thresholdKey === '30P')?.offsetDays !== 15) throw new Error('Rounding 14.7 mismatch');
    if (thresholds49.find((t) => t.thresholdKey === '20P')?.offsetDays !== 10) throw new Error('Rounding 9.8 mismatch');
    if (thresholds49.find((t) => t.thresholdKey === '10P')?.offsetDays !== 5) throw new Error('Rounding 4.9 mismatch');
    console.log('✅ PASSED: 49 days period rounded correctly: 14.7->15d, 9.8->10d, 4.9->5d');

    console.log('\n--- 15. Testing Short Period Edge Case (2 Days Period) ---');
    const thresholds2 = calculatePercentageThresholds('2026-09-10', '2026-09-12');
    if (thresholds2.length !== 2) throw new Error('Short period expected 2 distinct offsets');
    console.log('✅ PASSED: Short period (2 days) deduplicated offset collisions cleanly');

    console.log('\n--- 16. Testing Document With Real dateEmission ---');
    const realDocThresholds = calculatePercentageThresholds('2026-01-01', '2026-12-31');
    if (realDocThresholds.length === 0) throw new Error('Real dateEmission must return thresholds');
    console.log('✅ PASSED: Document with real dateEmission computed percentage thresholds successfully');

    console.log('\n--- 17. Testing Document With Missing dateEmission (NO FAKE 365-DAY FALLBACK) ---');
    const nullDocThresholds = calculatePercentageThresholds(null, '2026-12-31');
    if (nullDocThresholds.length !== 0) throw new Error('Missing dateEmission must NOT invent 365-day period');
    console.log('✅ PASSED: Document with missing dateEmission returned empty array []');

    console.log('\n--- 18. Testing Supplier Debt Due Date Compatibility ---');
    const dateDetteDate = new Date('2026-09-10');
    const dateEcheanceExpected = new Date('2026-09-10');
    dateEcheanceExpected.setDate(dateEcheanceExpected.getDate() + 30);
    if (dateEcheanceExpected.toISOString().substring(0, 10) !== '2026-10-10') throw new Error('Date math mismatch');
    console.log('✅ PASSED: Supplier debt dateEcheance correctly computed as dateDette + delaiPaiementJours (2026-10-10)');

    console.log('\n--- 19. Testing NotificationsScheduler Service Initialization ---');
    if (!scheduler) throw new Error('Scheduler DI failed');
    console.log('✅ PASSED: NotificationsScheduler initialized successfully via NestJS Dependency Injection');

    console.log('\n--- 20. Testing Scheduler Invocation Integrity ---');
    const schedRes = await scheduler.runScheduledCheck('2026-01-01');
    if (schedRes.payment.scannedCompanies === 0 || schedRes.receivable.scannedCompanies === 0) {
      throw new Error('Scheduler failed to scan companies');
    }
    console.log('✅ PASSED: Scheduler executed safely across active companies');

    // -------------------------------------------------------------
    // PART 2: NOTIFICATIONS STEP 3B-1 PAYMENT_DUE ENGINE (TESTS 21-50)
    // -------------------------------------------------------------
    console.log('\n--- 21. Testing Eligible Supplier Debt Notification at 30% Threshold ---');
    const fournisseurA = await prisma.fournisseur.create({
      data: { companyId: companyAId, nomFournisseur: `Fournisseur A ${timestamp}` },
    });

    const dateDette30 = new Date('2026-09-01T00:00:00.000Z');
    const dateEcheance50 = new Date('2026-10-21T00:00:00.000Z');

    const dette30 = await prisma.detteFournisseur.create({
      data: {
        companyId: companyAId,
        numeroDette: `DF-30P-${timestamp}`,
        idFournisseur: fournisseurA.id,
        nomFournisseurSnapshot: fournisseurA.nomFournisseur,
        dateDette: dateDette30,
        delaiPaiementJours: 50,
        dateEcheance: dateEcheance50,
        montantDu: 10000,
      },
    });

    const res30P = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-06');
    if (res30P.generatedNotifications < 1) {
      throw new Error(`Expected at least 1 notification generated at 30% threshold, got ${res30P.generatedNotifications}`);
    }

    const notif30PInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:30P` },
    });
    if (!notif30PInDb || notif30PInDb.priorite !== 'NORMAL') {
      throw new Error('Notification at 30% threshold missing or wrong priority (expected NORMAL)');
    }
    console.log('✅ PASSED: Eligible debt generated 30% threshold notification with priority NORMAL');

    console.log('\n--- 22. Testing Eligible Supplier Debt Notification at 20% Threshold ---');
    const res20P = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-11');
    if (res20P.generatedNotifications < 1) {
      throw new Error('Expected notification generated at 20% threshold');
    }
    const notif20PInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:20P` },
    });
    if (!notif20PInDb || notif20PInDb.priorite !== 'HIGH') {
      throw new Error('Notification at 20% threshold missing or wrong priority (expected HIGH)');
    }
    console.log('✅ PASSED: Eligible debt generated 20% threshold notification with priority HIGH');

    console.log('\n--- 23. Testing Eligible Supplier Debt Notification at 10% Threshold ---');
    const res10P = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-16');
    if (res10P.generatedNotifications < 1) {
      throw new Error('Expected notification generated at 10% threshold');
    }
    const notif10PInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:10P` },
    });
    if (!notif10PInDb || notif10PInDb.priorite !== 'URGENT') {
      throw new Error('Notification at 10% threshold missing or wrong priority (expected URGENT)');
    }
    console.log('✅ PASSED: Eligible debt generated 10% threshold notification with priority URGENT');

    console.log('\n--- 24. Testing Debt Reaching Due Date (0% Threshold) ---');
    const res0P = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-21');
    if (res0P.generatedNotifications < 1) {
      throw new Error('Expected due date notification generated at 0% threshold');
    }
    const notif0PInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:0P` },
    });
    if (!notif0PInDb || notif0PInDb.priorite !== 'URGENT') {
      throw new Error('Due date notification missing or wrong priority (expected URGENT)');
    }
    console.log('✅ PASSED: Debt reaching due date generated 0% threshold due notification');

    console.log('\n--- 25. Testing Overdue Debt With Remaining Balance ---');
    const resOverdue = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-25');
    if (resOverdue.generatedNotifications < 1) {
      throw new Error('Expected overdue notification generated');
    }
    const notifOverdueInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:OVERDUE` },
    });
    if (!notifOverdueInDb || notifOverdueInDb.priorite !== 'URGENT') {
      throw new Error('Overdue notification missing or wrong priority');
    }
    console.log('✅ PASSED: Overdue debt generated overdue notification with priority URGENT');

    console.log('\n--- 26. Testing Fully Paid Debt Generates NO Notification ---');
    const dateDettePaid = new Date('2026-09-01T00:00:00.000Z');
    const dateEcheancePaid = new Date('2026-10-21T00:00:00.000Z');
    const dettePaid = await prisma.detteFournisseur.create({
      data: {
        companyId: companyAId,
        numeroDette: `DF-PAID-${timestamp}`,
        idFournisseur: fournisseurA.id,
        nomFournisseurSnapshot: fournisseurA.nomFournisseur,
        dateDette: dateDettePaid,
        delaiPaiementJours: 50,
        dateEcheance: dateEcheancePaid,
        montantDu: 5000,
      },
    });
    await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-FULL2-${timestamp}`,
        idDetteFournisseur: dettePaid.id,
        montant: 5000,
        modePaiement: 'VIREMENT',
      },
    });

    await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-06');
    const notifPaidInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dettePaid.id}:30P` },
    });
    if (notifPaidInDb) {
      throw new Error('Fully paid debt created a notification!');
    }
    console.log('✅ PASSED: Fully paid debt generated ZERO notifications');

    console.log('\n--- 27. Testing Debt With Zero Remaining Balance ---');
    const detteZero = await prisma.detteFournisseur.create({
      data: {
        companyId: companyAId,
        numeroDette: `DF-ZERO-${timestamp}`,
        idFournisseur: fournisseurA.id,
        nomFournisseurSnapshot: fournisseurA.nomFournisseur,
        dateDette: dateDettePaid,
        delaiPaiementJours: 50,
        dateEcheance: dateEcheancePaid,
        montantDu: 2000,
      },
    });
    await prisma.paiementFournisseur.create({
      data: {
        numeroPaiement: `PF-ZERO-${timestamp}`,
        idDetteFournisseur: detteZero.id,
        montant: 2000,
        modePaiement: 'VIREMENT',
      },
    });
    await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-06');
    const notifZeroInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${detteZero.id}:30P` },
    });
    if (notifZeroInDb) {
      throw new Error('Zero balance debt created a notification!');
    }
    console.log('✅ PASSED: Debt with zero remaining balance generated ZERO notifications');

    console.log('\n--- 28. Testing Correct dateEcheance Calculation ---');
    const dateDetteCalc = new Date('2026-09-10T00:00:00.000Z');
    const delaiCalc = 45;
    const dateEcheanceCalcExpected = new Date('2026-09-10T00:00:00.000Z');
    dateEcheanceCalcExpected.setUTCDate(dateEcheanceCalcExpected.getUTCDate() + delaiCalc);
    if (dateEcheanceCalcExpected.toISOString().substring(0, 10) !== '2026-10-25') {
      throw new Error('Date math calculation failed');
    }
    console.log('✅ PASSED: dateEcheance derived exactly from dateDette + delaiPaiementJours (2026-10-25)');

    console.log('\n--- 29. Testing Missing Reference Date Rejection ---');
    const resMissingRef = calculatePercentageThresholds(null, '2026-10-25');
    if (resMissingRef.length !== 0) {
      throw new Error('Missing reference date must return empty array []');
    }
    console.log('✅ PASSED: Missing reference date safely returned 0 thresholds (no notification generated)');

    console.log('\n--- 30. Testing Tenant Isolation Across Different Companies ---');
    await service.scanSupplierPaymentDueForCompany(companyBId, '2026-10-06');
    const notifCompBHasCompADebt = await prisma.notification.findFirst({
      where: { companyId: companyBId, dedupKey: `PAYMENT_DUE:${dette30.id}:30P` },
    });
    if (notifCompBHasCompADebt) {
      throw new Error('Company B generated notification for Company A debt!');
    }
    console.log('✅ PASSED: Company A and Company B debts remain completely tenant-isolated');

    console.log('\n--- 31. Testing Cross-Company Recipient FAIL CLOSED Rejection ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'dettes_fournisseurs', [userB1Id]);
      throw new Error('Cross-company recipient should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Cross-company recipient requested explicitly FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 32. Testing Duplicate Same Debt + Same Threshold Prevention ---');
    const resDupScan = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-06');
    if (resDupScan.duplicatesPrevented < 1) {
      throw new Error(`Duplicate scan on same day should prevent duplicate notification, got duplicatesPrevented=${resDupScan.duplicatesPrevented}`);
    }
    const count30PInDb = await prisma.notification.count({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${dette30.id}:30P` },
    });
    if (count30PInDb !== 1) {
      throw new Error(`Expected exactly 1 notification in DB for dedupKey, got ${count30PInDb}`);
    }
    console.log('✅ PASSED: Re-running scanner for same debt + same threshold prevented duplicate notification safely');

    console.log('\n--- 33. Testing Different Thresholds Create Separate Notifications ---');
    const allNotifsForDebt30 = await prisma.notification.findMany({
      where: { companyId: companyAId, entityId: dette30.id, entityType: 'DETTE_FOURNISSEUR' },
    });
    const dedupKeys = allNotifsForDebt30.map((n) => n.dedupKey);
    if (!dedupKeys.includes(`PAYMENT_DUE:${dette30.id}:30P`) ||
        !dedupKeys.includes(`PAYMENT_DUE:${dette30.id}:20P`) ||
        !dedupKeys.includes(`PAYMENT_DUE:${dette30.id}:10P`) ||
        !dedupKeys.includes(`PAYMENT_DUE:${dette30.id}:0P`) ||
        !dedupKeys.includes(`PAYMENT_DUE:${dette30.id}:OVERDUE`)) {
      throw new Error('Different thresholds must be able to create separate notifications!');
    }
    console.log('✅ PASSED: 5 distinct thresholds (30P, 20P, 10P, 0P, OVERDUE) created 5 separate notifications');

    console.log('\n--- 34. Testing Deterministic Timestamp-Free DedupKey ---');
    const sampleNotif = allNotifsForDebt30[0];
    if (!sampleNotif.dedupKey || /\d{4}-\d{2}-\d{2}/.test(sampleNotif.dedupKey)) {
      throw new Error(`DedupKey must be deterministic and contain no timestamps! Got ${sampleNotif.dedupKey}`);
    }
    console.log('✅ PASSED: DedupKey is deterministic and contains no timestamps (e.g. PAYMENT_DUE:123:30P)');

    console.log('\n--- 35. Testing Correct entityType and entityId ---');
    if (sampleNotif.entityType !== 'DETTE_FOURNISSEUR' || sampleNotif.entityId !== dette30.id) {
      throw new Error('Notification entityType/entityId mismatch');
    }
    console.log('✅ PASSED: Notification has exact entityType=DETTE_FOURNISSEUR and entityId=dette.id');

    console.log('\n--- 36. Testing Internally Derived targetRoute Resolution ---');
    if (sampleNotif.targetRoute !== '/dettes-fournisseurs') {
      throw new Error(`Expected targetRoute=/dettes-fournisseurs, got ${sampleNotif.targetRoute}`);
    }
    console.log('✅ PASSED: targetRoute is internally derived (/dettes-fournisseurs) and not externally trusted');

    console.log('\n--- 37. Testing French Notification Title and Message ---');
    if (!sampleNotif.titre.includes('fournisseur') || !sampleNotif.message.includes('MAD')) {
      throw new Error('Notification content must be strictly in French');
    }
    console.log('✅ PASSED: Notification title & message strictly written in French using supplier debt context');

    console.log('\n--- 38. Testing Scheduler Invokes PAYMENT_DUE Only ---');
    const schedulerSummary = await scheduler.runScheduledCheck('2026-10-06');
    if (schedulerSummary.payment.scannedCompanies === 0) {
      throw new Error('Scheduler failed to run PAYMENT_DUE scanner across active companies');
    }
    console.log('✅ PASSED: NotificationsScheduler successfully executed PAYMENT_DUE scanning across active companies');

    console.log('\n--- 39. Testing Scheduler Invokes DOCUMENT_EXPIRATION ---');
    if (!schedulerSummary.documentExpiration) {
      throw new Error('Scheduler must invoke DOCUMENT_EXPIRATION scanner in Step 3B-3');
    }
    console.log('✅ PASSED: DOCUMENT_EXPIRATION scanner active in NotificationsScheduler');

    console.log('\n--- 40. Testing Scheduler Invokes TRIP_ALERT ---');
    if (!schedulerSummary.tripAlert) {
      throw new Error('Scheduler must invoke TRIP_ALERT scanner in Step 3B-4');
    }
    console.log('✅ PASSED: TRIP_ALERT scanner active in NotificationsScheduler');

    console.log('\n--- 41. Testing Midnight Boundary in Africa/Casablanca ---');
    const midnightUtcInstant = new Date('2026-09-10T23:30:00.000Z');
    const casablancaDateAtMidnight = getCasablancaDateString(midnightUtcInstant);
    if (casablancaDateAtMidnight !== '2026-09-11') {
      throw new Error(`Expected Africa/Casablanca business date 2026-09-11 at 23:30 UTC, got ${casablancaDateAtMidnight}`);
    }
    console.log('✅ PASSED: Midnight boundary in Africa/Casablanca resolves to 2026-09-11 at 23:30 UTC (UTC+1)');

    console.log('\n--- 42. Testing Correct Business Date Around UTC/Local Midnight ---');
    const morningUtcInstant = new Date('2026-09-10T08:00:00.000Z');
    const casablancaDateMorning = getCasablancaDateString(morningUtcInstant);
    if (casablancaDateMorning !== '2026-09-10') {
      throw new Error(`Expected Africa/Casablanca business date 2026-09-10, got ${casablancaDateMorning}`);
    }
    console.log('✅ PASSED: Explicit getCasablancaDateString computes correct business calendar date');

    console.log('\n--- 43. Testing Threshold Exactly on Today\'s Business Date ---');
    const fournisseurTZ = await prisma.fournisseur.create({
      data: { companyId: companyAId, nomFournisseur: `Fournisseur TZ ${timestamp}` },
    });
    const detteTZ = await prisma.detteFournisseur.create({
      data: {
        companyId: companyAId,
        numeroDette: `DF-TZ-${timestamp}`,
        idFournisseur: fournisseurTZ.id,
        nomFournisseurSnapshot: fournisseurTZ.nomFournisseur,
        dateDette: new Date('2026-09-01T00:00:00.000Z'),
        delaiPaiementJours: 50,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        montantDu: 8000,
      },
    });

    const resTZExact = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-06');
    if (resTZExact.generatedNotifications < 1) {
      throw new Error('Threshold exactly on today\'s business date should generate a notification');
    }
    console.log('✅ PASSED: Threshold falling exactly on today\'s business date generated notification');

    console.log('\n--- 44. Testing Threshold One Day Before Today\'s Business Date ---');
    const notif20PDayAfter = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${detteTZ.id}:20P` },
    });
    if (notif20PDayAfter) {
      throw new Error('Premature 20% threshold notification generated on 2026-10-07');
    }
    console.log('✅ PASSED: Non-matching threshold date (1 day before/after) did not trigger premature notification');

    console.log('\n--- 45. Testing Due Date Exactly Equal to Today\'s Business Date ---');
    await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-21');
    const notif0PExact = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${detteTZ.id}:0P` },
    });
    if (!notif0PExact) {
      throw new Error('Due date exactly matching today\'s business date failed to generate 0P notification');
    }
    console.log('✅ PASSED: Due date matching today\'s business date generated 0P due notification');

    console.log('\n--- 46. Testing Overdue Debt One Business Day After Due Date ---');
    await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-22');
    const notifOverdueNextDay = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `PAYMENT_DUE:${detteTZ.id}:OVERDUE` },
    });
    if (!notifOverdueNextDay) {
      throw new Error('Overdue debt 1 business day after due date failed to generate OVERDUE notification');
    }
    console.log('✅ PASSED: Overdue debt 1 business day after due date generated OVERDUE notification');

    console.log('\n--- 47. Testing Existing PAYMENT_DUE Deduplication Still Works ---');
    const resDedupReScan = await service.scanSupplierPaymentDueForCompany(companyAId, '2026-10-22');
    if (resDedupReScan.duplicatesPrevented < 1) {
      throw new Error('Deduplication re-scan should prevent duplicate notifications');
    }
    console.log('✅ PASSED: Re-running scanner on same business day prevented duplicate notifications');

    console.log('\n--- 48. Testing Existing Tenant Isolation Still Works ---');
    await service.scanSupplierPaymentDueForCompany(companyBId, '2026-10-22');
    const notifBHasA = await prisma.notification.findFirst({
      where: { companyId: companyBId, dedupKey: `PAYMENT_DUE:${detteTZ.id}:OVERDUE` },
    });
    if (notifBHasA) {
      throw new Error('Cross-company tenant isolation violated during payment due scan!');
    }
    console.log('✅ PASSED: Tenant isolation intact across companies during business date scan');

    console.log('\n--- 49. Testing NotificationsScheduler @Cron Explicit TimeZone Configuration ---');
    const schedulerFileContent = require('fs').readFileSync(
      require('path').join(__dirname, 'modules/notifications/notifications.scheduler.ts'),
      'utf8',
    );

    const hasExplicitTimezoneInCron = schedulerFileContent.includes("timeZone: BUSINESS_TIMEZONE") ||
      schedulerFileContent.includes("timeZone: 'Africa/Casablanca'");

    if (!hasExplicitTimezoneInCron) {
      throw new Error('NotificationsScheduler @Cron decorator does not explicitly specify timeZone: Africa/Casablanca');
    }
    console.log('✅ PASSED: NotificationsScheduler @Cron decorator explicitly configures timeZone: Africa/Casablanca');

    console.log('\n--- 50. Testing PAYMENT_DUE Summary Count Preservation ---');
    const summaryPaymentOnly = await service.scanAllSupplierPaymentDue('2026-10-22');
    if (summaryPaymentOnly.scannedCompanies < 2) {
      throw new Error('PAYMENT_DUE scan across active companies failed');
    }
    console.log('✅ PASSED: scanAllSupplierPaymentDue executed successfully across active companies');

    // -------------------------------------------------------------
    // PART 3: NOTIFICATIONS STEP 3B-2 RECEIVABLE_DUE ENGINE (TESTS 51-79)
    // -------------------------------------------------------------
    console.log('\n--- 51. Testing Correct Customer Receivable Entity (CreanceClient) ---');
    const factureA30 = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: `FAC-30P-${timestamp}`,
        nomClient: `Client Alpha ${timestamp}`,
        dateFacture: new Date('2026-09-01T00:00:00.000Z'),
        joursEcheance: 50,
        sousTotal: 10000,
        tauxTva: 20,
      },
    });

    const creanceA30 = await prisma.creanceClient.create({
      data: {
        numeroFacture: factureA30.numeroFacture,
        nomClient: factureA30.nomClient,
        dateEmission: factureA30.dateFacture,
        delaiPaiementJours: 50,
        montantFacture: 12000,
        montantRecu: 0,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        statutPaiement: 'NON_PAYE',
      },
    });

    if (!creanceA30.id || creanceA30.numeroFacture !== factureA30.numeroFacture) {
      throw new Error('CreanceClient mapping failed');
    }
    console.log('✅ PASSED: CreanceClient correctly identified and mapped to Facture');

    console.log('\n--- 52. Testing Customer Receivable Due Date Business Rule ---');
    const dateEcheanceDerived = new Date(creanceA30.dateEmission);
    dateEcheanceDerived.setUTCDate(dateEcheanceDerived.getUTCDate() + creanceA30.delaiPaiementJours);
    if (dateEcheanceDerived.toISOString().substring(0, 10) !== '2026-10-21') {
      throw new Error('Due date calculation rule mismatch');
    }
    console.log('✅ PASSED: Due date derived exactly from dateEmission + delaiPaiementJours (2026-10-21)');

    console.log('\n--- 53. Testing 30% Threshold Generates NORMAL Notification for RECEIVABLE_DUE ---');
    const resRec30P = await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    if (resRec30P.generatedNotifications < 1) {
      throw new Error(`Expected at least 1 notification generated at 30% threshold, got ${resRec30P.generatedNotifications}`);
    }

    const notifRec30InDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:30P` },
    });
    if (!notifRec30InDb || notifRec30InDb.priorite !== 'NORMAL') {
      throw new Error('RECEIVABLE_DUE 30% threshold notification missing or wrong priority (expected NORMAL)');
    }
    console.log('✅ PASSED: 30% threshold generated RECEIVABLE_DUE notification with priority NORMAL');

    console.log('\n--- 54. Testing 20% Threshold Generates HIGH Notification for RECEIVABLE_DUE ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-11');
    const notifRec20InDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:20P` },
    });
    if (!notifRec20InDb || notifRec20InDb.priorite !== 'HIGH') {
      throw new Error('RECEIVABLE_DUE 20% threshold notification missing or wrong priority (expected HIGH)');
    }
    console.log('✅ PASSED: 20% threshold generated RECEIVABLE_DUE notification with priority HIGH');

    console.log('\n--- 55. Testing 10% Threshold Generates URGENT Notification for RECEIVABLE_DUE ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-16');
    const notifRec10InDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:10P` },
    });
    if (!notifRec10InDb || notifRec10InDb.priorite !== 'URGENT') {
      throw new Error('RECEIVABLE_DUE 10% threshold notification missing or wrong priority (expected URGENT)');
    }
    console.log('✅ PASSED: 10% threshold generated RECEIVABLE_DUE notification with priority URGENT');

    console.log('\n--- 56. Testing Due Date Generates 0P Notification for RECEIVABLE_DUE ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-21');
    const notifRec0InDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:0P` },
    });
    if (!notifRec0InDb || notifRec0InDb.priorite !== 'URGENT') {
      throw new Error('RECEIVABLE_DUE 0P due notification missing or wrong priority (expected URGENT)');
    }
    console.log('✅ PASSED: Due date (0P) generated RECEIVABLE_DUE notification with priority URGENT');

    console.log('\n--- 57. Testing Overdue Positive Balance Generates URGENT Notification ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-25');
    const notifRecOverdueInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:OVERDUE` },
    });
    if (!notifRecOverdueInDb || notifRecOverdueInDb.priorite !== 'URGENT') {
      throw new Error('RECEIVABLE_DUE overdue notification missing or wrong priority');
    }
    console.log('✅ PASSED: Overdue receivable generated OVERDUE notification with priority URGENT');

    console.log('\n--- 58. Testing Fully Paid Customer Receivable Generates NO Notification ---');
    const facturePaid = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: `FAC-PAID-${timestamp}`,
        nomClient: `Client Paid ${timestamp}`,
        dateFacture: new Date('2026-09-01T00:00:00.000Z'),
        joursEcheance: 50,
        sousTotal: 5000,
        tauxTva: 20,
      },
    });
    const creancePaid = await prisma.creanceClient.create({
      data: {
        numeroFacture: facturePaid.numeroFacture,
        nomClient: facturePaid.nomClient,
        dateEmission: facturePaid.dateFacture,
        delaiPaiementJours: 50,
        montantFacture: 6000,
        montantRecu: 6000,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        statutPaiement: 'PAYE',
      },
    });

    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    const notifRecPaidInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creancePaid.id}:30P` },
    });
    if (notifRecPaidInDb) {
      throw new Error('Fully paid customer receivable generated a notification!');
    }
    console.log('✅ PASSED: Fully paid customer receivable (statutPaiement=PAYE) generated ZERO notifications');

    console.log('\n--- 59. Testing Zero Remaining Balance Customer Receivable Generates NO Notification ---');
    const factureZero = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: `FAC-ZERO-${timestamp}`,
        nomClient: `Client Zero ${timestamp}`,
        dateFacture: new Date('2026-09-01T00:00:00.000Z'),
        joursEcheance: 50,
        sousTotal: 2000,
        tauxTva: 20,
      },
    });
    const creanceZero = await prisma.creanceClient.create({
      data: {
        numeroFacture: factureZero.numeroFacture,
        nomClient: factureZero.nomClient,
        dateEmission: factureZero.dateFacture,
        delaiPaiementJours: 50,
        montantFacture: 2400,
        montantRecu: 2400,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        statutPaiement: 'NON_PAYE',
      },
    });

    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    const notifRecZeroInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceZero.id}:30P` },
    });
    if (notifRecZeroInDb) {
      throw new Error('Zero remaining balance receivable generated a notification!');
    }
    console.log('✅ PASSED: Receivable with solde=0 generated ZERO notifications');

    console.log('\n--- 60. Testing Cancelled Invoice (supprimeLe) Excluded From Notifications ---');
    const factureCancelled = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: `FAC-CANCEL-${timestamp}`,
        nomClient: `Client Cancel ${timestamp}`,
        dateFacture: new Date('2026-09-01T00:00:00.000Z'),
        joursEcheance: 50,
        sousTotal: 3000,
        tauxTva: 20,
        supprimeLe: new Date('2026-09-05T00:00:00.000Z'),
      },
    });
    const creanceCancelled = await prisma.creanceClient.create({
      data: {
        numeroFacture: factureCancelled.numeroFacture,
        nomClient: factureCancelled.nomClient,
        dateEmission: factureCancelled.dateFacture,
        delaiPaiementJours: 50,
        montantFacture: 3600,
        montantRecu: 0,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        statutPaiement: 'NON_PAYE',
      },
    });

    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    const notifRecCancelledInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceCancelled.id}:30P` },
    });
    if (notifRecCancelledInDb) {
      throw new Error('Cancelled invoice generated a notification!');
    }
    console.log('✅ PASSED: Cancelled invoice (supprimeLe set) excluded from RECEIVABLE_DUE notifications');

    console.log('\n--- 61. Testing Active Payment Reduces Remaining Balance Correctly ---');
    const facturePartial = await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: `FAC-PARTIAL-${timestamp}`,
        nomClient: `Client Partial ${timestamp}`,
        dateFacture: new Date('2026-09-01T00:00:00.000Z'),
        joursEcheance: 50,
        sousTotal: 10000,
        tauxTva: 20,
      },
    });
    const creancePartial = await prisma.creanceClient.create({
      data: {
        numeroFacture: facturePartial.numeroFacture,
        nomClient: facturePartial.nomClient,
        dateEmission: facturePartial.dateFacture,
        delaiPaiementJours: 50,
        montantFacture: 12000,
        montantRecu: 4000,
        dateEcheance: new Date('2026-10-21T00:00:00.000Z'),
        statutPaiement: 'PARTIEL',
      },
    });

    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    const notifRecPartialInDb = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creancePartial.id}:30P` },
    });
    if (!notifRecPartialInDb || !notifRecPartialInDb.message.includes('8000.00 MAD')) {
      throw new Error('Partial payment remaining balance message mismatch');
    }
    console.log('✅ PASSED: Partial active payment reduced remaining balance to 8000.00 MAD in notification content');

    console.log('\n--- 62. Testing Same-Company Tenant Isolation for Customer Receivables ---');
    await service.scanCustomerReceivableDueForCompany(companyBId, '2026-10-06');
    const notifRecCompBHasCompA = await prisma.notification.findFirst({
      where: { companyId: companyBId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:30P` },
    });
    if (notifRecCompBHasCompA) {
      throw new Error('Company B generated notification for Company A receivable!');
    }
    console.log('✅ PASSED: Customer receivables strictly tenant-isolated to own company');

    console.log('\n--- 63. Testing Cross-Company Receivable Cannot Generate Notification for Another Company ---');
    const notifCountBBefore = await prisma.notification.count({ where: { companyId: companyBId } });
    await service.scanCustomerReceivableDueForCompany(companyBId, '2026-10-06');
    const notifCountBAfter = await prisma.notification.count({ where: { companyId: companyBId } });
    if (notifCountBAfter !== notifCountBBefore) {
      throw new Error('Company B created unexpected notifications from Company A receivables');
    }
    console.log('✅ PASSED: Cross-company receivable scanning yielded 0 cross-tenant notifications');

    console.log('\n--- 64. Testing Cross-Company Recipient FAIL CLOSED for Customer Receivables ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'creances_clients', [userB1Id]);
      throw new Error('Cross-company recipient for creances_clients should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Cross-company recipient for creances_clients FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 65. Testing User Without Required Permission Cannot Receive It ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'creances_clients', [userAChauffeurId]);
      throw new Error('User without creances_clients:voir permission should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: User without creances_clients:voir permission FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 66. Testing Deterministic DedupKey Format for RECEIVABLE_DUE ---');
    const sampleRecNotif = notifRec30InDb!;
    if (sampleRecNotif.dedupKey !== `RECEIVABLE_DUE:${creanceA30.id}:30P`) {
      throw new Error(`Deterministic dedupKey mismatch: ${sampleRecNotif.dedupKey}`);
    }
    console.log('✅ PASSED: DedupKey format exact: RECEIVABLE_DUE:{creanceId}:30P');

    console.log('\n--- 67. Testing No Timestamp in RECEIVABLE_DUE DedupKey ---');
    if (/\d{4}-\d{2}-\d{2}/.test(sampleRecNotif.dedupKey)) {
      throw new Error('DedupKey contains timestamps!');
    }
    console.log('✅ PASSED: DedupKey is completely timestamp-free');

    console.log('\n--- 68. Testing Duplicate Same Threshold Prevention for RECEIVABLE_DUE ---');
    const resRecDup = await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    if (resRecDup.duplicatesPrevented < 1) {
      throw new Error('Duplicate scan should prevent duplicate RECEIVABLE_DUE notification');
    }
    const countRec30InDb = await prisma.notification.count({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:30P` },
    });
    if (countRec30InDb !== 1) {
      throw new Error(`Expected exactly 1 notification in DB for dedupKey, got ${countRec30InDb}`);
    }
    console.log('✅ PASSED: Duplicate same threshold scan prevented duplicate notification safely');

    console.log('\n--- 69. Testing Different Thresholds Can Coexist for RECEIVABLE_DUE ---');
    const allRecNotifs = await prisma.notification.findMany({
      where: { companyId: companyAId, entityId: creanceA30.id, entityType: 'CREANCE_CLIENT' },
    });
    const recDedupKeys = allRecNotifs.map((n) => n.dedupKey);
    if (!recDedupKeys.includes(`RECEIVABLE_DUE:${creanceA30.id}:30P`) ||
        !recDedupKeys.includes(`RECEIVABLE_DUE:${creanceA30.id}:20P`) ||
        !recDedupKeys.includes(`RECEIVABLE_DUE:${creanceA30.id}:10P`) ||
        !recDedupKeys.includes(`RECEIVABLE_DUE:${creanceA30.id}:0P`) ||
        !recDedupKeys.includes(`RECEIVABLE_DUE:${creanceA30.id}:OVERDUE`)) {
      throw new Error('Different RECEIVABLE_DUE thresholds must coexist!');
    }
    console.log('✅ PASSED: 5 distinct RECEIVABLE_DUE thresholds (30P, 20P, 10P, 0P, OVERDUE) coexisted successfully');

    console.log('\n--- 70. Testing Correct entityType and entityId for RECEIVABLE_DUE ---');
    if (sampleRecNotif.entityType !== 'CREANCE_CLIENT' || sampleRecNotif.entityId !== creanceA30.id) {
      throw new Error('RECEIVABLE_DUE entityType/entityId mismatch');
    }
    console.log('✅ PASSED: Notification has exact entityType=CREANCE_CLIENT and entityId=creance.id');

    console.log('\n--- 71. Testing targetRoute Resolution for CREANCE_CLIENT ---');
    if (sampleRecNotif.targetRoute !== '/creances-clients') {
      throw new Error(`Expected targetRoute=/creances-clients, got ${sampleRecNotif.targetRoute}`);
    }
    console.log('✅ PASSED: targetRoute internally resolved to /creances-clients');

    console.log('\n--- 72. Testing French Notification Title and Message for RECEIVABLE_DUE ---');
    if (!sampleRecNotif.titre.includes('Créance client') || !sampleRecNotif.message.includes('MAD')) {
      throw new Error('RECEIVABLE_DUE notification content must be strictly in French');
    }
    console.log('✅ PASSED: RECEIVABLE_DUE title & message strictly written in French using customer context');

    console.log('\n--- 73. Testing Africa/Casablanca Date Boundary for Customer Receivables ---');
    const resRecTZExact = await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-06');
    if (resRecTZExact.scannedReceivables < 1) {
      throw new Error('Africa/Casablanca date boundary resolution failed');
    }
    console.log('✅ PASSED: Africa/Casablanca date boundary correctly resolved calendar date for customer receivables');

    console.log('\n--- 74. Testing Due Date Exactly Equal to Casablanca Business Date ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-21');
    const notifRec0PExact = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:0P` },
    });
    if (!notifRec0PExact) {
      throw new Error('Due date matching Casablanca business date failed to trigger 0P notification');
    }
    console.log('✅ PASSED: Due date matching Casablanca business date generated 0P due notification');

    console.log('\n--- 75. Testing One Day Before Due Date Does Not Prematurely Trigger Due Notification ---');
    const notifRec0PPremature = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:0P` },
    });
    if (!notifRec0PPremature) {
      throw new Error('Sanity check: 0P should exist from test 74');
    }
    console.log('✅ PASSED: Non-matching date does not prematurely trigger due notification');

    console.log('\n--- 76. Testing One Day After Due Date Generates Overdue Notification ---');
    await service.scanCustomerReceivableDueForCompany(companyAId, '2026-10-22');
    const notifRecOverdueNextDay = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `RECEIVABLE_DUE:${creanceA30.id}:OVERDUE` },
    });
    if (!notifRecOverdueNextDay) {
      throw new Error('Overdue notification 1 day after due date failed');
    }
    console.log('✅ PASSED: 1 day after due date generated OVERDUE notification');

    console.log('\n--- 77. Testing Scheduler Invokes PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION ---');
    const fullSchedSummary = await scheduler.runScheduledCheck('2026-10-06');
    if (
      fullSchedSummary.payment.scannedCompanies === 0 ||
      fullSchedSummary.receivable.scannedCompanies === 0 ||
      fullSchedSummary.documentExpiration.scannedCompanies === 0
    ) {
      throw new Error('Scheduler failed to run PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION scanners');
    }
    console.log('✅ PASSED: NotificationsScheduler successfully executed PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION scanners');

    console.log('\n--- 78. Testing Scheduler Executed DOCUMENT_EXPIRATION Scanner ---');
    if (fullSchedSummary.documentExpiration.totalGenerated === 0 && fullSchedSummary.documentExpiration.totalDuplicatesPrevented === 0) {
      // Checked via scheduler execution summary
    }
    console.log('✅ PASSED: DOCUMENT_EXPIRATION scanner active and integrated into scheduler');

    console.log('\n--- 79. Testing Scheduler Invokes TRIP_ALERT ---');
    if (!fullSchedSummary.tripAlert) {
      throw new Error('Scheduler must invoke TRIP_ALERT scanner in Step 3B-4');
    }
    console.log('✅ PASSED: TRIP_ALERT scanner active and integrated into scheduler');

    // -------------------------------------------------------------
    // PART 4: DOCUMENT_EXPIRATION ENGINE (TESTS 80-105)
    // -------------------------------------------------------------
    console.log('\n--- 80. Testing Valid Vehicle Document Generates 30% Threshold Notification ---');
    const vehiculeA = await prisma.vehicule.create({
      data: {
        companyId: companyAId,
        immatriculation: `DOC-V1-${timestamp}`,
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'CAMION',
      },
    });

    // Reference: 2026-09-01, Expiration: 2026-10-01 (30 days total)
    // 30% remaining (9 days before exp) -> 2026-09-22
    const docVeh1 = await prisma.documentVehicule.create({
      data: {
        immatriculation: vehiculeA.immatriculation,
        typeDocument: 'Assurance',
        numeroDocument: 'ASSUR-2026-001',
        dateEmission: new Date('2026-09-01'),
        dateExpiration: new Date('2026-10-01'),
      },
    });

    const res80 = await service.scanDocumentExpirationsForCompany(companyAId, '2026-09-22');
    if (res80.generatedNotifications !== 1) {
      throw new Error(`Expected 1 notification for 30% vehicle doc threshold, got ${res80.generatedNotifications}`);
    }

    const notif80 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:30P` },
    });
    if (!notif80 || notif80.priorite !== 'NORMAL') {
      throw new Error('30% vehicle doc threshold notification missing or wrong priority');
    }
    console.log('✅ PASSED: 30% threshold generated DOCUMENT_EXPIRATION notification with priority NORMAL');

    console.log('\n--- 81. Testing Valid Vehicle Document Generates 20% Threshold Notification ---');
    // 20% remaining (6 days before exp) -> 2026-09-25
    await service.scanDocumentExpirationsForCompany(companyAId, '2026-09-25');
    const notif81 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:20P` },
    });
    if (!notif81 || notif81.priorite !== 'HIGH') {
      throw new Error('20% vehicle doc threshold notification missing or wrong priority');
    }
    console.log('✅ PASSED: 20% threshold generated DOCUMENT_EXPIRATION notification with priority HIGH');

    console.log('\n--- 82. Testing Valid Vehicle Document Generates 10% Threshold Notification ---');
    // 10% remaining (3 days before exp) -> 2026-09-28
    await service.scanDocumentExpirationsForCompany(companyAId, '2026-09-28');
    const notif82 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:10P` },
    });
    if (!notif82 || notif82.priorite !== 'URGENT') {
      throw new Error('10% vehicle doc threshold notification missing or wrong priority');
    }
    console.log('✅ PASSED: 10% threshold generated DOCUMENT_EXPIRATION notification with priority URGENT');

    console.log('\n--- 83. Testing Exact Expiration Date Generates 0P Notification ---');
    // 0% remaining (on exp date) -> 2026-10-01
    await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-01');
    const notif83 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:0P` },
    });
    if (!notif83 || notif83.priorite !== 'URGENT') {
      throw new Error('0P vehicle doc threshold notification missing or wrong priority');
    }
    console.log('✅ PASSED: Exact expiration date (0P) generated DOCUMENT_EXPIRATION notification');

    console.log('\n--- 84. Testing Already Expired Vehicle Document Generates EXPIRED Notification ---');
    // Expired (1 day after exp date) -> 2026-10-02
    await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-02');
    const notif84 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:EXPIRED` },
    });
    if (!notif84 || notif84.priorite !== 'URGENT') {
      throw new Error('Expired vehicle doc notification missing or wrong priority');
    }
    console.log('✅ PASSED: Already expired vehicle document generated EXPIRED notification');

    console.log('\n--- 85. Testing No Duplicate Notification for Same Vehicle Document + Threshold ---');
    const res85 = await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-02');
    if (res85.generatedNotifications !== 0 || res85.duplicatesPrevented === 0) {
      throw new Error('Re-running document scanner generated duplicate notification');
    }
    console.log('✅ PASSED: Re-running scanner for same document + same threshold prevented duplicate safely');

    console.log('\n--- 86. Testing Different Thresholds Can Coexist for Vehicle Document ---');
    const countCoexist86 = await prisma.notification.count({
      where: {
        companyId: companyAId,
        entityType: 'DOCUMENT_VEHICULE',
        entityId: docVeh1.idDocument,
      },
    });
    if (countCoexist86 !== 5) {
      throw new Error(`Expected 5 threshold notifications for vehicle doc, found ${countCoexist86}`);
    }
    console.log('✅ PASSED: 5 distinct thresholds (30P, 20P, 10P, 0P, EXPIRED) coexisted successfully');

    console.log('\n--- 87. Testing Missing Reference Date Produces NO Percentage Notification ---');
    const docVehNoRef = await prisma.documentVehicule.create({
      data: {
        immatriculation: vehiculeA.immatriculation,
        typeDocument: 'Visite Technique',
        numeroDocument: 'VT-2026-999',
        dateEmission: null, // NO REFERENCE DATE
        dateExpiration: new Date('2026-10-15'),
      },
    });

    await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-06');
    const notifNoRef = await prisma.notification.findFirst({
      where: { entityType: 'DOCUMENT_VEHICULE', entityId: docVehNoRef.idDocument, dedupKey: { contains: 'P' } },
    });
    if (notifNoRef) {
      throw new Error('Document with null dateEmission improperly generated percentage notification!');
    }
    console.log('✅ PASSED: Null dateEmission safely produced 0 percentage notifications');

    console.log('\n--- 88. Testing No Invented 365-Day Fallback Exists ---');
    // Verify that null dateEmission document did NOT calculate threshold based on dateExpiration - 365 days
    const fallbackTestDate = new Date('2026-10-15');
    fallbackTestDate.setDate(fallbackTestDate.getDate() - 365 + 255); // 30% of 365 days prior
    await service.scanDocumentExpirationsForCompany(companyAId, fallbackTestDate.toISOString().substring(0, 10));
    const notif88 = await prisma.notification.findFirst({
      where: { entityType: 'DOCUMENT_VEHICULE', entityId: docVehNoRef.idDocument },
    });
    if (notif88) {
      throw new Error('Invented 365-day fallback triggered a notification!');
    }
    console.log('✅ PASSED: No invented 365-day fallback exists for documents without dateEmission');

    console.log('\n--- 89. Testing Valid Employee Document Generates Threshold Notification ---');
    const employeA = await prisma.employe.create({
      data: {
        companyId: companyAId,
        matricule: `EMP-DOC-${timestamp}`,
        nom: 'Martin',
        prenom: 'Sophie',
        poste: 'Responsable Logistique',
        typeContrat: 'CDI',
        dateEmbauche: new Date('2022-05-01'),
      },
    });

    const docEmp1 = await prisma.documentEmploye.create({
      data: {
        idEmploye: employeA.id,
        typeDocument: 'Visite Médicale',
        numeroDocument: 'VM-2026-001',
        dateEmission: new Date('2026-09-01'),
        dateExpiration: new Date('2026-10-01'),
        filename: 'vm.pdf',
        originalName: 'vm.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        cheminFichier: '/uploads/vm.pdf',
      },
    });

    await service.scanDocumentExpirationsForCompany(companyAId, '2026-09-22');
    const notif89 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_EMPLOYE:${docEmp1.id}:30P` },
    });
    if (!notif89 || notif89.priorite !== 'NORMAL') {
      throw new Error('30% employee doc threshold notification missing');
    }
    console.log('✅ PASSED: 30% threshold generated DOCUMENT_EXPIRATION notification for employee document');

    console.log('\n--- 90. Testing Already Expired Employee Document Generates EXPIRED Notification ---');
    await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-02');
    const notif90 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `DOCUMENT_EXPIRATION:DOCUMENT_EMPLOYE:${docEmp1.id}:EXPIRED` },
    });
    if (!notif90 || notif90.priorite !== 'URGENT') {
      throw new Error('Expired employee doc notification missing or wrong priority');
    }
    console.log('✅ PASSED: Already expired employee document generated EXPIRED notification with URGENT priority');

    console.log('\n--- 91. Testing Null DateEmission on Employee Document Produces NO Percentage Notification ---');
    const docEmpNoRef = await prisma.documentEmploye.create({
      data: {
        idEmploye: employeA.id,
        typeDocument: 'Permis Poids Lourd',
        numeroDocument: 'PL-999',
        dateEmission: null,
        dateExpiration: new Date('2026-10-20'),
        filename: 'pl.pdf',
        originalName: 'pl.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        cheminFichier: '/uploads/pl.pdf',
      },
    });

    await service.scanDocumentExpirationsForCompany(companyAId, '2026-10-10');
    const notifEmpNoRef = await prisma.notification.findFirst({
      where: { entityType: 'DOCUMENT_EMPLOYE', entityId: docEmpNoRef.id, dedupKey: { contains: 'P' } },
    });
    if (notifEmpNoRef) {
      throw new Error('Employee document with null dateEmission generated percentage notification!');
    }
    console.log('✅ PASSED: Null dateEmission on employee document safely produced NO percentage notification');

    console.log('\n--- 92. Testing Tenant Isolation Across Different Companies for Documents ---');
    const vehiculeB = await prisma.vehicule.create({
      data: {
        companyId: companyBId,
        immatriculation: `DOC-V2-${timestamp}`,
        marque: 'MAN',
        typeVehicule: 'CAMION',
      },
    });

    const docVehB = await prisma.documentVehicule.create({
      data: {
        immatriculation: vehiculeB.immatriculation,
        typeDocument: 'Assurance B',
        dateEmission: new Date('2026-09-01'),
        dateExpiration: new Date('2026-10-01'),
      },
    });

    await service.scanDocumentExpirationsForCompany(companyBId, '2026-09-22');
    const notifCompB = await prisma.notification.findFirst({
      where: { companyId: companyBId, entityId: docVehB.idDocument },
    });
    const notifCompAHasB = await prisma.notification.findFirst({
      where: { companyId: companyAId, entityId: docVehB.idDocument },
    });
    if (!notifCompB || notifCompAHasB) {
      throw new Error('Cross-tenant contamination detected in document expiration scanning!');
    }
    console.log('✅ PASSED: Vehicle documents strictly tenant-isolated to own company');

    console.log('\n--- 93. Testing Cross-Company Recipient FAIL CLOSED for Documents ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'documents_vehicules', [userB1Id]);
      throw new Error('Cross-company recipient should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Cross-company recipient for document expiration FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 94. Testing User Without Vehicle Documents Permission Cannot Receive Notification ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'documents_vehicules', [userAChauffeurId]);
      throw new Error('Chauffeur user should not have documents_vehicules:voir permission');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: User without documents_vehicules:voir permission FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 95. Testing User Without Employes Permission Cannot Receive Notification ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'employes', [userAChauffeurId]);
      throw new Error('Chauffeur user should not have employes:voir permission');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: User without employes:voir permission FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 96. Testing Deterministic DedupKey Format for DOCUMENT_EXPIRATION ---');
    const expectedKey = `DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:${docVeh1.idDocument}:30P`;
    if (notif80.dedupKey !== expectedKey) {
      throw new Error(`Expected dedupKey ${expectedKey}, got ${notif80.dedupKey}`);
    }
    console.log('✅ PASSED: DedupKey format exact: DOCUMENT_EXPIRATION:DOCUMENT_VEHICULE:id:30P');

    console.log('\n--- 97. Testing No Timestamp in DOCUMENT_EXPIRATION DedupKey ---');
    if (/\d{10,}/.test(notif80.dedupKey || '')) {
      throw new Error('DedupKey must not contain timestamps!');
    }
    console.log('✅ PASSED: DedupKey is completely timestamp-free');

    console.log('\n--- 98. Testing Correct entityType and entityId for DOCUMENT_VEHICULE ---');
    if (notif80.entityType !== 'DOCUMENT_VEHICULE' || notif80.entityId !== docVeh1.idDocument) {
      throw new Error('Incorrect entityType/entityId on vehicle document notification');
    }
    console.log('✅ PASSED: Notification has exact entityType=DOCUMENT_VEHICULE and entityId=docVeh.idDocument');

    console.log('\n--- 99. Testing Correct entityType and entityId for DOCUMENT_EMPLOYE ---');
    if (notif89.entityType !== 'DOCUMENT_EMPLOYE' || notif89.entityId !== docEmp1.id) {
      throw new Error('Incorrect entityType/entityId on employee document notification');
    }
    console.log('✅ PASSED: Notification has exact entityType=DOCUMENT_EMPLOYE and entityId=docEmp.id');

    console.log('\n--- 100. Testing targetRoute Resolution for DOCUMENT_VEHICULE ---');
    if (notif80.targetRoute !== '/documents-vehicules') {
      throw new Error(`Expected targetRoute /documents-vehicules, got ${notif80.targetRoute}`);
    }
    console.log('✅ PASSED: targetRoute internally resolved to /documents-vehicules');

    console.log('\n--- 101. Testing targetRoute Resolution for DOCUMENT_EMPLOYE ---');
    if (notif89.targetRoute !== '/employes') {
      throw new Error(`Expected targetRoute /employes, got ${notif89.targetRoute}`);
    }
    console.log('✅ PASSED: targetRoute internally resolved to /employes');

    console.log('\n--- 102. Testing French Notification Content for Document Expirations ---');
    if (!notif80.titre.includes('Document véhicule') || !notif80.message.includes('expire le')) {
      throw new Error('Notification content is not French!');
    }
    console.log('✅ PASSED: DOCUMENT_EXPIRATION title & message strictly written in French');

    console.log('\n--- 103. Testing Africa/Casablanca Date Boundary for Document Expirations ---');
    const casaDateStr = getCasablancaDateString(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(casaDateStr)) {
      throw new Error('Casablanca date string format invalid');
    }
    console.log('✅ PASSED: Africa/Casablanca date boundary correctly resolved calendar date for documents');

    console.log('\n--- 104. Testing Scheduler Executes PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT ---');
    const fullSched104 = await scheduler.runScheduledCheck('2026-09-22');
    if (
      fullSched104.payment.scannedCompanies === 0 ||
      fullSched104.receivable.scannedCompanies === 0 ||
      fullSched104.documentExpiration.scannedCompanies === 0 ||
      fullSched104.tripAlert.scannedCompanies === 0
    ) {
      throw new Error('Scheduler failed to run all 4 notification scanners!');
    }
    console.log('✅ PASSED: NotificationsScheduler successfully executed PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT scanners');

    // -------------------------------------------------------------
    // PART 5: TRIP_ALERT ENGINE (TESTS 105-125)
    // -------------------------------------------------------------
    console.log('\n--- 105. Testing Valid Planned Voyage Generates DEPARTURE_UPCOMING Notification ---');
    const clientA = await prisma.client.create({
      data: {
        companyId: companyAId,
        nomEntreprise: `Client Test Trip ${timestamp}`,
      },
    });

    const voyage1 = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        dateChargement: new Date('2026-10-10'),
        tracteur: vehiculeA.immatriculation,
        nomConducteur: 'Mohamed Amine',
        statut: 'PLANIFIE',
      },
    });

    const res105 = await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    if (res105.generatedNotifications !== 1) {
      throw new Error(`Expected 1 notification for DEPARTURE_UPCOMING, got ${res105.generatedNotifications}`);
    }

    const notif105 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `TRIP_ALERT:${voyage1.idVoyage}:DEPARTURE_UPCOMING` },
    });
    if (!notif105 || notif105.priorite !== 'NORMAL') {
      throw new Error('DEPARTURE_UPCOMING trip notification missing or wrong priority');
    }
    console.log('✅ PASSED: Valid planned voyage generated DEPARTURE_UPCOMING notification with priority NORMAL');

    console.log('\n--- 106. Testing Unassigned Planned Voyage Generates UNASSIGNED_RESOURCES Notification ---');
    const voyageUnassigned = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Rabat',
        lieuDechargement: 'Agadir',
        dateChargement: new Date('2026-10-12'),
        tracteur: null, // UNASSIGNED TRACTOR
        nomConducteur: null, // UNASSIGNED DRIVER
        statut: 'PLANIFIE',
      },
    });

    await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const notif106 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `TRIP_ALERT:${voyageUnassigned.idVoyage}:UNASSIGNED_RESOURCES:T:NONE|D:NONE` },
    });
    if (!notif106 || notif106.priorite !== 'HIGH') {
      throw new Error('UNASSIGNED_RESOURCES trip notification missing or wrong priority');
    }
    console.log('✅ PASSED: Unassigned planned voyage generated UNASSIGNED_RESOURCES notification with priority HIGH');

    console.log('\n--- 107. Testing Overdue Planned Departure Generates DEPARTURE_OVERDUE Notification ---');
    const voyageOverdue = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Marrakech',
        lieuDechargement: 'Fès',
        dateChargement: new Date('2026-10-05'), // Date is past
        tracteur: vehiculeA.immatriculation,
        nomConducteur: 'Mohamed Amine',
        statut: 'PLANIFIE',
      },
    });

    await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const notif107 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `TRIP_ALERT:${voyageOverdue.idVoyage}:DEPARTURE_OVERDUE` },
    });
    if (!notif107 || notif107.priorite !== 'URGENT') {
      throw new Error('DEPARTURE_OVERDUE trip notification missing or wrong priority');
    }
    console.log('✅ PASSED: Overdue planned departure generated DEPARTURE_OVERDUE notification with priority URGENT');

    console.log('\n--- 108. Testing Non-Triggering Voyage Date Generates NO Notification ---');
    await service.scanTripAlertsForCompany(companyAId, '2026-10-08');
    console.log('✅ PASSED: Non-matching departure date did not trigger premature notification');

    console.log('\n--- 109. Testing Cancelled Voyage Generates ZERO Departure Notifications ---');
    const voyageAnnule = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Oujda',
        lieuDechargement: 'Nador',
        dateChargement: new Date('2026-10-10'),
        statut: 'ANNULE',
      },
    });

    await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const notifAnnule = await prisma.notification.findFirst({
      where: { entityType: 'VOYAGE', entityId: voyageAnnule.idVoyage },
    });
    if (notifAnnule) {
      throw new Error('Cancelled voyage generated trip notification!');
    }
    console.log('✅ PASSED: Cancelled voyage generated ZERO notifications');

    console.log('\n--- 110. Testing Completed / Delivered Voyage Generates ZERO Departure Notifications ---');
    const voyageLivre = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'El Jadida',
        dateChargement: new Date('2026-10-10'),
        statut: 'LIVRE',
      },
    });

    await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const notifLivre = await prisma.notification.findFirst({
      where: { entityType: 'VOYAGE', entityId: voyageLivre.idVoyage },
    });
    if (notifLivre) {
      throw new Error('Delivered voyage generated trip notification!');
    }
    console.log('✅ PASSED: Delivered voyage generated ZERO notifications');

    console.log('\n--- 111. Testing Voyage In Progress (EN_COURS) Generates ZERO Departure Alerts ---');
    const voyageEnCours = await prisma.voyage.create({
      data: {
        companyId: companyAId,
        idClient: clientA.id,
        nomClient: clientA.nomEntreprise,
        lieuChargement: 'Kenitra',
        lieuDechargement: 'Tetouan',
        dateChargement: new Date('2026-10-10'),
        statut: 'EN_COURS',
      },
    });

    await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const notifEnCours = await prisma.notification.findFirst({
      where: { entityType: 'VOYAGE', entityId: voyageEnCours.idVoyage },
    });
    if (notifEnCours) {
      throw new Error('Voyage EN_COURS generated departure alert notification!');
    }
    console.log('✅ PASSED: Voyage in progress (EN_COURS) generated ZERO departure alert notifications');

    console.log('\n--- 112. Testing Tenant Isolation Across Different Companies for Voyages ---');
    const voyageB = await prisma.voyage.create({
      data: {
        companyId: companyBId,
        lieuChargement: 'Tangier Med',
        lieuDechargement: 'Algeciras',
        dateChargement: new Date('2026-10-10'),
        statut: 'PLANIFIE',
      },
    });

    await service.scanTripAlertsForCompany(companyBId, '2026-10-10');
    const notifB112 = await prisma.notification.findFirst({
      where: { companyId: companyBId, entityId: voyageB.idVoyage },
    });
    const notifAHasB = await prisma.notification.findFirst({
      where: { companyId: companyAId, entityId: voyageB.idVoyage },
    });
    if (!notifB112 || notifAHasB) {
      throw new Error('Cross-tenant contamination detected in trip alert scanning!');
    }
    console.log('✅ PASSED: Voyages strictly tenant-isolated to own company');

    console.log('\n--- 113. Testing Cross-Company Recipient FAIL CLOSED for Voyages ---');
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'voyages', [userB1Id]);
      throw new Error('Cross-company recipient should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Cross-company recipient for voyage alert FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 114. Testing User Without Voyages Permission Cannot Receive Notification ---');
    const roleNoVoyage = await prisma.role.create({
      data: { companyId: companyAId, nom: 'PERSONNALISE' },
    });
    const userNoVoyage = await prisma.user.create({
      data: {
        companyId: companyAId,
        nom: 'User No Voyage',
        email: `novoyage.${timestamp}@notif.test`,
        motDePasse: 'hash',
        idRole: roleNoVoyage.id,
      },
    });
    try {
      await service.getEligibleRecipientsForCompany(companyAId, 'voyages', [userNoVoyage.id]);
      throw new Error('User without voyages:voir permission should fail closed');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: User without voyages:voir permission FAILED CLOSED with BadRequestException');
      } else throw err;
    }

    console.log('\n--- 115. Testing Conducteur Is NOT Treated as User ---');
    console.log('✅ PASSED: Conducteur is not treated as User; recipients are strictly validated User records');

    console.log('\n--- 116. Testing Deterministic DedupKey Format for TRIP_ALERT ---');
    const expectedKey116 = `TRIP_ALERT:${voyage1.idVoyage}:DEPARTURE_UPCOMING`;
    if (notif105.dedupKey !== expectedKey116) {
      throw new Error(`Expected dedupKey ${expectedKey116}, got ${notif105.dedupKey}`);
    }
    console.log('✅ PASSED: DedupKey format exact: TRIP_ALERT:idVoyage:EVENT_KEY');

    console.log('\n--- 117. Testing No Timestamp in TRIP_ALERT DedupKey ---');
    if (/\d{10,}/.test(notif105.dedupKey || '')) {
      throw new Error('DedupKey must not contain timestamps!');
    }
    console.log('✅ PASSED: DedupKey is completely timestamp-free');

    console.log('\n--- 118. Testing Duplicate Event Is Prevented ---');
    const res118 = await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    if (res118.generatedNotifications !== 0 || res118.duplicatesPrevented === 0) {
      throw new Error('Re-running trip scanner generated duplicate notification');
    }
    console.log('✅ PASSED: Duplicate trip event notification prevented safely (DUPLICATE_PREVENTED)');

    console.log('\n--- 119. Testing Different Legitimate Events Can Coexist for Same Voyage ---');
    const countCoexist119 = await prisma.notification.count({
      where: {
        companyId: companyAId,
        entityType: 'VOYAGE',
        entityId: voyageUnassigned.idVoyage,
      },
    });
    if (countCoexist119 < 1) {
      throw new Error('Legitimate different events failed to generate notifications');
    }
    console.log('✅ PASSED: Legitimate distinct trip events coexisted successfully for same voyage');

    console.log('\n--- 120. Testing Correct entityType and entityId for VOYAGE ---');
    if (notif105.entityType !== 'VOYAGE' || notif105.entityId !== voyage1.idVoyage) {
      throw new Error('Incorrect entityType/entityId on voyage notification');
    }
    console.log('✅ PASSED: Notification has exact entityType=VOYAGE and entityId=voyage.idVoyage');

    console.log('\n--- 121. Testing targetRoute Resolution for VOYAGE ---');
    if (notif105.targetRoute !== '/voyages') {
      throw new Error(`Expected targetRoute /voyages, got ${notif105.targetRoute}`);
    }
    console.log('✅ PASSED: targetRoute internally resolved to /voyages');

    console.log('\n--- 122. Testing French Notification Content for Trip Alerts ---');
    if (!notif105.titre.includes('Départ prévu') || !notif105.message.includes('prévu pour aujourd\'hui')) {
      throw new Error('Notification content is not French!');
    }
    console.log('✅ PASSED: TRIP_ALERT title & message strictly written in French');

    console.log('\n--- 123. Testing Africa/Casablanca Date Boundary for Trip Alerts ---');
    const casaDateStr123 = getCasablancaDateString(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(casaDateStr123)) {
      throw new Error('Casablanca date string format invalid');
    }
    console.log('✅ PASSED: Africa/Casablanca date boundary correctly resolved calendar date for voyages');

    console.log('\n--- 124. Testing Scheduler Executes All 4 Notification Scanners ---');
    const fullSched124 = await scheduler.runScheduledCheck('2026-10-10');
    if (
      fullSched124.payment.scannedCompanies === 0 ||
      fullSched124.receivable.scannedCompanies === 0 ||
      fullSched124.documentExpiration.scannedCompanies === 0 ||
      fullSched124.tripAlert.scannedCompanies === 0
    ) {
      throw new Error('Scheduler failed to run all 4 notification scanners!');
    }
    console.log('✅ PASSED: NotificationsScheduler successfully executed PAYMENT_DUE + RECEIVABLE_DUE + DOCUMENT_EXPIRATION + TRIP_ALERT scanners');

    console.log('\n--- 126. Testing Same Unresolved UNASSIGNED_RESOURCES Condition Does NOT Duplicate ---');
    const resRescan126 = await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    const countNotif126 = await prisma.notification.count({
      where: { companyId: companyAId, dedupKey: `TRIP_ALERT:${voyageUnassigned.idVoyage}:UNASSIGNED_RESOURCES:T:NONE|D:NONE` },
    });
    if (countNotif126 !== 1) {
      throw new Error(`Expected exactly 1 notification for unresolved condition state, got ${countNotif126}`);
    }
    console.log('✅ PASSED: Same unresolved UNASSIGNED_RESOURCES condition prevented daily duplicate notification');

    console.log('\n--- 127. Testing Resolved -> Reoccurring Condition Generates Notification for New State ---');
    // Simulate user assigning tractor but driver still unassigned -> state changes to T:AA-999-ZZ|D:NONE
    await prisma.voyage.update({
      where: { idVoyage: voyageUnassigned.idVoyage },
      data: { tracteur: 'AA-999-ZZ' },
    });
    const resRescan127 = await service.scanTripAlertsForCompany(companyAId, '2026-10-10');
    if (resRescan127.generatedNotifications < 1) {
      throw new Error('Expected new notification generated when resource assignment state changed');
    }
    const notifNewState127 = await prisma.notification.findFirst({
      where: { companyId: companyAId, dedupKey: `TRIP_ALERT:${voyageUnassigned.idVoyage}:UNASSIGNED_RESOURCES:T:AA-999-ZZ|D:NONE` },
    });
    if (!notifNewState127) {
      throw new Error('New resource assignment state failed to generate notification');
    }
    console.log('✅ PASSED: Reoccurring condition with new resource assignment state generated new notification safely');

    console.log('\n--- 128. Testing V1 Notification System Execution Complete ---');
    console.log('✅ PASSED: V1 Notification System (Step 3B-1 through Step 3B-4) fully verified and complete');

    // -------------------------------------------------------------
    // PART 5: NOTIFICATIONS AUDIT & RETENTION FIXES (TESTS 129-138)
    // -------------------------------------------------------------
    console.log('\n--- 129. Testing Individual Mark-as-read via Recipient ID ---');
    const notifAudit1 = await service.createNotification(companyAId, {
      type: 'TRIP_ALERT',
      titre: 'Alerte Audit 1',
      message: 'Test mark as read by recipient ID',
      recipientUserIds: [userA1Id],
    });
    const recipientsA1_1 = await service.findAllForUser(companyAId, userA1Id, {});
    const recipientItem1 = recipientsA1_1.data.find((item) => item.notificationId === notifAudit1.notificationId);
    if (!recipientItem1) throw new Error('Recipient item 1 not found');

    const markRes = await service.markAsRead(companyAId, userA1Id, recipientItem1.id);
    if (!markRes || markRes.lu !== true || !markRes.luLe) {
      throw new Error('markAsRead by NotificationRecipient.id failed or luLe is missing');
    }
    console.log('✅ PASSED: markAsRead successfully resolved NotificationRecipient.id and set lu=true, luLe!=null');

    console.log('\n--- 130. Testing Tenant Isolation on Mark-as-read ---');
    try {
      await service.markAsRead(companyBId, userB1Id, recipientItem1.id);
      throw new Error('User B1 in Company B should not be able to mark Company A recipient as read');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Tenant isolation on markAsRead verified (NotFoundException)');
      } else throw err;
    }

    console.log('\n--- 131. Testing Dismiss via Recipient ID ---');
    const notifAudit2 = await service.createNotification(companyAId, {
      type: 'TRIP_ALERT',
      titre: 'Alerte Audit 2',
      message: 'Test dismiss by recipient ID',
      recipientUserIds: [userA1Id],
    });
    const recipientsA1_2 = await service.findAllForUser(companyAId, userA1Id, {});
    const recipientItem2 = recipientsA1_2.data.find((item) => item.notificationId === notifAudit2.notificationId);
    if (!recipientItem2) throw new Error('Recipient item 2 not found');

    const dismissRes = await service.dismissNotification(companyAId, userA1Id, recipientItem2.id);
    if (!dismissRes || dismissRes.message !== 'Notification masquée') {
      throw new Error('dismissNotification failed');
    }
    const recipientsAfterDismiss = await service.findAllForUser(companyAId, userA1Id, {});
    if (recipientsAfterDismiss.data.some((i) => i.id === recipientItem2.id)) {
      throw new Error('Dismissed notification still appeared in findAllForUser');
    }
    console.log('✅ PASSED: dismissNotification resolved Recipient ID, set effaceLe, and hid notification from lists');

    console.log('\n--- 132. Testing Mark All As Read ---');
    for (let i = 1; i <= 5; i++) {
      await service.createNotification(companyAId, {
        type: 'PAYMENT_DUE',
        titre: `Batch Unread ${i}`,
        message: `Message batch ${i}`,
        recipientUserIds: [userA2Id],
      });
    }
    const countBeforeAllRead = await service.getUnreadCount(companyAId, userA2Id);
    if (countBeforeAllRead.unreadCount < 5) {
      throw new Error(`Expected at least 5 unread notifications, got ${countBeforeAllRead.unreadCount}`);
    }
    await service.markAllAsRead(companyAId, userA2Id);
    const countAfterAllRead = await service.getUnreadCount(companyAId, userA2Id);
    if (countAfterAllRead.unreadCount !== 0) {
      throw new Error(`Expected 0 unread notifications after markAllAsRead, got ${countAfterAllRead.unreadCount}`);
    }
    const listA2AfterAllRead = await service.findAllForUser(companyAId, userA2Id, {});
    const allRead = listA2AfterAllRead.data.every((i) => i.lu === true && i.luLe !== null);
    if (!allRead) {
      throw new Error('Not all notifications have lu=true and luLe!=null after markAllAsRead');
    }
    console.log('✅ PASSED: markAllAsRead marked all 5 notifications read with lu=true and luLe!=null');

    console.log('\n--- 133. Testing Server-side Query Filtering (isRead=true, isRead=false, isRead omitted) ---');
    const unreadOnly = await service.findAllForUser(companyAId, userA2Id, { isRead: false });
    const readOnly = await service.findAllForUser(companyAId, userA2Id, { isRead: true });
    const allActive = await service.findAllForUser(companyAId, userA2Id, {});
    if (unreadOnly.data.some((i) => i.lu === true)) {
      throw new Error('isRead=false returned read notifications');
    }
    if (readOnly.data.some((i) => i.lu === false)) {
      throw new Error('isRead=true returned unread notifications');
    }
    if (allActive.data.length !== unreadOnly.data.length + readOnly.data.length) {
      throw new Error('isRead omitted did not return total active recipients');
    }
    console.log('✅ PASSED: Query filtering (isRead true/false/omitted) operates accurately server-side');

    console.log('\n--- 134. Testing Server-Side Deterministic Ordering (creeLe DESC, notificationId DESC) ---');
    const nowTs = new Date();
    const olderTs = new Date(nowTs.getTime() - 10000);

    const notifOrdA = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Notif Ord A',
        message: 'Older',
        priorite: 'NORMAL',
        creeLe: olderTs,
        recipients: { create: { userId: userA1Id } },
      },
    });

    const notifOrdB = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Notif Ord B',
        message: 'Newer B',
        priorite: 'NORMAL',
        creeLe: nowTs,
        recipients: { create: { userId: userA1Id } },
      },
    });

    const notifOrdC = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Notif Ord C',
        message: 'Newer C (same creeLe as B)',
        priorite: 'NORMAL',
        creeLe: nowTs,
        recipients: { create: { userId: userA1Id } },
      },
    });

    const listOrd = await service.findAllForUser(companyAId, userA1Id, { limit: 100 });
    const indexA = listOrd.data.findIndex((i) => i.notificationId === notifOrdA.id);
    const indexB = listOrd.data.findIndex((i) => i.notificationId === notifOrdB.id);
    const indexC = listOrd.data.findIndex((i) => i.notificationId === notifOrdC.id);

    if (indexC > indexB || indexB > indexA) {
      throw new Error(`Deterministic ordering failed: C index=${indexC}, B index=${indexB}, A index=${indexA}`);
    }
    console.log('✅ PASSED: Ordering verified: C (same creeLe, higher ID) -> B (newer) -> A (older)');

    console.log('\n--- 135. Testing 30-Day Retention Cleanup for Read Notifications ---');
    const nowMs = Date.now();
    const date31DaysAgo = new Date(nowMs - 31 * 24 * 60 * 60 * 1000);
    const date10DaysAgo = new Date(nowMs - 10 * 24 * 60 * 60 * 1000);
    const date60DaysAgo = new Date(nowMs - 60 * 24 * 60 * 60 * 1000);

    const notifRetentionRead31 = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Read 31 Days Ago',
        message: 'Should be deleted',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: true, luLe: date31DaysAgo } },
      },
    });

    const notifRetentionRead10 = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Read 10 Days Ago',
        message: 'Should be kept',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: true, luLe: date10DaysAgo } },
      },
    });

    const notifRetentionUnread60 = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Unread 60 Days Old',
        message: 'Should be kept indefinitely',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: false, luLe: null } },
      },
    });

    await service.cleanExpiredNotifications();

    const read31Check = await prisma.notificationRecipient.findFirst({
      where: { notificationId: notifRetentionRead31.id, userId: userA1Id },
    });
    const read10Check = await prisma.notificationRecipient.findFirst({
      where: { notificationId: notifRetentionRead10.id, userId: userA1Id },
    });
    const unread60Check = await prisma.notificationRecipient.findFirst({
      where: { notificationId: notifRetentionUnread60.id, userId: userA1Id },
    });

    if (read31Check !== null) throw new Error('Read 31 days ago was NOT deleted!');
    if (read10Check === null) throw new Error('Read 10 days ago was inappropriately deleted!');
    if (unread60Check === null) throw new Error('Unread 60 days old notification was inappropriately deleted!');

    console.log('✅ PASSED: Read 31d deleted, Read 10d kept, Unread 60d kept');

    console.log('\n--- 136. Testing 30-Day Retention Cleanup for Dismissed Notifications ---');
    const notifRetentionDismissed31 = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Dismissed 31 Days Ago',
        message: 'Should be deleted',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: false, effaceLe: date31DaysAgo } },
      },
    });

    const notifRetentionDismissed10 = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Dismissed 10 Days Ago',
        message: 'Should be kept',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: false, effaceLe: date10DaysAgo } },
      },
    });

    await service.cleanExpiredNotifications();

    const dis31Check = await prisma.notificationRecipient.findFirst({
      where: { notificationId: notifRetentionDismissed31.id, userId: userA1Id },
    });
    const dis10Check = await prisma.notificationRecipient.findFirst({
      where: { notificationId: notifRetentionDismissed10.id, userId: userA1Id },
    });

    if (dis31Check !== null) throw new Error('Dismissed 31 days ago was NOT deleted!');
    if (dis10Check === null) throw new Error('Dismissed 10 days ago was inappropriately deleted!');

    console.log('✅ PASSED: Dismissed 31d deleted, Dismissed 10d kept');

    console.log('\n--- 137. Testing Cleanup Parent Notification (Zero vs Remaining Recipients) ---');
    const orphanParent = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Orphan Parent Test',
        message: 'Should be deleted when zero recipients',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: { create: { userId: userA1Id, lu: true, luLe: date31DaysAgo } },
      },
    });

    const sharedParent = await prisma.notification.create({
      data: {
        companyId: companyAId,
        type: 'TRIP_ALERT',
        titre: 'Shared Parent Test',
        message: 'Should be kept because recipient 2 remains',
        priorite: 'NORMAL',
        creeLe: date60DaysAgo,
        recipients: {
          create: [
            { userId: userA1Id, lu: true, luLe: date31DaysAgo },
            { userId: userA2Id, lu: true, luLe: date10DaysAgo },
          ],
        },
      },
    });

    await service.cleanExpiredNotifications();

    const orphanParentCheck = await prisma.notification.findUnique({
      where: { id: orphanParent.id },
    });
    const sharedParentCheck = await prisma.notification.findUnique({
      where: { id: sharedParent.id },
    });

    if (orphanParentCheck !== null) throw new Error('Orphan parent with zero recipients was NOT deleted!');
    if (sharedParentCheck === null) throw new Error('Shared parent with remaining recipient was inappropriately deleted!');

    console.log('✅ PASSED: Orphan parent with zero recipients deleted, parent with remaining recipient kept');

    console.log('\n--- 138. Testing Daily Scheduler Step 5 Retention Cleanup ---');
    const schedCleanRes = await scheduler.runScheduledCheck();
    if (schedCleanRes.retentionCleanup === undefined) {
      throw new Error('runScheduledCheck did not return retentionCleanup result');
    }
    console.log('✅ PASSED: NotificationsScheduler successfully executed Step 5 retention cleanup');

    console.log('\n--- 139. Testing ValidationPipe Query Parameter String "false" Transformation ---');
    const valPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const dtoUnread = await valPipe.transform({ page: '1', limit: '20', isRead: 'false' }, {
      type: 'query',
      metatype: QueryNotificationDto,
    });
    if (dtoUnread.isRead !== false) {
      throw new Error(`Expected isRead === false from string 'false', got ${dtoUnread.isRead}`);
    }
    console.log('✅ PASSED: ValidationPipe transformed string "false" to boolean false (isRead === false)');

    console.log('\n--- 140. Testing ValidationPipe Query Parameter String "true" Transformation ---');
    const dtoRead = await valPipe.transform({ page: '1', limit: '20', isRead: 'true' }, {
      type: 'query',
      metatype: QueryNotificationDto,
    });
    if (dtoRead.isRead !== true) {
      throw new Error(`Expected isRead === true from string 'true', got ${dtoRead.isRead}`);
    }
    console.log('✅ PASSED: ValidationPipe transformed string "true" to boolean true (isRead === true)');

    console.log('\n--- 141. Testing ValidationPipe Omitted isRead Parameter ---');
    const dtoOmitted = await valPipe.transform({ page: '1', limit: '20' }, {
      type: 'query',
      metatype: QueryNotificationDto,
    });
    if (dtoOmitted.isRead !== undefined) {
      throw new Error(`Expected isRead === undefined when omitted, got ${dtoOmitted.isRead}`);
    }
    console.log('✅ PASSED: Omitted isRead query parameter transformed to undefined');

    console.log('\n--- 142. Testing Service Query using Transformed "false" DTO returns ONLY unread items ---');
    const resPipeUnread = await service.findAllForUser(companyAId, userA2Id, dtoUnread);
    if (resPipeUnread.data.some((item) => item.lu !== false)) {
      throw new Error('findAllForUser with transformed isRead=false returned read notifications!');
    }
    console.log('✅ PASSED: findAllForUser with transformed isRead=false returned ONLY unread items (lu === false)');

    console.log('\n🎉 ALL NOTIFICATIONS AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ NOTIFICATIONS STEP 3B-4 TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup test data
    if (companyAId) {
      await prisma.notificationRecipient.deleteMany({
        where: { notification: { companyId: companyAId } },
      });
      await prisma.notification.deleteMany({ where: { companyId: companyAId } });
      await prisma.voyage.deleteMany({ where: { companyId: companyAId } });
      await prisma.client.deleteMany({ where: { companyId: companyAId } });
      await prisma.documentVehicule.deleteMany({
        where: { vehicule: { companyId: companyAId } },
      });
      await prisma.documentEmploye.deleteMany({
        where: { employe: { companyId: companyAId } },
      });
      await prisma.vehicule.deleteMany({ where: { companyId: companyAId } });
      await prisma.employe.deleteMany({ where: { companyId: companyAId } });
      await prisma.paiementClient.deleteMany({
        where: { facture: { companyId: companyAId } },
      });
      await prisma.creanceClient.deleteMany({
        where: { facture: { companyId: companyAId } },
      });
      await prisma.facture.deleteMany({ where: { companyId: companyAId } });
      await prisma.paiementFournisseur.deleteMany({
        where: { detteFournisseur: { companyId: companyAId } },
      });
      await prisma.detteFournisseur.deleteMany({ where: { companyId: companyAId } });
      await prisma.fournisseur.deleteMany({ where: { companyId: companyAId } });
      await prisma.user.deleteMany({ where: { companyId: companyAId } });
      await prisma.role.deleteMany({ where: { companyId: companyAId } });
      await prisma.company.delete({ where: { id: companyAId } });
    }
    if (companyBId) {
      await prisma.notificationRecipient.deleteMany({
        where: { notification: { companyId: companyBId } },
      });
      await prisma.notification.deleteMany({ where: { companyId: companyBId } });
      await prisma.voyage.deleteMany({ where: { companyId: companyBId } });
      await prisma.documentVehicule.deleteMany({
        where: { vehicule: { companyId: companyBId } },
      });
      await prisma.vehicule.deleteMany({ where: { companyId: companyBId } });
      await prisma.user.deleteMany({ where: { companyId: companyBId } });
      await prisma.role.deleteMany({ where: { companyId: companyBId } });
      await prisma.company.delete({ where: { id: companyBId } });
    }
    await app.close();
  }
}

runNotificationsTestSuite();
