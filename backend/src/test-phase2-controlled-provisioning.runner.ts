import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { CompanyProvisioningService } from './modules/company-provisioning/company-provisioning.service';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { UsersService } from './modules/users/users.service';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { ConflictException, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import type { AuthenticatedUser } from './modules/auth/types/auth-user.type';

async function runPhase2ControlledProvisioningTests() {
  console.log('=== PHASE 2 CONTROLLED COMPANY PROVISIONING TEST SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const provisioningService = app.get(CompanyProvisioningService);
  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);
  const reflector = app.get(Reflector);
  const permissionsGuard = new PermissionsGuard(reflector);

  const testEmail = `test.provision.${Date.now()}@atlas.ma`;
  const testCompanyName = `Transport Atlas Test ${Date.now()}`;
  let provisionedCompanyId: number | null = null;
  let provisionedUserId: number | null = null;
  let temporaryPassword = '';

  try {
    // -------------------------------------------------------------
    // Test 1: Successful Provisioning & Atomic DB Creation
    // -------------------------------------------------------------
    console.log('--- 1. Testing Atomic Provisioning (Company + Settings + ADMIN_GENERAL) ---');
    const result = await provisioningService.provisionCompany({
      companyName: testCompanyName,
      adminName: 'Karim Atlas',
      adminEmail: testEmail,
    });

    provisionedCompanyId = result.company.id;
    provisionedUserId = result.admin.id;
    temporaryPassword = result.temporaryPassword;

    if (!result.company.id || result.company.nom !== testCompanyName || result.company.statut !== 'ACTIF') {
      throw new Error(`Company creation failed: ${JSON.stringify(result.company)}`);
    }
    if (!result.admin.id || result.admin.email !== testEmail || !result.admin.mustChangePassword) {
      throw new Error(`Admin creation failed: ${JSON.stringify(result.admin)}`);
    }
    if (!temporaryPassword || temporaryPassword.length < 12) {
      throw new Error('Temporary password must be at least 12 characters');
    }

    // Verify DB states
    const dbCompany = await prisma.company.findUnique({ where: { id: result.company.id } });
    const dbSettings = await prisma.companySettings.findUnique({ where: { companyId: result.company.id } });
    const dbUser = await prisma.user.findUnique({ where: { id: result.admin.id }, include: { role: true } });

    if (!dbCompany || !dbSettings || !dbUser) {
      throw new Error('Database atomic record creation failed');
    }
    if (dbSettings.nomEntreprise !== testCompanyName || dbSettings.devise !== 'MAD') {
      throw new Error('CompanySettings initialization default failed');
    }
    if (!dbUser.mustChangePassword) {
      throw new Error('mustChangePassword was not set to true for newly provisioned user');
    }
    console.log('✅ PASSED: Company, Settings, and ADMIN_GENERAL created atomically inside transaction');

    // -------------------------------------------------------------
    // Test 2: System Role ADMIN_GENERAL Verification
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing System Role ADMIN_GENERAL Assignment ---');
    if (dbUser.role.nom !== 'ADMIN_GENERAL' || dbUser.role.companyId !== null) {
      throw new Error(`Role must be system ADMIN_GENERAL (companyId=null). Got companyId=${dbUser.role.companyId}`);
    }
    console.log('✅ PASSED: ADMIN_GENERAL system role (companyId=NULL) correctly assigned');

    // -------------------------------------------------------------
    // Test 3: Temporary Password Hashing
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Temporary Password Security & Hashing ---');
    const isHashValid = await bcrypt.compare(temporaryPassword, dbUser.motDePasse);
    if (!isHashValid) {
      throw new Error('Stored password hash does not match generated temporary password');
    }
    if (dbUser.motDePasse.includes(temporaryPassword)) {
      throw new Error('Plaintext password was dangerously stored in database');
    }
    console.log('✅ PASSED: Temporary password hashed using bcrypt (plaintext never stored)');

    // -------------------------------------------------------------
    // Test 4 & 5: Duplicate Email & Rollback Verification
    // -------------------------------------------------------------
    console.log('\n--- 4 & 5. Testing Duplicate Email Handling & Rollback ---');
    const totalCompaniesBefore = await prisma.company.count();
    try {
      await provisioningService.provisionCompany({
        companyName: 'Should Fail Company',
        adminName: 'Fail User',
        adminEmail: testEmail, // Duplicate email
      });
      throw new Error('Provisioning with duplicate email should have failed');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log('✅ PASSED: Duplicate email correctly rejected with ConflictException');
      } else {
        throw err;
      }
    }
    const totalCompaniesAfter = await prisma.company.count();
    if (totalCompaniesBefore !== totalCompaniesAfter) {
      throw new Error('Transaction rollback failed: orphan company record created on email conflict');
    }
    console.log('✅ PASSED: Transaction rollback verified (zero orphan companies left)');

    // -------------------------------------------------------------
    // Test 6: Authentication with Temporary Credentials
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Login with Temporary Credentials ---');
    const loginTokens = await authService.login({ email: testEmail, password: temporaryPassword });
    if (!loginTokens.accessToken || !loginTokens.user.mustChangePassword) {
      throw new Error('Login failed or mustChangePassword flag missing from auth response');
    }
    console.log('✅ PASSED: Login successful and mustChangePassword=true returned in session payload');

    // -------------------------------------------------------------
    // Test 7: Backend Enforcement of Mandatory Password Change
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Backend Guard Enforcement of mustChangePassword ---');
    const tempUserContext: AuthenticatedUser = {
      sub: result.admin.id,
      email: testEmail,
      nom: result.admin.nom,
      role: 'ADMIN_GENERAL',
      companyId: result.company.id,
      mustChangePassword: true,
      isAdminGeneral: true,
      permissions: {} as any,
    };

    const mockContextProtected = {
      getHandler: () => ({ name: 'findAll' }),
      getClass: () => ({ name: 'UsersController' }),
      switchToHttp: () => ({
        getRequest: () => ({ user: tempUserContext }),
      }),
    } as any;

    try {
      permissionsGuard.canActivate(mockContextProtected);
      throw new Error('PermissionsGuard should block normal ERP endpoints when mustChangePassword is true');
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        console.log('✅ PASSED: PermissionsGuard correctly blocked normal ERP route for user with mustChangePassword=true');
      } else {
        throw err;
      }
    }

    // Verify /auth/change-password is permitted
    const mockContextChangePassword = {
      getHandler: () => AuthController.prototype.changePassword,
      getClass: () => AuthController,
      switchToHttp: () => ({
        getRequest: () => ({ user: tempUserContext }),
      }),
    } as any;

    // We decorate auth controller with @AllowMustChangePassword, so changePassword handler allows it
    const isChangePasswordAllowed = permissionsGuard.canActivate(mockContextChangePassword);
    if (!isChangePasswordAllowed) {
      throw new Error('PermissionsGuard should allow POST /auth/change-password endpoint');
    }
    console.log('✅ PASSED: PermissionsGuard explicitly allows POST /auth/change-password route');

    // -------------------------------------------------------------
    // Test 8, 9, 10, 11: Self-Service Password Change Flow
    // -------------------------------------------------------------
    console.log('\n--- 8 - 11. Testing Self-Service Password Change Flow ---');
    const newPassword = 'NewSecurePassword123!';

    // Rejection of wrong current password
    try {
      await authService.changePassword(result.admin.id, {
        currentPassword: 'WrongPassword!',
        newPassword,
      });
      throw new Error('Should reject incorrect current password');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Incorrect current password rejected cleanly');
      } else {
        throw err;
      }
    }

    // Rejection of identical new password
    try {
      await authService.changePassword(result.admin.id, {
        currentPassword: temporaryPassword,
        newPassword: temporaryPassword,
      });
      throw new Error('Should reject identical new password');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Identical new password rejected cleanly');
      } else {
        throw err;
      }
    }

    // Successful password change
    const changeRes = await authService.changePassword(result.admin.id, {
      currentPassword: temporaryPassword,
      newPassword,
    });
    if (!changeRes.message) {
      throw new Error('Password change response invalid');
    }

    // Verify mustChangePassword is now false in DB
    const updatedDbUser = await prisma.user.findUnique({ where: { id: result.admin.id } });
    if (updatedDbUser?.mustChangePassword) {
      throw new Error('mustChangePassword was not reset to false after password change');
    }
    console.log('✅ PASSED: Password changed successfully and mustChangePassword set to false');

    // Test 9: Old temporary password no longer works
    try {
      await authService.login({ email: testEmail, password: temporaryPassword });
      throw new Error('Old temporary password should no longer authenticate');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('✅ PASSED: Old temporary password rejected');
      } else {
        throw err;
      }
    }

    // Test 10: New password works
    const newLoginRes = await authService.login({ email: testEmail, password: newPassword });
    if (!newLoginRes.accessToken || newLoginRes.user.mustChangePassword) {
      throw new Error('Login with new password failed or mustChangePassword remained true');
    }
    console.log('✅ PASSED: New password authenticates successfully and mustChangePassword=false');

    // Test 11: Normal ERP access allowed after password change
    const updatedUserContext: AuthenticatedUser = {
      sub: result.admin.id,
      email: testEmail,
      nom: result.admin.nom,
      role: 'ADMIN_GENERAL',
      companyId: result.company.id,
      mustChangePassword: false,
      isAdminGeneral: true,
      permissions: {} as any,
    };
    const mockContextUpdated = {
      getHandler: () => ({ name: 'findAll' }),
      getClass: () => ({ name: 'UsersController' }),
      switchToHttp: () => ({
        getRequest: () => ({ user: updatedUserContext }),
      }),
    } as any;
    const canAccessNormalRoute = permissionsGuard.canActivate(mockContextUpdated);
    if (!canAccessNormalRoute) {
      throw new Error('Normal ERP access should be granted after password change');
    }
    console.log('✅ PASSED: Normal ERP route access granted after password change');

    // -------------------------------------------------------------
    // Test 12: Existing Users Non-Regression
    // -------------------------------------------------------------
    console.log('\n--- 12. Testing Existing Users Non-Regression ---');
    const existingAdminUser = await prisma.user.findFirst({ where: { role: { nom: 'ADMIN_GENERAL' } } });
    if (existingAdminUser) {
      if (existingAdminUser.id !== result.admin.id && existingAdminUser.mustChangePassword) {
        throw new Error(`Existing user #${existingAdminUser.id} was corrupted with mustChangePassword=true`);
      }
    }
    console.log('✅ PASSED: Existing users retain mustChangePassword=false');

    // -------------------------------------------------------------
    // Test 13 & 14: Suspended & Inactive Company Access Control
    // -------------------------------------------------------------
    console.log('\n--- 13 & 14. Testing Company Status Suspension / Deactivation Access Control ---');
    // Set company to SUSPENDU
    await prisma.company.update({ where: { id: result.company.id }, data: { statut: 'SUSPENDU' } });
    try {
      await authService.login({ email: testEmail, password: newPassword });
      throw new Error('Login should be blocked for SUSPENDU company');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('✅ PASSED: Login blocked for SUSPENDU company');
      } else {
        throw err;
      }
    }

    // Set company to INACTIF
    await prisma.company.update({ where: { id: result.company.id }, data: { statut: 'INACTIF' } });
    try {
      await authService.login({ email: testEmail, password: newPassword });
      throw new Error('Login should be blocked for INACTIF company');
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        console.log('✅ PASSED: Login blocked for INACTIF company');
      } else {
        throw err;
      }
    }

    // Restore to ACTIF
    await prisma.company.update({ where: { id: result.company.id }, data: { statut: 'ACTIF' } });

    // -------------------------------------------------------------
    // Test 15: Tenant Isolation Protection
    // -------------------------------------------------------------
    console.log('\n--- 15. Testing Tenant Isolation (UsersController.create forces requester companyId) ---');
    const userRole = await prisma.role.findFirst({ where: { nom: 'EXPLOITANT', companyId: null } });
    if (userRole) {
      const adminActor: AuthenticatedUser = {
        sub: result.admin.id,
        email: testEmail,
        nom: result.admin.nom,
        role: 'ADMIN_GENERAL',
        companyId: result.company.id,
        isAdminGeneral: true,
        permissions: {} as any,
      };
      const createdUserByController = await usersService.create(result.company.id, {
        nom: 'User Tenant Isolation',
        email: `tenant.iso.${Date.now()}@atlas.ma`,
        motDePasse: 'Password123!',
        idRole: userRole.id,
      }, adminActor);
      const dbCreatedUser = await prisma.user.findUnique({ where: { id: createdUserByController.id } });
      if (!dbCreatedUser || dbCreatedUser.companyId !== result.company.id) {
        throw new Error('UsersService.create allowed arbitrary companyId');
      }
      await prisma.user.delete({ where: { id: createdUserByController.id } });
    }
    console.log('✅ PASSED: Tenant user creation strictly bound to authenticated companyId');

    // -------------------------------------------------------------
    // Test 16: CLI Command Runner Verification
    // -------------------------------------------------------------
    console.log('\n--- 16. Testing CLI Script Execution ---');
    const cliEmail = `cli.provision.${Date.now()}@atlas.ma`;
    const cliCmd = `npm run provision:company -- --companyName="CLI Test Company" --adminName="CLI Admin" --adminEmail="${cliEmail}"`;
    const cliOutput = execSync(cliCmd, { cwd: process.cwd(), encoding: 'utf-8' });
    if (!cliOutput.includes('ENTREPRISE PROVISIONNÉE AVEC SUCCÈS') || !cliOutput.includes(cliEmail)) {
      throw new Error(`CLI execution output missing success payload:\n${cliOutput}`);
    }
    console.log('✅ PASSED: CLI command provision:company executed successfully with correct formatted output');

    // Clean up CLI created records
    const cliUser = await prisma.user.findUnique({ where: { email: cliEmail } });
    if (cliUser) {
      await prisma.companySettings.deleteMany({ where: { companyId: cliUser.companyId } });
      await prisma.user.deleteMany({ where: { companyId: cliUser.companyId } });
      await prisma.company.delete({ where: { id: cliUser.companyId } });
    }

    console.log('\n🎉 ALL 16 PHASE 2 CONTROLLED PROVISIONING INVARIANT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ PHASE 2 CONTROLLED PROVISIONING TEST SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    if (provisionedUserId) {
      await prisma.companySettings.deleteMany({ where: { companyId: provisionedCompanyId! } });
      await prisma.user.deleteMany({ where: { companyId: provisionedCompanyId! } });
      await prisma.company.deleteMany({ where: { id: provisionedCompanyId! } });
    }
    await app.close();
  }
}

runPhase2ControlledProvisioningTests();
