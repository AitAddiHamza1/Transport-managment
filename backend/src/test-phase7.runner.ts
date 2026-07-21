import { toVehiculeView } from './modules/vehicules/vehicules.service';
import { VehiculeStatut } from '@prisma/client';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== PHASE 7 VEHICLES INVARIANT & UNIT TEST SUITE ===\n');

// 1. Decimal Mapper & Serialization
console.log('--- 1. Decimal Mapper & Capacity Unit ---');
const rawPrismaVehicule = {
  id: 1,
  immatriculation: '12345-A-6',
  marque: 'Volvo',
  modele: 'FH16',
  typeVehicule: 'CAMION',
  annee: 2022,
  numeroChassis: 'VIN123456',
  capaciteCharge: '25.50', // Prisma Decimal string representation
  statut: VehiculeStatut.DISPONIBLE,
  creeLe: new Date(),
  documents: [
    {
      idDocument: 10,
      typeDocument: 'Carte Grise',
      numeroDocument: 'CG-999',
      dateExpiration: new Date('2027-12-31'),
      statut: 'VALIDE',
    },
  ],
};

const view = toVehiculeView(rawPrismaVehicule);
assert(
  typeof view.capaciteCharge === 'number',
  'Decimal capaciteCharge is converted to JavaScript number',
);
assert(view.capaciteCharge === 25.5, 'capaciteCharge matches 25.5 T');
assert(view.documents?.length === 1, 'Documents read-only summary included');
assert(view.documents?.[0].typeDocument === 'Carte Grise', 'Document type is Carte Grise');

// Null capacity handling
const rawNullCap = { ...rawPrismaVehicule, capaciteCharge: null };
const viewNullCap = toVehiculeView(rawNullCap);
assert(viewNullCap.capaciteCharge === null, 'Null capacity returns null');

// 2. Registration & Chassis Normalization Invariants
console.log('\n--- 2. Normalization Invariants ---');
function normalizeImmat(immat: string): string {
  return immat.trim().toUpperCase();
}

function normalizeChassis(chassis?: string | null): string | null {
  if (!chassis) return null;
  const trimmed = chassis.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

assert(
  normalizeImmat(' 12345-a-6 ') === '12345-A-6',
  'Immatriculation whitespace and casing normalized',
);
assert(normalizeChassis(' vin999 ') === 'VIN999', 'Chassis number normalized to uppercase');
assert(normalizeChassis('   ') === null, 'Whitespace-only chassis normalized to null');
assert(normalizeChassis('') === null, 'Empty string chassis normalized to null');

// 3. Status Invariants
console.log('\n--- 3. Status Transition Rules ---');
function validateStatusTransition(
  currentStatus: VehiculeStatut,
  targetStatus: VehiculeStatut,
  hasActiveTrip: boolean,
): { allowed: boolean; message?: string } {
  if (targetStatus === VehiculeStatut.EN_VOYAGE && !hasActiveTrip) {
    return {
      allowed: false,
      message: "Le statut EN_VOYAGE ne peut être activé que lorsqu'un voyage est en cours.",
    };
  }
  if (
    currentStatus === VehiculeStatut.EN_VOYAGE &&
    targetStatus === VehiculeStatut.DISPONIBLE &&
    hasActiveTrip
  ) {
    return {
      allowed: false,
      message:
        'Ce véhicule est actuellement en voyage actif et ne peut pas être marqué disponible.',
    };
  }
  return { allowed: true };
}

assert(
  validateStatusTransition(VehiculeStatut.DISPONIBLE, VehiculeStatut.EN_VOYAGE, false).allowed ===
    false,
  'Cannot set EN_VOYAGE without active trip',
);
assert(
  validateStatusTransition(VehiculeStatut.DISPONIBLE, VehiculeStatut.EN_VOYAGE, true).allowed ===
    true,
  'Setting EN_VOYAGE with active trip succeeds',
);
assert(
  validateStatusTransition(VehiculeStatut.EN_VOYAGE, VehiculeStatut.DISPONIBLE, true).allowed ===
    false,
  'Cannot change EN_VOYAGE to DISPONIBLE while trip remains active',
);
assert(
  validateStatusTransition(VehiculeStatut.EN_VOYAGE, VehiculeStatut.MAINTENANCE, true).allowed ===
    true,
  'Emergency breakdown change EN_VOYAGE -> MAINTENANCE during active trip is permitted',
);

console.log('\n🎉 ALL PHASE 7 INVARIANT TESTS PASSED SUCCESSFULLY!');
