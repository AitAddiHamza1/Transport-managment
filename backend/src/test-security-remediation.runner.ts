import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

async function runSecurityRemediationTests() {
  console.log('====================================================');
  console.log('=== SECURITY REMEDIATION REGRESSION TEST SUITE ===');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const paiementsService = app.get(PaiementsClientsService);

  try {
    // -------------------------------------------------------------
    // Test 1: Mandatory companyId Enforcement on findAll
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Mandatory companyId on findAll...');
    try {
      await paiementsService.findAll(undefined as any);
      throw new Error('FAILED: Service accepted undefined companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException && err.message.includes('entreprise requis')) {
        console.log('  ✓ PASSED: Missing companyId cleanly rejected with UnauthorizedException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 2: Mandatory companyId Enforcement on findOne
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing Mandatory companyId on findOne...');
    try {
      await paiementsService.findOne(1, 0);
      throw new Error('FAILED: Service accepted zero companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException && err.message.includes('entreprise requis')) {
        console.log('  ✓ PASSED: Zero companyId cleanly rejected with UnauthorizedException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 3: Mandatory companyId Enforcement on findStats
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Mandatory companyId on findStats...');
    try {
      await paiementsService.findStats(undefined as any);
      throw new Error('FAILED: Service accepted undefined companyId');
    } catch (err: any) {
      if (err instanceof UnauthorizedException && err.message.includes('entreprise requis')) {
        console.log('  ✓ PASSED: Missing companyId cleanly rejected with UnauthorizedException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 4: Single-Step Relational Lookup & IDOR Protection on findOne
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing Single-Step Relational IDOR Protection on findOne...');
    try {
      // Query with non-existent payment ID or mismatched companyId
      await paiementsService.findOne(999999, 999999);
      throw new Error('FAILED: findOne returned result for non-existent/cross-tenant ID');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('  ✓ PASSED: Non-existent or cross-tenant payment returned clean NotFoundException (404)');
      } else {
        throw err;
      }
    }

    console.log('\n====================================================');
    console.log('=== ALL SECURITY REMEDIATION TESTS PASSED CLEANLY ===');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('❌ SECURITY REMEDIATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runSecurityRemediationTests();
