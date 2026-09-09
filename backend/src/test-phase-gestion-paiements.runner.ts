import { PrismaService } from './prisma/prisma.service';
import { GestionPaiementsService } from './modules/gestion-paiements/gestion-paiements.service';
import { DepensesAdministrativesService } from './modules/depenses-administratives/depenses-administratives.service';

async function runGestionPaiementsVerification() {
  console.log('==================================================================');
  console.log('=== GESTION DES PAIEMENTS MODULE INVARIANT VERIFICATION SUITE ===');
  console.log('==================================================================\n');

  const prisma = new PrismaService();
  const service = new GestionPaiementsService(prisma);
  const adminExpService = new DepensesAdministrativesService(prisma);

  try {
    const testAdmin = await prisma.user.findFirst({
      where: { email: 'admin@transport.local' },
      include: { role: true },
    });

    const adminPermissions = {
      gestion_paiements: { voir: true },
      paiements_clients: { voir: true },
      paiements_fournisseurs: { voir: true },
      paiements_employes: { voir: true },
      depenses_administratives: { voir: true },
    };

    // -------------------------------------------------------------
    // Test 1: User with no source permissions receives empty result, not 500
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing user with no source permissions (0 sources allowed)...');
    const noSourcesPerms = {
      gestion_paiements: { voir: true },
    };
    const emptyListRes = await service.findAll({}, noSourcesPerms, 'COMPTABLE', false);
    if (emptyListRes.data.length !== 0 || emptyListRes.meta.total !== 0) {
      throw new Error('Expected empty data array and total 0 for user with no source permissions');
    }
    const emptyStatsRes = await service.findStats({}, noSourcesPerms, 'COMPTABLE', false);
    if (emptyStatsRes.totalCount !== 0 || emptyStatsRes.totalIn !== '0.00') {
      throw new Error('Expected 0 stats for user with no source permissions');
    }
    console.log(
      '  ✓ PASSED: User with no source permissions returned 200 with empty list and zero stats (no 500 error)',
    );

    // -------------------------------------------------------------
    // Test 2: BigInt & Decimal Serialization
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing BigInt and Decimal JSON serialization...');
    const listRes = await service.findAll(
      { page: 1, limit: 10 },
      adminPermissions,
      'ADMIN_GENERAL',
      true,
    );
    const jsonStr = JSON.stringify(listRes);
    if (jsonStr.includes('BigInt')) {
      throw new Error('JSON serialization failed: raw BigInt detected');
    }
    console.log(
      `  ✓ PASSED: JSON.stringify succeeded on ${listRes.data.length} items without BigInt failure`,
    );

    // -------------------------------------------------------------
    // Test 3: Active record creation & mapping for Administrative Expense
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Administrative Expense mapping & direction OUT...');
    const testAdminExp = await adminExpService.create(
      {
        categorieDepense: 'FOURNITURES_BUREAU',
        description: 'Test Achat Fournitures Verification',
        montant: 750.5,
        dateDepense: '2026-06-15',
      },
      testAdmin?.id,
    );

    const fullList = await service.findAll(
      { page: 1, limit: 50 },
      adminPermissions,
      'ADMIN_GENERAL',
      true,
    );
    const foundAdminExp = fullList.data.find(
      (m) => m.sourceType === 'ADMINISTRATIVE_EXPENSE' && m.sourceId === testAdminExp.idDepense,
    );

    if (!foundAdminExp) {
      throw new Error('Created administrative expense not found in consolidated list!');
    }
    if (foundAdminExp.direction !== 'OUT')
      throw new Error('Expected direction OUT for admin expense');
    if (foundAdminExp.amount !== '750.50')
      throw new Error(`Expected amount "750.50", got "${foundAdminExp.amount}"`);
    if (foundAdminExp.party.type !== 'ADMINISTRATIVE_CATEGORY')
      throw new Error('Invalid party type');

    console.log(
      `  ✓ PASSED: Administrative Expense #${testAdminExp.idDepense} correctly mapped as ${foundAdminExp.movementId}`,
    );

    // -------------------------------------------------------------
    // Test 4: Stats Calculation & Net Balance
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Filtered Stats Calculation & Net Balance...');
    const stats = await service.findStats({}, adminPermissions, 'ADMIN_GENERAL', true);
    const totalInNum = parseFloat(stats.totalIn);
    const totalOutNum = parseFloat(stats.totalOut);
    const expectedNet = (totalInNum - totalOutNum).toFixed(2);

    if (stats.netBalance !== expectedNet) {
      throw new Error(`Expected net balance ${expectedNet}, got ${stats.netBalance}`);
    }

    console.log(
      `  ✓ PASSED: Stats calculated totalIn=${stats.totalIn}, totalOut=${stats.totalOut}, netBalance=${stats.netBalance} MAD`,
    );

    // -------------------------------------------------------------
    // Test 5: Source-Level Permission Filtering (Restricted User)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Source-Level Permission Filtering for Restricted User...');
    const restrictedPermissions = {
      gestion_paiements: { voir: true },
      paiements_clients: { voir: true },
      // NO depenses_administratives permission!
    };

    const restrictedList = await service.findAll({}, restrictedPermissions, 'COMPTABLE', false);
    const hasAdminExpInRestricted = restrictedList.data.some(
      (m) => m.sourceType === 'ADMINISTRATIVE_EXPENSE',
    );

    if (hasAdminExpInRestricted) {
      throw new Error(
        'SECURITY VIOLATION: Restricted user was able to view administrative expenses!',
      );
    }

    console.log(
      '  ✓ PASSED: Source-level permission filtering correctly excluded unauthorized module data',
    );

    // -------------------------------------------------------------
    // Test 6: Exclusion of Soft-Deleted Records
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Exclusion of Soft-Deleted Records...');
    await adminExpService.softDelete(testAdminExp.idDepense);

    const postDeleteList = await service.findAll({}, adminPermissions, 'ADMIN_GENERAL', true);
    const hasDeletedExp = postDeleteList.data.some(
      (m) => m.sourceType === 'ADMINISTRATIVE_EXPENSE' && m.sourceId === testAdminExp.idDepense,
    );

    if (hasDeletedExp) {
      throw new Error('Soft-deleted administrative expense appeared in gestion-paiements list!');
    }

    console.log('  ✓ PASSED: Soft-deleted administrative expense excluded from unified list');

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    await prisma.depenseAdministrative.delete({
      where: { idDepense: testAdminExp.idDepense },
    });

    console.log('\n==================================================================');
    console.log('=== ALL GESTION DES PAIEMENTS INVARIANT TESTS PASSED CLEANLY ===');
    console.log('==================================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGestionPaiementsVerification();
