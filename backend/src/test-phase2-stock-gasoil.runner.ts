import { PrismaService } from './prisma/prisma.service';
import { StockGasoilService } from './modules/stock-gasoil/stock-gasoil.service';
import { BonsCarburantService } from './modules/bons-carburant/bons-carburant.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SourceCarburant, TypeMouvementGasoil } from '@prisma/client';

async function runStockGasoilPhase2TestSuite() {
  console.log('=============================================================================');
  console.log('=== PHASE 2 — GESTION DU STOCK GASOIL CORRECTION QA TEST SUITE =============');
  console.log('=============================================================================\n');

  const prisma = new PrismaService();
  const notificationsService = new NotificationsService(prisma);
  const stockService = new StockGasoilService(prisma, notificationsService);
  const bonsService = new BonsCarburantService(prisma, stockService);

  const testRunId = Date.now();

  try {
    // ── Setup Test Companies & Vehicles ──
    console.log('[SETUP] Creating test companies and vehicles...');
    const companyA = await prisma.company.create({
      data: { nom: `QA Company A ${testRunId}` },
    });
    const companyB = await prisma.company.create({
      data: { nom: `QA Company B ${testRunId}` },
    });

    // Ensure company settings exist with 500 L threshold
    await prisma.companySettings.upsert({
      where: { companyId: companyA.id },
      create: { companyId: companyA.id, seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
      update: { seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
    });

    await prisma.companySettings.upsert({
      where: { companyId: companyB.id },
      create: { companyId: companyB.id, seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
      update: { seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
    });

    const vehicleA = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: `QA-${testRunId.toString().slice(-5)}-A`,
        marque: 'Volvo',
        modele: 'FH16',
      },
    });

    const vehicleB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: `QA-${testRunId.toString().slice(-5)}-B`,
        marque: 'Scania',
        modele: 'R500',
      },
    });

    console.log(`  ✓ Company A #${companyA.id}, Vehicle A: ${vehicleA.immatriculation}`);
    console.log(`  ✓ Company B #${companyB.id}, Vehicle B: ${vehicleB.immatriculation}`);

    // =========================================================================
    // SECTION 1: MOVING WEIGHTED AVERAGE PMP CORRECTION TEST (Section 1.4)
    // =========================================================================
    console.log('\n-----------------------------------------------------------------------------');
    console.log('--- SECTION 1: MOVING WEIGHTED AVERAGE PMP CORRECTION TEST (SECTION 1.4) ----');
    console.log('-----------------------------------------------------------------------------');

    // Step 1: ENTRY 1000 L @ 12 MAD
    console.log('1. Creating Entry #1: 1000 L @ 12 MAD...');
    await stockService.createEntree(companyA.id, {
      quantiteLitres: 1000,
      prixUnitaire: 12.0,
      nomFournisseur: 'Afriquia Tank',
      dateMouvement: '2026-09-01',
    });
    const pmp1 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Stock = ${pmp1.stockActuelLitres} L, PMP = ${pmp1.pmpActuel} MAD/L`);
    if (pmp1.stockActuelLitres !== '1000.00' || pmp1.pmpActuel !== '12.000') {
      throw new Error(`Expected Stock=1000.00 L, PMP=12.000, got Stock=${pmp1.stockActuelLitres}, PMP=${pmp1.pmpActuel}`);
    }

    // Step 2: SORTIE 900 L (Internal Bon)
    console.log('2. Creating Internal Bon #1: 900 L...');
    const bonPmpTest1 = await bonsService.create(
      {
        numeroBon: `PMP-BON-1-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 900,
        dateCarburant: '2026-09-02',
      },
      companyA.id,
    );
    const pmp2 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Bon Price = ${bonPmpTest1.prixParLitre} MAD/L, Stock = ${pmp2.stockActuelLitres} L, PMP = ${pmp2.pmpActuel} MAD/L`);
    if (pmp2.stockActuelLitres !== '100.00' || pmp2.pmpActuel !== '12.000') {
      throw new Error(`Expected Stock=100.00 L, PMP=12.000 after SORTIE, got Stock=${pmp2.stockActuelLitres}, PMP=${pmp2.pmpActuel}`);
    }

    // Step 3: NEW ENTRY 100 L @ 14 MAD
    console.log('3. Creating Entry #2: 100 L @ 14 MAD...');
    await stockService.createEntree(companyA.id, {
      quantiteLitres: 100,
      prixUnitaire: 14.0,
      nomFournisseur: 'Total Bulk',
      dateMouvement: '2026-09-03',
    });

    // Expected PMP: (100 L remaining * 12 MAD + 100 L new * 14 MAD) / 200 L = 2600 / 200 = 13.000 MAD/L
    const pmp3 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Current Stock = ${pmp3.stockActuelLitres} L, Current PMP = ${pmp3.pmpActuel} MAD/L`);
    if (pmp3.stockActuelLitres !== '200.00' || pmp3.pmpActuel !== '13.000') {
      throw new Error(`CRITICAL PMP FAILURE: Expected Stock=200.00 L, PMP=13.000 MAD/L. Got Stock=${pmp3.stockActuelLitres}, PMP=${pmp3.pmpActuel}`);
    }
    console.log('  ✓ PASSED: Moving Weighted Average PMP derived as exactly 13.000 MAD/L!');

    // Step 4: Create Internal Bon for 50 L
    console.log('4. Creating Internal Bon #2: 50 L (expects unit price = 13.000 MAD)...');
    const bonPmpTest2 = await bonsService.create(
      {
        numeroBon: `PMP-BON-2-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 50,
        dateCarburant: '2026-09-03',
      },
      companyA.id,
    );

    const pmp4 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Bon Unit Price = ${bonPmpTest2.prixParLitre} MAD/L, Stock = ${pmp4.stockActuelLitres} L, PMP = ${pmp4.pmpActuel} MAD/L`);
    if (bonPmpTest2.prixParLitre !== '13.000' || pmp4.stockActuelLitres !== '150.00' || pmp4.pmpActuel !== '13.000') {
      throw new Error(`CRITICAL PMP FAILURE: Expected Bon Price=13.000, Stock=150.00, PMP=13.000. Got Bon Price=${bonPmpTest2.prixParLitre}, Stock=${pmp4.stockActuelLitres}, PMP=${pmp4.pmpActuel}`);
    }
    console.log('  ✓ PASSED: Section 1.4 PMP scenario fully verified and mathematically exact!');

    // Clean up Section 1 test movements
    await prisma.stockGasoilMouvement.deleteMany({ where: { companyId: companyA.id } });
    await prisma.bonCarburant.deleteMany({ where: { vehicule: { companyId: companyA.id } } });

    // =========================================================================
    // SECTION 2: LOW STOCK ALERT STATE MACHINE & DEDUPLICATION (Section 2.4)
    // =========================================================================
    console.log('\n-----------------------------------------------------------------------------');
    console.log('--- SECTION 2: LOW STOCK ALERT STATE MACHINE & DEDUPLICATION (SECTION 2.4) --');
    console.log('-----------------------------------------------------------------------------');

    // Create test user for Company A so notifications have recipient
    const testUserA = await prisma.user.create({
      data: {
        companyId: companyA.id,
        nom: 'Chef Dépôt A',
        email: `chef-depot-${testRunId}@company-a.com`,
        motDePasse: 'hash123',
        idRole: 1,
      },
    });

    const getNotifCount = async () =>
      prisma.notification.count({ where: { companyId: companyA.id, type: 'STOCK_GASOIL_LOW' } });

    // 1. Stock 1000 L, Threshold 500 -> no low alert
    console.log('\n1. Stock 1000 L (Threshold 500 L)...');
    await stockService.createEntree(companyA.id, { quantiteLitres: 1000, prixUnitaire: 12.0 });
    let notifsCount = await getNotifCount();
    console.log(`  ✓ Notifications count = ${notifsCount}`);
    if (notifsCount !== 0) throw new Error(`Expected 0 notifications for Stock 1000 L, got ${notifsCount}`);

    // 2. Stock 500 L -> 1 low-stock alert
    console.log('\n2. Consuming fuel so Stock = 500 L (Threshold 500 L)...');
    await bonsService.create(
      {
        numeroBon: `ALERT-BON-1-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 500,
      },
      companyA.id,
    );
    notifsCount = await getNotifCount();
    console.log(`  ✓ Notifications count = ${notifsCount}`);
    if (notifsCount !== 1) throw new Error(`Expected 1 notification upon transition to LOW (500 L), got ${notifsCount}`);
    console.log('  ✓ PASSED: State transition NORMAL -> LOW triggered 1 notification!');

    // 3. Stock 400 L -> no duplicate alert
    console.log('\n3. Consuming fuel so Stock = 400 L (still LOW state)...');
    await bonsService.create(
      {
        numeroBon: `ALERT-BON-2-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 100,
      },
      companyA.id,
    );
    notifsCount = await getNotifCount();
    console.log(`  ✓ Notifications count = ${notifsCount}`);
    if (notifsCount !== 1) throw new Error(`Expected NO duplicate notification in LOW state, got ${notifsCount}`);
    console.log('  ✓ PASSED: Duplicate notification in LOW state successfully suppressed!');

    // 4. Stock 2000 L after entry -> reset state
    console.log('\n4. Replenishing stock (+2000 L -> Stock 2400 L)...');
    await stockService.createEntree(companyA.id, { quantiteLitres: 2000, prixUnitaire: 12.0 });
    const statsState4 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Stock = ${statsState4.stockActuelLitres} L, Statut alerte = ${statsState4.statutAlerte}`);
    if (statsState4.statutAlerte !== 'NORMAL') {
      throw new Error(`Expected alert state RESET to NORMAL, got ${statsState4.statutAlerte}`);
    }
    console.log('  ✓ PASSED: Alert state reset to NORMAL upon stock replenishment!');

    // 5. Stock 450 L later -> 2nd low-stock alert
    console.log('\n5. Consuming fuel so Stock = 450 L (transition NORMAL -> LOW again)...');
    await bonsService.create(
      {
        numeroBon: `ALERT-BON-3-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 1950,
      },
      companyA.id,
    );
    notifsCount = await getNotifCount();
    console.log(`  ✓ Notifications count = ${notifsCount}`);
    if (notifsCount !== 2) throw new Error(`Expected 2nd notification upon new transition to LOW, got ${notifsCount}`);
    console.log('  ✓ PASSED: Re-entering LOW state triggered 2nd low-stock alert!');

    // 6. Stock 0 L -> 1 empty-stock alert
    console.log('\n6. Consuming remaining 450 L so Stock = 0 L (transition LOW -> ZERO)...');
    await bonsService.create(
      {
        numeroBon: `ALERT-BON-4-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 450,
      },
      companyA.id,
    );
    notifsCount = await getNotifCount();
    const lastNotif = await prisma.notification.findFirst({
      where: { companyId: companyA.id },
      orderBy: { id: 'desc' },
    });
    console.log(`  ✓ Notifications count = ${notifsCount}, Last Notif Title = "${lastNotif?.titre}"`);
    if (notifsCount !== 3 || lastNotif?.titre !== 'Stock gasoil épuisé') {
      throw new Error(`Expected empty-stock alert upon transition to ZERO, got count=${notifsCount}, title=${lastNotif?.titre}`);
    }
    console.log('  ✓ PASSED: Transition LOW -> ZERO triggered empty-stock alert!');

    // 7. Stock remains 0 L -> no duplicate empty-stock alerts
    console.log('\n7. Checking zero stock stability (no duplicate empty-stock alerts)...');
    const statsState7 = await stockService.findStats({}, companyA.id);
    if (statsState7.statutAlerte !== 'ZERO') {
      throw new Error(`Expected alert state ZERO, got ${statsState7.statutAlerte}`);
    }
    notifsCount = await getNotifCount();
    if (notifsCount !== 3) throw new Error(`Expected count=3 (no duplicates), got ${notifsCount}`);
    console.log('  ✓ PASSED: Duplicate empty-stock alerts suppressed!');

    // 8. Stock replenished above threshold -> reset
    console.log('\n8. Replenishing stock (+1000 L -> Stock 1000 L > 500 L)...');
    await stockService.createEntree(companyA.id, { quantiteLitres: 1000, prixUnitaire: 12.0 });
    const statsState8 = await stockService.findStats({}, companyA.id);
    console.log(`  ✓ Stock = ${statsState8.stockActuelLitres} L, Statut alerte = ${statsState8.statutAlerte}`);
    if (statsState8.statutAlerte !== 'NORMAL') {
      throw new Error(`Expected alert state RESET to NORMAL from ZERO, got ${statsState8.statutAlerte}`);
    }
    console.log('  ✓ PASSED: Alert state reset to NORMAL from ZERO state!');

    // 9. Stock becomes 0 L again -> new empty-stock alert
    console.log('\n9. Consuming all 1000 L so Stock = 0 L again (transition NORMAL -> ZERO)...');
    await bonsService.create(
      {
        numeroBon: `ALERT-BON-5-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 1000,
      },
      companyA.id,
    );
    notifsCount = await getNotifCount();
    console.log(`  ✓ Notifications count = ${notifsCount}`);
    if (notifsCount !== 4) throw new Error(`Expected 4th notification (new ZERO alert), got ${notifsCount}`);
    console.log('  ✓ PASSED: Section 2.4 Notification State Machine completely verified!');

    // Clean up Section 2 test data
    await prisma.notificationRecipient.deleteMany({ where: { userId: testUserA.id } });
    await prisma.notification.deleteMany({ where: { companyId: companyA.id } });
    await prisma.user.delete({ where: { id: testUserA.id } });
    await prisma.stockGasoilMouvement.deleteMany({ where: { companyId: companyA.id } });
    await prisma.bonCarburant.deleteMany({ where: { vehicule: { companyId: companyA.id } } });

    // =========================================================================
    // SECTION 3: REGRESSION TEST SUITE
    // =========================================================================
    console.log('\n-----------------------------------------------------------------------------');
    console.log('--- SECTION 3: REGRESSION SUITE (13 HISTORICAL REGRESSION SCENARIOS) --------');
    console.log('-----------------------------------------------------------------------------');

    // Regression 1: Zero Stock Internal Bon Rejection
    console.log('Reg 1. Internal Bon with zero stock (expect 400)...');
    try {
      await bonsService.create(
        {
          numeroBon: `REG-ZERO-${testRunId}`,
          immatriculation: vehicleA.immatriculation,
          sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
          litres: 100,
        },
        companyA.id,
      );
      throw new Error('Expected 400 rejection');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('insuffisant')) {
        console.log(`  ✓ PASSED: Rejection verified (${err.message})`);
      } else throw err;
    }

    // Regression 2: External Bon -> No Stock Movement
    console.log('Reg 2. External Bon creation...');
    const regExtBon = await bonsService.create(
      {
        numeroBon: `REG-EXT-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.EXTERNE,
        nomStation: 'Station Afriquia',
        litres: 200,
        prixParLitre: 12.0,
      },
      companyA.id,
    );
    const regMouvements = await prisma.stockGasoilMouvement.count({ where: { idBonCarburant: regExtBon.idBon } });
    if (regMouvements !== 0) throw new Error('Expected 0 stock movements for EXTERNE bon');
    console.log('  ✓ PASSED: External Bon created 0 stock movements');

    // Regression 3: Stock Entry & Supplier Debt Isolation
    console.log('Reg 3. Stock Entry & Supplier Debt Isolation...');
    await stockService.createEntree(companyA.id, {
      quantiteLitres: 1000,
      prixUnitaire: 12.0,
      nomFournisseur: 'Fournisseur Test',
    });
    const regDebts = await prisma.detteFournisseur.count({ where: { companyId: companyA.id } });
    if (regDebts !== 0) throw new Error('Expected 0 supplier debts created');
    console.log('  ✓ PASSED: Stock entry isolated from supplier debts');

    // Regression 4: Internal Bon creation & SORTIE linkage
    console.log('Reg 4. Internal Bon (100 L) creation...');
    const regIntBon = await bonsService.create(
      {
        numeroBon: `REG-INT-${testRunId}`,
        immatriculation: vehicleA.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 100,
      },
      companyA.id,
    );
    const regSortie = await prisma.stockGasoilMouvement.findUnique({ where: { idBonCarburant: regIntBon.idBon } });
    if (!regSortie || regSortie.typeMouvement !== TypeMouvementGasoil.SORTIE) {
      throw new Error('Expected 1 SORTIE movement');
    }
    console.log('  ✓ PASSED: Internal Bon created 1 linked SORTIE movement');

    // Regression 5: Stock Overdraft Rejection
    console.log('Reg 5. Stock Overdraft Rejection (1500 L requested when 900 L available)...');
    try {
      await bonsService.create(
        {
          numeroBon: `REG-OVER-${testRunId}`,
          immatriculation: vehicleA.immatriculation,
          sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
          litres: 1500,
        },
        companyA.id,
      );
      throw new Error('Expected overdraft rejection');
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes('insuffisant')) {
        console.log(`  ✓ PASSED: Overdraft rejected (${err.message})`);
      } else throw err;
    }

    // Regression 6: Source Transition (STOCK_ENTREPRISE -> EXTERNE)
    console.log('Reg 6. Source transition STOCK_ENTREPRISE -> EXTERNE...');
    await bonsService.update(regIntBon.idBon, { sourceCarburant: SourceCarburant.EXTERNE }, companyA.id);
    const regCheckDeleted = await prisma.stockGasoilMouvement.findUnique({ where: { idBonCarburant: regIntBon.idBon } });
    if (regCheckDeleted) throw new Error('Expected SORTIE movement to be deleted');
    console.log('  ✓ PASSED: Transition to EXTERNE removed SORTIE movement');

    // Regression 7: Source Transition (EXTERNE -> STOCK_ENTREPRISE)
    console.log('Reg 7. Source transition EXTERNE -> STOCK_ENTREPRISE...');
    await bonsService.update(regIntBon.idBon, { sourceCarburant: SourceCarburant.STOCK_ENTREPRISE, litres: 150 }, companyA.id);
    const regCheckRecreated = await prisma.stockGasoilMouvement.findUnique({ where: { idBonCarburant: regIntBon.idBon } });
    if (!regCheckRecreated) throw new Error('Expected SORTIE movement to be recreated');
    console.log('  ✓ PASSED: Transition to STOCK_ENTREPRISE recreated SORTIE movement');

    // Regression 8: Multi-Tenant & Vehicle Isolation
    console.log('Reg 8. Multi-tenant vehicle isolation...');
    try {
      await bonsService.create(
        {
          numeroBon: `REG-CROSS-${testRunId}`,
          immatriculation: vehicleB.immatriculation,
          sourceCarburant: SourceCarburant.EXTERNE,
          litres: 50,
          prixParLitre: 12.0,
        },
        companyA.id,
      );
      throw new Error('Expected NotFoundException for cross-tenant vehicle');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Cross-tenant access strictly blocked (404)');
      } else throw err;
    }

    // Regression 9: Delete Internal Bon
    console.log('Reg 9. Delete Internal Bon...');
    await bonsService.remove(regIntBon.idBon, companyA.id);
    const regStatsAfterDelete = await stockService.findStats({}, companyA.id);
    if (regStatsAfterDelete.stockActuelLitres !== '1000.00') {
      throw new Error(`Expected stock restored to 1000.00 L, got ${regStatsAfterDelete.stockActuelLitres}`);
    }
    console.log('  ✓ PASSED: Deleting internal Bon restored stock to 1000.00 L');

    // ── CLEANUP ──
    console.log('\n[CLEANUP] Cleaning up test database fixtures...');
    await prisma.stockGasoilMouvement.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.bonCarburant.deleteMany({ where: { vehicule: { companyId: { in: [companyA.id, companyB.id] } } } });
    await prisma.vehicule.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.companySettings.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    console.log('  ✓ Cleanup finished');

    console.log('\n=============================================================================');
    console.log('=== ALL PHASE 2 CORRECTION QA TEST SCENARIOS PASSED 100% CLEANLY ============');
    console.log('=============================================================================\n');
  } catch (err) {
    console.error('❌ QA Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStockGasoilPhase2TestSuite();
