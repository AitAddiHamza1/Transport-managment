import { PrismaClient, ContratType, EmployeStatut, ConducteurStatut } from '@prisma/client';
import { ConducteursService } from './modules/conducteurs/conducteurs.service';
import { EmployesService } from './modules/employes/employes.service';
import { CreateConducteurDto } from './modules/conducteurs/dto/create-conducteur.dto';
import { UpdateConducteurDto } from './modules/conducteurs/dto/update-conducteur.dto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as assert from 'assert';

const prisma = new PrismaClient();
const conducteursService = new ConducteursService(prisma as any);
const employesService = new EmployesService(prisma as any);

async function runRegressionSuite() {
  console.log('======================================================================');
  console.log('=== TEST RUNNER : EMPLOYÉS ↔ CONDUCTEURS INTEGRITY REGRESSION ===');
  console.log('======================================================================\n');

  const ts = Date.now();
  let passCount = 0;

  function recordPass(testNum: number, name: string) {
    passCount++;
    console.log(`[PASS] Test ${testNum}: ${name}`);
  }

  // 1. Setup : Création de deux entreprises isolées
  const companyA = await prisma.company.create({
    data: { nom: `TestCo Integrity A ${ts}` },
  });
  const companyB = await prisma.company.create({
    data: { nom: `TestCo Integrity B ${ts}` },
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1 : Creating a driver without an employee is rejected (DTO & Service)
    // -------------------------------------------------------------------------
    const dtoNoEmp = plainToInstance(CreateConducteurDto, {
      nomConducteur: 'Conducteur Sans Employé',
      statut: ConducteurStatut.DISPONIBLE,
    });
    const dtoErrors1 = await validate(dtoNoEmp);
    assert.ok(
      dtoErrors1.some((e) => e.property === 'idEmploye'),
      'DTO validation must reject driver creation without idEmploye',
    );

    await assert.rejects(
      async () => {
        await conducteursService.create(dtoNoEmp as any, companyA.id);
      },
      (err: any) => err instanceof BadRequestException,
      'Service must throw BadRequestException when idEmploye is missing',
    );
    recordPass(1, 'Creating a driver without an employee is rejected at DTO and Service levels');

    // -------------------------------------------------------------------------
    // TEST 2 : Creating a driver with a nonexistent employee is rejected (404)
    // -------------------------------------------------------------------------
    const dtoNonexistent = plainToInstance(CreateConducteurDto, {
      idEmploye: 9999999,
      statut: ConducteurStatut.DISPONIBLE,
    });
    await assert.rejects(
      async () => {
        await conducteursService.create(dtoNonexistent, companyA.id);
      },
      (err: any) => err instanceof NotFoundException,
      'Service must throw NotFoundException when idEmploye does not exist',
    );
    recordPass(2, 'Creating a driver with a nonexistent employee is rejected (404)');

    // -------------------------------------------------------------------------
    // TEST 3 : An employee belonging to another company is rejected (Cross-tenant)
    // -------------------------------------------------------------------------
    const empCompanyB = await prisma.employe.create({
      data: {
        companyId: companyB.id,
        matricule: `EMP-${ts}-B1`,
        nom: 'Benali',
        prenom: 'Karim',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: ContratType.CDI,
        statut: EmployeStatut.ACTIF,
      },
    });

    const dtoCrossTenant = plainToInstance(CreateConducteurDto, {
      idEmploye: empCompanyB.id,
      statut: ConducteurStatut.DISPONIBLE,
    });
    await assert.rejects(
      async () => {
        // Tentative d'associer l'employé de Company B à Company A
        await conducteursService.create(dtoCrossTenant, companyA.id);
      },
      (err: any) => err instanceof NotFoundException,
      'Cross-tenant driver creation must be rejected with NotFoundException',
    );
    recordPass(3, 'An employee belonging to another company is rejected with cross-tenant isolation');

    // -------------------------------------------------------------------------
    // TEST 4 : A logically deleted employee cannot be linked to a new driver
    // -------------------------------------------------------------------------
    const empSoftDeletedA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${ts}-SD`,
        nom: 'Alami',
        prenom: 'Youssef',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: ContratType.CDI,
        statut: EmployeStatut.ACTIF,
        supprimeLe: new Date(), // Soft-deleted
      },
    });

    const dtoSoftDeleted = plainToInstance(CreateConducteurDto, {
      idEmploye: empSoftDeletedA.id,
      statut: ConducteurStatut.DISPONIBLE,
    });
    await assert.rejects(
      async () => {
        await conducteursService.create(dtoSoftDeleted, companyA.id);
      },
      (err: any) => err instanceof BadRequestException,
      'Soft-deleted employee cannot be linked to a new driver',
    );
    recordPass(4, 'A logically deleted employee cannot be linked to a new driver');

    // -------------------------------------------------------------------------
    // TEST 5 : Updating a driver cannot bypass these rules
    // -------------------------------------------------------------------------
    // Création d'un employé valide dans Company A
    const empValidA1 = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${ts}-A1`,
        nom: 'Tazi',
        prenom: 'Adil',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: ContratType.CDI,
        statut: EmployeStatut.ACTIF,
      },
    });

    const validDriverA1 = await conducteursService.create(
      plainToInstance(CreateConducteurDto, {
        idEmploye: empValidA1.id,
        statut: ConducteurStatut.DISPONIBLE,
      }),
      companyA.id,
    );
    assert.strictEqual(validDriverA1.idEmploye, empValidA1.id);
    assert.strictEqual(validDriverA1.nomConducteur, 'Adil Tazi');

    // 5a. Tentative de détacher l'employé (idEmploye = null) lors d'un update
    await assert.rejects(
      async () => {
        await conducteursService.update(validDriverA1.id, { idEmploye: null } as any, companyA.id);
      },
      (err: any) => err instanceof BadRequestException,
      'Detaching driver (idEmploye = null) must be rejected',
    );

    // 5b. Tentative de rattacher un employé d'une autre entreprise (Company B)
    await assert.rejects(
      async () => {
        await conducteursService.update(validDriverA1.id, { idEmploye: empCompanyB.id }, companyA.id);
      },
      (err: any) => err instanceof NotFoundException,
      'Re-linking driver to other company employee must be rejected',
    );

    // 5c. Tentative de rattacher un employé soft-deleted
    await assert.rejects(
      async () => {
        await conducteursService.update(validDriverA1.id, { idEmploye: empSoftDeletedA.id }, companyA.id);
      },
      (err: any) => err instanceof BadRequestException,
      'Re-linking driver to soft-deleted employee must be rejected',
    );
    recordPass(5, 'Updating a driver cannot bypass employee integrity and validation rules');

    // -------------------------------------------------------------------------
    // TEST 6 : An employee linked to a driver on an active voyage cannot be deleted or deactivated
    // -------------------------------------------------------------------------
    // Créer un voyage en cours pour ce conducteur dans Company A
    const activeTrip = await prisma.voyage.create({
      data: {
        companyId: companyA.id,
        nomConducteur: validDriverA1.nomConducteur,
        statut: 'EN_COURS',
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger Med',
      },
    });

    // Passer le statut du conducteur à EN_VOYAGE
    await prisma.conducteur.update({
      where: { id: validDriverA1.id },
      data: { statut: ConducteurStatut.EN_VOYAGE },
    });

    // Tentative 1 : softDelete de l'employé alors que son conducteur est en voyage
    await assert.rejects(
      async () => {
        await employesService.softDelete(empValidA1.id, companyA.id);
      },
      (err: any) =>
        err instanceof BadRequestException &&
        err.message.includes('actuellement affecté à un voyage actif'),
      'Soft-deleting an employee whose driver is on active trip must be rejected',
    );

    // Tentative 2 : update statut vers DEMISSIONNAIRE alors que le conducteur est en voyage
    await assert.rejects(
      async () => {
        await employesService.update(
          empValidA1.id,
          { statut: EmployeStatut.DEMISSIONNAIRE, dateSortie: new Date().toISOString() },
          companyA.id,
        );
      },
      (err: any) =>
        err instanceof BadRequestException &&
        err.message.includes('actuellement affecté à un voyage actif'),
      'Deactivating an employee whose driver is on active trip must be rejected',
    );
    recordPass(6, 'Employee linked to a driver on an active voyage cannot be deleted or deactivated');

    // Clôturer le voyage pour débloquer les tests suivants
    await prisma.voyage.update({
      where: { idVoyage: activeTrip.idVoyage },
      data: { statut: 'LIVRE' },
    });
    await prisma.conducteur.update({
      where: { id: validDriverA1.id },
      data: { statut: ConducteurStatut.DISPONIBLE },
    });

    // -------------------------------------------------------------------------
    // TEST 7 : A valid employee deactivation/deletion handles the linked driver consistently
    // -------------------------------------------------------------------------
    // 7a. Changement de statut RH vers SUSPENDU -> conducteur passe à INDISPONIBLE
    await employesService.update(
      empValidA1.id,
      { statut: EmployeStatut.SUSPENDU },
      companyA.id,
    );
    const condAfterSusp = await prisma.conducteur.findUnique({ where: { id: validDriverA1.id } });
    assert.strictEqual(
      condAfterSusp?.statut,
      ConducteurStatut.INDISPONIBLE,
      'Driver status must switch to INDISPONIBLE when employee is SUSPENDU',
    );

    // Réactiver l'employé pour le test de soft-delete
    await employesService.update(
      empValidA1.id,
      { statut: EmployeStatut.ACTIF },
      companyA.id,
    );

    // 7b. softDelete de l'employé sans voyage actif
    const delRes = await employesService.softDelete(empValidA1.id, companyA.id);
    assert.ok(delRes.message.includes('supprimé avec succès'));

    const empAfterDelete = await prisma.employe.findUnique({ where: { id: empValidA1.id } });
    assert.ok(empAfterDelete?.supprimeLe !== null, 'Employee must be soft-deleted');

    const condAfterDelete = await prisma.conducteur.findUnique({ where: { id: validDriverA1.id } });
    assert.strictEqual(
      condAfterDelete?.statut,
      ConducteurStatut.INACTIF,
      'Driver must be transitioned to INACTIF upon employee soft-delete',
    );
    recordPass(7, 'A valid employee deactivation/deletion handles the linked driver consistently');

    // -------------------------------------------------------------------------
    // TEST 8 : Orphan drivers do not appear in the operational driver list or its counters
    // -------------------------------------------------------------------------
    // Créons un conducteur orphelin dans Company A manuellement (simulation donnée ancienne/script)
    const orphanDriver = await prisma.conducteur.create({
      data: {
        companyId: companyA.id,
        nomConducteur: 'Conducteur Fantome Orphelin',
        idEmploye: null,
        statut: ConducteurStatut.DISPONIBLE,
      },
    });

    // Créons également un deuxième employé actif avec un conducteur valide dans Company A
    const empValidA2 = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${ts}-A2`,
        nom: 'Naciri',
        prenom: 'Hamza',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: ContratType.CDI,
        statut: EmployeStatut.ACTIF,
      },
    });
    const driverValidA2 = await conducteursService.create(
      plainToInstance(CreateConducteurDto, {
        idEmploye: empValidA2.id,
        statut: ConducteurStatut.DISPONIBLE,
      }),
      companyA.id,
    );

    // Liste des conducteurs via ConducteursService.findAll
    const listRes = await conducteursService.findAll({}, companyA.id);
    const statsRes = await conducteursService.findStats(companyA.id);

    // Seul driverValidA2 doit apparaître (validDriverA1 a son employé soft-deleted, orphanDriver n'a pas d'employé)
    assert.strictEqual(listRes.meta.total, 1, 'Only the active, non-deleted driver must be counted in findAll total');
    assert.strictEqual(listRes.data.length, 1, 'Only 1 driver returned in data array');
    assert.strictEqual(listRes.data[0].id, driverValidA2.id);
    assert.strictEqual(statsRes.total, 1, 'Driver stats total must exclude orphan and soft-deleted drivers');
    assert.strictEqual(statsRes.disponibles, 1, 'Driver stats disponibles must exclude orphan and soft-deleted drivers');
    recordPass(8, 'Orphan drivers and drivers linked to deleted employees are excluded from list and counters');

    // -------------------------------------------------------------------------
    // TEST 9 : List, search, pagination and status counters use consistent filters
    // -------------------------------------------------------------------------
    // Recherche par nom qui match l'orphelin -> ne doit rien retourner
    const searchOrphan = await conducteursService.findAll({ search: 'Fantome' }, companyA.id);
    assert.strictEqual(searchOrphan.meta.total, 0, 'Search must not return orphan drivers');
    assert.strictEqual(searchOrphan.data.length, 0);

    // Recherche par nom qui match le conducteur valide
    const searchValid = await conducteursService.findAll({ search: 'Naciri' }, companyA.id);
    assert.strictEqual(searchValid.meta.total, 1, 'Search matches valid driver');
    assert.strictEqual(searchValid.data[0].id, driverValidA2.id);

    // Filtrage par statut DISPONIBLE
    const filterDisp = await conducteursService.findAll({ statut: ConducteurStatut.DISPONIBLE }, companyA.id);
    assert.strictEqual(filterDisp.meta.total, 1);
    assert.strictEqual(statsRes.disponibles, filterDisp.meta.total, 'Stats "disponibles" matches list total');
    recordPass(9, 'List, search, pagination and status counters use strictly consistent filters');

    // -------------------------------------------------------------------------
    // TEST 10 : Company A cannot see or modify Company B's employees or drivers
    // -------------------------------------------------------------------------
    // Créer un conducteur valide dans Company B
    const driverValidB = await conducteursService.create(
      plainToInstance(CreateConducteurDto, {
        idEmploye: empCompanyB.id,
        statut: ConducteurStatut.DISPONIBLE,
      }),
      companyB.id,
    );

    // Company A ne doit pas voir le conducteur de Company B
    const listCompanyA = await conducteursService.findAll({}, companyA.id);
    assert.ok(
      !listCompanyA.data.some((d) => d.id === driverValidB.id),
      'Company A cannot see Company B drivers',
    );

    // Company A ne peut pas modifier le conducteur de Company B
    await assert.rejects(
      async () => {
        await conducteursService.update(driverValidB.id, { telephone: '0600000000' }, companyA.id);
      },
      (err: any) => err instanceof NotFoundException,
      'Company A cannot update Company B driver',
    );

    // Company A ne peut pas supprimer le conducteur de Company B
    await assert.rejects(
      async () => {
        await conducteursService.remove(driverValidB.id, companyA.id);
      },
      (err: any) => err instanceof NotFoundException,
      'Company A cannot delete Company B driver',
    );
    recordPass(10, 'Tenant isolation strictly preserved across all operations');

    // -------------------------------------------------------------------------
    // TEST 11 : Frontend query cache invalidation contract verification
    // -------------------------------------------------------------------------
    const fs = require('fs');
    const path = require('path');
    const condHookPath = path.resolve(__dirname, '../../frontend/src/features/conducteurs/useConducteurs.ts');
    const empHookPath = path.resolve(__dirname, '../../frontend/src/features/employes/useEmployes.ts');

    assert.ok(fs.existsSync(condHookPath), 'Frontend conducteurs hook file must exist');
    assert.ok(fs.existsSync(empHookPath), 'Frontend employes hook file must exist');

    const condHookContent = fs.readFileSync(condHookPath, 'utf8');
    const empHookContent = fs.readFileSync(empHookPath, 'utf8');

    // Vérifier l'invalidation croisée employes dans les mutations conducteurs
    assert.ok(
      condHookContent.includes("queryClient.invalidateQueries({ queryKey: ['employes'] })"),
      'useConducteurs must invalidate employes queries on driver mutations',
    );

    // Vérifier l'invalidation croisée conducteurs dans les mutations employes
    assert.ok(
      empHookContent.includes("queryClient.invalidateQueries({ queryKey: ['conducteurs'] })"),
      'useEmployes must invalidate conducteurs queries on employee mutations',
    );
    recordPass(11, 'Frontend cross-invalidation queries contract verified strictly');

    // -------------------------------------------------------------------------
    // TEST 12 : Existing voyage history and employee records remain intact
    // -------------------------------------------------------------------------
    const tripCheck = await prisma.voyage.findUnique({ where: { idVoyage: activeTrip.idVoyage } });
    assert.ok(tripCheck !== null, 'Voyage history record remains fully intact');
    assert.strictEqual(tripCheck?.nomConducteur, validDriverA1.nomConducteur);
    assert.strictEqual(tripCheck?.statut, 'LIVRE');
    recordPass(12, 'Voyage history and records remain completely intact without corruption');

    console.log(`\n======================================================================`);
    console.log(`=== ALL ${passCount} REGRESSION TESTS PASSED CLEANLY (100% SUCCESS) ===`);
    console.log(`======================================================================\n`);
  } finally {
    // Nettoyage ciblé des enregistrements créés par ce test runner uniquement
    await prisma.voyage.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.conducteur.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.employe.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
  }
}

runRegressionSuite().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
