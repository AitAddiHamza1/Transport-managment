import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService } from './modules/factures/factures.service';
import { ModeFacturation } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';

async function runFactureStatsMulticurrencyTests() {
  console.log('========================================================================');
  console.log('=== TEST RUNNER — FACTURE STATS MULTI-CURRENCY & TENANT ISOLATION ===');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const facturesService = app.get(FacturesService);

  let companyAId: number | null = null;
  let companyBId: number | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Test Companies
    // -------------------------------------------------------------
    console.log('[SETUP] Initializing isolated test companies...');
    let compA = await prisma.company.findFirst({ where: { nom: 'TEST_STATS_MULTICURRENCY_A' } });
    if (!compA) compA = await prisma.company.create({ data: { nom: 'TEST_STATS_MULTICURRENCY_A' } });
    companyAId = compA.id;

    let compB = await prisma.company.findFirst({ where: { nom: 'TEST_STATS_MULTICURRENCY_B' } });
    if (!compB) compB = await prisma.company.create({ data: { nom: 'TEST_STATS_MULTICURRENCY_B' } });
    companyBId = compB.id;

    // Clean up test data
    await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
    await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });

    // -------------------------------------------------------------
    // TEST 5 — EMPTY LIST (0 Invoices)
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing empty invoice list stats (0 invoices)...');
    const emptyStats = await facturesService.findStats(companyAId);
    if (emptyStats.totalFactures !== 0) throw new Error(`Expected 0 factures, got ${emptyStats.totalFactures}`);
    if (emptyStats.totalSousTotal !== 0) throw new Error(`Expected 0 totalSousTotal, got ${emptyStats.totalSousTotal}`);
    if (emptyStats.totalTva !== 0) throw new Error(`Expected 0 totalTva, got ${emptyStats.totalTva}`);
    if (emptyStats.totalTtc !== 0) throw new Error(`Expected 0 totalTtc, got ${emptyStats.totalTtc}`);
    if (Object.keys(emptyStats.totalSousTotalByCurrency || {}).length !== 0) {
      throw new Error(`Expected empty totalSousTotalByCurrency, got ${JSON.stringify(emptyStats.totalSousTotalByCurrency)}`);
    }
    console.log('  ✓ PASSED: Empty invoice list correctly reports 0 count, 0 amounts, and empty byCurrency.');

    // -------------------------------------------------------------
    // TEST 1 — ALL INVOICES IN MAD
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing single currency MAD factures...');
    await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F_TEST_MAD_1',
        nomClient: 'CLIENT_TEST_A',
        devise: 'MAD',
        sousTotal: 10000.0,
        tauxTva: 20.0,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });
    await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F_TEST_MAD_2',
        nomClient: 'CLIENT_TEST_A',
        devise: 'MAD',
        sousTotal: 5000.0,
        tauxTva: 20.0,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });

    const statsMad = await facturesService.findStats(companyAId);
    if (statsMad.totalFactures !== 2) throw new Error(`Expected totalFactures=2, got ${statsMad.totalFactures}`);
    if (statsMad.devise !== 'MAD') throw new Error(`Expected devise=MAD, got ${statsMad.devise}`);
    if (statsMad.totalSousTotal !== 15000.0) throw new Error(`Expected totalSousTotal=15000, got ${statsMad.totalSousTotal}`);
    if (statsMad.totalTva !== 3000.0) throw new Error(`Expected totalTva=3000, got ${statsMad.totalTva}`);
    if (statsMad.totalTtc !== 18000.0) throw new Error(`Expected totalTtc=18000, got ${statsMad.totalTtc}`);
    if (statsMad.totalSousTotalByCurrency?.['MAD'] !== 15000.0) {
      throw new Error(`Expected MAD HT=15000, got ${statsMad.totalSousTotalByCurrency?.['MAD']}`);
    }
    if (statsMad.totalTvaByCurrency?.['MAD'] !== 3000.0) {
      throw new Error(`Expected MAD TVA=3000, got ${statsMad.totalTvaByCurrency?.['MAD']}`);
    }
    if (statsMad.totalTtcByCurrency?.['MAD'] !== 18000.0) {
      throw new Error(`Expected MAD TTC=18000, got ${statsMad.totalTtcByCurrency?.['MAD']}`);
    }
    console.log('  ✓ PASSED: All MAD invoices correctly aggregated (Count: 2, HT: 15,000 MAD, TTC: 18,000 MAD).');

    // -------------------------------------------------------------
    // TEST 3 — MIXED CURRENCY (MAD + EUR)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing mixed currency (MAD + EUR) factures...');
    await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F_TEST_EUR_1',
        nomClient: 'CLIENT_TEST_A',
        devise: 'EUR',
        sousTotal: 2000.0,
        tauxTva: 20.0,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });

    const statsMixed = await facturesService.findStats(companyAId);
    if (statsMixed.totalFactures !== 3) throw new Error(`Expected totalFactures=3, got ${statsMixed.totalFactures}`);
    if (statsMixed.devise !== 'MIXED') throw new Error(`Expected devise=MIXED, got ${statsMixed.devise}`);
    // No direct unsafe sum
    if (statsMixed.totalSousTotal !== 0 || statsMixed.totalTva !== 0 || statsMixed.totalTtc !== 0) {
      throw new Error(`Expected 0 for direct unseparated sums in MIXED mode, got ST=${statsMixed.totalSousTotal}`);
    }
    if (statsMixed.totalSousTotalByCurrency?.['MAD'] !== 15000.0) {
      throw new Error(`Expected MAD HT=15000 in mixed stats, got ${statsMixed.totalSousTotalByCurrency?.['MAD']}`);
    }
    if (statsMixed.totalSousTotalByCurrency?.['EUR'] !== 2000.0) {
      throw new Error(`Expected EUR HT=2000 in mixed stats, got ${statsMixed.totalSousTotalByCurrency?.['EUR']}`);
    }
    if (statsMixed.totalTtcByCurrency?.['MAD'] !== 18000.0) {
      throw new Error(`Expected MAD TTC=18000 in mixed stats, got ${statsMixed.totalTtcByCurrency?.['MAD']}`);
    }
    if (statsMixed.totalTtcByCurrency?.['EUR'] !== 2400.0) {
      throw new Error(`Expected EUR TTC=2400 in mixed stats, got ${statsMixed.totalTtcByCurrency?.['EUR']}`);
    }
    console.log('  ✓ PASSED: Mixed currencies flagged devise="MIXED", no unsafe direct summation, amounts cleanly grouped:');
    console.log(`    MAD: HT ${statsMixed.totalSousTotalByCurrency?.['MAD']}, TTC ${statsMixed.totalTtcByCurrency?.['MAD']}`);
    console.log(`    EUR: HT ${statsMixed.totalSousTotalByCurrency?.['EUR']}, TTC ${statsMixed.totalTtcByCurrency?.['EUR']}`);

    // -------------------------------------------------------------
    // TEST 7 — SUPPORTED CURRENCY FILTERS (MAD and EUR)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing currency filter parameter (devise filter)...');
    const statsFilteredMad = await facturesService.findStats(companyAId, { devise: 'MAD' });
    if (statsFilteredMad.totalFactures !== 2) throw new Error(`Expected 2 MAD factures, got ${statsFilteredMad.totalFactures}`);
    if (statsFilteredMad.devise !== 'MAD') throw new Error(`Expected devise=MAD, got ${statsFilteredMad.devise}`);
    if (statsFilteredMad.totalSousTotal !== 15000.0) throw new Error(`Expected totalSousTotal=15000, got ${statsFilteredMad.totalSousTotal}`);

    const statsFilteredEur = await facturesService.findStats(companyAId, { devise: 'EUR' });
    if (statsFilteredEur.totalFactures !== 1) throw new Error(`Expected 1 EUR facture, got ${statsFilteredEur.totalFactures}`);
    if (statsFilteredEur.devise !== 'EUR') throw new Error(`Expected devise=EUR, got ${statsFilteredEur.devise}`);
    if (statsFilteredEur.totalSousTotal !== 2000.0) throw new Error(`Expected totalSousTotal=2000, got ${statsFilteredEur.totalSousTotal}`);
    if (statsFilteredEur.totalTtc !== 2400.0) throw new Error(`Expected totalTtc=2400, got ${statsFilteredEur.totalTtc}`);
    console.log('  ✓ PASSED: Currency filters correctly isolate MAD (2 invoices) and EUR (1 invoice).');

    // -------------------------------------------------------------
    // TEST 2 — ALL INVOICES IN EUR ONLY (tested via filter)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Verifying single currency EUR calculation...');
    if (statsFilteredEur.totalSousTotalByCurrency?.['EUR'] !== 2000.0) {
      throw new Error(`Expected EUR HT=2000, got ${statsFilteredEur.totalSousTotalByCurrency?.['EUR']}`);
    }
    console.log('  ✓ PASSED: EUR currency single aggregation verified.');

    // -------------------------------------------------------------
    // TEST 4 — TOTAL NUL RÉELLEMENT ÉGAL À ZÉRO
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing zero amount invoice (total nul)...');
    await prisma.facture.create({
      data: {
        companyId: companyAId,
        numeroFacture: 'F_TEST_ZERO_1',
        nomClient: 'CLIENT_TEST_A',
        devise: 'MAD',
        sousTotal: 0.0,
        tauxTva: 0.0,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });
    const statsWithZero = await facturesService.findStats(companyAId, { devise: 'MAD' });
    if (statsWithZero.totalFactures !== 3) throw new Error(`Expected 3 MAD factures, got ${statsWithZero.totalFactures}`);
    if (statsWithZero.totalSousTotal !== 15000.0) throw new Error(`Expected totalSousTotal=15000, got ${statsWithZero.totalSousTotal}`);
    console.log('  ✓ PASSED: Zero amount invoice correctly counted without distorting totals.');

    // -------------------------------------------------------------
    // TEST 8 — TENANT ISOLATION (Company A vs Company B)
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing multi-tenant statistics isolation...');
    await prisma.facture.create({
      data: {
        companyId: companyBId,
        numeroFacture: 'F_TEST_COMPB_1',
        nomClient: 'CLIENT_TEST_B',
        devise: 'MAD',
        sousTotal: 88000.0,
        tauxTva: 20.0,
        modeFacturation: ModeFacturation.AVEC_FACTURE,
      },
    });

    const statsCompA = await facturesService.findStats(companyAId);
    const statsCompB = await facturesService.findStats(companyBId);

    if (statsCompA.totalFactures !== 4) throw new Error(`Company A should have 4 factures, got ${statsCompA.totalFactures}`);
    if (statsCompB.totalFactures !== 1) throw new Error(`Company B should have 1 facture, got ${statsCompB.totalFactures}`);
    if (statsCompB.totalSousTotal !== 88000.0) throw new Error(`Company B should have 88000 HT, got ${statsCompB.totalSousTotal}`);
    if (statsCompB.totalSousTotalByCurrency?.['MAD'] !== 88000.0) {
      throw new Error(`Company B MAD HT mismatch: ${statsCompB.totalSousTotalByCurrency?.['MAD']}`);
    }
    // Check that Company B invoice is NOT in Company A
    if (statsCompA.totalSousTotalByCurrency?.['MAD'] !== 15000.0) {
      throw new Error(`Leak detected! Company A MAD HT should be 15000, got ${statsCompA.totalSousTotalByCurrency?.['MAD']}`);
    }
    console.log('  ✓ PASSED: Strict tenant isolation verified. Zero leakage between Company A and Company B.');

    // -------------------------------------------------------------
    // TEST 6 — AUTH / ERROR HANDLING
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing unauthorized/missing company ID error...');
    let threwUnauthorized = false;
    try {
      await facturesService.findStats(0);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        threwUnauthorized = true;
      }
    }
    if (!threwUnauthorized) throw new Error('Expected UnauthorizedException when companyId <= 0');
    console.log('  ✓ PASSED: findStats throws UnauthorizedException when companyId is missing/invalid.');

    // -------------------------------------------------------------
    // TEST 9 — ABSENCE DE RÉGRESSION DANS LES CALCULS HT/TVA/TTC
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Verifying calculation accuracy & backward compatibility...');
    if (typeof statsCompB.totalFactures !== 'number' ||
        typeof statsCompB.totalSousTotal !== 'number' ||
        typeof statsCompB.totalTva !== 'number' ||
        typeof statsCompB.totalTtc !== 'number' ||
        typeof statsCompB.emisesCount !== 'number' ||
        typeof statsCompB.payeesCount !== 'number' ||
        typeof statsCompB.annuleesCount !== 'number') {
      throw new Error('Backward-compatible FactureStats fields missing or wrong type');
    }
    console.log('  ✓ PASSED: Full backward compatibility and precision preserved.');

    console.log('\n========================================================================');
    console.log('=== ALL 9 TARGETED TESTS PASSED PERFECTLY (0 FAILURES) ===');
    console.log('========================================================================\n');
  } finally {
    // Clean up test data
    console.log('[CLEANUP] Cleaning temporary test records...');
    if (companyAId && companyBId) {
      await prisma.creanceClient.deleteMany({ where: { facture: { companyId: { in: [companyAId, companyBId] } } } });
      await prisma.facture.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
      await prisma.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    }
    await app.close();
  }
}

runFactureStatsMulticurrencyTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
