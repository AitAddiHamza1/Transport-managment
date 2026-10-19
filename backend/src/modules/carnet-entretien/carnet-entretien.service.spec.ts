import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, MaintenanceTriggerType, Prisma } from '@prisma/client';
import { CarnetEntretienService, MaintenanceInterventionView, VehicleSituationView } from './carnet-entretien.service';

// Mock function helper matching Jest conventions
function createMockFn(impl?: Function) {
  const fn: any = function (...args: any[]) {
    fn.mock.calls.push(args);
    if (impl) return impl(...args);
  };
  fn.mock = { calls: [] };
  fn.mockImplementation = (newImpl: Function) => createMockFn(newImpl);
  fn.mockResolvedValue = (val: any) => createMockFn(async () => val);
  return fn;
}

// Support both Jest environment and standalone ts-node execution
let describeBlock = typeof describe === 'function' ? describe : ((name: string, fn: () => void) => {
  console.log(`\n=== ${name} ===`);
  fn();
}) as any;

let itBlock = typeof it === 'function' ? it : ((name: string, fn: () => void | Promise<void>) => {
  return (async () => {
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  })();
}) as any;

function expectVal(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but received ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b} but received ${a}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null but received ${actual}`);
      }
    },
    toBeGreaterThan: (val: number) => {
      if (!(actual > val)) {
        throw new Error(`Expected ${actual} > ${val}`);
      }
    },
  };
}

describeBlock('CarnetEntretienService - Phase 2 Maintenance Alert Thresholds', () => {
  // Setup isolated mock PrismaService with in-memory state
  const mockVehicules: any[] = [
    { id: 1, companyId: 1, immatriculation: '12345-A-1', marque: 'Volvo', modele: 'FH16' },
  ];
  const mockBonsCarburant: any[] = [
    { idBon: 1, companyId: 1, immatriculation: '12345-A-1', kilometrage: BigInt(50000) },
  ];
  const mockRules: any[] = [
    {
      id: 10,
      companyId: 1,
      code: 'VIDANGE_20K',
      nom: 'Vidange 20,000 km',
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      intervalleKm: 20000,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
      intervalleMois: null,
    },
    {
      id: 20,
      companyId: 1,
      code: 'CONTROLE_ANNUEL',
      nom: 'Contrôle Annuel',
      triggerType: MaintenanceTriggerType.DATE,
      intervalleKm: null,
      seuilAlerteKm: null,
      seuilAlerteJours: 15,
      intervalleMois: 12,
    },
    {
      id: 30,
      companyId: 1,
      code: 'REVISION_MIXTE',
      nom: 'Révision Mixte',
      triggerType: MaintenanceTriggerType.KILOMETRAGE_OU_DATE,
      intervalleKm: 20000,
      seuilAlerteKm: 2000,
      seuilAlerteJours: 15,
      intervalleMois: 12,
    },
  ];
  const mockInterventions: any[] = [];

  const mockPrisma: any = {
    bonCarburant: {
      aggregate: createMockFn(async ({ where }: any) => {
        const targetImmat = where?.immatriculation?.equals?.trim().toUpperCase();
        const records = mockBonsCarburant.filter(
          (b) => b.immatriculation.toUpperCase() === targetImmat && b.companyId === where?.vehicule?.companyId,
        );
        if (records.length === 0) return { _max: { kilometrage: null } };
        const maxKm = records.reduce((max, b) => (b.kilometrage > max ? b.kilometrage : max), records[0].kilometrage);
        return { _max: { kilometrage: maxKm } };
      }),
    },
    vehicule: {
      findFirst: createMockFn(async ({ where }: any) => {
        return mockVehicules.find(
          (v) => v.immatriculation === where?.immatriculation && v.companyId === where?.companyId,
        ) ?? null;
      }),
    },
    maintenanceRule: {
      findFirst: createMockFn(async ({ where }: any) => {
        return mockRules.find((r) => r.id === where?.id && r.companyId === where?.companyId) ?? null;
      }),
      findUnique: createMockFn(async ({ where }: any) => {
        if (where?.id) return mockRules.find((r) => r.id === where.id) ?? null;
        if (where?.companyId_code) {
          return mockRules.find(
            (r) => r.companyId === where.companyId_code.companyId && r.code === where.companyId_code.code,
          ) ?? null;
        }
        return null;
      }),
    },
    maintenanceIntervention: {
      findFirst: createMockFn(async ({ where }: any) => {
        return mockInterventions.find((i) => i.id === where?.id && i.companyId === where?.companyId) ?? null;
      }),
      findMany: createMockFn(async ({ where }: any) => {
        return mockInterventions.filter(
          (i) => i.companyId === where?.companyId && (!where?.immatriculation || i.immatriculation === where.immatriculation),
        );
      }),
      create: createMockFn(async ({ data }: any) => {
        const rule = mockRules.find((r) => r.id === data.idRule) ?? null;
        const record = {
          id: mockInterventions.length + 1,
          ...data,
          rule,
          depenseVehicule: null,
          creeLe: new Date(),
          misAJourLe: new Date(),
        };
        mockInterventions.push(record);
        return record;
      }),
    },
  };

  const service = new CarnetEntretienService(mockPrisma as any);

  // -------------------------------------------------------------------------
  // 1. Required Regression Tests: Kilometer-based maintenance status
  // -------------------------------------------------------------------------
  itBlock('1. Remaining 10,000 km with an alert threshold of 2,000 km => OK', () => {
    // Current: 50,000 km, Due: 60,000 km => Remaining = 10,000 km > 2,000 km threshold
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 50000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(status).toBe(MaintenanceStatus.OK);
  });

  itBlock('2. Remaining 1,500 km with an alert threshold of 2,000 km => UPCOMING', () => {
    // Current: 58,500 km, Due: 60,000 km => Remaining = 1,500 km <= 2,000 km threshold
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 58500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(status).toBe(MaintenanceStatus.UPCOMING);
  });

  itBlock('3. Remaining exactly 2,000 km => UPCOMING', () => {
    // Current: 58,000 km, Due: 60,000 km => Remaining = 2,000 km === threshold
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 58000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(status).toBe(MaintenanceStatus.UPCOMING);
  });

  itBlock('4. Remaining exactly 0 km => DUE', () => {
    // Current: 60,000 km, Due: 60,000 km => Remaining = 0 km
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 60000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(status).toBe(MaintenanceStatus.DUE);
  });

  itBlock('5. Remaining negative => OVERDUE', () => {
    // Current: 60,500 km, Due: 60,000 km => Remaining = -500 km (< 0)
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 60500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(status).toBe(MaintenanceStatus.OVERDUE);
  });

  itBlock('5b. Additional edge cases: null threshold, 0 threshold, null mileage', () => {
    // Remaining positive with null seuilAlerteKm => OK
    const statusNullThreshold = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 50000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: null,
      seuilAlerteJours: null,
    });
    expectVal(statusNullThreshold).toBe(MaintenanceStatus.OK);

    // Remaining positive with seuilAlerteKm === 0 => OK (remaining 500 > 0)
    const statusZeroThreshold = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: 59500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 0,
      seuilAlerteJours: null,
    });
    expectVal(statusZeroThreshold).toBe(MaintenanceStatus.OK);

    // Null currentMileage => OK (no evaluation possible)
    const statusNullMileage = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE,
      currentMileage: null,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: null,
      seuilAlerteKm: 2000,
      seuilAlerteJours: null,
    });
    expectVal(statusNullMileage).toBe(MaintenanceStatus.OK);
  });

  // -------------------------------------------------------------------------
  // 6. Verify that date-based maintenance behavior remains unchanged
  // -------------------------------------------------------------------------
  itBlock('6a. Date-based: remaining negative days => OVERDUE', () => {
    const refDate = new Date('2026-10-18T12:00:00Z');
    const pastDate = new Date('2026-10-13T12:00:00Z'); // -5 days
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.DATE,
      currentMileage: null,
      prochainKmEcheance: null,
      prochaineDateEcheance: pastDate,
      seuilAlerteKm: null,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status).toBe(MaintenanceStatus.OVERDUE);
  });

  itBlock('6b. Date-based: remaining 0 days (due today) => DUE', () => {
    const refDate = new Date('2026-10-18T08:00:00Z');
    const todayDate = new Date('2026-10-18T18:00:00Z'); // same calendar day
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.DATE,
      currentMileage: null,
      prochainKmEcheance: null,
      prochaineDateEcheance: todayDate,
      seuilAlerteKm: null,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status).toBe(MaintenanceStatus.DUE);
  });

  itBlock('6c. Date-based: remaining days within threshold => UPCOMING', () => {
    const refDate = new Date('2026-10-18T12:00:00Z');
    const futureDate = new Date('2026-10-25T12:00:00Z'); // +7 days <= 15 threshold
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.DATE,
      currentMileage: null,
      prochainKmEcheance: null,
      prochaineDateEcheance: futureDate,
      seuilAlerteKm: null,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status).toBe(MaintenanceStatus.UPCOMING);
  });

  itBlock('6d. Date-based: remaining days beyond threshold => OK', () => {
    const refDate = new Date('2026-10-18T12:00:00Z');
    const distantDate = new Date('2026-11-20T12:00:00Z'); // +33 days > 15 threshold
    const status = service.calculateStatus({
      triggerType: MaintenanceTriggerType.DATE,
      currentMileage: null,
      prochainKmEcheance: null,
      prochaineDateEcheance: distantDate,
      seuilAlerteKm: null,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status).toBe(MaintenanceStatus.OK);
  });

  itBlock('6e. Combined KILOMETRAGE_OU_DATE: worst status wins', () => {
    const refDate = new Date('2026-10-18T12:00:00Z');
    const upcomingDate = new Date('2026-10-25T12:00:00Z'); // UPCOMING (+7 days <= 15)

    // KM is OK (10,000 km remaining) + Date is UPCOMING => UPCOMING
    const status1 = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE_OU_DATE,
      currentMileage: 50000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: upcomingDate,
      seuilAlerteKm: 2000,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status1).toBe(MaintenanceStatus.UPCOMING);

    // KM is OVERDUE (-500 km) + Date is OK => OVERDUE
    const distantDate = new Date('2026-11-20T12:00:00Z');
    const status2 = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE_OU_DATE,
      currentMileage: 60500,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: distantDate,
      seuilAlerteKm: 2000,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status2).toBe(MaintenanceStatus.OVERDUE);

    // Both KM and Date are OK => OK
    const status3 = service.calculateStatus({
      triggerType: MaintenanceTriggerType.KILOMETRAGE_OU_DATE,
      currentMileage: 50000,
      prochainKmEcheance: 60000,
      prochaineDateEcheance: distantDate,
      seuilAlerteKm: 2000,
      seuilAlerteJours: 15,
      referenceDate: refDate,
    });
    expectVal(status3).toBe(MaintenanceStatus.OK);
  });

  // -------------------------------------------------------------------------
  // 6f. Verify API response shapes remain strictly unchanged
  // -------------------------------------------------------------------------
  itBlock('6f. Verify API response shape: MaintenanceInterventionView and VehicleSituationView', async () => {
    // Create an intervention through the service using mock Prisma
    const createdIntervention = await service.createIntervention(1, {
      immatriculation: '12345-A-1',
      idRule: 10,
      libelle: 'Vidange réglementaire',
      dateIntervention: '2026-09-01',
      kilometrageRealise: 40000,
      prochainKmEcheance: 60000, // 60,000 - 50,000 = 10,000 km remaining > 2,000 threshold => OK!
    });

    // Validate all fields of MaintenanceInterventionView
    expectVal(typeof createdIntervention.id).toBe('number');
    expectVal(createdIntervention.companyId).toBe(1);
    expectVal(createdIntervention.immatriculation).toBe('12345-A-1');
    expectVal(createdIntervention.idRule).toBe(10);
    expectVal(createdIntervention.ruleCode).toBe('VIDANGE_20K');
    expectVal(createdIntervention.ruleNom).toBe('Vidange 20,000 km');
    expectVal(createdIntervention.libelle).toBe('Vidange réglementaire');
    expectVal(createdIntervention.dateIntervention).toBe('2026-09-01');
    expectVal(createdIntervention.kilometrageRealise).toBe(40000);
    expectVal(createdIntervention.prochainKmEcheance).toBe(60000);
    expectVal(createdIntervention.currentVehicleMileage).toBe(50000);
    expectVal(createdIntervention.remainingKm).toBe(10000);
    // Crucial: With remaining 10,000 km and threshold 2,000 km, status MUST be OK in the response!
    expectVal(createdIntervention.statut).toBe(MaintenanceStatus.OK);
    expectVal(createdIntervention.idDepenseVehicule).toBeNull();
    expectVal(createdIntervention.depenseMontant).toBeNull();
    expectVal(createdIntervention.depenseDate).toBeNull();
    expectVal(typeof createdIntervention.creeLe).toBe('string');
    expectVal(typeof createdIntervention.misAJourLe).toBe('string');

    // Query Vehicle Situation View
    const situation = await service.getVehicleSituation(1, '12345-A-1');
    expectVal(situation.immatriculation).toBe('12345-A-1');
    expectVal(situation.currentMileage).toBe(50000);
    expectVal(situation.statutGlobal).toBe(MaintenanceStatus.OK);
    expectVal(situation.prochaineEcheanceKm).toBe(60000);
    expectVal(situation.remainingKm).toBe(10000);
    expectVal(Array.isArray(situation.interventions)).toBe(true);
    expectVal(situation.interventions.length).toBe(1);
    expectVal(situation.interventions[0].statut).toBe(MaintenanceStatus.OK);
  });
});
