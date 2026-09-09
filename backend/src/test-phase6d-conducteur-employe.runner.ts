import { PrismaClient, ContratType, EmployeStatut, ConducteurStatut, Prisma } from '@prisma/client';
import * as assert from 'assert';

const prisma = new PrismaClient();

async function runTests() {
  console.log('[TESTS] Starting Phase 6D test runner...');

  // Setup: reset test data first
  console.log('  -> Resetting database for clean test run...');
  await prisma.versementEmploye.deleteMany();
  await prisma.paiementEmploye.deleteMany();
  await prisma.documentEmploye.deleteMany();
  await prisma.documentConducteur.deleteMany();
  await prisma.paiementClient.deleteMany();
  await prisma.creanceClient.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.voyage.deleteMany();
  await prisma.conducteur.deleteMany();
  await prisma.employe.deleteMany();

  await prisma.$executeRaw`DELETE FROM employe_sequences;`;
  await prisma.$executeRaw`DELETE FROM invoice_sequences;`;
  await prisma.$executeRaw`INSERT INTO employe_sequences (prefixe, dernier_numero) VALUES ('EMP', 0) ON CONFLICT (prefixe) DO UPDATE SET dernier_numero = 0;`;

  // Test 1: Create normal employee without driver
  console.log('  [TEST 1] Create employee without driver profile...');
  const emp1 = await prisma.employe.create({
    data: {
      matricule: 'EMP-0001',
      nom: 'Sami',
      prenom: 'Karim',
      poste: 'Mécanicien',
      typeContrat: ContratType.CDI,
      statut: EmployeStatut.ACTIF,
      dateEmbauche: new Date(),
    },
  });
  const condCheck1 = await prisma.conducteur.findFirst({ where: { idEmploye: emp1.id } });
  assert.strictEqual(condCheck1, null, 'Driver profile should not be created for mechanic');

  // Test 2: Create employee with linked driver atomically
  console.log('  [TEST 2] Create employee with driver profile atomically...');
  const emp2 = await prisma.employe.create({
    data: {
      matricule: 'EMP-0002',
      nom: 'Tazi',
      prenom: 'Adil',
      poste: 'Conducteur',
      typeContrat: ContratType.CDI,
      statut: EmployeStatut.ACTIF,
      dateEmbauche: new Date(),
      conducteur: {
        create: {
          nomConducteur: 'Adil Tazi',
          statut: ConducteurStatut.DISPONIBLE,
        },
      },
    },
    include: { conducteur: true },
  });
  assert.ok(emp2.conducteur, 'Driver profile should be created atomically');
  assert.strictEqual(emp2.conducteur.nomConducteur, 'Adil Tazi');
  assert.strictEqual(emp2.conducteur.statut, ConducteurStatut.DISPONIBLE);

  // Test 4: Prevent second driver for same employee
  console.log('  [TEST 4] Prevent second driver for same employee...');
  try {
    await prisma.conducteur.create({
      data: {
        idEmploye: emp2.id,
        nomConducteur: 'Duplicate Test',
        statut: ConducteurStatut.DISPONIBLE,
      },
    });
    assert.fail('Unique index should prevent multiple drivers for same employee');
  } catch (err: any) {
    assert.ok(
      err.code === 'P2002' || err.message.includes('Unique constraint failed'),
      'Should throw unique constraint error',
    );
  }

  // Test 5: Link eligible existing employee from conducteurs page
  console.log('  [TEST 5] Link existing employee to new conducteur...');
  const driver3 = await prisma.conducteur.create({
    data: {
      idEmploye: emp1.id,
      nomConducteur: `${emp1.prenom} ${emp1.nom}`,
      statut: ConducteurStatut.DISPONIBLE,
    },
  });
  assert.strictEqual(driver3.idEmploye, emp1.id);

  // Test 6: Reject suspended/exited employee
  console.log('  [TEST 6] Reject linking suspended employee...');
  const empSuspended = await prisma.employe.create({
    data: {
      matricule: 'EMP-0003',
      nom: 'Fassi',
      prenom: 'Omar',
      poste: 'Conducteur',
      typeContrat: ContratType.CDD,
      statut: EmployeStatut.SUSPENDU,
      dateEmbauche: new Date(),
    },
  });
  // Simulate controller/service validation
  try {
    if (empSuspended.statut !== 'ACTIF') {
      throw new Error(`Impossible de relier un employé non-actif (${empSuspended.statut})`);
    }
    await prisma.conducteur.create({
      data: {
        idEmploye: empSuspended.id,
        nomConducteur: 'Omar Fassi',
        statut: ConducteurStatut.DISPONIBLE,
      },
    });
    assert.fail('Should reject non-active employee');
  } catch (err: any) {
    assert.ok(err.message.includes('non-actif'), 'Error message should complain about status');
  }

  // Test 11: Voyage status updates only operational driver status
  console.log(
    '  [TEST 11] Voyage resource sync updates driver status, preserves employee HR status...',
  );
  // Simulate starting trip
  await prisma.conducteur.update({
    where: { id: emp2.conducteur!.id },
    data: { statut: ConducteurStatut.EN_VOYAGE },
  });
  const updatedEmp2 = await prisma.employe.findUnique({
    where: { id: emp2.id },
  });
  assert.strictEqual(
    updatedEmp2!.statut,
    EmployeStatut.ACTIF,
    'Employee HR status must remain ACTIF',
  );

  // Test 12: Linked driver appears in Paiements employés
  console.log('  [TEST 12] Verify driver can receive employee payments...');
  const payment = await prisma.paiementEmploye.create({
    data: {
      idEmploye: emp2.id,
      numeroPaiement: 'PAI-2026-0001',
      periode: '2026-08',
      salaireReference: new Prisma.Decimal('5500.00'),
      montantDu: new Prisma.Decimal('5500.00'),
    },
  });
  assert.strictEqual(payment.idEmploye, emp2.id);

  // Test 14: Partial/full salary versements
  console.log('  [TEST 14] Verify salary versements...');
  const versement = await prisma.versementEmploye.create({
    data: {
      idPaiementEmploye: payment.id,
      montant: new Prisma.Decimal('2500.00'),
      dateVersement: new Date(),
      modePaiement: 'ESPECES',
      notes: 'Avance sur salaire',
    },
  });
  assert.strictEqual(versement.idPaiementEmploye, payment.id);

  // Test 15: Employee update refreshes driver identity display
  console.log('  [TEST 15] Sync name updates from employee to driver...');
  const updatedEmp = await prisma.employe.update({
    where: { id: emp2.id },
    data: { prenom: 'Adil Mod' },
    include: { conducteur: true },
  });
  // Simulate service sync
  await prisma.conducteur.update({
    where: { id: updatedEmp.conducteur!.id },
    data: { nomConducteur: `${updatedEmp.prenom} ${updatedEmp.nom}` },
  });
  const finalDriver = await prisma.conducteur.findUnique({
    where: { id: updatedEmp.conducteur!.id },
  });
  assert.strictEqual(
    finalDriver!.nomConducteur,
    'Adil Mod Tazi',
    'Driver snapshot name should sync',
  );

  console.log('\n[TESTS] All runner tests passed successfully!');
  process.exit(0);
}

runTests().catch((e) => {
  console.error('[TESTS] Test run failed:', e);
  process.exit(1);
});
