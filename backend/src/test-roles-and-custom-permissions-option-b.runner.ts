/**
 * Suite de tests automatisée — Rôles & Permissions Utilisateurs (Option B)
 *
 * Valide les comportements spécifiques à l'Option B :
 * 1. Création de rôle sur mesure (sans colonne permissions sur la table roles)
 * 2. Assignation d'un rôle sur mesure à un utilisateur avec matrice de permissions personnalisée
 * 3. Persistance et normalisation correcte de users.permissions (JSONB)
 * 4. Évaluation des permissions effectives d'un utilisateur sous rôle sur mesure
 * 5. Préservation des permissions lors de la mise à jour d'un utilisateur sous rôle sur mesure
 * 6. Réinitialisation à DbNull lors de la bascule vers un rôle système prédéfini (ex: EXPLOITANT)
 * 7. Blocage strict de suppression d'un rôle sur mesure attribué à des utilisateurs (409 Conflict)
 * 8. Suppression autorisée d'un rôle sur mesure à 0 utilisateur
 * 9. Immutabilité des rôles système (rejet 403 Forbidden sur update et remove)
 * 10. Protection contre l'usurpation des noms de rôles réservés (rejet 400 BadRequest)
 * 11. Isolation stricte multi-tenant des rôles et utilisateurs
 * 12. Prévention de l'escalade de privilèges via assertPermissionsDelegable
 */
import { PrismaClient, UserStatut } from '@prisma/client';
import { UsersService } from './modules/users/users.service';
import { UsersController } from './modules/users/users.controller';
import { RolesService } from './modules/roles/roles.service';
import { RolesController } from './modules/roles/roles.controller';
import { AuthenticatedUser } from './modules/auth/types/auth-user.type';
import {
  fullMatrix,
  emptyMatrix,
  computeEffectivePermissions,
  PROFILE_DEFAULTS,
} from './common/permissions/permissions';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

const prisma = new PrismaClient();
const usersService = new UsersService(prisma as any);
const usersController = new UsersController(usersService);
const rolesService = new RolesService(prisma as any);
const rolesController = new RolesController(rolesService);

async function runOptionBTests() {
  console.log('=== RUNNING ROLES & CUSTOM PERMISSIONS (OPTION B) TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`✅ [PASS ${passed + failed}] ${testName}`);
    } else {
      failed++;
      console.error(`❌ [FAIL ${passed + failed}] ${testName} ${detail ? `(${detail})` : ''}`);
    }
  }

  const ts = Date.now();
  let testCompanyA: any = null;
  let testCompanyB: any = null;

  const createdUserIds: number[] = [];
  const createdRoleIds: number[] = [];

  try {
    // 0. Setup Entreprises de test
    testCompanyA = await prisma.company.create({
      data: { nom: `OptionB Co A ${ts}` },
    });
    testCompanyB = await prisma.company.create({
      data: { nom: `OptionB Co B ${ts}` },
    });

    const adminRole = await prisma.role.findFirst({
      where: { nom: 'ADMIN_GENERAL', companyId: null },
    });
    if (!adminRole) throw new Error('ADMIN_GENERAL introuvable');

    const exploitantRole = await prisma.role.findFirst({
      where: { nom: 'EXPLOITANT', companyId: null },
    });
    if (!exploitantRole) throw new Error('EXPLOITANT introuvable');

    // Admin acteur de l'entreprise A
    const adminA = await prisma.user.create({
      data: {
        companyId: testCompanyA.id,
        nom: `Admin A ${ts}`,
        email: `adminA_${ts}@test.ma`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: adminRole.id,
        statut: UserStatut.ACTIF,
      },
    });
    createdUserIds.push(adminA.id);

    const actorA: AuthenticatedUser = {
      sub: adminA.id,
      email: adminA.email,
      nom: adminA.nom,
      role: 'ADMIN_GENERAL',
      companyId: testCompanyA.id,
      isAdminGeneral: true,
      permissions: fullMatrix(),
    };

    // -------------------------------------------------------------------------
    // Scénario 1 : Création d'un rôle sur mesure (Option B — libellé organisationnel)
    // -------------------------------------------------------------------------
    const customRoleA = await rolesController.create(testCompanyA.id, {
      nom: `Chef Quai ${ts}`,
      description: 'Superviseur des opérations de quai',
    });
    createdRoleIds.push(customRoleA.id);

    const dbRoleA = await prisma.role.findUnique({ where: { id: customRoleA.id } });
    assert(
      dbRoleA !== null &&
        dbRoleA.companyId === testCompanyA.id &&
        dbRoleA.nom === `Chef Quai ${ts}`,
      'Scénario 1 : Rôle sur mesure créé avec succès et rattaché au tenant A',
    );

    // -------------------------------------------------------------------------
    // Scénario 2 : Création d'un utilisateur sous rôle sur mesure avec permissions
    // -------------------------------------------------------------------------
    const customMatrix = emptyMatrix();
    customMatrix.voyages = {
      voir: true,
      ajouter: true,
      modifier: true,
      supprimer: false,
      exporter: true,
      imprimer: true,
      valider: true,
    };
    customMatrix.conducteurs = {
      voir: true,
      ajouter: true,
      modifier: false,
      supprimer: false,
      exporter: false,
      imprimer: false,
      valider: false,
    };

    const userUnderCustomRole = await usersController.create(
      testCompanyA.id,
      {
        nom: `Operateur Quai ${ts}`,
        email: `quai_${ts}@test.ma`,
        motDePasse: 'Password123!',
        idRole: customRoleA.id,
        statut: UserStatut.ACTIF,
        permissions: customMatrix,
      },
      actorA,
    );
    createdUserIds.push(userUnderCustomRole.id);

    const dbUserQuai = await prisma.user.findUnique({
      where: { id: userUnderCustomRole.id },
      include: { role: true },
    });

    assert(
      dbUserQuai !== null &&
        dbUserQuai.idRole === customRoleA.id &&
        dbUserQuai.permissions !== null,
      'Scénario 2 : Utilisateur créé sous rôle sur mesure avec permissions JSONB persistées',
    );

    // -------------------------------------------------------------------------
    // Scénario 3 : Résolution des permissions effectives d'un rôle sur mesure
    // -------------------------------------------------------------------------
    const effectivePerms = computeEffectivePermissions(
      dbUserQuai!.role.nom,
      dbUserQuai!.permissions,
    );
    assert(
      effectivePerms.voyages.voir === true &&
        effectivePerms.voyages.ajouter === true &&
        effectivePerms.voyages.supprimer === false &&
        effectivePerms.conducteurs.voir === true &&
        effectivePerms.factures.voir === false,
      'Scénario 3 : computeEffectivePermissions applique fidèlement la matrice individuelle (Option B)',
    );

    // -------------------------------------------------------------------------
    // Scénario 4 : Mise à jour et préservation des permissions d'un rôle sur mesure
    // -------------------------------------------------------------------------
    const updatedMatrix = { ...customMatrix };
    updatedMatrix.vehicules = {
      voir: true,
      ajouter: false,
      modifier: false,
      supprimer: false,
      exporter: false,
      imprimer: false,
      valider: false,
    };

    await usersController.update(
      testCompanyA.id,
      userUnderCustomRole.id,
      {
        telephone: '0612345678',
        permissions: updatedMatrix,
      },
      actorA,
    );

    const dbUserAfterUpdate = await prisma.user.findUnique({
      where: { id: userUnderCustomRole.id },
    });
    const permsAfterUpdate = (dbUserAfterUpdate?.permissions as any) || {};

    assert(
      permsAfterUpdate.vehicules?.voir === true && permsAfterUpdate.voyages?.voir === true,
      'Scénario 4 : Mise à jour des permissions individuelles persistée avec succès',
    );

    // -------------------------------------------------------------------------
    // Scénario 5 : Bascule d'un rôle sur mesure vers un rôle système prédéfini
    // -------------------------------------------------------------------------
    await usersController.update(
      testCompanyA.id,
      userUnderCustomRole.id,
      {
        idRole: exploitantRole.id,
      },
      actorA,
    );

    const dbUserAfterSwitchToSystem = await prisma.user.findUnique({
      where: { id: userUnderCustomRole.id },
      include: { role: true },
    });

    const permsAfterSwitch = computeEffectivePermissions(
      dbUserAfterSwitchToSystem!.role.nom,
      dbUserAfterSwitchToSystem!.permissions,
    );

    assert(
      dbUserAfterSwitchToSystem?.permissions === null &&
        permsAfterSwitch.dashboard.voir === PROFILE_DEFAULTS.EXPLOITANT.dashboard.voir,
      'Scénario 5 : Bascule vers rôle système prédéfini réinitialise permissions à DbNull et applique les valeurs système',
    );

    // Rétablir le rôle sur mesure pour les tests de suppression
    await usersController.update(
      testCompanyA.id,
      userUnderCustomRole.id,
      {
        idRole: customRoleA.id,
        permissions: customMatrix,
      },
      actorA,
    );

    // -------------------------------------------------------------------------
    // Scénario 6 : Blocage de suppression d'un rôle sur mesure avec utilisateurs
    // -------------------------------------------------------------------------
    let err6 = false;
    try {
      await rolesController.remove(testCompanyA.id, customRoleA.id);
    } catch (e) {
      err6 = e instanceof ConflictException;
    }
    assert(
      err6,
      'Scénario 6 : Rejet 409 Conflict lors de la tentative de suppression d’un rôle avec utilisateurs associés',
    );

    // -------------------------------------------------------------------------
    // Scénario 7 : Suppression autorisée d'un rôle sur mesure sans utilisateur
    // -------------------------------------------------------------------------
    const customRoleEmpty = await rolesController.create(testCompanyA.id, {
      nom: `Role Temporaire ${ts}`,
      description: 'Sans aucun utilisateur',
    });
    createdRoleIds.push(customRoleEmpty.id);

    const deleteRes = await rolesController.remove(testCompanyA.id, customRoleEmpty.id);
    const dbDeleted = await prisma.role.findUnique({ where: { id: customRoleEmpty.id } });

    assert(
      deleteRes.id === customRoleEmpty.id && dbDeleted === null,
      'Scénario 7 : Suppression d’un rôle sans utilisateur réussie',
    );

    // -------------------------------------------------------------------------
    // Scénario 8 : Immutabilité des rôles système (rejet sur update et delete)
    // -------------------------------------------------------------------------
    let err8Update = false;
    let err8Delete = false;
    try {
      await rolesController.update(testCompanyA.id, adminRole.id, { nom: 'Faux Admin' });
    } catch (e) {
      err8Update = e instanceof ForbiddenException;
    }
    try {
      await rolesController.remove(testCompanyA.id, adminRole.id);
    } catch (e) {
      err8Delete = e instanceof ForbiddenException;
    }
    assert(
      err8Update && err8Delete,
      'Scénario 8 : Rôles système protégés contre toute modification et suppression (403 Forbidden)',
    );

    // -------------------------------------------------------------------------
    // Scénario 9 : Rejet des noms de rôles réservés
    // -------------------------------------------------------------------------
    let err9 = false;
    try {
      await rolesController.create(testCompanyA.id, {
        nom: 'ADMIN_GENERAL',
        description: 'Tentative usurpation',
      });
    } catch (e) {
      err9 = e instanceof BadRequestException;
    }
    assert(
      err9,
      'Scénario 9 : Création d’un rôle avec un nom réservé rejetée avec 400 BadRequest',
    );

    // -------------------------------------------------------------------------
    // Scénario 10 : Isolation multi-tenant des rôles sur mesure
    // -------------------------------------------------------------------------
    const rolesListB = await rolesController.findAll(testCompanyB.id, {});
    const customRoleAInB = rolesListB.data.some((r) => r.id === customRoleA.id);

    let err10FindOne = false;
    try {
      await rolesController.findOne(testCompanyB.id, customRoleA.id);
    } catch (e) {
      err10FindOne = e instanceof NotFoundException;
    }

    assert(
      !customRoleAInB && err10FindOne,
      'Scénario 10 : Isolation stricte inter-entreprises des rôles sur mesure',
    );

    // -------------------------------------------------------------------------
    // Scénario 11 : Prévention d'escalade de privilèges via assertPermissionsDelegable
    // -------------------------------------------------------------------------
    const actorNonAdmin: AuthenticatedUser = {
      sub: 999998,
      email: 'delegue@test.ma',
      nom: 'Delegue Restreint',
      role: 'PERSONNALISE',
      companyId: testCompanyA.id,
      isAdminGeneral: false,
      permissions: {
        ...emptyMatrix(),
        utilisateurs: { voir: true, ajouter: true, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
        voyages: { voir: true, ajouter: false, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
      },
    };

    let err11 = false;
    try {
      // Tente d'accorder "voyages: ajouter" qu'il ne possède pas
      await usersController.create(
        testCompanyA.id,
        {
          nom: 'Tente Escalade',
          email: `escalade_${ts}@test.ma`,
          motDePasse: 'Password123!',
          idRole: customRoleA.id,
          statut: UserStatut.ACTIF,
          permissions: {
            ...emptyMatrix(),
            voyages: { voir: true, ajouter: true, modifier: false, supprimer: false, exporter: false, imprimer: false, valider: false },
          },
        },
        actorNonAdmin,
      );
    } catch (e) {
      err11 = e instanceof ForbiddenException;
    }

    assert(
      err11,
      'Scénario 11 : assertPermissionsDelegable bloque toute tentative d’escalade de privilèges sur rôle sur mesure',
    );

    // -------------------------------------------------------------------------
    // Scénario 12 : Rôle sur mesure sans permissions explicites reçoit emptyMatrix
    // -------------------------------------------------------------------------
    const userNoPerms = await usersController.create(
      testCompanyA.id,
      {
        nom: `User No Perms ${ts}`,
        email: `noperms_${ts}@test.ma`,
        motDePasse: 'Password123!',
        idRole: customRoleA.id,
        statut: UserStatut.ACTIF,
      },
      actorA,
    );
    createdUserIds.push(userNoPerms.id);

    const dbUserNoPerms = await prisma.user.findUnique({
      where: { id: userNoPerms.id },
      include: { role: true },
    });
    const permsEvaluatedNoPerms = computeEffectivePermissions(
      dbUserNoPerms!.role.nom,
      dbUserNoPerms!.permissions,
    );

    assert(
      permsEvaluatedNoPerms.voyages.voir === false &&
        permsEvaluatedNoPerms.dashboard.voir === false,
      'Scénario 12 : Rôle sur mesure sans permissions explicites applique le fail-closed (emptyMatrix)',
    );

    // -------------------------------------------------------------------------
    // Scénario 13 : Protection du dernier ADMIN_GENERAL actif contre le changement de rôle
    // (Même s'il existe un autre admin INACTIF, le dernier admin ACTIF ne peut être rétrogradé par un autre admin)
    // -------------------------------------------------------------------------
    const adminAInactive = await prisma.user.create({
      data: {
        companyId: testCompanyA.id,
        nom: `Admin Inactif ${ts}`,
        email: `admin_inactif_${ts}@test.ma`,
        motDePasse: '$2b$10$e8.Z/g1z...',
        idRole: adminRole.id,
        statut: UserStatut.INACTIF,
      },
    });
    createdUserIds.push(adminAInactive.id);

    const actorInactiveAdmin: AuthenticatedUser = {
      sub: adminAInactive.id,
      email: adminAInactive.email,
      nom: adminAInactive.nom,
      role: 'ADMIN_GENERAL',
      companyId: testCompanyA.id,
      isAdminGeneral: true,
      permissions: fullMatrix(),
    };

    let err13RoleDemote = false;
    try {
      await usersController.update(
        testCompanyA.id,
        adminA.id,
        { idRole: exploitantRole.id },
        actorInactiveAdmin,
      );
    } catch (e) {
      err13RoleDemote = e instanceof ConflictException;
    }

    assert(
      err13RoleDemote,
      'Scénario 13 : Rétrogradation du dernier ADMIN_GENERAL actif bloquée (409 Conflict) même avec un admin inactif existant',
    );

    // -------------------------------------------------------------------------
    // Scénario 14 : Protection du dernier ADMIN_GENERAL actif contre la désactivation
    // -------------------------------------------------------------------------
    let err14Deactivate = false;
    try {
      await usersController.update(
        testCompanyA.id,
        adminA.id,
        { statut: UserStatut.INACTIF },
        actorInactiveAdmin,
      );
    } catch (e) {
      err14Deactivate = e instanceof ConflictException;
    }

    assert(
      err14Deactivate,
      'Scénario 14 : Désactivation du dernier ADMIN_GENERAL actif bloquée (409 Conflict)',
    );

    // -------------------------------------------------------------------------
    // Scénario 15 : Protection du dernier ADMIN_GENERAL actif contre la suppression
    // -------------------------------------------------------------------------
    let err15Delete = false;
    try {
      await usersController.remove(testCompanyA.id, adminA.id, actorInactiveAdmin);
    } catch (e) {
      err15Delete = e instanceof ConflictException;
    }

    assert(
      err15Delete,
      'Scénario 15 : Suppression du dernier ADMIN_GENERAL actif bloquée (409 Conflict)',
    );

    // -------------------------------------------------------------------------
    // Scénario 16 : Auto-protection de l'administrateur connecté (anti-suicide)
    // -------------------------------------------------------------------------
    let err16SelfRole = false;
    let err16SelfStatut = false;
    let err16SelfDelete = false;
    try {
      await usersController.update(testCompanyA.id, adminA.id, { idRole: exploitantRole.id }, actorA);
    } catch (e) {
      err16SelfRole = e instanceof BadRequestException;
    }
    try {
      await usersController.update(testCompanyA.id, adminA.id, { statut: UserStatut.INACTIF }, actorA);
    } catch (e) {
      err16SelfStatut = e instanceof BadRequestException;
    }
    try {
      await usersController.remove(testCompanyA.id, adminA.id, actorA);
    } catch (e) {
      err16SelfDelete = e instanceof BadRequestException;
    }

    assert(
      err16SelfRole && err16SelfStatut && err16SelfDelete,
      'Scénario 16 : Auto-protection bloque toute tentative de modifier son propre rôle, statut ou de supprimer son propre compte (400 BadRequest)',
    );

    // -------------------------------------------------------------------------
    // Scénario 17 : Filtrage combiné et pagination des utilisateurs
    // -------------------------------------------------------------------------
    const filteredByCustomRole = await usersController.findAll(testCompanyA.id, {
      idRole: customRoleA.id,
      page: 1,
      limit: 10,
    });
    const statsCompanyA = await usersController.stats(testCompanyA.id);

    assert(
      filteredByCustomRole.meta.total === 2 &&
        filteredByCustomRole.data.length === 2 &&
        statsCompanyA.total >= 4 &&
        statsCompanyA.inactifs >= 1,
      'Scénario 17 : Filtrage par rôle reflète le jeu filtré (meta.total = 2) tandis que stats reflète les agrégats globaux',
    );

    // -------------------------------------------------------------------------
    // Scénario 18 : Isolation multi-tenant stricte du listing et des stats utilisateurs
    // -------------------------------------------------------------------------
    const listCompanyB = await usersController.findAll(testCompanyB.id, {});
    const statsCompanyB = await usersController.stats(testCompanyB.id);

    assert(
      listCompanyB.meta.total === 0 &&
        listCompanyB.data.length === 0 &&
        statsCompanyB.total === 0,
      'Scénario 18 : Aucun utilisateur ou statistique de l’entreprise A n’est visible depuis l’entreprise B',
    );

    // -------------------------------------------------------------------------
    // Scénario 19 : Message d'erreur explicite lors d'un conflit d'e-mail global
    // -------------------------------------------------------------------------
    let err19Conflict = false;
    let err19Message = '';
    try {
      await usersController.create(
        testCompanyB.id,
        {
          nom: 'Tentative Doublon Global',
          email: adminA.email, // e-mail appartenant à testCompanyA
          motDePasse: 'Password123!',
          idRole: adminRole.id,
        },
        actorA,
      );
    } catch (e: any) {
      err19Conflict = e instanceof ConflictException;
      err19Message = e.message;
    }

    assert(
      err19Conflict &&
        err19Message ===
          'Cette adresse e-mail est déjà associée à un compte sur TRANSiVO. Veuillez utiliser une autre adresse.',
      'Scénario 19 : Le conflit d’e-mail retourne 409 Conflict avec le message explicite TRANSiVO sans divulguer le tenant tiers',
    );
  } catch (error) {
    console.error('ERREUR INATTENDUE DURANT LES TESTS :', error);
  } finally {
    console.log('\n--- NETTOYAGE DES DONNÉES DE TEST ---');
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdRoleIds.length > 0) {
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
    }
    if (testCompanyA) {
      await prisma.company.delete({ where: { id: testCompanyA.id } });
    }
    if (testCompanyB) {
      await prisma.company.delete({ where: { id: testCompanyB.id } });
    }
    await prisma.$disconnect();
    console.log('--- NETTOYAGE TERMINÉ ---\n');
  }

  console.log(`TOTAL VALIDÉS : ${passed}`);
  console.log(`TOTAL ÉCHOUÉS : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runOptionBTests();
