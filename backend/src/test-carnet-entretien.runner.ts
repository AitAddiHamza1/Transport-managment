import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { CarnetEntretienService } from './modules/carnet-entretien/carnet-entretien.service';
import { DepensesVehiculesService } from './modules/depenses-vehicules/depenses-vehicules.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { MaintenanceStatus, MaintenanceTriggerType, SourceCarburant } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 2 — CARNET D’ENTRETIEN BACKEND TEST SUITE');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const carnetService = app.get(CarnetEntretienService);
  const depensesService = app.get(DepensesVehiculesService);
  const dettesService = app.get(DettesFournisseursService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] Test ${passed + failed + 1}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${passed + failed + 1}: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // PRE-TEST CLEANUP
    // -----------------------------------------------------------------
    const existingTestCompanies = await prisma.company.findMany({
      where: { nom: { in: ['Company Carnet Test A', 'Company Carnet Test B'] } },
      select: { id: true },
    });
    if (existingTestCompanies.length > 0) {
      const cIds = existingTestCompanies.map((c) => c.id);
      await prisma.maintenanceIntervention.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.maintenanceRule.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.depenseVehicule.deleteMany({ where: { immatriculation: { in: ['TST-58448', 'TST-99999', 'COMP-B-001'] } } });
      await prisma.bonCarburant.deleteMany({ where: { immatriculation: { in: ['TST-58448', 'TST-99999', 'COMP-B-001'] } } });
      await prisma.detteFournisseur.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.detteFournisseurSequence.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.fournisseur.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.vehicule.deleteMany({ where: { companyId: { in: cIds } } });
      await prisma.company.deleteMany({ where: { id: { in: cIds } } });
    }

    // -----------------------------------------------------------------
    // SETUP TEST ENVIRONMENT (Two Tenant Companies)
    // -----------------------------------------------------------------
    const companyA = await prisma.company.create({
      data: { nom: 'Company Carnet Test A' },
    });
    const companyB = await prisma.company.create({
      data: { nom: 'Company Carnet Test B' },
    });

    const vehiculeA1 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: 'TST-58448',
        marque: 'Volvo',
        modele: 'FH16',
      },
    });

    const vehiculeA2 = await prisma.vehicule.create({
      data: {
        companyId: companyA.id,
        immatriculation: 'TST-99999',
        marque: 'Scania',
        modele: 'R500',
      },
    });

    const vehiculeB = await prisma.vehicule.create({
      data: {
        companyId: companyB.id,
        immatriculation: 'COMP-B-001',
        marque: 'Renault',
        modele: 'T480',
      },
    });

    const fournisseurA = await prisma.fournisseur.create({
      data: {
        companyId: companyA.id,
        nomFournisseur: 'Garage Auto Express A',
        ice: '123456789000011',
      },
    });

    const fournisseurB = await prisma.fournisseur.create({
      data: {
        companyId: companyB.id,
        nomFournisseur: 'Garage Auto Express B',
        ice: '123456789000022',
      },
    });

    // -----------------------------------------------------------------
    // TEST CASES 1–5: MAINTENANCE RULE & INTERVENTION CRUD & LINKING
    // -----------------------------------------------------------------
    // 1. Création MaintenanceRule
    const ruleVidange = await carnetService.createRule(companyA.id, {
      code: 'VIDANGE_10K',
      nom: 'Vidange Moteur 10 000 KM',
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      intervalleKm: 10000,
      seuilAlerteKm: 1000,
    });
    assert(
      ruleVidange.code === 'VIDANGE_10K' && ruleVidange.intervalleKm === 10000,
      '1. Création MaintenanceRule',
    );

    // 2. Création intervention
    const intervention1 = await carnetService.createIntervention(companyA.id, {
      immatriculation: vehiculeA1.immatriculation,
      idRule: ruleVidange.id,
      libelle: 'Vidange 50 000 km',
      dateIntervention: '2026-09-15',
      kilometrageRealise: 50000,
      prochainKmEcheance: 60000,
    });
    assert(
      intervention1.immatriculation === 'TST-58448' && intervention1.prochainKmEcheance === 60000,
      '2. Création intervention',
    );

    // 3. Modification intervention
    const updatedIntervention1 = await carnetService.updateIntervention(companyA.id, intervention1.id, {
      libelle: 'Vidange 50 000 km avec filtre à huile',
      notes: 'Huile Synthétique 5W30',
    });
    assert(
      updatedIntervention1.libelle === 'Vidange 50 000 km avec filtre à huile' &&
        updatedIntervention1.notes === 'Huile Synthétique 5W30',
      '3. Modification intervention',
    );

    // 4. Suppression intervention
    const tempIntervention = await carnetService.createIntervention(companyA.id, {
      immatriculation: vehiculeA1.immatriculation,
      libelle: 'Changement essuie-glace temporaire',
      dateIntervention: '2026-09-16',
      kilometrageRealise: 50100,
    });
    const deleteRes = await carnetService.removeIntervention(companyA.id, tempIntervention.id);
    let tempNotFound = false;
    try {
      await carnetService.findOneIntervention(companyA.id, tempIntervention.id);
    } catch (e) {
      if (e instanceof NotFoundException) tempNotFound = true;
    }
    assert(deleteRes.id === tempIntervention.id && tempNotFound, '4. Suppression intervention');

    // 5. Liaison intervention <-> DepenseVehicule
    const expenseSansIntervention = await prisma.depenseVehicule.create({
      data: {
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'SANS_FACTURE',
        immatriculation: vehiculeA1.immatriculation,
        description: 'Dépense vidange garage',
        montant: 1200,
        dateDepense: new Date('2026-09-15'),
      },
    });
    const interventionLinked = await carnetService.createIntervention(companyA.id, {
      immatriculation: vehiculeA1.immatriculation,
      idRule: ruleVidange.id,
      libelle: 'Vidange liée à dépense',
      dateIntervention: '2026-09-15',
      kilometrageRealise: 50000,
      idDepenseVehicule: expenseSansIntervention.idDepense,
    });
    assert(
      interventionLinked.idDepenseVehicule === expenseSansIntervention.idDepense,
      '5. Liaison intervention <-> DepenseVehicule',
    );

    // -----------------------------------------------------------------
    // TEST CASES 6–9: MILEAGE ENGINE (MAX FROM BONCARBURANT)
    // -----------------------------------------------------------------
    const timestamp = Date.now();
    // 6. currentMileage depuis BonCarburant
    const bon1 = await prisma.bonCarburant.create({
      data: {
        numeroBon: `BC-${timestamp}-001`,
        immatriculation: vehiculeA1.immatriculation,
        sourceCarburant: SourceCarburant.EXTERNE,
        kilometrage: BigInt(55000),
        litres: 200,
        prixParLitre: 12,
        dateCarburant: new Date('2026-09-10'),
      },
    });
    const mileage6 = await carnetService.getCurrentMileage(companyA.id, vehiculeA1.immatriculation);
    assert(mileage6 === 55000, '6. currentMileage depuis BonCarburant');

    // 7. Changement du dernier kilométrage
    const bon2 = await prisma.bonCarburant.create({
      data: {
        numeroBon: `BC-${timestamp}-002`,
        immatriculation: vehiculeA1.immatriculation,
        sourceCarburant: SourceCarburant.EXTERNE,
        kilometrage: BigInt(62000),
        litres: 210,
        prixParLitre: 12,
        dateCarburant: new Date('2026-09-18'),
      },
    });
    const mileage7 = await carnetService.getCurrentMileage(companyA.id, vehiculeA1.immatriculation);
    assert(mileage7 === 62000, '7. Changement du dernier kilométrage');

    // 8. Suppression du dernier Bon
    await prisma.bonCarburant.delete({ where: { idBon: bon2.idBon } });
    const mileage8 = await carnetService.getCurrentMileage(companyA.id, vehiculeA1.immatriculation);
    assert(mileage8 === 55000, '8. Suppression du dernier Bon');

    // 9. Véhicule sans BonCarburant
    const mileage9 = await carnetService.getCurrentMileage(companyA.id, vehiculeA2.immatriculation);
    assert(mileage9 === null, '9. Véhicule sans BonCarburant');

    // -----------------------------------------------------------------
    // TEST CASES 10–13: STATUS ENGINE
    // -----------------------------------------------------------------
    // 10. Statut OK
    const status10 = carnetService.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 55000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 1000,
      seuilAlerteJours: null,
    });
    assert(status10 === MaintenanceStatus.OK, '10. Statut OK');

    // 11. Statut UPCOMING
    const status11 = carnetService.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 59200,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 1000,
      seuilAlerteJours: null,
    });
    assert(status11 === MaintenanceStatus.UPCOMING, '11. Statut UPCOMING');

    // 12. Statut OVERDUE
    const status12 = carnetService.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 60500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 1000,
      seuilAlerteJours: null,
    });
    assert(status12 === MaintenanceStatus.OVERDUE, '12. Statut OVERDUE');

    // 13. KILOMETRAGE_OU_DATE
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const status13 = carnetService.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE_OU_DATE,
      currentMileage: 59500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: futureDate,
      seuilAlerteKm: 1000,
      seuilAlerteJours: 10,
    });
    assert(status13 === MaintenanceStatus.UPCOMING, '13. KILOMETRAGE_OU_DATE');

    // -----------------------------------------------------------------
    // TEST CASES 14–18: CHARGES & SUPPLIER DEBT INTEGRATION
    // -----------------------------------------------------------------
    // 14. Charge sans facture -> aucune dette
    const chargeSansFacture = await depensesService.create(companyA.id, {
      immatriculation: vehiculeA1.immatriculation,
      categorieDepense: 'PIECES',
      justificatifType: 'SANS_FACTURE',
      description: 'Achat ampoule phare cash',
      montant: 150,
      dateDepense: '2026-09-18',
      idFournisseur: fournisseurA.id,
    });
    assert(
      chargeSansFacture.idFournisseur === null && chargeSansFacture.idDetteFournisseur === null,
      '14. Charge sans facture -> aucune dette',
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'facture_test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 500,
      buffer: Buffer.from('%PDF-1.4 test content'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    // 15. Charge avec facture -> dette créée
    const chargeAvecFacture = await depensesService.create(
      companyA.id,
      {
        immatriculation: vehiculeA1.immatriculation,
        categorieDepense: 'REPARATION',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: `FAC-GARAGE-${timestamp}-001`,
        description: 'Réparation freinage',
        montant: 3500,
        dateDepense: '2026-09-18',
        idFournisseur: fournisseurA.id,
      },
      mockFile,
    );
    assert(
      chargeAvecFacture.idFournisseur === fournisseurA.id &&
        chargeAvecFacture.idDetteFournisseur !== null &&
        chargeAvecFacture.idDetteFournisseur !== undefined,
      '15. Charge avec facture -> dette créée',
    );

    // 16. Charge avec facture -> aucun paiement créé
    const generatedDette = await dettesService.findOne(chargeAvecFacture.idDetteFournisseur!, companyA.id);
    assert(
      generatedDette.paiementsCount === 0 && generatedDette.montantPaye === 0,
      '16. Charge avec facture -> aucun paiement créé',
    );

    // 17. Modification charge
    const updatedCharge = await depensesService.update(companyA.id, chargeAvecFacture.idDepense, {
      description: 'Réparation freinage et purge liquide',
    });
    assert(
      updatedCharge.description === 'Réparation freinage et purge liquide',
      '17. Modification charge',
    );

    // 18. Suppression charge
    const chargeToDelete = await depensesService.create(
      companyA.id,
      {
        immatriculation: vehiculeA1.immatriculation,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: `FAC-DEL-${timestamp}-001`,
        montant: 500,
        idFournisseur: fournisseurA.id,
      },
      mockFile,
    );
    const deleteChargeId = chargeToDelete.idDepense;
    const linkedDetteId = chargeToDelete.idDetteFournisseur!;
    await depensesService.remove(companyA.id, deleteChargeId);

    let detteSoftDeleted = false;
    try {
      await dettesService.findOne(linkedDetteId, companyA.id);
    } catch (e) {
      if (e instanceof NotFoundException) detteSoftDeleted = true;
    }
    assert(detteSoftDeleted, '18. Suppression charge');

    // -----------------------------------------------------------------
    // TEST CASES 19–23: MULTI-TENANCY ISOLATION
    // -----------------------------------------------------------------
    // 19. Company A ne peut pas lire Company B
    let readCrossTenantBlocked = false;
    try {
      await carnetService.findOneRule(companyA.id, 999999);
    } catch (e) {
      if (e instanceof NotFoundException) readCrossTenantBlocked = true;
    }
    assert(readCrossTenantBlocked, '19. Company A ne peut pas lire Company B');

    // 20. Company A ne peut pas modifier Company B
    const ruleB = await carnetService.createRule(companyB.id, {
      code: `REVISION_B_${timestamp}`,
      nom: 'Révision Company B',
    });
    let updateCrossTenantBlocked = false;
    try {
      await carnetService.updateRule(companyA.id, ruleB.id, { nom: 'Pirate' });
    } catch (e) {
      if (e instanceof NotFoundException) updateCrossTenantBlocked = true;
    }
    assert(updateCrossTenantBlocked, '20. Company A ne peut pas modifier Company B');

    // 21. Company A ne peut pas supprimer Company B
    let deleteCrossTenantBlocked = false;
    try {
      await carnetService.removeRule(companyA.id, ruleB.id);
    } catch (e) {
      if (e instanceof NotFoundException) deleteCrossTenantBlocked = true;
    }
    assert(deleteCrossTenantBlocked, '21. Company A ne peut pas supprimer Company B');

    // 22. Fournisseur d'une autre company rejeté
    let supplierCrossTenantBlocked = false;
    try {
      await depensesService.create(
        companyA.id,
        {
          immatriculation: vehiculeA1.immatriculation,
          categorieDepense: 'PNEUS',
          justificatifType: 'AVEC_FACTURE',
          typeFacture: `FAC-CROSS-${timestamp}`,
          montant: 1000,
          idFournisseur: fournisseurB.id,
        },
        mockFile,
      );
    } catch (e) {
      if (e instanceof NotFoundException) supplierCrossTenantBlocked = true;
    }
    assert(supplierCrossTenantBlocked, '22. Fournisseur d’une autre company rejeté');

    // 23. Véhicule d'une autre company rejeté
    let vehicleCrossTenantBlocked = false;
    try {
      await carnetService.createIntervention(companyA.id, {
        immatriculation: vehiculeB.immatriculation,
        libelle: 'Pirate intervention',
        dateIntervention: '2026-09-18',
        kilometrageRealise: 10000,
      });
    } catch (e) {
      if (e instanceof NotFoundException) vehicleCrossTenantBlocked = true;
    }
    assert(vehicleCrossTenantBlocked, '23. Véhicule d’une autre company rejeté');

    // -----------------------------------------------------------------
    // TEST CASES 24–25: DUPLICATION & INTEGRITY RULES
    // -----------------------------------------------------------------
    // 24. Une charge ne peut avoir qu'une intervention
    const expenseForSingleIntervention = await prisma.depenseVehicule.create({
      data: {
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'SANS_FACTURE',
        immatriculation: vehiculeA1.immatriculation,
        montant: 800,
      },
    });

    await carnetService.createIntervention(companyA.id, {
      immatriculation: vehiculeA1.immatriculation,
      libelle: 'Première intervention liée',
      dateIntervention: '2026-09-18',
      kilometrageRealise: 50000,
      idDepenseVehicule: expenseForSingleIntervention.idDepense,
    });

    let duplicateInterventionBlocked = false;
    try {
      await carnetService.createIntervention(companyA.id, {
        immatriculation: vehiculeA1.immatriculation,
        libelle: 'Deuxième intervention sur même charge',
        dateIntervention: '2026-09-18',
        kilometrageRealise: 50000,
        idDepenseVehicule: expenseForSingleIntervention.idDepense,
      });
    } catch (e) {
      if (e instanceof ConflictException) duplicateInterventionBlocked = true;
    }
    assert(duplicateInterventionBlocked, '24. Une charge ne peut avoir qu’une intervention');

    // 25. Aucune double dette pour la même charge
    const refFactureSingle = `FAC-SINGLE-${timestamp}`;
    const chargeSingleDebt = await depensesService.create(
      companyA.id,
      {
        immatriculation: vehiculeA1.immatriculation,
        categorieDepense: 'ENTRETIEN',
        justificatifType: 'AVEC_FACTURE',
        typeFacture: refFactureSingle,
        montant: 2500,
        idFournisseur: fournisseurA.id,
      },
      mockFile,
    );

    const countDebts = await prisma.detteFournisseur.count({
      where: {
        companyId: companyA.id,
        referenceFactureFournisseur: refFactureSingle,
        supprimeLe: null,
      },
    });
    assert(
      countDebts === 1 && chargeSingleDebt.idDetteFournisseur !== null,
      '25. Aucune double dette pour la même charge',
    );

    // -----------------------------------------------------------------
    // CLEANUP TEST DATA
    // -----------------------------------------------------------------
    await prisma.maintenanceIntervention.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.maintenanceRule.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.depenseVehicule.deleteMany({
      where: { immatriculation: { in: [vehiculeA1.immatriculation, vehiculeA2.immatriculation, vehiculeB.immatriculation] } },
    });
    await prisma.bonCarburant.deleteMany({
      where: { immatriculation: { in: [vehiculeA1.immatriculation, vehiculeA2.immatriculation, vehiculeB.immatriculation] } },
    });
    await prisma.detteFournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.detteFournisseurSequence.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.fournisseur.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.vehicule.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await app.close();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: TOTAL = 25 | PASSED = ${passed} | FAILED = ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
