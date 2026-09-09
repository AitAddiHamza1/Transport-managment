import { canCheck } from './common/permissions/evaluator';
import {
  computeEffectivePermissions,
  normalizeMatrix,
  PROFILE_DEFAULTS,
} from './common/permissions/permissions';
import { RESERVED_ROLE_NAMES } from './modules/roles/roles.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== PHASE 6 UNIT & INVARIANT TEST SUITE ===\n');

// ---------------------------------------------------------------------
// 1. CUSTOM ROLE & PROFILE PERMISSION BEHAVIOR
// ---------------------------------------------------------------------
console.log('--- 1. Custom Role & Profile Permission Behavior ---');

const customMatrix = normalizeMatrix({
  voyages: { voir: true, ajouter: true },
});

// ADMIN_GENERAL / ADMIN always gets full matrix
const adminPerms = computeEffectivePermissions('ADMIN_GENERAL', null);
assert(
  canCheck(adminPerms, true, 'utilisateurs', 'voir') === true,
  'ADMIN_GENERAL gets full matrix + bypass',
);

// Predefined system role (EXPLOITANT) ignores custom user permissions
const exploitantPerms = computeEffectivePermissions('EXPLOITANT', customMatrix);
assert(
  exploitantPerms.utilisateurs.voir === PROFILE_DEFAULTS.EXPLOITANT.utilisateurs.voir,
  'Predefined system profile (EXPLOITANT) uses system defaults and ignores stored custom permissions',
);
assert(
  canCheck(exploitantPerms, false, 'voyages', 'voir') === true,
  'Predefined system profile (EXPLOITANT) retains standard operational access',
);

// PERSONNALISE role uses custom stored permissions
const personnalisePerms = computeEffectivePermissions('PERSONNALISE', customMatrix);
assert(
  canCheck(personnalisePerms, false, 'voyages', 'voir') === true &&
    canCheck(personnalisePerms, false, 'voyages', 'ajouter') === true,
  'PERSONNALISE uses custom stored permissions',
);
assert(
  canCheck(personnalisePerms, false, 'utilisateurs', 'voir') === false,
  'PERSONNALISE denies ungranted module access',
);

// Custom DB role (not in PROFILE_DEFAULTS) with custom user permissions
const customRolePerms = computeEffectivePermissions('Exploitant Regional', customMatrix);
assert(
  canCheck(customRolePerms, false, 'voyages', 'voir') === true,
  'Custom DB role uses stored user permissions',
);

// Custom DB role with null permissions defaults to emptyMatrix() (fail-closed)
const customRoleNullPerms = computeEffectivePermissions('Exploitant Regional', null);
assert(
  canCheck(customRoleNullPerms, false, 'voyages', 'voir') === false,
  'Custom DB role with null permissions defaults to emptyMatrix()',
);

// PERSONNALISE with null permissions defaults to emptyMatrix()
const personnaliseNullPerms = computeEffectivePermissions('PERSONNALISE', null);
assert(
  canCheck(personnaliseNullPerms, false, 'voyages', 'voir') === false,
  'PERSONNALISE with null permissions defaults to emptyMatrix()',
);

// ---------------------------------------------------------------------
// 2. BACKEND VOIR = FALSE INVARIANT
// ---------------------------------------------------------------------
console.log('\n--- 2. Backend voir = false Invariant ---');

const malformedVoirFalse = normalizeMatrix({
  voyages: { voir: false, ajouter: true, modifier: true, supprimer: true },
});

assert(malformedVoirFalse.voyages.voir === false, 'normalizeMatrix sets voir to false');
assert(
  malformedVoirFalse.voyages.ajouter === false,
  'normalizeMatrix forces ajouter to false when voir is false',
);
assert(
  malformedVoirFalse.voyages.modifier === false,
  'normalizeMatrix forces modifier to false when voir is false',
);
assert(
  malformedVoirFalse.voyages.supprimer === false,
  'normalizeMatrix forces supprimer to false when voir is false',
);

// ---------------------------------------------------------------------
// 3. RESERVED ROLE NAMES PROTECTION
// ---------------------------------------------------------------------
console.log('\n--- 3. Reserved Role Names Protection ---');

function isReservedRole(nom: string): boolean {
  const normalized = nom.trim().toUpperCase();
  return RESERVED_ROLE_NAMES.includes(normalized);
}

assert(isReservedRole('ADMIN_GENERAL') === true, 'ADMIN_GENERAL is reserved');
assert(
  isReservedRole(' admin_general ') === true,
  'Whitespace & casing variant " admin_general " is reserved',
);
assert(isReservedRole('ADMIN') === true, 'ADMIN is reserved');
assert(isReservedRole('EXPLOITANT') === true, 'EXPLOITANT is reserved');
assert(isReservedRole('COMPTABLE') === true, 'COMPTABLE is reserved');
assert(isReservedRole('CHAUFFEUR') === true, 'CHAUFFEUR is reserved');
assert(
  isReservedRole('Superviseur Regional') === false,
  'Custom role "Superviseur Regional" is NOT reserved',
);

console.log('\n🎉 ALL PHASE 6 UNIT & INVARIANT TESTS PASSED SUCCESSFULLY!');
