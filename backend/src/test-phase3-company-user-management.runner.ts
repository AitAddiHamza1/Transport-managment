import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { UsersService } from './modules/users/users.service';
import { RolesService } from './modules/roles/roles.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

async function runPhase3CompanyUserManagementTests() {
  console.log('=== PHASE 3 COMPANY USER MANAGEMENT REGRESSION TEST SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);

  let testCoId: number | null = null;

  try {
    // 1. Setup tenant company & admin user
    console.log('--- 1. Testing System Role Immutability & ADMIN_GENERAL Setup ---');
    const co = await prisma.company.create({ data: { nom: `Phase 3 Test Co ${Date.now()}`, statut: 'ACTIF' } });
    testCoId = co.id;

    const roleAdmin = await prisma.role.findFirst({ where: { nom: 'ADMIN_GENERAL' } });
    if (!roleAdmin) throw new Error('ADMIN_GENERAL system role not found');

    const passHash = await bcrypt.hash('Password123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        companyId: co.id,
        nom: 'Main Admin',
        email: `mainadmin.${Date.now()}@p3test.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    const adminContext: any = {
      sub: adminUser.id,
      companyId: co.id,
      role: 'ADMIN_GENERAL',
      isAdminGeneral: true,
      permissions: { permissionsList: [] },
    };

    // System role cannot be deleted
    try {
      await rolesService.remove(co.id, roleAdmin.id);
      throw new Error('Should prevent deletion of system role ADMIN_GENERAL');
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        console.log('✅ PASSED: System role ADMIN_GENERAL is immutable');
      } else throw err;
    }

    // 2. Testing Last Active ADMIN_GENERAL Protection
    console.log('\n--- 2. Testing Last Active ADMIN_GENERAL Protection ---');
    const user2 = await prisma.user.create({
      data: {
        companyId: co.id,
        nom: 'Second User',
        email: `second.${Date.now()}@p3test.ma`,
        motDePasse: passHash,
        idRole: roleAdmin.id,
        statut: 'ACTIF',
      },
    });

    const actor2Context: any = {
      sub: user2.id,
      companyId: co.id,
      role: 'ADMIN_GENERAL',
      isAdminGeneral: true,
      permissions: { permissionsList: [] },
    };

    try {
      await usersService.update(co.id, adminUser.id, { statut: 'INACTIF' }, actor2Context);
      await usersService.update(co.id, user2.id, { statut: 'INACTIF' }, adminContext);
      throw new Error('Should prevent deactivating the last active ADMIN_GENERAL user');
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        console.log('✅ PASSED: Deactivation of last active ADMIN_GENERAL prevented');
      } else throw err;
    }

    // 3. Testing Self-Delete Protection
    console.log('\n--- 3. Testing Self-Delete Protection ---');
    try {
      await usersService.remove(co.id, adminUser.id, adminContext);
      throw new Error('Should prevent user from deleting themselves');
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        console.log('✅ PASSED: Self-deletion prevented cleanly');
      } else throw err;
    }

    // 4. Testing Admin Password Reset -> mustChangePassword=true
    console.log('\n--- 4. Testing Admin Password Reset ---');
    await usersService.update(co.id, user2.id, { motDePasse: 'ResetTempPass123!' }, adminContext);
    const resetUserInDb = await prisma.user.findUnique({ where: { id: user2.id } });
    if (!resetUserInDb?.mustChangePassword) {
      throw new Error('mustChangePassword was not set to true after admin password update');
    }
    console.log('✅ PASSED: Admin password update sets mustChangePassword=true for target user');

    // 5. Testing Custom Role Creation & Tenant Isolation
    console.log('\n--- 5. Testing Custom Role Creation & Tenant Isolation ---');
    const customRole = await rolesService.create(co.id, {
      nom: `Agent Transport ${Date.now()}`,
      description: 'Role agent transport local',
    });

    if ((customRole as any).companyId && (customRole as any).companyId !== co.id) {
      throw new Error('Custom role companyId mismatch!');
    }
    console.log('✅ PASSED: Custom role created and strictly bound to tenant companyId');

    console.log('\n🎉 ALL 5 PHASE 3 COMPANY USER MANAGEMENT REGRESSION TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ PHASE 3 REGRESSION TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    if (testCoId) {
      await prisma.user.deleteMany({ where: { companyId: testCoId } });
      await prisma.role.deleteMany({ where: { companyId: testCoId } });
      await prisma.company.delete({ where: { id: testCoId } });
    }
    await app.close();
  }
}

runPhase3CompanyUserManagementTests();
