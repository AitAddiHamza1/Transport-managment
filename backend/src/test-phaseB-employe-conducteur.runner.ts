import {
  PrismaClient,
  ConducteurStatut,
  EmployeStatut,
} from '@prisma/client';
import { ConducteursService } from './modules/conducteurs/conducteurs.service';
import { ConducteursController } from './modules/conducteurs/conducteurs.controller';
import { CreateConducteurDto } from './modules/conducteurs/dto/create-conducteur.dto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

const prisma = new PrismaClient();
const service = new ConducteursService(prisma as any);
const controller = new ConducteursController(service);

// Mock AuthenticatedUser actor
const mockActorTenantA: any = {
  id: 1,
  companyId: 0, // set dynamically
  email: 'adminA@test.com',
  isAdminGeneral: false,
  permissions: { conducteurs: ['voir', 'ajouter', 'modifier', 'supprimer'], employes: ['voir'] },
};

const mockActorTenantB: any = {
  id: 2,
  companyId: 0, // set dynamically
  email: 'adminB@test.com',
  isAdminGeneral: false,
  permissions: { conducteurs: ['voir', 'ajouter', 'modifier', 'supprimer'], employes: ['voir'] },
};

async function runPhaseBTests() {
  console.log('=== RUNNING PHASE B: EMPLOYÉ → CONDUCTEUR TEST SUITE ===\n');
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

  const companyA = await prisma.company.create({
    data: { nom: `Phase B Co A ${ts}` },
  });
  const companyB = await prisma.company.create({
    data: { nom: `Phase B Co B ${ts}` },
  });

  mockActorTenantA.companyId = companyA.id;
  mockActorTenantB.companyId = companyB.id;

  try {
    // Setup test Employee in Company A
    const employeeA = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${ts}-01`,
        nom: 'Ait',
        prenom: 'Ayoub',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
        statut: EmployeStatut.ACTIF,
      },
    });

    // Setup test Employee in Company B (Cross-tenant)
    const employeeB = await prisma.employe.create({
      data: {
        companyId: companyB.id,
        matricule: `EMP-${ts}-02`,
        nom: 'Mansouri',
        prenom: 'Omar',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
        statut: EmployeStatut.ACTIF,
      },
    });

    // =================================================================
    // TEST 1 — Employee-linked conducteur creation without nomConducteur
    // =================================================================
    console.log('--- TEST 1 — Employee-linked conducteur creation ---');
    const dto1 = plainToInstance(CreateConducteurDto, {
      idEmploye: employeeA.id,
      statut: ConducteurStatut.DISPONIBLE,
    });
    const errors1 = await validate(dto1);
    assert(errors1.length === 0, 'TEST 1: DTO validation passes without nomConducteur when idEmploye is provided');

    const createdDriver1 = await controller.create(dto1, mockActorTenantA, companyA.id);
    assert(createdDriver1.idEmploye === employeeA.id, 'TEST 1: Conducteur is linked to Employee');
    assert(createdDriver1.nomConducteur === 'Ayoub Ait', 'TEST 1: nomConducteur is derived from Employee ("Ayoub Ait")');

    // =================================================================
    // TEST 2 — Employee-linked creation with malicious/incorrect nomConducteur
    // =================================================================
    console.log('\n--- TEST 2 — Employee-linked creation with malicious nomConducteur ---');
    // Setup a second active employee in Company A
    const employeeA2 = await prisma.employe.create({
      data: {
        companyId: companyA.id,
        matricule: `EMP-${ts}-03`,
        nom: 'Bennani',
        prenom: 'Hassan',
        poste: 'Conducteur',
        dateEmbauche: new Date(),
        typeContrat: 'CDI',
        statut: EmployeStatut.ACTIF,
      },
    });

    const dto2 = plainToInstance(CreateConducteurDto, {
      idEmploye: employeeA2.id,
      nomConducteur: 'Wrong Name Malicious',
      statut: ConducteurStatut.DISPONIBLE,
    });
    const createdDriver2 = await controller.create(dto2, mockActorTenantA, companyA.id);
    assert(
      createdDriver2.nomConducteur === 'Hassan Bennani',
      'TEST 2: Backend ignores "Wrong Name Malicious" and sets derived name "Hassan Bennani"',
    );

    // =================================================================
    // TEST 3 — Standalone conducteur creation
    // =================================================================
    console.log('\n--- TEST 3 — Standalone conducteur creation ---');
    const dto3 = plainToInstance(CreateConducteurDto, {
      nomConducteur: 'Karim Sami',
      statut: ConducteurStatut.DISPONIBLE,
    });
    const errors3 = await validate(dto3);
    assert(errors3.length === 0, 'TEST 3: DTO validation passes with nomConducteur when idEmploye is absent');

    const createdDriver3 = await controller.create(dto3, mockActorTenantA, companyA.id);
    assert(createdDriver3.idEmploye === null, 'TEST 3: Standalone driver has idEmploye null');
    assert(createdDriver3.nomConducteur === 'Karim Sami', 'TEST 3: Standalone driver name stored as "Karim Sami"');

    // =================================================================
    // TEST 4 — Standalone conducteur without name rejected
    // =================================================================
    console.log('\n--- TEST 4 — Standalone conducteur without name ---');
    const dto4 = plainToInstance(CreateConducteurDto, {
      statut: ConducteurStatut.DISPONIBLE,
    });
    const errors4 = await validate(dto4);
    assert(
      errors4.length > 0 && errors4.some((e) => e.property === 'nomConducteur'),
      'TEST 4: DTO validation rejects standalone creation without nomConducteur',
    );

    // =================================================================
    // TEST 5 — Invalid employee ID
    // =================================================================
    console.log('\n--- TEST 5 — Invalid employee ID ---');
    const dto5 = plainToInstance(CreateConducteurDto, {
      idEmploye: 999999,
      statut: ConducteurStatut.DISPONIBLE,
    });
    let err5 = false;
    try {
      await controller.create(dto5, mockActorTenantA, companyA.id);
    } catch (e) {
      err5 = e instanceof NotFoundException;
    }
    assert(err5, 'TEST 5: Non-existent idEmploye rejected with NotFoundException (404)');

    // =================================================================
    // TEST 6 — Cross-tenant employee protection
    // =================================================================
    console.log('\n--- TEST 6 — Cross-tenant employee protection ---');
    const dto6 = plainToInstance(CreateConducteurDto, {
      idEmploye: employeeB.id, // Employee B belongs to Company B
      statut: ConducteurStatut.DISPONIBLE,
    });
    let err6 = false;
    try {
      await controller.create(dto6, mockActorTenantA, companyA.id); // Tenant A attempts to link Employee B
    } catch (e) {
      err6 = e instanceof NotFoundException;
    }
    assert(err6, 'TEST 6: Cross-tenant employee link rejected with NotFoundException (404)');

    // =================================================================
    // TEST 7 — Display name consistency on retrieval
    // =================================================================
    console.log('\n--- TEST 7 — Display name consistency ---');
    const fetchedDriver1 = await controller.findOne(createdDriver1.id, mockActorTenantA, companyA.id);
    assert(
      fetchedDriver1.nomConducteur === 'Ayoub Ait',
      'TEST 7: findOne returns clean name "Ayoub Ait" (no matricule or dropdown formatting)',
    );

    const listDrivers = await controller.findAll({}, mockActorTenantA, companyA.id);
    const listedDriver1 = listDrivers.data.find((d) => d.id === createdDriver1.id);
    assert(
      listedDriver1?.nomConducteur === 'Ayoub Ait',
      'TEST 7: findAll list returns clean name "Ayoub Ait"',
    );

  } catch (error) {
    console.error('UNEXPECTED ERROR IN PHASE B TEST RUNNER:', error);
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.conducteur.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.employe.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
    console.log('--- CLEANUP COMPLETE ---\n');
  }

  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhaseBTests();
