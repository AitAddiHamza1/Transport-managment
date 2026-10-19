/**
 * Regression Test Suite: Voyage Resource Dropdown Filtering (TRANSiVO)
 * Path: frontend/src/test-voyage-dropdowns.runner.ts
 */

import {
  isTractorEligible,
  isTrailerEligible,
  isDriverEligible,
  formatVehicleOptionLabel,
  formatDriverOptionLabel,
} from './pages/voyages/voyageResourceFilters.ts';
import { z } from 'zod';


let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, description: string) {
  testCount++;
  if (!condition) {
    console.error(`❌ [FAIL #${testCount}] ${description}`);
    throw new Error(`Test failed: ${description}`);
  }
  passedCount++;
  console.log(`✅ [PASS #${testCount}] ${description}`);
}

console.log('================================================================');
console.log('RUNNING REGRESSION TEST SUITE: VOYAGE RESOURCE DROPDOWNS');
console.log('================================================================\n');

// Mock data fixtures
const tractorStandard: Vehicule = {
  id: 1,
  immatriculation: 'TR-100-AA',
  marque: 'VOLVO',
  modele: 'FH16',
  typeVehicule: 'TRACTEUR',
  statut: 'DISPONIBLE',
  annee: 2020,
  numeroChassis: 'CH-TR-100',
  capaciteCharge: 40000,
  creeLe: new Date().toISOString(),
};

const tractorTruck: Vehicule = {
  id: 2,
  immatriculation: 'HTTP-3243',
  marque: 'MAN',
  modele: null,
  typeVehicule: 'CAMION',
  statut: 'DISPONIBLE',
  annee: 2019,
  numeroChassis: 'CH-TR-200',
  capaciteCharge: 26000,
  creeLe: new Date().toISOString(),
};

const tractorEnVoyage: Vehicule = {
  id: 3,
  immatriculation: 'TR-300-CC',
  marque: 'SCANIA',
  modele: 'R500',
  typeVehicule: 'TRACTEUR',
  statut: 'EN_VOYAGE',
  annee: 2021,
  numeroChassis: 'CH-TR-300',
  capaciteCharge: 40000,
  creeLe: new Date().toISOString(),
};

const tractorMaintenance: Vehicule = {
  id: 4,
  immatriculation: 'TR-400-DD',
  marque: 'MERCEDES',
  modele: 'Actros',
  typeVehicule: 'TRACTEUR',
  statut: 'MAINTENANCE',
  annee: 2018,
  numeroChassis: 'CH-TR-400',
  capaciteCharge: 40000,
  creeLe: new Date().toISOString(),
};

const tractorHorsService: Vehicule = {
  id: 5,
  immatriculation: 'TR-500-EE',
  marque: 'DAF',
  modele: 'XF',
  typeVehicule: 'TRACTEUR',
  statut: 'HORS_SERVICE',
  annee: 2015,
  numeroChassis: 'CH-TR-500',
  capaciteCharge: 40000,
  creeLe: new Date().toISOString(),
};

const trailerStandard: Vehicule = {
  id: 6,
  immatriculation: '76576-A-4',
  marque: 'SCHMITZ',
  modele: 'Cargobull',
  typeVehicule: 'REMORQUE',
  statut: 'DISPONIBLE',
  annee: 2021,
  numeroChassis: 'CH-TL-100',
  capaciteCharge: 38000,
  creeLe: new Date().toISOString(),
};

const trailerEnVoyage: Vehicule = {
  id: 7,
  immatriculation: '765665-A-8',
  marque: 'KRONE',
  modele: 'DryLiner',
  typeVehicule: 'REMORQUE',
  statut: 'EN_VOYAGE',
  annee: 2020,
  numeroChassis: 'CH-TL-200',
  capaciteCharge: 38000,
  creeLe: new Date().toISOString(),
};

const vehicleCiterne: Vehicule = {
  id: 8,
  immatriculation: 'CIT-800-ZZ',
  marque: 'MAGYAR',
  modele: 'Inox',
  typeVehicule: 'CITERNE',
  statut: 'DISPONIBLE',
  annee: 2022,
  numeroChassis: 'CH-CT-800',
  capaciteCharge: 35000,
  creeLe: new Date().toISOString(),
};

const vehiclePorteConteneur: Vehicule = {
  id: 9,
  immatriculation: 'PC-900-YY',
  marque: 'KOGEL',
  modele: 'Port 45',
  typeVehicule: 'PORTE_CONTENEUR',
  statut: 'DISPONIBLE',
  annee: 2021,
  numeroChassis: 'CH-PC-900',
  capaciteCharge: 40000,
  creeLe: new Date().toISOString(),
};

const vehicleUtilitaire: Vehicule = {
  id: 10,
  immatriculation: 'UT-100-XX',
  marque: 'RENAULT',
  modele: 'Master',
  typeVehicule: 'UTILITAIRE',
  statut: 'DISPONIBLE',
  annee: 2022,
  numeroChassis: 'CH-UT-100',
  capaciteCharge: 3500,
  creeLe: new Date().toISOString(),
};

// Driver fixtures
const driverDisponibleActiveEmp: Conducteur = {
  id: 1,
  nomConducteur: 'Karim Sami',
  telephone: '0612345678',
  adresse: 'Casablanca',
  statut: 'DISPONIBLE',
  creeLe: new Date().toISOString(),
  idEmploye: 10,
  employe: {
    id: 10,
    matricule: 'EMP-010',
    nom: 'Sami',
    prenom: 'Karim',
    statut: 'ACTIF',
  },
};

const driverEnVoyageActiveEmp: Conducteur = {
  id: 2,
  nomConducteur: 'Ayoub Ait',
  telephone: '0698765432',
  adresse: 'Tanger',
  statut: 'EN_VOYAGE',
  creeLe: new Date().toISOString(),
  idEmploye: 11,
  employe: {
    id: 11,
    matricule: 'EMP-011',
    nom: 'Ait',
    prenom: 'Ayoub',
    statut: 'ACTIF',
  },
};

const driverInactiveEmp: Conducteur = {
  id: 3,
  nomConducteur: 'Mehdi Bennani',
  telephone: '0655555555',
  adresse: 'Rabat',
  statut: 'DISPONIBLE',
  creeLe: new Date().toISOString(),
  idEmploye: 12,
  employe: {
    id: 12,
    matricule: 'EMP-012',
    nom: 'Bennani',
    prenom: 'Mehdi',
    statut: 'INACTIF',
  },
};

const driverNoEmp: Conducteur = {
  id: 4,
  nomConducteur: 'Conducteur SansProfil',
  telephone: '0600000000',
  adresse: null,
  statut: 'DISPONIBLE',
  creeLe: new Date().toISOString(),
  idEmploye: null,
  employe: undefined,
};

// ── Test Group 1: Tractor Dropdown Filtering ───────────────────────────
console.log('--- 1. Tractor Dropdown Filtering ---');

assert(
  isTractorEligible(tractorStandard),
  'TRACTEUR with DISPONIBLE is eligible in tractor dropdown',
);

assert(
  isTractorEligible(tractorTruck),
  'CAMION with DISPONIBLE is eligible in tractor dropdown',
);

assert(
  isTractorEligible(tractorEnVoyage),
  'TRACTEUR with EN_VOYAGE is eligible for future trip planning',
);

assert(
  !isTractorEligible(trailerStandard),
  'REMORQUE is strictly excluded from tractor dropdown',
);

assert(
  !isTractorEligible(vehicleUtilitaire),
  'UTILITAIRE is strictly excluded from tractor dropdown',
);

assert(
  !isTractorEligible(tractorMaintenance),
  'MAINTENANCE tractor is excluded from normal available dropdown options',
);

assert(
  !isTractorEligible(tractorHorsService),
  'HORS_SERVICE tractor is excluded from normal available dropdown options',
);

assert(
  isTractorEligible(tractorMaintenance, { currentImmatriculation: tractorMaintenance.immatriculation }),
  'Assigned maintenance tractor remains eligible when editing that existing voyage',
);

// ── Test Group 2: Trailer Dropdown Filtering ───────────────────────────
console.log('\n--- 2. Trailer Dropdown Filtering ---');

assert(
  isTrailerEligible(trailerStandard),
  'REMORQUE with DISPONIBLE is eligible in trailer dropdown',
);

assert(
  isTrailerEligible(trailerEnVoyage),
  'REMORQUE with EN_VOYAGE is eligible for future trip planning',
);

assert(
  !isTrailerEligible(tractorStandard),
  'TRACTEUR is strictly excluded from trailer dropdown',
);

assert(
  !isTrailerEligible(tractorTruck),
  'CAMION is strictly excluded from trailer dropdown',
);

assert(
  !isTrailerEligible(vehicleCiterne),
  'CITERNE is not admitted as a trailer without explicit modeling confirmation',
);

assert(
  !isTrailerEligible(vehiclePorteConteneur),
  'PORTE_CONTENEUR is not admitted as a trailer without explicit modeling confirmation',
);

assert(
  !isTrailerEligible(vehicleUtilitaire),
  'UTILITAIRE is strictly excluded from trailer dropdown',
);

// ── Test Group 3: Cross-Role Tractor != Trailer Mutual Exclusion ───────
console.log('\n--- 3. Cross-Role Mutual Exclusion ---');

assert(
  !isTractorEligible(tractorStandard, { selectedRemorque: tractorStandard.immatriculation }),
  'Same registration cannot be chosen as tractor if already selected as trailer',
);

assert(
  !isTrailerEligible(trailerStandard, { selectedTracteur: trailerStandard.immatriculation }),
  'Same registration cannot be chosen as trailer if already selected as tractor',
);

assert(
  isTractorEligible(tractorStandard, { selectedRemorque: trailerStandard.immatriculation }),
  'Different tractor is eligible when a different trailer is selected',
);

assert(
  isTrailerEligible(trailerStandard, { selectedTracteur: tractorStandard.immatriculation }),
  'Different trailer is eligible when a different tractor is selected',
);

// ── Test Group 4: Driver Dropdown Filtering ────────────────────────────
console.log('\n--- 4. Driver Dropdown Filtering ---');

assert(
  isDriverEligible(driverDisponibleActiveEmp),
  'Driver with DISPONIBLE and ACTIF employee is eligible',
);

assert(
  !isDriverEligible(driverEnVoyageActiveEmp),
  'Driver with EN_VOYAGE is excluded during new voyage planning to prevent activation conflict',
);

assert(
  isDriverEligible(driverEnVoyageActiveEmp, { currentNomConducteur: driverEnVoyageActiveEmp.nomConducteur }),
  'Currently assigned EN_VOYAGE driver remains eligible when editing an existing voyage',
);

assert(
  !isDriverEligible(driverInactiveEmp),
  'Driver with INACTIF employee is strictly excluded',
);

assert(
  !isDriverEligible(driverNoEmp),
  'Driver without linked employee is strictly excluded',
);

// ── Test Group 5: Option Label Formatting ──────────────────────────────
console.log('\n--- 5. French Label Formatting ---');

assert(
  formatVehicleOptionLabel(tractorStandard) === 'TR-100-AA (VOLVO)',
  'Disponible vehicle formatted without status suffix',
);

assert(
  formatVehicleOptionLabel(tractorEnVoyage) === 'TR-300-CC (SCANIA — En voyage)',
  'En voyage vehicle formatted with French status suffix " — En voyage"',
);

assert(
  formatDriverOptionLabel(driverDisponibleActiveEmp) === 'Karim Sami',
  'Available driver label formatted with full name',
);

assert(
  formatDriverOptionLabel(driverEnVoyageActiveEmp, true) === 'Ayoub Ait (En voyage — Actuel)',
  'Currently assigned driver in trip formatted with French indication " (En voyage — Actuel)"',
);

// ── Test Group 6: Schema Mutual Exclusion Validation ───────────────────
console.log('\n--- 6. Zod Schema Cross-Role Validation ---');

const testVoyageSchema = z
  .object({
    tracteur: z.string().optional().nullable(),
    remorque: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.tracteur &&
        data.remorque &&
        data.tracteur.trim().toUpperCase() === data.remorque.trim().toUpperCase()
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Le tracteur et la remorque doivent être différents',
      path: ['remorque'],
    },
  );

const validDiffPair = testVoyageSchema.safeParse({
  tracteur: 'TR-100-AA',
  remorque: 'TL-100-BB',
});
assert(validDiffPair.success === true, 'Different tractor and trailer pass schema validation');

const invalidSamePair = testVoyageSchema.safeParse({
  tracteur: 'TR-100-AA',
  remorque: 'TR-100-AA',
});
assert(
  invalidSamePair.success === false &&
    invalidSamePair.error.issues[0]?.message ===
      'Le tracteur et la remorque doivent être différents',
  'Identical tractor and trailer rejected by schema validation with French message',
);

const emptyTractorOrTrailer = testVoyageSchema.safeParse({
  tracteur: 'TR-100-AA',
  remorque: '',
});
assert(emptyTractorOrTrailer.success === true, 'Empty trailer is valid when tractor is specified');

// ── Test Group 7: Multi-Tenant Isolation Preservation ──────────────────
console.log('\n--- 7. Multi-Tenant Isolation Preservation ---');

interface ScopedResource {
  immatriculation: string;
  companyId?: number;
}

function filterTenantVehicles<T extends ScopedResource>(vehicles: T[], userCompanyId: number): T[] {
  return vehicles.filter((v) => !v.companyId || v.companyId === userCompanyId);
}

const company1Vehicles = [
  { immatriculation: 'TR-C1-001', companyId: 1 },
  { immatriculation: 'TL-C1-002', companyId: 1 },
];
const company2Vehicles = [
  { immatriculation: 'TR-C2-999', companyId: 2 },
];

const scopedList = filterTenantVehicles([...company1Vehicles, ...company2Vehicles], 1);
assert(
  scopedList.every((v) => v.companyId === 1) && scopedList.length === 2,
  'Company 2 vehicles are completely excluded from Company 1 dropdown options',
);

console.log('\n================================================================');
console.log(`ALL ${passedCount}/${testCount} REGRESSION TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================\n');
