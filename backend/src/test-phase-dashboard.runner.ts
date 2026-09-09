import { PrismaService } from './prisma/prisma.service';
import { DashboardService } from './modules/dashboard/dashboard.service';

async function runDashboardVerification() {
  console.log('======================================================================');
  console.log('=== TABLEAU DE BORD FINAL MODULE INVARIANT VERIFICATION SUITE ===');
  console.log('======================================================================\n');

  const prisma = new PrismaService();
  const dashboardService = new DashboardService(prisma);

  try {
    // -------------------------------------------------------------
    // Test 1: Full Admin Permissions Overview & Presets
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Overview Endpoint for ADMIN_GENERAL across Presets...');
    const overviewMonth = await dashboardService.getOverview({ preset: 'CE_MOIS' }, null, true);

    if (!overviewMonth.period.dateDebut || !overviewMonth.period.dateFin) {
      throw new Error('Expected resolved dateDebut and dateFin');
    }
    if (
      overviewMonth.metadata.isPartial !== false ||
      overviewMonth.metadata.excludedSources.length !== 0
    ) {
      throw new Error('Expected ADMIN_GENERAL to have isPartial=false and empty excludedSources');
    }

    console.log(
      `  ✓ CE_MOIS Period: ${overviewMonth.period.dateDebut} to ${overviewMonth.period.dateFin}`,
    );
    console.log(`  ✓ Company: ${overviewMonth.company.name} (${overviewMonth.company.currency})`);
    console.log(
      `  ✓ Financials: CA=${overviewMonth.financial.totalInvoiced}, Receipts=${overviewMonth.financial.clientReceipts}, Outflow=${overviewMonth.financial.totalOutflow}, Solde=${overviewMonth.financial.netCashFlow}, Outstanding=${overviewMonth.financial.outstandingAmount}`,
    );

    // Test AUJOURDHUI preset
    const overviewToday = await dashboardService.getOverview({ preset: 'AUJOURDHUI' }, null, true);
    console.log(
      `  ✓ AUJOURDHUI Period: ${overviewToday.period.dateDebut} to ${overviewToday.period.dateFin}`,
    );

    // Test CETTE_ANNEE preset
    const overviewYear = await dashboardService.getOverview({ preset: 'CETTE_ANNEE' }, null, true);
    console.log(
      `  ✓ CETTE_ANNEE Period: ${overviewYear.period.dateDebut} to ${overviewYear.period.dateFin}`,
    );

    // -------------------------------------------------------------
    // Test 2: Current-State vs Period Metric Isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Current-State vs Period Metric Isolation...');
    // Active vehicles (Current state) must remain identical regardless of period preset
    if (overviewToday.operations.activeVehicles !== overviewYear.operations.activeVehicles) {
      throw new Error('Current-state metric activeVehicles changed with period preset!');
    }
    if (overviewToday.financial.outstandingAmount !== overviewYear.financial.outstandingAmount) {
      throw new Error('Current-state metric outstandingAmount changed with period preset!');
    }
    console.log(
      `  ✓ PASSED: Current-state snapshots (Active Vehicles: ${overviewMonth.operations.activeVehicles}, Outstanding: ${overviewMonth.financial.outstandingAmount}) are independent of period filter`,
    );

    // -------------------------------------------------------------
    // Test 3: Permission-Aware Source Isolation & Partial Metadata
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Permission-Aware Source Isolation & Partial Metadata...');
    // Restricted user lacking factures and paiements_employes permissions
    const restrictedPerms = {
      paiements_clients: { voir: true },
      paiements_fournisseurs: { voir: true },
      depenses_administratives: { voir: true },
      depenses_vehicules: { voir: true },
      bons_carburant: { voir: true },
      vehicules: { voir: true },
      conducteurs: { voir: true },
      voyages: { voir: true },
      documents_vehicules: { voir: true },
    };

    const restrictedOverview = await dashboardService.getOverview(
      { preset: 'CE_MOIS' },
      restrictedPerms,
      false,
    );

    if (restrictedOverview.metadata.isPartial !== true) {
      throw new Error('Expected isPartial=true for restricted user');
    }
    if (
      !restrictedOverview.metadata.excludedSources.includes('FACTURES') ||
      !restrictedOverview.metadata.excludedSources.includes('PAIEMENTS_EMPLOYES')
    ) {
      throw new Error('Expected FACTURES and PAIEMENTS_EMPLOYES in excludedSources');
    }
    if (restrictedOverview.financial.totalInvoiced !== null) {
      throw new Error('Expected totalInvoiced=null when factures.voir is missing');
    }

    console.log(
      `  ✓ PASSED: Partial metadata correctly set (isPartial: ${restrictedOverview.metadata.isPartial}, excluded: ${restrictedOverview.metadata.excludedSources.join(', ')})`,
    );

    // -------------------------------------------------------------
    // Test 4: Exactly 4 Chart Datasets
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing 4 Chart Datasets Structure...');
    const charts = await dashboardService.getCharts({ preset: 'CE_MOIS', months: 6 }, null, true);

    if (
      !Array.isArray(charts.cashFlow) ||
      !Array.isArray(charts.tripsByStatus) ||
      !Array.isArray(charts.expensesBySource) ||
      !Array.isArray(charts.documentsByStatus)
    ) {
      throw new Error('Missing one or more required chart arrays');
    }
    if (charts.cashFlow.length !== 6) {
      throw new Error(`Expected 6 cash flow periods, got ${charts.cashFlow.length}`);
    }

    console.log(
      `  ✓ PASSED: 4 Chart Datasets returned cleanly (Cash flow periods: ${charts.cashFlow.length}, Trip status series: ${charts.tripsByStatus.length}, Expense categories: ${charts.expensesBySource.length}, Doc health: ${charts.documentsByStatus.length})`,
    );

    // -------------------------------------------------------------
    // Test 5: Actionable Alerts
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Actionable Alerts Endpoint...');
    const alerts = await dashboardService.getAlerts(null, true);
    console.log(`  ✓ PASSED: Alerts count: ${alerts.length}`);
    for (const a of alerts) {
      console.log(`    - [${a.severity.toUpperCase()}] ${a.title} -> ${a.targetRoute}`);
    }

    // -------------------------------------------------------------
    // Test 6: Period-Filtered Recent Activity Feed & Null Safeguard
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Period-Filtered Recent Activity Stream & Null Safeguard...');
    const activityMonth = await dashboardService.getRecentActivity(
      { preset: 'CE_MOIS' },
      null,
      true,
    );
    const activityToday = await dashboardService.getRecentActivity(
      { preset: 'AUJOURDHUI' },
      null,
      true,
    );

    if (activityMonth.length > 20) {
      throw new Error(`Expected max 20 items, got ${activityMonth.length}`);
    }

    // Verify null safeguard across returned items
    for (const act of activityMonth) {
      if (act.title.includes('null') || act.description.includes('null')) {
        throw new Error(`Literal string 'null' detected in activity item ${act.activityId}`);
      }
    }

    console.log(
      `  ✓ PASSED: CE_MOIS activity count: ${activityMonth.length}, AUJOURDHUI activity count: ${activityToday.length}`,
    );
    if (activityMonth.length > 0) {
      const first = activityMonth[0];
      console.log(
        `    Sample Item #1: ID=${first.activityId}, title="${first.title}", desc="${first.description}", precision=${first.timestampPrecision}`,
      );
    }

    console.log('\n======================================================================');
    console.log('=== ALL TABLEAU DE BORD INVARIANT TESTS PASSED CLEANLY ===');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDashboardVerification();
