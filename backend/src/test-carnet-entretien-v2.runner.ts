import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { CarnetEntretienService } from './modules/carnet-entretien/carnet-entretien.service';
import { CarnetEntretienController } from './modules/carnet-entretien/carnet-entretien.controller';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function runTests() {
  console.log('=== RUNNING PHASE 2 BACKEND TEST SUITE (22 TESTS) ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const depensesService = app.get(DepensesVehiculesService);
  const carnetService = app.get(CarnetEntretienService);

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failedCount++;
    }
  }

  // Setup test environment
  const timestamp = Date.now();
  const company1 = await prisma.company.create({
    data: { nom: `Test Company A ${timestamp}` },
  });
  const company2 = await prisma.company.create({
    data: { nom: `Test Company B ${timestamp}` },
  });

  const immat1 = `TEST-${timestamp.toString().slice(-6)}-A`;
  const immat2 = `TEST-${timestamp.toString().slice(-6)}-B`;

  await prisma.vehicule.create({
    data: {
      companyId: company1.id,
      immatriculation: immat1,
      marque: 'Volvo',
      modele: 'FH16',
      typeVehicule: 'CAMION',
    },
  });

  await prisma.vehicule.create({
    data: {
      companyId: company2.id,
      immatriculation: immat2,
      marque: 'Scania',
      modele: 'R500',
      typeVehicule: 'CAMION',
    },
  });

  const fournisseur1 = await prisma.fournisseur.create({
    data: {
      companyId: company1.id,
      nomFournisseur: `Fournisseur Alpha ${timestamp}`,
    },
  });

  const fournisseur2 = await prisma.fournisseur.create({
    data: {
      companyId: company2.id,
      nomFournisseur: `Fournisseur Beta ${timestamp}`,
    },
  });

  try {
    // TEST 1: Charge normale (isMaintenanceIntervention = false)
    const exp1 = await depensesService.create(company1.id, {
      immatriculation: immat1,
      categorieDepense: 'PEAGE',
      justificatifType: 'SANS_FACTURE',
      montant: 250,
      isMaintenanceIntervention: false,
      description: 'Péage autoroute',
    });
    const checkIntervention1 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp1.idDepense },
    });
    assert(exp1.idDepense > 0 && checkIntervention1 === null, 'TEST 1: Charge normale sans intervention');

    // TEST 2: Charge entretien (km = 1500, intervalle = 100)
    const exp2 = await depensesService.create(company1.id, {
      immatriculation: immat1,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 1200,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Changement des pneus',
      kilometrageRealise: 1500,
      intervalleKm: 100,
      notesIntervention: 'Pneus neufs installés',
    });
    const checkIntervention2 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });
    assert(
      checkIntervention2 !== null && checkIntervention2.prochainKmEcheance === 1600,
      'TEST 2: Charge entretien avec prochainKmEcheance = 1600',
    );

    // TEST 3: Current mileage = 1550 (remaining = 50, UPCOMING)
    await prisma.bonCarburant.create({
      data: {
        immatriculation: immat1,
        litres: 50,
        prixParLitre: 12,
        kilometrage: BigInt(1550),
        dateCarburant: new Date(),
      },
    });
    const view3 = await carnetService.findOneIntervention(company1.id, checkIntervention2!.id);
    assert(
      view3.currentVehicleMileage === 1550 && view3.remainingKm === 50 && view3.statut === 'UPCOMING',
      `TEST 3: Current mileage = 1550 -> remaining 50 km (UPCOMING), got ${view3.statut}`,
    );

    // TEST 4: Current mileage = 1600 (remaining = 0, DUE)
    await prisma.bonCarburant.create({
      data: {
        immatriculation: immat1,
        litres: 50,
        prixParLitre: 12,
        kilometrage: BigInt(1600),
        dateCarburant: new Date(),
      },
    });
    const view4 = await carnetService.findOneIntervention(company1.id, checkIntervention2!.id);
    assert(
      view4.currentVehicleMileage === 1600 && view4.remainingKm === 0 && view4.statut === 'DUE',
      `TEST 4: Current mileage = 1600 -> remaining 0 km (DUE), got ${view4.statut}`,
    );

    // TEST 5: Current mileage = 1650 (remaining = -50, OVERDUE)
    await prisma.bonCarburant.create({
      data: {
        immatriculation: immat1,
        litres: 50,
        prixParLitre: 12,
        kilometrage: BigInt(1650),
        dateCarburant: new Date(),
      },
    });
    const view5 = await carnetService.findOneIntervention(company1.id, checkIntervention2!.id);
    assert(
      view5.currentVehicleMileage === 1650 && view5.remainingKm === -50 && view5.statut === 'OVERDUE',
      `TEST 5: Current mileage = 1650 -> remaining -50 km (OVERDUE), got ${view5.statut}`,
    );

    // TEST 6: Modification intervalle (intervalle = 200 => prochainKmEcheance = 1700)
    await depensesService.update(company1.id, exp2.idDepense, {
      isMaintenanceIntervention: true,
      kilometrageRealise: 1500,
      intervalleKm: 200,
    });
    const checkIntervention6 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });
    assert(
      checkIntervention6 !== null && checkIntervention6.prochainKmEcheance === 1700,
      `TEST 6: Modification intervalle -> prochainKmEcheance = 1700, got ${checkIntervention6?.prochainKmEcheance}`,
    );

    // TEST 7: Modification kilométrage (km = 2000 => prochainKmEcheance = 2100)
    await depensesService.update(company1.id, exp2.idDepense, {
      isMaintenanceIntervention: true,
      kilometrageRealise: 2000,
      intervalleKm: 100,
    });
    const checkIntervention7 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });
    assert(
      checkIntervention7 !== null && checkIntervention7.prochainKmEcheance === 2100,
      `TEST 7: Modification kilométrage -> prochainKmEcheance = 2100, got ${checkIntervention7?.prochainKmEcheance}`,
    );

    // TEST 8: Passage Oui -> Non (Intervention supprimée)
    await depensesService.update(company1.id, exp2.idDepense, {
      isMaintenanceIntervention: false,
    });
    const checkIntervention8 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });
    assert(checkIntervention8 === null, 'TEST 8: Passage Oui -> Non supprime l’intervention liée');

    // TEST 9: Passage Non -> Oui (Intervention créée)
    await depensesService.update(company1.id, exp2.idDepense, {
      isMaintenanceIntervention: true,
      libelleIntervention: 'Révision freinage',
      kilometrageRealise: 2500,
      intervalleKm: 500,
    });
    const checkIntervention9 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp2.idDepense },
    });
    assert(
      checkIntervention9 !== null && checkIntervention9.prochainKmEcheance === 3000,
      'TEST 9: Passage Non -> Oui crée l’intervention liée',
    );

    // TEST 10: Suppression charge (Pas d'intervention orpheline)
    const expToDelete = await depensesService.create(company1.id, {
      immatriculation: immat1,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 500,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Vidange boite',
      kilometrageRealise: 1000,
      intervalleKm: 500,
    });
    const createdInterventionId = (
      await prisma.maintenanceIntervention.findUnique({
        where: { idDepenseVehicule: expToDelete.idDepense },
      })
    )?.id;

    await depensesService.remove(company1.id, expToDelete.idDepense);
    const checkOrphan = await prisma.maintenanceIntervention.findFirst({
      where: { id: createdInterventionId },
    });
    assert(checkOrphan === null, 'TEST 10: Suppression charge -> aucune intervention orpheline');

    // TEST 11: Avec facture -> DetteFournisseur créée
    const dummyFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'facture.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF-1.4 test pdf content'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    const expAvecFacture = await depensesService.create(
      company1.id,
      {
        immatriculation: immat1,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: 'FAC-TEST-001',
        montant: 3000,
        idFournisseur: fournisseur1.id,
        isMaintenanceIntervention: true,
        libelleIntervention: 'Remplacement embrayage',
        kilometrageRealise: 2000,
        intervalleKm: 1000,
      },
      dummyFile,
    );
    const checkDette = await prisma.detteFournisseur.findUnique({
      where: { id: expAvecFacture.idDetteFournisseur! },
    });
    assert(
      expAvecFacture.idDetteFournisseur !== null && checkDette !== null,
      'TEST 11: Avec facture -> DetteFournisseur créée',
    );

    // TEST 12: Sans facture -> Aucune DetteFournisseur
    const expSansFacture = await depensesService.create(company1.id, {
      immatriculation: immat1,
      categorieDepense: 'LAVAGE',
      justificatifType: 'SANS_FACTURE',
      montant: 150,
      isMaintenanceIntervention: false,
    });
    assert(expSansFacture.idDetteFournisseur === null, 'TEST 12: Sans facture -> pas de DetteFournisseur');

    // TEST 13: Avec facture -> Aucun PaiementFournisseur automatique
    const checkPaiementsDette = await prisma.paiementFournisseur.findMany({
      where: { idDetteFournisseur: expAvecFacture.idDetteFournisseur! },
    });
    assert(
      checkPaiementsDette.length === 0,
      'TEST 13: Avec facture -> aucun PaiementFournisseur automatique',
    );

    // TEST 14: Aucun doublon financier (Une dépense, une intervention)
    const countExpenses = await prisma.depenseVehicule.count({
      where: { idDepense: expAvecFacture.idDepense },
    });
    const countInterventions = await prisma.maintenanceIntervention.count({
      where: { idDepenseVehicule: expAvecFacture.idDepense },
    });
    assert(
      countExpenses === 1 && countInterventions === 1,
      'TEST 14: Aucun doublon financier (1 Depense, 1 Intervention)',
    );

    // TEST 15: Tenant isolation (Consultation isolée)
    const listCompany1 = await depensesService.findAll(company1.id, {});
    const hasCompany2Immat = listCompany1.data.some((d) => d.immatriculation === immat2);
    assert(!hasCompany2Immat, 'TEST 15: Tenant isolation des dépenses véhicules');

    // TEST 16: Cross-tenant vehicle rejection
    let test16Passed = false;
    try {
      await depensesService.create(company1.id, {
        immatriculation: immat2, // Vehicle from company 2
        categorieDepense: 'AUTRE',
        justificatifType: 'SANS_FACTURE',
        montant: 100,
      });
    } catch (e: any) {
      if (e instanceof NotFoundException) test16Passed = true;
    }
    assert(test16Passed, 'TEST 16: Cross-tenant vehicle rejection (NotFoundException)');

    // TEST 17: Cross-tenant supplier rejection
    let test17Passed = false;
    try {
      await depensesService.create(
        company1.id,
        {
          immatriculation: immat1,
          categorieDepense: 'AUTRE',
          justificatifType: 'AVEC_FACTURE',
          typeFacture: 'FAC-ERR',
          montant: 100,
          idFournisseur: fournisseur2.id, // Supplier from company 2
        },
        dummyFile,
      );
    } catch (e: any) {
      if (e instanceof NotFoundException) test17Passed = true;
    }
    assert(test17Passed, 'TEST 17: Cross-tenant supplier rejection (NotFoundException)');

    // TEST 18: Lecture Carnet (Interventions liées retournées)
    const carnetList1 = await carnetService.findAllInterventions(company1.id, {});
    const hasLinkedIntervention = carnetList1.data.some(
      (i) => i.idDepenseVehicule === expAvecFacture.idDepense,
    );
    assert(hasLinkedIntervention, 'TEST 18: Lecture Carnet -> interventions retournées');

    // TEST 19: Intervention historique avec idDepenseVehicule NULL
    const historicalIntervention = await prisma.maintenanceIntervention.create({
      data: {
        companyId: company1.id,
        immatriculation: immat1,
        libelle: 'Intervention Historique',
        dateIntervention: new Date(),
        kilometrageRealise: 5000,
        prochainKmEcheance: 10000,
        statut: 'OK',
        idDepenseVehicule: null,
      },
    });
    const historicalView = await carnetService.findOneIntervention(
      company1.id,
      historicalIntervention.id,
    );
    assert(
      historicalView.id === historicalIntervention.id && historicalView.idDepenseVehicule === null,
      'TEST 19: Intervention historique idDepenseVehicule NULL lue sans erreur',
    );

    // TEST 20: Nouvelle intervention via DepensesVehiculesService toujours liée
    const exp20 = await depensesService.create(company1.id, {
      immatriculation: immat1,
      categorieDepense: 'ENTRETIEN',
      justificatifType: 'SANS_FACTURE',
      montant: 800,
      isMaintenanceIntervention: true,
      libelleIntervention: 'Changement filtres',
      kilometrageRealise: 3000,
      intervalleKm: 500,
    });
    const checkIntervention20 = await prisma.maintenanceIntervention.findUnique({
      where: { idDepenseVehicule: exp20.idDepense },
    });
    assert(
      checkIntervention20 !== null && checkIntervention20.idDepenseVehicule === exp20.idDepense,
      'TEST 20: Nouvelle intervention toujours liée à sa DepenseVehicule',
    );

    // TEST 21: Tentative de modification autonome via PATCH /api/carnet-entretien/:id (rejetée)
    const carnetController = app.get(CarnetEntretienController);
    let test21Passed = false;
    try {
      await carnetController.updateIntervention(company1.id, checkIntervention20!.id, {
        libelle: 'Modification directe interdite',
      });
    } catch (e: any) {
      if (e instanceof BadRequestException) test21Passed = true;
    }
    assert(
      test21Passed,
      'TEST 21: Modification autonome via PATCH /api/carnet-entretien/:id refusée (BadRequestException)',
    );

    // TEST 22: Tentative de suppression autonome via DELETE /api/carnet-entretien/:id (rejetée)
    let test22Passed = false;
    try {
      await carnetController.removeIntervention(company1.id, checkIntervention20!.id);
    } catch (e: any) {
      if (e instanceof BadRequestException) test22Passed = true;
    }
    assert(
      test22Passed,
      'TEST 22: Suppression autonome via DELETE /api/carnet-entretien/:id refusée (BadRequestException)',
    );
  } catch (error) {
    console.error('UNEXPECTED TEST EXCEPTION:', error);
  } finally {
    // Clean up test records
    await prisma.maintenanceIntervention.deleteMany({
      where: { companyId: { in: [company1.id, company2.id] } },
    });
    await prisma.depenseVehicule.deleteMany({
      where: { immatriculation: { in: [immat1, immat2] } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [company1.id, company2.id] } },
    });
    await prisma.bonCarburant.deleteMany({
      where: { immatriculation: { in: [immat1, immat2] } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [company1.id, company2.id] } },
    });
    await prisma.fournisseur.deleteMany({
      where: { companyId: { in: [company1.id, company2.id] } },
    });
    await prisma.detteFournisseurSequence.deleteMany({
      where: { companyId: { in: [company1.id, company2.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [company1.id, company2.id] } },
    });

    await app.close();

    console.log(`\n========================================`);
    console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`========================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
