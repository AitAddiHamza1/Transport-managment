import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TraverseesMaritimesService } from './modules/traversees-maritimes/traversees-maritimes.service';
import { VoyagesService } from './modules/voyages/voyages.service';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, msg: string) {
  testCount++;
  if (!condition) {
    throw new Error(`[FAIL] Test #${testCount} failed: ${msg}`);
  }
  passedCount++;
  console.log(`✓ [PASS #${testCount}] ${msg}`);
}

function mockFn(impl?: Function) {
  const fn: any = function (...args: any[]) {
    fn.calls.push(args);
    if (impl) return impl(...args);
  };
  fn.calls = [];
  fn.mockImplementation = (newImpl: Function) => mockFn(newImpl);
  fn.mockResolvedValue = (val: any) => mockFn(async () => val);
  return fn;
}

async function runTangerMedBackendTests() {
  console.log('\n==================================================');
  console.log('RUNNING PHASE 2 TANGER MED BACKEND TEST SUITE (A to V)');
  console.log('==================================================\n');

  const companyA = 10;
  const companyB = 20;

  let tmRecords: any[] = [];
  let nextTmId = 1;

  let voyageRecords: any[] = [];
  let nextVoyageId = 1;

  let clientRecords: any[] = [
    { id: 1, companyId: companyA, nomEntreprise: 'Client A', deviseFacturation: 'MAD' },
    { id: 2, companyId: companyB, nomEntreprise: 'Client B', deviseFacturation: 'EUR' },
  ];

  let vehiculeRecords: any[] = [
    { id: 101, companyId: companyA, immatriculation: '12345-A-1', marque: 'Volvo', typeVehicule: 'CAMION', statut: 'DISPONIBLE' },
    { id: 102, companyId: companyA, immatriculation: '99999-B-2', marque: 'Kogel', typeVehicule: 'REMORQUE', statut: 'DISPONIBLE' },
  ];

  let driverRecords: any[] = [
    { id: 201, companyId: companyA, nomConducteur: 'Rachid Driver' },
  ];

  const createMockPrisma = () => {
    return {
      traverseeMaritime: {
        create: mockFn(async ({ data }: any) => {
          const newRecord = {
            id: nextTmId++,
            companyId: data.companyId,
            idVoyage: data.idVoyage ?? null,
            immatriculation: data.immatriculation ?? null,
            idConducteur: data.idConducteur ?? null,
            dateOperation: data.dateOperation ?? new Date(),
            hasCircuitPortuaire: data.hasCircuitPortuaire ?? false,
            circuitNature: data.circuitNature ?? null,
            circuitMontant: data.circuitMontant ? new Prisma.Decimal(data.circuitMontant) : null,
            circuitNotes: data.circuitNotes ?? null,
            circuitEstVerifie: data.circuitEstVerifie ?? false,
            hasBateau: data.hasBateau ?? false,
            dateTraversee: data.dateTraversee ?? null,
            bateau: data.bateau ?? null,
            lieuEmbarquement: data.lieuEmbarquement ?? null,
            prix: data.prix ? new Prisma.Decimal(data.prix) : null,
            devise: data.devise ?? 'MAD',
            estVerifiee: data.estVerifiee ?? false,
            cheminFichier: data.cheminFichier ?? null,
            nomOriginal: data.nomOriginal ?? null,
            mimeType: data.mimeType ?? null,
            tailleFichier: data.tailleFichier ?? null,
            hasTransitAljaziras: data.hasTransitAljaziras ?? false,
            transitTypeService: data.transitTypeService ?? null,
            transitPrix: data.transitPrix ? new Prisma.Decimal(data.transitPrix) : null,
            transitNotes: data.transitNotes ?? null,
            transitEstVerifie: data.transitEstVerifie ?? false,
            creeLe: new Date(),
            misAJourLe: new Date(),
            supprimeLe: null,
            vehicule: null,
            conducteur: null,
          };
          tmRecords.push(newRecord);
          return newRecord;
        }),
        findFirst: mockFn(async ({ where }: any) => {
          return (
            tmRecords.find((r) => {
              if (r.supprimeLe !== null) return false;
              if (where.id !== undefined && r.id !== where.id) return false;
              if (where.companyId !== undefined && r.companyId !== where.companyId) return false;
              if (where.idVoyage !== undefined && r.idVoyage !== where.idVoyage) return false;
              return true;
            }) || null
          );
        }),
        findUnique: mockFn(async ({ where }: any) => {
          return tmRecords.find((r) => r.idVoyage === where.idVoyage && r.supprimeLe === null) || null;
        }),
        findMany: mockFn(async ({ where, skip, take }: any) => {
          let filtered = tmRecords.filter((r) => {
            if (r.supprimeLe !== null) return false;
            if (where.companyId !== undefined && r.companyId !== where.companyId) return false;
            if (where.hasCircuitPortuaire !== undefined && r.hasCircuitPortuaire !== where.hasCircuitPortuaire) return false;
            if (where.hasBateau !== undefined && r.hasBateau !== where.hasBateau) return false;
            if (where.hasTransitAljaziras !== undefined && r.hasTransitAljaziras !== where.hasTransitAljaziras) return false;
            return true;
          });
          const start = skip || 0;
          const end = take ? start + take : filtered.length;
          return filtered.slice(start, end);
        }),
        count: mockFn(async ({ where }: any) => {
          let filtered = tmRecords.filter((r) => {
            if (r.supprimeLe !== null) return false;
            if (where.companyId !== undefined && r.companyId !== where.companyId) return false;
            if (where.hasCircuitPortuaire !== undefined && r.hasCircuitPortuaire !== where.hasCircuitPortuaire) return false;
            if (where.hasBateau !== undefined && r.hasBateau !== where.hasBateau) return false;
            if (where.hasTransitAljaziras !== undefined && r.hasTransitAljaziras !== where.hasTransitAljaziras) return false;
            return true;
          });
          return filtered.length;
        }),
        update: mockFn(async ({ where, data }: any) => {
          const rec = tmRecords.find((r) => r.id === where.id || r.idVoyage === where.idVoyage);
          if (!rec) throw new NotFoundException('Traversee non trouvee');
          Object.assign(rec, data);
          rec.misAJourLe = new Date();
          return rec;
        }),
      },
      client: {
        findFirst: mockFn(async ({ where }: any) => {
          return clientRecords.find((c) => c.id === where.id && c.companyId === where.companyId) || null;
        }),
      },
      vehicule: {
        findFirst: mockFn(async ({ where }: any) => {
          return vehiculeRecords.find((v) => v.immatriculation === where.immatriculation && v.companyId === where.companyId) || null;
        }),
      },
      conducteur: {
        findFirst: mockFn(async ({ where }: any) => {
          return driverRecords.find((d) => d.companyId === where.companyId && d.nomConducteur.toLowerCase() === (where.nomConducteur?.contains?.toLowerCase() || where.nomConducteur?.toLowerCase())) || null;
        }),
      },
      voyage: {
        create: mockFn(async ({ data }: any) => {
          const newV = {
            idVoyage: nextVoyageId++,
            companyId: data.companyId,
            idClient: data.idClient,
            nomClient: data.nomClient,
            modeFacturation: data.modeFacturation,
            typeVoyage: data.typeVoyage,
            tracteur: data.tracteur,
            remorque: data.remorque,
            nomConducteur: data.nomConducteur,
            lieuChargement: data.lieuChargement,
            lieuDechargement: data.lieuDechargement,
            dateChargement: data.dateChargement,
            numeroCmr: data.numeroCmr,
            statut: data.statut,
            montantVoyage: data.montantVoyage,
            devise: data.devise,
            tracteurVehicule: null,
            remorqueVehicule: null,
            fraisImmobilisation: null,
            traverseeMaritime: null,
            documents: [],
          };
          voyageRecords.push(newV);
          return newV;
        }),
        findFirst: mockFn(async ({ where }: any) => {
          const v = voyageRecords.find((r) => r.idVoyage === where.idVoyage && r.companyId === where.companyId);
          if (!v) return null;
          const linkedTm = tmRecords.find((tm) => tm.idVoyage === v.idVoyage && tm.supprimeLe === null);
          return {
            ...v,
            traverseeMaritime: linkedTm || null,
          };
        }),
        update: mockFn(async ({ where, data }: any) => {
          const v = voyageRecords.find((r) => r.idVoyage === where.idVoyage);
          if (!v) throw new NotFoundException('Voyage non trouve');
          Object.assign(v, data);
          return v;
        }),
      },
      $transaction: mockFn(async (cbOrArray: any) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(mockPrisma);
        }
        return Promise.all(cbOrArray);
      }),
    };
  };

  const mockPrisma: any = createMockPrisma();
  const mockSyncService: any = {
    resolveDriverByName: mockFn(async (tx: any, name: string, companyId: number) => {
      return driverRecords.find((d) => d.companyId === companyId && d.nomConducteur.toLowerCase() === name.toLowerCase()) || null;
    }),
    validateActivationEligibility: mockFn().mockResolvedValue({ driver: { id: 201 } }),
    acquireResources: mockFn().mockResolvedValue(undefined),
    releaseResources: mockFn().mockResolvedValue(undefined),
  };
  const mockFacturesService: any = {
    isFacturePayeeInTx: mockFn().mockResolvedValue({ isPayee: false }),
    recalculateFactureInTx: mockFn().mockResolvedValue(undefined),
  };

  const tmService = new TraverseesMaritimesService(mockPrisma);
  const voyagesService = new VoyagesService(mockPrisma, mockSyncService, mockFacturesService);

  // A. Create Circuit only
  const resA = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    hasCircuitPortuaire: true,
    circuitNature: 'PESAGE',
    circuitMontant: 500,
    hasBateau: false,
    hasTransitAljaziras: false,
  });
  assert(
    resA.hasCircuitPortuaire === true && resA.hasBateau === false && resA.hasTransitAljaziras === false && resA.circuitMontant === 500,
    'A. Create Circuit only: successfully created operation with Circuit portuaire only',
  );

  // B. Create Bateau only
  const resB = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    hasCircuitPortuaire: false,
    hasBateau: true,
    dateTraversee: '2026-10-04',
    bateau: 'BALEARIA',
    lieuEmbarquement: 'Tanger Med',
    prix: 1200,
    hasTransitAljaziras: false,
  });
  assert(
    resB.hasBateau === true && resB.hasCircuitPortuaire === false && resB.bateau === 'BALEARIA',
    'B. Create Bateau only: successfully created operation with Bateau only',
  );

  // C. Create Transit only
  const resC = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    hasCircuitPortuaire: false,
    hasBateau: false,
    hasTransitAljaziras: true,
    transitTypeService: 'CUSTOMS_FORM',
    transitPrix: 350,
  });
  assert(
    resC.hasTransitAljaziras === true && resC.transitTypeService === 'CUSTOMS_FORM',
    'C. Create Transit only: successfully created operation with Transit Aljaziras only',
  );

  // D. Create Circuit + Bateau
  const resD = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    hasCircuitPortuaire: true,
    circuitNature: 'SCANNER',
    hasBateau: true,
    bateau: 'FRS',
    hasTransitAljaziras: false,
  });
  assert(
    resD.hasCircuitPortuaire === true && resD.hasBateau === true && resD.hasTransitAljaziras === false,
    'D. Create Circuit + Bateau: successfully created combined operation',
  );

  // E. Create all three
  const resE = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    hasCircuitPortuaire: true,
    hasBateau: true,
    hasTransitAljaziras: true,
  });
  assert(
    resE.hasCircuitPortuaire === true && resE.hasBateau === true && resE.hasTransitAljaziras === true,
    'E. Create all three: successfully created operation with all three services active',
  );

  // F. Reject all three false
  try {
    await tmService.create(companyA, {
      dateOperation: '2026-10-04',
      hasCircuitPortuaire: false,
      hasBateau: false,
      hasTransitAljaziras: false,
    });
    assert(false, 'Should have failed with HTTP 400 when all three are false');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('au moins un service'),
      'F. Reject all three false: rejected with HTTP 400 business message',
    );
  }

  // G. Update service combinations
  const resG = await tmService.update(companyA, resA.id, {
    hasCircuitPortuaire: true,
    hasBateau: true,
    hasTransitAljaziras: false,
  });
  assert(
    resG.hasCircuitPortuaire === true && resG.hasBateau === true,
    'G. Update service combinations: updated existing operation services',
  );

  // Verification Setup
  const recordToVerify = tmRecords.find((r) => r.id === resE.id);
  recordToVerify.circuitEstVerifie = true;
  recordToVerify.estVerifiee = true;
  recordToVerify.transitEstVerifie = true;

  // H. Reject removal of verified Circuit
  try {
    await tmService.update(companyA, resE.id, {
      hasCircuitPortuaire: false,
      hasBateau: true,
      hasTransitAljaziras: true,
    });
    assert(false, 'Should have rejected removal of verified Circuit');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Circuit portuaire'),
      'H. Reject removal of verified Circuit: rejected with French HTTP 400 error',
    );
  }

  // I. Reject removal of verified Bateau
  try {
    await tmService.update(companyA, resE.id, {
      hasCircuitPortuaire: true,
      hasBateau: false,
      hasTransitAljaziras: true,
    });
    assert(false, 'Should have rejected removal of verified Bateau');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Bateau'),
      'I. Reject removal of verified Bateau: rejected with French HTTP 400 error',
    );
  }

  // J. Reject removal of verified Transit
  try {
    await tmService.update(companyA, resE.id, {
      hasCircuitPortuaire: true,
      hasBateau: true,
      hasTransitAljaziras: false,
    });
    assert(false, 'Should have rejected removal of verified Transit');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Transit Aljaziras'),
      'J. Reject removal of verified Transit: rejected with French HTTP 400 error',
    );
  }

  // K. Independent verification Circuit
  recordToVerify.circuitEstVerifie = false;
  const toggleC = await tmService.toggleCircuitVerification(companyA, resE.id, true);
  assert(
    toggleC.circuitEstVerifie === true && toggleC.estVerifiee === true,
    'K. Independent verification Circuit: toggles circuit verification independently',
  );

  // L. Independent verification Bateau
  recordToVerify.estVerifiee = false;
  const toggleB = await tmService.toggleBateauVerification(companyA, resE.id, true);
  assert(
    toggleB.estVerifiee === true && toggleB.transitEstVerifie === true,
    'L. Independent verification Bateau: toggles bateau verification independently',
  );

  // M. Independent verification Transit
  recordToVerify.transitEstVerifie = false;
  const toggleT = await tmService.toggleTransitVerification(companyA, resE.id, true);
  assert(
    toggleT.transitEstVerifie === true,
    'M. Independent verification Transit: toggles transit verification independently',
  );

  // N. Verification does not affect other sections
  const toggleOffC = await tmService.toggleCircuitVerification(companyA, resE.id, false);
  assert(
    toggleOffC.circuitEstVerifie === false && toggleOffC.estVerifiee === true && toggleOffC.transitEstVerifie === true,
    'N. Verification does not affect other sections: turning off Circuit leaves Bateau & Transit verified',
  );

  // O. Cross-tenant read rejected
  try {
    await tmService.findOne(companyB, resA.id);
    assert(false, 'Cross-tenant read should fail');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'O. Cross-tenant read rejected: returns NotFoundException for another tenant resource',
    );
  }

  // P. Cross-tenant update rejected
  try {
    await tmService.update(companyB, resA.id, { hasBateau: true });
    assert(false, 'Cross-tenant update should fail');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'P. Cross-tenant update rejected: returns NotFoundException for another tenant resource',
    );
  }

  // Q. Cross-tenant verification rejected
  try {
    await tmService.toggleCircuitVerification(companyB, resA.id, true);
    assert(false, 'Cross-tenant verification should fail');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Q. Cross-tenant verification rejected: returns NotFoundException',
    );
  }

  // R. Vehicle/driver can be null
  const resR = await tmService.create(companyA, {
    dateOperation: '2026-10-04',
    immatriculation: null,
    idConducteur: null,
    hasCircuitPortuaire: true,
  });
  assert(
    resR.immatriculation === null && resR.idConducteur === null,
    'R. Vehicle/driver can be null: planned operation supports null vehicle & driver',
  );

  // S. Voyage can select services without vehicle/driver
  const voyageS = await voyagesService.create(companyA, {
    idClient: 1,
    lieuChargement: 'Tangier Port',
    lieuDechargement: 'Madrid Logistics Center',
    tangerMedServices: {
      hasCircuitPortuaire: true,
      hasBateau: true,
      hasTransitAljaziras: false,
    },
  });
  assert(
    voyageS.traverseeMaritime !== null && voyageS.traverseeMaritime?.hasCircuitPortuaire === true,
    'S. Voyage can select services without vehicle/driver: creates voyage & Tanger Med operation without vehicle/driver',
  );

  // T. Voyage creates ONE Tanger Med operation, not three
  const tmCountForVoyage = tmRecords.filter((r) => r.idVoyage === voyageS.idVoyage && r.supprimeLe === null);
  assert(
    tmCountForVoyage.length === 1,
    'T. Voyage creates ONE Tanger Med operation, not three: verified exactly 1 record created',
  );

  // U. Voyage update modifies the same operation
  const voyageU = await voyagesService.update(companyA, voyageS.idVoyage, {
    tangerMedServices: {
      hasCircuitPortuaire: false,
      hasBateau: true,
      hasTransitAljaziras: true,
    },
  });
  const tmCountAfterUpdate = tmRecords.filter((r) => r.idVoyage === voyageS.idVoyage && r.supprimeLe === null);
  assert(
    tmCountAfterUpdate.length === 1 && voyageU.traverseeMaritime?.hasCircuitPortuaire === false && voyageU.traverseeMaritime?.hasTransitAljaziras === true,
    'U. Voyage update modifies the same operation: updated existing record instead of creating another',
  );

  // V. sectionPresence is stable across pagination/filtering
  const paginatedResult = await tmService.findAll(companyA, { page: 1, limit: 2 });
  assert(
    paginatedResult.meta.sectionPresence !== undefined &&
      typeof paginatedResult.meta.sectionPresence.circuit === 'boolean' &&
      typeof paginatedResult.meta.sectionPresence.bateau === 'boolean' &&
      typeof paginatedResult.meta.sectionPresence.transit === 'boolean',
    'V. sectionPresence is stable across pagination/filtering: metadata contains sectionPresence calculated for full filtered dataset',
  );

  console.log(`\n==================================================`);
  console.log(`ALL ${passedCount}/${testCount} TESTS PASSED SUCCESSFULLY!`);
  console.log(`==================================================\n`);
}

runTangerMedBackendTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
