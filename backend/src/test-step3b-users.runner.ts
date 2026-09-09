import { PrismaClient, UserStatut } from '@prisma/client';
import { UsersService } from './modules/users/users.service';
import { UsersController } from './modules/users/users.controller';
import { RolesService } from './modules/roles/roles.service';
import { RolesController } from './modules/roles/roles.controller';
import { AuthenticatedUser } from './modules/auth/types/auth-user.type';
import { fullMatrix, emptyMatrix } from './common/permissions/permissions';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const prisma = new PrismaClient();
const usersService = new UsersService(prisma as any);
const usersController = new UsersController(usersService);
const rolesService = new RolesService(prisma as any);
const rolesController = new RolesController(rolesService);

async function runTests() {
  console.log('=== RUNNING MULTI-TENANT STEP 3B-USERS & ROLES TEST SUITE ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passCount++;
      console.log(`[PASS] Test ${passCount + failCount}: ${testName}`);
    } else {
      failCount++;
      console.error(
        `[FAIL] Test ${passCount + failCount}: ${testName} ${detail ? `(${detail})` : ''}`,
      );
    }
  }

  const ts = Date.now();

  // 1. Create test companies
  const companyA = await prisma.company.create({
    data: { nom: `Users Co A ${ts}` },
  });
  const companyB = await prisma.company.create({
    data: { nom: `Users Co B ${ts}` },
  });
  const companyEmpty = await prisma.company.create({
    data: { nom: `Users Co Empty ${ts}` },
  });

  // Fetch or create a system role (companyId: null)
  let adminGeneralRole = await prisma.role.findFirst({
    where: { nom: 'ADMIN_GENERAL', companyId: null },
  });
  if (!adminGeneralRole) {
    adminGeneralRole = await prisma.role.create({
      data: { nom: 'ADMIN_GENERAL', description: 'Administrateur général', companyId: null },
    });
  }

  const customRoleName = 'PERSONNALISE';
  let customSystemRole = await prisma.role.findFirst({
    where: { nom: customRoleName, companyId: null },
  });
  if (!customSystemRole) {
    customSystemRole = await prisma.role.create({
      data: { nom: customRoleName, description: 'Rôle personnalisé par défaut', companyId: null },
    });
  }

  // Create Custom Roles for Tenant A and Tenant B
  const customRoleA = await prisma.role.create({
    data: {
      companyId: companyA.id,
      nom: `Custom Role A ${ts}`,
      description: 'Rôle sur mesure Tenant A',
    },
  });

  const customRoleB = await prisma.role.create({
    data: {
      companyId: companyB.id,
      nom: `Custom Role B ${ts}`,
      description: 'Rôle sur mesure Tenant B',
    },
  });

  const createdUserIds: number[] = [];
  const createdRoleIds: number[] = [customRoleA.id, customRoleB.id];

  try {
    // Seed initial users for Tenant A: Admin 1, Admin 2, Normal User 1
    const userA1 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        nom: `Admin User A1 ${ts}`,
        email: `adminA1_${ts}@test.com`,
        motDePasse: '$2b$10$e8.Z/g1z...', // dummy bcrypt
        idRole: adminGeneralRole.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(userA1.id);

    const userA2 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        nom: `Admin User A2 ${ts}`,
        email: `adminA2_${ts}@test.com`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: adminGeneralRole.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(userA2.id);

    const userA3 = await prisma.user.create({
      data: {
        companyId: companyA.id,
        nom: `Normal User A3 ${ts}`,
        email: `normalA3_${ts}@test.com`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: customRoleA.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(userA3.id);

    // Seed initial users for Tenant B: Admin B1 + 4 additional admins (5 total)
    const userB1 = await prisma.user.create({
      data: {
        companyId: companyB.id,
        nom: `Admin User B1 ${ts}`,
        email: `adminB1_${ts}@test.com`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: adminGeneralRole.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(userB1.id);

    for (let i = 2; i <= 5; i++) {
      const uB = await prisma.user.create({
        data: {
          companyId: companyB.id,
          nom: `Admin User B${i} ${ts}`,
          email: `adminB${i}_${ts}@test.com`,
          motDePasse: '$2b$10$e8.Z/g1z...',
          idRole: adminGeneralRole.id,
          statut: UserStatut.ACTIF,
        },
      });
      createdUserIds.push(uB.id);
    }

    const actorA1: AuthenticatedUser = {
      sub: userA1.id,
      email: userA1.email,
      nom: userA1.nom,
      role: 'ADMIN_GENERAL',
      companyId: companyA.id,
      isAdminGeneral: true,
      permissions: fullMatrix(),
    };

    // ----------------------------------------------------
    // Scenario 1: Tenant A findAll isolation
    // ----------------------------------------------------
    const resAllA = await usersController.findAll(companyA.id, {});
    const onlyCompanyA =
      resAllA.data.length === 3 &&
      resAllA.data.every((u) => [userA1.id, userA2.id, userA3.id].includes(u.id));
    assert(onlyCompanyA, 'Tenant A findAll isolation', `Count: ${resAllA.data.length}`);

    // ----------------------------------------------------
    // Scenario 2: Tenant B findAll isolation
    // ----------------------------------------------------
    const resAllB = await usersController.findAll(companyB.id, {});
    const onlyCompanyB =
      resAllB.data.length === 5 &&
      resAllB.data.every((u) => u.id !== userA1.id && u.id !== userA2.id && u.id !== userA3.id);
    assert(onlyCompanyB, 'Tenant B findAll isolation', `Count: ${resAllB.data.length}`);

    // ----------------------------------------------------
    // Scenario 3: Tenant A stats isolation
    // ----------------------------------------------------
    const statsA = await usersController.stats(companyA.id);
    assert(
      statsA.total === 3 && statsA.actifs === 3,
      'Tenant A stats isolation',
      `Total: ${statsA.total}`,
    );

    // ----------------------------------------------------
    // Scenario 4: Tenant B stats isolation
    // ----------------------------------------------------
    const statsB = await usersController.stats(companyB.id);
    assert(
      statsB.total === 5 && statsB.actifs === 5,
      'Tenant B stats isolation',
      `Total: ${statsB.total}`,
    );

    // ----------------------------------------------------
    // Scenario 5: Tenant A findOne own user succeeds
    // ----------------------------------------------------
    const foundA1 = await usersController.findOne(companyA.id, userA1.id);
    assert(foundA1.id === userA1.id, 'Tenant A findOne own user succeeds');

    // ----------------------------------------------------
    // Scenario 6: Tenant A findOne Tenant B user returns 404
    // ----------------------------------------------------
    let err6 = false;
    try {
      await usersController.findOne(companyA.id, userB1.id);
    } catch (e) {
      err6 = e instanceof NotFoundException;
    }
    assert(err6, 'Tenant A findOne Tenant B user returns 404');

    // ----------------------------------------------------
    // Scenario 7: Tenant A update Tenant B user returns 404
    // ----------------------------------------------------
    let err7 = false;
    try {
      await usersController.update(companyA.id, userB1.id, { nom: 'Hacked Name' }, actorA1);
    } catch (e) {
      err7 = e instanceof NotFoundException;
    }
    assert(err7, 'Tenant A update Tenant B user returns 404');

    // ----------------------------------------------------
    // Scenario 8: Tenant A delete Tenant B user returns 404
    // ----------------------------------------------------
    let err8 = false;
    try {
      await usersController.remove(companyA.id, userB1.id, actorA1);
    } catch (e) {
      err8 = e instanceof NotFoundException;
    }
    assert(err8, 'Tenant A delete Tenant B user returns 404');

    // ----------------------------------------------------
    // Scenario 9: User creation always uses JWT companyId
    // ----------------------------------------------------
    const newUserA = await usersController.create(companyA.id, {
      nom: `New User ${ts}`,
      email: `new_user_${ts}@test.com`,
      motDePasse: 'Password123!',
      idRole: adminGeneralRole.id,
    }, actorA1);
    createdUserIds.push(newUserA.id);
    const dbUserA = await prisma.user.findUnique({ where: { id: newUserA.id } });
    assert(dbUserA?.companyId === companyA.id, 'User creation always uses JWT companyId');

    // ----------------------------------------------------
    // Scenario 10: Forged DTO companyId cannot change ownership
    // ----------------------------------------------------
    const forgedDto: any = {
      nom: `Forged User ${ts}`,
      email: `forged_user_${ts}@test.com`,
      motDePasse: 'Password123!',
      idRole: adminGeneralRole.id,
      companyId: companyB.id, // Forged companyId in DTO
    };
    const newUserForged = await usersController.create(companyA.id, forgedDto, actorA1);
    createdUserIds.push(newUserForged.id);
    const dbUserForged = await prisma.user.findUnique({ where: { id: newUserForged.id } });
    assert(dbUserForged?.companyId === companyA.id, 'Forged DTO companyId cannot change ownership');

    // ----------------------------------------------------
    // Scenario 11: Tenant A cannot create user for Tenant B
    // ----------------------------------------------------
    assert(dbUserForged?.companyId !== companyB.id, 'Tenant A cannot create user for Tenant B');

    // ----------------------------------------------------
    // Scenario 12: Last admin protection is company-scoped
    // ----------------------------------------------------
    // Create a temporary tenant with 1 admin only
    const companySingle = await prisma.company.create({ data: { nom: `Single Admin Co ${ts}` } });
    const singleAdmin = await prisma.user.create({
      data: {
        companyId: companySingle.id,
        nom: `Single Admin ${ts}`,
        email: `single_admin_${ts}@test.com`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: adminGeneralRole.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(singleAdmin.id);

    const singleActor: AuthenticatedUser = {
      sub: 999999,
      email: 'other@test.com',
      nom: 'Other Admin',
      role: 'ADMIN_GENERAL',
      companyId: companySingle.id,
      isAdminGeneral: true,
      permissions: fullMatrix(),
    };

    let err12 = false;
    try {
      await usersController.remove(companySingle.id, singleAdmin.id, singleActor);
    } catch (e) {
      err12 = e instanceof ConflictException;
    }
    assert(err12, 'Last admin protection is company-scoped (blocks removing single admin)');

    // ----------------------------------------------------
    // Scenario 13: Tenant B admin count cannot affect Tenant A last-admin protection
    // ----------------------------------------------------
    // Even though Tenant B has 5 admins, companySingle (with 1 admin) is still protected from demotion/deletion
    let err13 = false;
    try {
      await usersController.update(
        companySingle.id,
        singleAdmin.id,
        { idRole: customSystemRole.id }, // demote single admin using system role accessible to companySingle
        singleActor,
      );
    } catch (e) {
      err13 = e instanceof ConflictException;
    }
    assert(err13, 'Tenant B admin count cannot affect Tenant A last-admin protection');

    // Clean up singleAdmin company
    await prisma.user.delete({ where: { id: singleAdmin.id } });
    await prisma.company.delete({ where: { id: companySingle.id } });

    // ----------------------------------------------------
    // Scenario 14: Tenant A can update an allowed same-tenant user
    // ----------------------------------------------------
    const updatedA3 = await usersController.update(
      companyA.id,
      userA3.id,
      { nom: `Updated Normal User A3 ${ts}`, telephone: '0600000000' },
      actorA1,
    );
    assert(
      updatedA3.nom.startsWith('Updated Normal User A3'),
      'Tenant A can update an allowed same-tenant user',
    );

    // ----------------------------------------------------
    // Scenario 15: Self role modification remains blocked
    // ----------------------------------------------------
    let err15 = false;
    try {
      await usersController.update(companyA.id, userA1.id, { idRole: customRoleA.id }, actorA1);
    } catch (e) {
      err15 = e instanceof BadRequestException;
    }
    assert(err15, 'Self role modification remains blocked');

    // ----------------------------------------------------
    // Scenario 16: Self permission modification remains blocked
    // ----------------------------------------------------
    let err16 = false;
    try {
      await usersController.update(
        companyA.id,
        userA1.id,
        { permissions: { utilisateurs: { voir: true } } as any },
        actorA1,
      );
    } catch (e) {
      err16 = e instanceof BadRequestException;
    }
    assert(err16, 'Self permission modification remains blocked');

    // ----------------------------------------------------
    // Scenario 17: Self deactivation/suspension remains blocked
    // ----------------------------------------------------
    let err17 = false;
    try {
      await usersController.update(companyA.id, userA1.id, { statut: UserStatut.INACTIF }, actorA1);
    } catch (e) {
      err17 = e instanceof BadRequestException;
    }
    assert(err17, 'Self deactivation/suspension remains blocked');

    // ----------------------------------------------------
    // Scenario 18: Self deletion remains blocked
    // ----------------------------------------------------
    let err18 = false;
    try {
      await usersController.remove(companyA.id, userA1.id, actorA1);
    } catch (e) {
      err18 = e instanceof BadRequestException;
    }
    assert(err18, 'Self deletion remains blocked');

    // ----------------------------------------------------
    // Scenario 19: ADMIN_GENERAL remains confined to its company
    // ----------------------------------------------------
    const statsFromB = await usersController.stats(companyB.id);
    assert(
      statsFromB.total === 5,
      'ADMIN_GENERAL remains confined to its company (Tenant B stats show only Tenant B count)',
    );

    // ----------------------------------------------------
    // Scenario 20: Empty tenant returns empty users
    // ----------------------------------------------------
    const emptyAll = await usersController.findAll(companyEmpty.id, {});
    assert(
      emptyAll.data.length === 0 && emptyAll.meta.total === 0,
      'Empty tenant returns empty users',
    );

    // ----------------------------------------------------
    // Scenario 21: Empty tenant returns zero stats
    // ----------------------------------------------------
    const emptyStats = await usersController.stats(companyEmpty.id);
    assert(
      emptyStats.total === 0 &&
        emptyStats.actifs === 0 &&
        emptyStats.inactifs === 0 &&
        emptyStats.suspendus === 0,
      'Empty tenant returns zero stats',
    );

    // ----------------------------------------------------
    // Scenario 22: Status filters remain tenant-scoped
    // ----------------------------------------------------
    const activeA = await usersController.findAll(companyA.id, { statut: UserStatut.ACTIF });
    assert(activeA.data.length === 5, 'Status filters remain tenant-scoped');

    // ----------------------------------------------------
    // Scenario 23: Role filters remain tenant-scoped
    // ----------------------------------------------------
    const roleFiltered = await usersController.findAll(companyA.id, { idRole: customRoleA.id });
    assert(
      roleFiltered.data.length === 1 && roleFiltered.data[0].id === userA3.id,
      'Role filters remain tenant-scoped',
    );

    // ----------------------------------------------------
    // Scenario 24: Search remains tenant-scoped
    // ----------------------------------------------------
    const searchRes = await usersController.findAll(companyA.id, { search: 'Admin User B' });
    assert(
      searchRes.data.length === 0,
      'Search remains tenant-scoped (Searching Tenant B name in Tenant A returns 0)',
    );

    // ----------------------------------------------------
    // ----------------------------------------------------
    // Scenario 25: Global email uniqueness remains enforced
    // ----------------------------------------------------
    const actorB1: AuthenticatedUser = {
      sub: userB1.id,
      email: userB1.email,
      nom: userB1.nom,
      role: 'ADMIN_GENERAL',
      companyId: companyB.id,
      isAdminGeneral: true,
      permissions: fullMatrix(),
    };

    let err25 = false;
    try {
      await usersController.create(companyB.id, {
        nom: 'Duplicate Email User',
        email: userA1.email, // existing email from Tenant A
        motDePasse: 'Password123!',
        idRole: adminGeneralRole.id,
      }, actorB1);
    } catch (e) {
      err25 = e instanceof ConflictException;
    }
    assert(err25, 'Global email uniqueness remains enforced');

    // ----------------------------------------------------
    // Scenario 26: Tenant A cannot assign Tenant B custom role
    // ----------------------------------------------------
    let err26 = false;
    try {
      await usersController.create(companyA.id, {
        nom: 'Cross Tenant Role User',
        email: `cross_role_${ts}@test.com`,
        motDePasse: 'Password123!',
        idRole: customRoleB.id, // Custom role belonging to Tenant B
      }, actorA1);
    } catch (e) {
      err26 = e instanceof BadRequestException;
    }
    assert(err26, 'Tenant A cannot assign Tenant B custom role on create');

    // ----------------------------------------------------
    // Scenario 27: Roles list returns system + Tenant A custom roles only
    // ----------------------------------------------------
    const rolesA = await rolesController.findAll(companyA.id, {});
    const includesCustomA = rolesA.data.some((r) => r.id === customRoleA.id);
    const excludesCustomB = !rolesA.data.some((r) => r.id === customRoleB.id);
    assert(
      includesCustomA && excludesCustomB,
      'Roles list returns system + Tenant A custom roles only',
    );

    // ----------------------------------------------------
    // Scenario 28: Tenant A cannot access Tenant B custom role by ID
    // ----------------------------------------------------
    let err28 = false;
    try {
      await rolesController.findOne(companyA.id, customRoleB.id);
    } catch (e) {
      err28 = e instanceof NotFoundException;
    }
    assert(err28, 'Tenant A cannot access Tenant B custom role by ID');

    // ----------------------------------------------------
    // Scenario 29: System-role permission reset to DbNull remains intact
    // ----------------------------------------------------
    const systemRoleUser = await usersController.create(companyA.id, {
      nom: `System Role User ${ts}`,
      email: `sysrole_${ts}@test.com`,
      motDePasse: 'Password123!',
      idRole: adminGeneralRole.id,
      permissions: { custom: true } as any, // should be ignored / set to DbNull
    }, actorA1);
    createdUserIds.push(systemRoleUser.id);
    const dbSysUser = await prisma.user.findUnique({ where: { id: systemRoleUser.id } });
    assert(
      dbSysUser?.permissions === null,
      'System-role permission reset to DbNull remains intact',
    );

    // ----------------------------------------------------
    // Scenario 30: Custom-role permissions normalization remains intact
    // ----------------------------------------------------
    const customUserPerms = await usersController.create(companyA.id, {
      nom: `Custom Role User Perms ${ts}`,
      email: `customrole_perms_${ts}@test.com`,
      motDePasse: 'Password123!',
      idRole: customSystemRole.id,
      permissions: { utilisateurs: { voir: true } } as any,
    }, actorA1);
    createdUserIds.push(customUserPerms.id);
    assert(
      customUserPerms.permissions !== null && typeof customUserPerms.permissions === 'object',
      'Custom-role permissions normalization remains intact',
    );
    createdUserIds.push(customUserPerms.id);
    assert(
      customUserPerms.permissions !== null && typeof customUserPerms.permissions === 'object',
      'Custom-role permissions normalization remains intact',
    );

    // ----------------------------------------------------
    // Scenario 31: Tenant A cannot update Tenant B custom role
    // ----------------------------------------------------
    let err31 = false;
    try {
      await rolesController.update(companyA.id, customRoleB.id, { nom: 'Hacked Role B' });
    } catch (e) {
      err31 = e instanceof NotFoundException;
    }
    assert(err31, 'Tenant A cannot update Tenant B custom role');

    // ----------------------------------------------------
    // Scenario 32: Tenant A cannot delete Tenant B custom role
    // ----------------------------------------------------
    let err32 = false;
    try {
      await rolesController.remove(companyA.id, customRoleB.id);
    } catch (e) {
      err32 = e instanceof NotFoundException;
    }
    assert(err32, 'Tenant A cannot delete Tenant B custom role');

    // ----------------------------------------------------
    // Scenario 33: Tenant A cannot create a custom role for Tenant B
    // ----------------------------------------------------
    const newRoleA = await rolesController.create(companyA.id, {
      nom: `Tenant A New Role ${ts}`,
      description: 'Created by Tenant A',
    });
    createdRoleIds.push(newRoleA.id);
    const dbRoleA = await prisma.role.findUnique({ where: { id: newRoleA.id } });
    assert(dbRoleA?.companyId === companyA.id, 'Tenant A cannot create a custom role for Tenant B');

    // ----------------------------------------------------
    // Scenario 34: Cross-tenant role ID cannot bypass ownership validation
    // ----------------------------------------------------
    let err34 = false;
    try {
      await usersController.update(companyA.id, userA3.id, { idRole: customRoleB.id }, actorA1);
    } catch (e) {
      err34 = e instanceof BadRequestException;
    }
    assert(err34, 'Cross-tenant role ID cannot bypass ownership validation on user update');

    // ----------------------------------------------------
    // Scenario 35: User update with forged companyId cannot move user between companies
    // ----------------------------------------------------
    const updateForged: any = {
      nom: `User A3 Moved ${ts}`,
      companyId: companyB.id, // Forged companyId attempt
    };
    await usersController.update(companyA.id, userA3.id, updateForged, actorA1);
    const dbA3AfterUpdate = await prisma.user.findUnique({ where: { id: userA3.id } });
    assert(
      dbA3AfterUpdate?.companyId === companyA.id,
      'User update with forged companyId cannot move user between companies',
    );

    // ----------------------------------------------------
    // Scenario 36: Non-admin actor cannot create an ADMIN_GENERAL user (403 Forbidden)
    // ----------------------------------------------------
    const actorA3_NonAdmin: AuthenticatedUser = {
      sub: userA3.id,
      email: userA3.email,
      nom: userA3.nom,
      role: 'PERSONNALISE',
      companyId: companyA.id,
      isAdminGeneral: false,
      permissions: {
        ...emptyMatrix(),
        utilisateurs: { voir: true, ajouter: true, modifier: true, supprimer: true, exporter: false, imprimer: false, valider: false },
      },
    };

    let err36 = false;
    try {
      await usersController.create(companyA.id, {
        nom: `Escalated Admin ${ts}`,
        email: `escalated_admin_${ts}@test.com`,
        motDePasse: 'Password123!',
        idRole: adminGeneralRole.id,
      }, actorA3_NonAdmin);
    } catch (e) {
      err36 = e instanceof ForbiddenException;
    }
    assert(err36, 'Non-admin actor cannot create an ADMIN_GENERAL user (403 Forbidden)');

    // ----------------------------------------------------
    // Scenario 37: Non-admin actor cannot promote another user to ADMIN_GENERAL (403 Forbidden)
    // ----------------------------------------------------
    let err37 = false;
    try {
      await usersController.update(companyA.id, newUserA.id, { idRole: adminGeneralRole.id }, actorA3_NonAdmin);
    } catch (e) {
      err37 = e instanceof ForbiddenException;
    }
    assert(err37, 'Non-admin actor cannot promote another user to ADMIN_GENERAL (403 Forbidden)');

    // ----------------------------------------------------
    // Scenario 38: Non-admin actor cannot modify an ADMIN_GENERAL target user (403 Forbidden)
    // ----------------------------------------------------
    let err38 = false;
    try {
      await usersController.update(companyA.id, userA1.id, { nom: 'Hacked Admin Name' }, actorA3_NonAdmin);
    } catch (e) {
      err38 = e instanceof ForbiddenException;
    }
    assert(err38, 'Non-admin actor cannot modify an ADMIN_GENERAL target user (403 Forbidden)');

    // ----------------------------------------------------
    // Scenario 39: Non-admin actor cannot delete an ADMIN_GENERAL target user (403 Forbidden)
    // ----------------------------------------------------
    let err39 = false;
    try {
      await usersController.remove(companyA.id, userA1.id, actorA3_NonAdmin);
    } catch (e) {
      err39 = e instanceof ForbiddenException;
    }
    assert(err39, 'Non-admin actor cannot delete an ADMIN_GENERAL target user (403 Forbidden)');

    // ----------------------------------------------------
    // Scenario 40: Non-admin actor cannot delegate permissions exceeding own authority
    // ----------------------------------------------------
    let err40 = false;
    try {
      await usersController.create(companyA.id, {
        nom: `Unauthorized Perms User ${ts}`,
        email: `unauth_perms_${ts}@test.com`,
        motDePasse: 'Password123!',
        idRole: customSystemRole.id,
        permissions: { factures: { voir: true, ajouter: true, modifier: true, supprimer: true, exporter: false, imprimer: false, valider: false } } as any,
      }, actorA3_NonAdmin);
    } catch (e) {
      err40 = e instanceof ForbiddenException;
    }
    assert(err40, 'Non-admin actor cannot delegate permissions exceeding own authority');

    // ----------------------------------------------------
    // Scenario 41: Admin password reset sets mustChangePassword = true
    // ----------------------------------------------------
    await usersController.update(companyA.id, userA3.id, { motDePasse: 'NewResetPassword123!' }, actorA1);
    const dbA3AfterReset = await prisma.user.findUnique({ where: { id: userA3.id } });
    assert(dbA3AfterReset?.mustChangePassword === true, 'Admin password reset sets mustChangePassword = true');

    // ----------------------------------------------------
    // Scenario 43: Non-admin actor cannot assign a system role with excessive default permissions (403 Forbidden)
    // ----------------------------------------------------
    let comptableRole = await prisma.role.findFirst({
      where: { nom: 'COMPTABLE', companyId: null },
    });
    if (!comptableRole) {
      comptableRole = await prisma.role.create({
        data: { nom: 'COMPTABLE', description: 'Comptable', companyId: null },
      });
      createdRoleIds.push(comptableRole.id);
    }
    let err43 = false;
    try {
      await usersController.create(companyA.id, {
        nom: `Comptable Escalation User ${ts}`,
        email: `comptable_esc_${ts}@test.com`,
        motDePasse: 'Password123!',
        idRole: comptableRole.id,
      }, actorA3_NonAdmin);
    } catch (e) {
      err43 = e instanceof ForbiddenException;
    }
    assert(err43, 'Non-admin actor cannot assign a system role with excessive default permissions (403 Forbidden)');
  } catch (error) {
    console.error('UNEXPECTED ERROR IN TEST RUNNER:', error);
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdRoleIds.length > 0) {
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
    }
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id, companyEmpty.id] } },
    });
    await prisma.$disconnect();
    console.log('--- CLEANUP COMPLETE ---\n');
  }

  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
