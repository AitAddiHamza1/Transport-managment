import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './modules/auth/auth.service';
import { PlatformAuthService } from './modules/platform-admin/platform-auth.service';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

async function runGuardSecurityRegressionTests() {
  console.log('=== GLOBAL GUARD BYPASS CORRECTION SECURITY TEST SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);
  const platformAuthService = app.get(PlatformAuthService);
  const reflector = app.get(Reflector);

  const jwtAuthGuard = new JwtAuthGuard(reflector);

  let tenantCo1Id: number | null = null;
  let tenantCo2Id: number | null = null;
  let platformAdminId: number | null = null;

  try {
    // 1. Setup Test Tenants & Platform Admin
    console.log('--- 1. Setup Test Entities ---');
    const co1 = await prisma.company.create({ data: { nom: `GuardTest Co1 ${Date.now()}`, statut: 'ACTIF' } });
    const co2 = await prisma.company.create({ data: { nom: `GuardTest Co2 ${Date.now()}`, statut: 'ACTIF' } });
    tenantCo1Id = co1.id;
    tenantCo2Id = co2.id;

    const roleAdmin = await prisma.role.findFirst({ where: { nom: 'ADMIN_GENERAL' } });
    if (!roleAdmin) throw new Error('ADMIN_GENERAL system role not found');

    const passHash = await bcrypt.hash('TenantPassword123!', 10);
    const tenantUser1 = await prisma.user.create({
      data: {
        companyId: co1.id,
        nom: 'Tenant User 1',
        email: `tenant1.${Date.now()}@guardtest.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    const tenantUser2 = await prisma.user.create({
      data: {
        companyId: co2.id,
        nom: 'Tenant User 2',
        email: `tenant2.${Date.now()}@guardtest.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    const tenantTokens1 = await authService.login({ email: tenantUser1.email, password: 'TenantPassword123!' });

    const platformAdminPassHash = await bcrypt.hash('PlatformPass123!', 10);
    const platformAdmin = await prisma.platformAdmin.create({
      data: {
        nom: 'GuardTest Admin',
        email: `admin.${Date.now()}@platformtest.ma`,
        motDePasse: platformAdminPassHash,
        statut: 'ACTIF',
        mustChangePassword: false,
      },
    });
    platformAdminId = platformAdmin.id;

    const platformTokens = await platformAuthService.login({
      email: platformAdmin.email,
      password: 'PlatformPass123!',
    });

    console.log('✅ PASSED: Test entities and tokens provisioned cleanly');

    // 2. Fail-Closed Test: Unguarded @PlatformRoute() or route containing "/platform"
    console.log('\n--- 2. Testing Fail-Closed Guard Security ---');
    const mockContext = (handler: any, classRef: any, url: string = '') => {
      return {
        getHandler: () => handler,
        getClass: () => classRef,
        switchToHttp: () => ({
          getRequest: () => ({ url, routerPath: url, headers: {} }),
        }),
      } as unknown as ExecutionContext;
    };

    const dummyUnguardedPlatformHandler = function () {};
    class DummyPlatformClass {}

    Reflect.defineMetadata('isPlatformRoute', true, DummyPlatformClass);

    try {
      await jwtAuthGuard.canActivate(mockContext(dummyUnguardedPlatformHandler, DummyPlatformClass, '/api/platform/unguarded'));
      throw new Error('Should reject unguarded @PlatformRoute()');
    } catch (err: any) {
      if (err instanceof UnauthorizedException && err.message.includes('Garde d’authentification plateforme manquant')) {
        console.log('✅ PASSED: Unguarded @PlatformRoute() rejected cleanly with 401 Unauthorized');
      } else throw err;
    }

    // 3. Query String Bypass Test: GET /api/clients?search=/platform
    console.log('\n--- 3. Testing Query String Bypass Immunity ---');
    class DummyTenantClass {}
    const dummyTenantHandler = function () {};
    const contextQueryPlatform = mockContext(dummyTenantHandler, DummyTenantClass, '/api/clients?search=/platform');

    let didExecutePassportStrategy = false;
    try {
      await jwtAuthGuard.canActivate(contextQueryPlatform);
    } catch (err: any) {
      didExecutePassportStrategy = true;
    }
    if (!didExecutePassportStrategy) {
      throw new Error('Query string with /platform bypassed JwtAuthGuard!');
    }
    console.log('✅ PASSED: Query string containing "/platform" does NOT bypass JwtAuthGuard (Passport strategy executed)');

    // 4. Path Parameter Bypass Test: GET /api/voyages/platform
    console.log('\n--- 4. Testing Path Parameter Bypass Immunity ---');
    const contextPathPlatform = mockContext(dummyTenantHandler, DummyTenantClass, '/api/voyages/platform');
    let didExecutePassportStrategyPath = false;
    try {
      await jwtAuthGuard.canActivate(contextPathPlatform);
    } catch (err: any) {
      didExecutePassportStrategyPath = true;
    }
    if (!didExecutePassportStrategyPath) {
      throw new Error('Path containing platform bypassed JwtAuthGuard!');
    }
    console.log('✅ PASSED: Path parameter containing "platform" does NOT bypass JwtAuthGuard');

    // 5. Platform/Tenant Crossing Tests
    console.log('\n--- 5. Testing Platform / Tenant Token Crossing Protection ---');
    const tenantJwtService = (authService as any).jwtService || (authService as any).jwt;
    const platformJwtService = (platformAuthService as any).jwtService;

    const tenantPayload = await tenantJwtService.verifyAsync(tenantTokens1.accessToken);
    if (!tenantPayload.companyId) {
      throw new Error('Tenant token missing companyId');
    }

    try {
      await platformJwtService.verifyAsync(tenantTokens1.accessToken);
      throw new Error('Tenant Token should not be valid for Platform auth!');
    } catch (err: any) {
      if (err.name === 'JsonWebTokenError' || err.message.includes('signature') || err.message.includes('secret')) {
        console.log('✅ PASSED: Tenant Access Token rejected by Platform JWT verification (invalid signature/secret mismatch)');
      } else throw err;
    }

    try {
      await tenantJwtService.verifyAsync(platformTokens.accessToken);
      throw new Error('Platform Token should not be valid for Tenant auth!');
    } catch (err: any) {
      if (err.name === 'JsonWebTokenError' || err.message.includes('signature') || err.message.includes('secret')) {
        console.log('✅ PASSED: Platform Access Token rejected by Tenant JWT verification (invalid signature/secret mismatch)');
      } else throw err;
    }

    // 6. Must Change Password Guard Testing for Real Account
    console.log('\n--- 6. Testing Real Platform Admin Account (admin@platform.com) State ---');
    const realAdmin = await prisma.platformAdmin.findUnique({ where: { email: 'admin@platform.com' } });
    if (!realAdmin) {
      console.log('⚠️ INFO: admin@platform.com not seeded in DB yet, skipping real account check');
    } else {
      console.log(`✅ PASSED: Real Platform Admin account found (ID: ${realAdmin.id}, Statut: ${realAdmin.statut}, mustChangePassword: ${realAdmin.mustChangePassword})`);
    }

    console.log('\n🎉 ALL SECURITY REGRESSION CHECKS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ GUARD SECURITY REGRESSION TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    if (tenantCo1Id) {
      await prisma.user.deleteMany({ where: { companyId: tenantCo1Id } });
      await prisma.company.delete({ where: { id: tenantCo1Id } });
    }
    if (tenantCo2Id) {
      await prisma.user.deleteMany({ where: { companyId: tenantCo2Id } });
      await prisma.company.delete({ where: { id: tenantCo2Id } });
    }
    if (platformAdminId) {
      await prisma.platformAdmin.delete({ where: { id: platformAdminId } });
    }
    await app.close();
  }
}

runGuardSecurityRegressionTests();
