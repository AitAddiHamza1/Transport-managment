import { PrismaService } from './prisma/prisma.service';
import { StockGasoilService } from './modules/stock-gasoil/stock-gasoil.service';
import { BonsCarburantService } from './modules/bons-carburant/bons-carburant.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { SourceCarburant } from '@prisma/client';

async function runPhase3IntegrationTests() {
  console.log('=============================================================================');
  console.log('=== PHASE 3 — FRONTEND & API INTEGRATION QA TEST SUITE =====================');
  console.log('=============================================================================\n');

  const prisma = new PrismaService();
  const notificationsService = new NotificationsService(prisma);
  const stockService = new StockGasoilService(prisma, notificationsService);
  const bonsService = new BonsCarburantService(prisma, stockService);

  const testRunId = Date.now();

  try {
    // 1. Setup test user & company
    console.log('[SETUP] Creating test company and vehicle...');
    const company = await prisma.company.create({
      data: { nom: `QA Phase3 ${testRunId}` },
    });

    await prisma.companySettings.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
      update: { seuilAlerteStockGasoil: 500.0, statutAlerteStockGasoil: 'NORMAL' },
    });

    const vehicle = await prisma.vehicule.create({
      data: {
        companyId: company.id,
        immatriculation: `P3-${testRunId.toString().slice(-5)}`,
        marque: 'Volvo',
        modele: 'FH16',
      },
    });

    console.log(`  ✓ Company #${company.id}, Vehicle: ${vehicle.immatriculation}`);

    // 2. Initial Stats Check
    console.log('\n--- 1. API GET /stock-gasoil/stats (Initial State) ---');
    const initialStats = await stockService.findStats({}, company.id);
    console.log(`  ✓ Initial Stock = ${initialStats.stockActuelLitres} L, Seuil = ${initialStats.seuilAlerteLitres} L, Statut = ${initialStats.statutAlerte}`);
    if (initialStats.stockActuelLitres !== '0.00') {
      throw new Error('Initial stock should be 0.00');
    }

    // 3. Create Stock Entry (Approvisionnement Citerne)
    console.log('\n--- 2. POST /stock-gasoil/entrees (New Stock Entry) ---');
    const entry1 = await stockService.createEntree(company.id, {
      quantiteLitres: 1000,
      prixUnitaire: 12.00,
      nomFournisseur: 'Afriquia Citerne',
      referenceFacture: 'BL-99001',
    });

    console.log(`  ✓ Created Entry #${entry1.idMouvement}: 1000 L @ 12 MAD`);
    const statsAfterEntry = await stockService.findStats({}, company.id);
    console.log(`  ✓ Stock = ${statsAfterEntry.stockActuelLitres} L, PMP = ${statsAfterEntry.pmpActuel} MAD/L`);
    if (statsAfterEntry.stockActuelLitres !== '1000.00' || statsAfterEntry.pmpActuel !== '12.000') {
      throw new Error('Stock or PMP incorrect after entry 1');
    }

    // 4. Create Internal Fuel Voucher (sourceCarburant = STOCK_ENTREPRISE)
    console.log('\n--- 3. Internal BonCarburant (sourceCarburant = STOCK_ENTREPRISE) ---');
    const internalBon = await bonsService.create(
      {
        numeroBon: `BON-INT-${testRunId}`,
        immatriculation: vehicle.immatriculation,
        sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
        litres: 200,
      },
      company.id,
    );

    console.log(`  ✓ Internal Bon #${internalBon.idBon} created: 200 L @ ${internalBon.prixParLitre} MAD/L`);
    const statsAfterBon = await stockService.findStats({}, company.id);
    console.log(`  ✓ Stock after sortie = ${statsAfterBon.stockActuelLitres} L, PMP = ${statsAfterBon.pmpActuel} MAD/L`);
    if (statsAfterBon.stockActuelLitres !== '800.00') {
      throw new Error('Stock should be 800.00 L after 200 L exit');
    }

    // 5. Check Overdraft Blocking (1500 L requested when 800 L available)
    console.log('\n--- 4. UI/Backend Overdraft Blocking Check (1500 L requested) ---');
    let overdraftBlocked = false;
    try {
      await bonsService.create(
        {
          numeroBon: `BON-OVER-${testRunId}`,
          immatriculation: vehicle.immatriculation,
          sourceCarburant: SourceCarburant.STOCK_ENTREPRISE,
          litres: 1500,
        },
        company.id,
      );
    } catch (err: any) {
      overdraftBlocked = true;
      console.log(`  ✓ Blocked overdraft error caught: "${err.message}"`);
    }
    if (!overdraftBlocked) throw new Error('Overdraft was not blocked!');

    // 6. Create External Fuel Voucher (sourceCarburant = EXTERNE)
    console.log('\n--- 5. External BonCarburant (sourceCarburant = EXTERNE) ---');
    const externalBon = await bonsService.create(
      {
        numeroBon: `BON-EXT-${testRunId}`,
        immatriculation: vehicle.immatriculation,
        sourceCarburant: SourceCarburant.EXTERNE,
        nomStation: 'Station Afriquia Oasis',
        litres: 100,
        prixParLitre: 14.50,
      },
      company.id,
    );

    console.log(`  ✓ External Bon #${externalBon.idBon} created.`);
    const statsAfterExternal = await stockService.findStats({}, company.id);
    console.log(`  ✓ Stock remains unchanged = ${statsAfterExternal.stockActuelLitres} L`);
    if (statsAfterExternal.stockActuelLitres !== '800.00') {
      throw new Error('External fuel voucher must not alter stock');
    }

    // Cleanup
    console.log('\n[CLEANUP] Removing test fixtures...');
    await prisma.stockGasoilMouvement.deleteMany({ where: { companyId: company.id } });
    await prisma.bonCarburant.deleteMany({ where: { vehicule: { companyId: company.id } } });
    await prisma.vehicule.deleteMany({ where: { companyId: company.id } });
    await prisma.companySettings.deleteMany({ where: { companyId: company.id } });
    await prisma.company.deleteMany({ where: { id: company.id } });
    console.log('  ✓ Cleanup complete.');

    console.log('\n=============================================================================');
    console.log('=== ALL PHASE 3 FRONTEND & API CONTRACT TESTS PASSED 100% CLEANLY ===========');
    console.log('=============================================================================\n');
  } catch (err: any) {
    console.error('❌ Phase 3 Integration Runner Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase3IntegrationTests();
