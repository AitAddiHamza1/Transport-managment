import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './modules/auth/auth.service';
import { UsersService } from './modules/users/users.service';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

async function runPhase1MultiTenancyTests() {
  console.log('=== PHASE 1 MULTI-TENANCY REGRESSION TEST SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);

  let co1Id: number | null = null;
  let co2Id: number | null = null;

  try {
    // 1. Setup two distinct companies (Tenants)
    console.log('--- 1. Testing Tenant Isolation Setup ---');
    const co1 = await prisma.company.create({ data: { nom: `Tenant Alpha ${Date.now()}`, statut: 'ACTIF' } });
    const co2 = await prisma.company.create({ data: { nom: `Tenant Beta ${Date.now()}`, statut: 'ACTIF' } });
    co1Id = co1.id;
    co2Id = co2.id;

    const roleAdmin = await prisma.role.findFirst({ where: { nom: 'ADMIN_GENERAL' } });
    if (!roleAdmin) throw new Error('ADMIN_GENERAL system role not found');

    const passHash = await bcrypt.hash('TenantPassword123!', 10);
    const user1 = await prisma.user.create({
      data: {
        companyId: co1.id,
        nom: 'User Alpha',
        email: `alpha.${Date.now()}@tenant1.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        companyId: co2.id,
        nom: 'User Beta',
        email: `beta.${Date.now()}@tenant2.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    console.log('✅ PASSED: Distinct tenants and users created cleanly');

    // 2. Testing JWT companyId Payload Isolation
    console.log('\n--- 2. Testing JWT companyId Payload Isolation ---');
    const tokens1 = await authService.login({ email: user1.email, password: 'TenantPassword123!' });
    const decodedPayload1 = await (authService as any).jwt.decode(tokens1.accessToken);

    if (decodedPayload1.companyId !== co1.id) {
      throw new Error(`JWT companyId mismatch: expected ${co1.id}, got ${decodedPayload1.companyId}`);
    }
    console.log('✅ PASSED: JWT correctly includes authentic companyId');

    // 3. Testing Inactive Company Login Blocking
    console.log('\n--- 3. Testing Inactive Company Login Blocking ---');
    await prisma.company.update({ where: { id: co2.id }, data: { statut: 'INACTIF' } });
    try {
      await authService.login({ email: user2.email, password: 'TenantPassword123!' });
      throw new Error('Should block login for user in INACTIF company');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('✅ PASSED: Login blocked for INACTIF company');
      } else throw err;
    }
    await prisma.company.update({ where: { id: co2.id }, data: { statut: 'ACTIF' } });

    // 4. Testing Cross-Tenant IDOR Protection
    console.log('\n--- 4. Testing Cross-Tenant IDOR Protection ---');
    // User 1's companyId -> list users
    const co1Users = await usersService.findAll(co1.id, { page: 1, limit: 10 });
    if (co1Users.data.some((u) => (u as any).companyId && (u as any).companyId !== co1.id)) {
      throw new Error('Cross-tenant data leak in users list!');
    }
    console.log('✅ PASSED: Company-scoped queries strictly isolate tenant data');

    // User 1's companyId trying to view User 2 by ID -> NotFoundException (IDOR Protection)
    try {
      await usersService.findOne(co1.id, user2.id);
      throw new Error('User 1 should not be able to view User 2 from another company');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Cross-tenant IDOR access prevented cleanly with NotFoundException');
      } else throw err;
    }

    // 5. Testing Zero companyId Fallback Protection
    console.log('\n--- 5. Testing Zero companyId Fallback Protection ---');
    try {
      await usersService.findOne(0, user1.id);
      throw new Error('Should reject query when companyId is 0 or invalid');
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof UnauthorizedException) {
        console.log('✅ PASSED: Invalid companyId context rejected cleanly');
      } else throw err;
    }

    console.log('\n🎉 ALL 5 PHASE 1 MULTI-TENANCY REGRESSION TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ PHASE 1 MULTI-TENANCY TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    if (co1Id) {
      await prisma.user.deleteMany({ where: { companyId: co1Id } });
      await prisma.company.delete({ where: { id: co1Id } });
    }
    if (co2Id) {
      await prisma.user.deleteMany({ where: { companyId: co2Id } });
      await prisma.company.delete({ where: { id: co2Id } });
    }
    await app.close();
  }
}

runPhase1MultiTenancyTests();
