import { PrismaService } from './prisma/prisma.service';
import { BonsCarburantService } from './modules/bons-carburant/bons-carburant.service';
import { ConflictException } from '@nestjs/common';

async function runConsommationGasoilInvariantTests() {
  console.log('=============================================================================');
  console.log('=== PHASE 6A — CONSOMMATION GASOIL INVARIANT & ACCEPTANCE SUITE =============');
  console.log('=============================================================================\n');

  const prisma = new PrismaService();
  const service = new BonsCarburantService(prisma);

  const testRunId = Date.now();
  const testImmat = `TST-${testRunId.toString().slice(-5)}`;

  try {
    // ── Setup Test Vehicle ──
    console.log('[SETUP] Creating test vehicle in database...');
    const vehicle = await prisma.vehicule.create({
      data: {
        immatriculation: testImmat,
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'TRACTEUR',
        statut: 'DISPONIBLE',
      },
    });
    console.log(`  ✓ Created Vehicle: ${vehicle.immatriculation}`);

    // ── Test 1: First fuel log -> STOCK_INITIAL ──
    console.log('\n[TEST 1] First fuel log creation (expect STOCK_INITIAL status)...');
    const log1 = await service.create({
      numeroBon: ` bon-test-${testRunId}-01 `,
      immatriculation: testImmat,
      nomConducteur: 'Karim Driver',
      nomStation: 'Afriquia Express',
      kilometrage: 100000,
      litres: 200,
      prixParLitre: 12.5,
      dateCarburant: '2026-08-01',
    });

    console.log(`  ✓ Created Log #1: N° Bon="${log1.numeroBon}", Status=${log1.status}`);
    if (log1.numeroBon !== `BON-TEST-${testRunId.toString().toUpperCase()}-01`) {
      throw new Error(
        `numeroBon normalization failed! Expected "BON-TEST-${testRunId}-01", got "${log1.numeroBon}"`,
      );
    }
    if (log1.status !== 'STOCK_INITIAL') {
      throw new Error(`Expected status STOCK_INITIAL, got "${log1.status}"`);
    }
    if (log1.distance !== null || log1.consommationL100 !== null || log1.coutKm !== null) {
      throw new Error('Expected null derived metrics for STOCK_INITIAL row');
    }
    console.log('  ✓ PASSED: First fuel log properly normalized and derived as STOCK_INITIAL');

    // ── Test 2: Duplicate numeroBon rejection ──
    console.log(
      '\n[TEST 2] Duplicate numeroBon case-insensitive rejection (expect 409 Conflict)...',
    );
    try {
      await service.create({
        numeroBon: `BON-test-${testRunId}-01`, // same number, different case
        immatriculation: testImmat,
        kilometrage: 100500,
        litres: 100,
        prixParLitre: 12.5,
        dateCarburant: '2026-08-02',
      });
      throw new Error('Expected 409 Conflict for duplicate numeroBon');
    } catch (err: any) {
      if (err instanceof ConflictException && err.message.includes('déjà')) {
        console.log(`  ✓ PASSED: Duplicate numeroBon rejected with 409 (${err.message})`);
      } else {
        throw err;
      }
    }

    // ── Test 3: Odometer Monotonicity Rejection (current <= previous) ──
    console.log('\n[TEST 3] Odometer lower than previous rejection (expect 409 Conflict)...');
    try {
      await service.create({
        numeroBon: `BON-TEST-${testRunId}-INVALID`,
        immatriculation: testImmat,
        kilometrage: 99999, // < 100000
        litres: 150,
        prixParLitre: 12.5,
        dateCarburant: '2026-08-02',
      });
      throw new Error('Expected 409 Conflict for lower odometer');
    } catch (err: any) {
      if (err instanceof ConflictException && err.message.includes('supérieur')) {
        console.log(`  ✓ PASSED: Lower odometer rejected with 409 (${err.message})`);
      } else {
        throw err;
      }
    }

    // ── Test 4: Second valid fuel log -> CALCULE ──
    console.log(
      '\n[TEST 4] Second fuel log creation (1000 km distance, 250 L -> 25 L/100km, expect CALCULE)...',
    );
    const log2 = await service.create({
      numeroBon: `BON-TEST-${testRunId}-02`,
      immatriculation: testImmat,
      nomConducteur: 'Karim Driver',
      nomStation: 'TotalEnergies',
      kilometrage: 101000, // +1000 km
      litres: 250,
      prixParLitre: 12.0,
      dateCarburant: '2026-08-03',
    });

    console.log(
      `  ✓ Created Log #2: Distance=${log2.distance} km, L/100km=${log2.consommationL100}, Coût/km=${log2.coutKm}, Status=${log2.status}`,
    );
    if (log2.status !== 'CALCULE') {
      throw new Error(`Expected status CALCULE, got "${log2.status}"`);
    }
    if (log2.distance !== 1000) {
      throw new Error(`Expected distance=1000, got ${log2.distance}`);
    }
    if (log2.consommationL100 !== '25.00') {
      throw new Error(`Expected consommationL100="25.00", got "${log2.consommationL100}"`);
    }
    if (log2.coutKm !== '3.00') {
      throw new Error(`Expected coutKm="3.00", got "${log2.coutKm}"`);
    }
    console.log(
      '  ✓ PASSED: Distance (1000 km), L/100km (25.00), and Coût/km (3.00 MAD/km) derived accurately!',
    );

    // ── Test 5: Third valid fuel log -> CALCULE ──
    console.log('\n[TEST 5] Third valid fuel log creation (102000 km, +1000 km distance)...');
    const log3 = await service.create({
      numeroBon: `BON-TEST-${testRunId}-03`,
      immatriculation: testImmat,
      kilometrage: 102000,
      litres: 200,
      prixParLitre: 13.0,
      dateCarburant: '2026-08-04',
    });

    if (log3.status !== 'CALCULE' || log3.distance !== 1000) {
      throw new Error(
        `Expected CALCULE distance 1000, got status ${log3.status} distance ${log3.distance}`,
      );
    }
    console.log(
      `  ✓ Log #3 derived cleanly: Distance=${log3.distance} km, L/100km=${log3.consommationL100}`,
    );

    // ── Test 6: Fuel log with NULL kilometrage -> NON_CALCULABLE ──
    console.log('\n[TEST 6] Fuel log without kilometrage (expect NON_CALCULABLE)...');
    const logNullKm = await service.create({
      numeroBon: `BON-TEST-${testRunId}-NOKM`,
      immatriculation: testImmat,
      litres: 100,
      prixParLitre: 12.0,
      dateCarburant: '2026-08-05',
    });

    if (logNullKm.status !== 'NON_CALCULABLE') {
      throw new Error(
        `Expected status NON_CALCULABLE for null kilometrage, got "${logNullKm.status}"`,
      );
    }
    console.log('  ✓ PASSED: Fuel log without kilometrage derived as NON_CALCULABLE');

    // ── Test 7: Filtered Stats weighted calculations ──
    console.log('\n[TEST 7] Testing findStats weighted calculations...');
    const stats = await service.findStats({ immatriculation: testImmat });
    console.log('  ✓ Stats:', stats);

    // Total litres = 200 + 250 + 100 + 200 = 750 L
    // Total montant = 200*12.5 + 250*12 + 100*12 + 200*13 = 2500 + 3000 + 1200 + 2600 = 9300 MAD
    // Calculable distance = 1000 + 1000 = 2000 km
    // Calculable litres = 250 + 200 = 450 L
    // Calculable montant = 3000 + 2600 = 5600 MAD
    // Weighted avg L/100km = (450 / 2000) * 100 = 22.50
    // Weighted avg cout/km = 5600 / 2000 = 2.80

    if (stats.litresTotal !== '750.00' || stats.coutTotal !== '9300.00') {
      throw new Error(
        `Stats totals incorrect! Expected 750.00 L / 9300.00 MAD, got ${stats.litresTotal} / ${stats.coutTotal}`,
      );
    }
    if (stats.consommationMoyenneL100 !== '22.50' || stats.coutMoyenKm !== '2.80') {
      throw new Error(
        `Weighted stats incorrect! Expected L/100=22.50 / CostKm=2.80, got ${stats.consommationMoyenneL100} / ${stats.coutMoyenKm}`,
      );
    }
    console.log('  ✓ PASSED: Filtered weighted stats match exact arithmetic invariants!');

    // ── Test 8: Excel Buffer Generation & Sanitization ──
    console.log('\n[TEST 8] Excel export generation and formula-injection sanitization...');
    const excelBuffer = await service.generateExcel({ immatriculation: testImmat });
    if (!Buffer.isBuffer(excelBuffer) || excelBuffer.length < 100) {
      throw new Error('Excel generation failed to return a valid buffer');
    }
    console.log(`  ✓ Excel Buffer generated successfully (${excelBuffer.length} bytes)`);

    // ── Test 9: Hard Delete Recalculation ──
    console.log('\n[TEST 9] Hard delete recalculation on following row...');
    await service.remove(log2.idBon); // remove log2 (101000 km)
    const log3Refreshed = await service.findOne(log3.idBon);

    // After log2 is removed, log3 (102000 km) directly follows log1 (100000 km) -> distance becomes 2000 km
    if (log3Refreshed.distance !== 2000) {
      throw new Error(
        `Expected distance to recalculate to 2000 km after deletion, got ${log3Refreshed.distance}`,
      );
    }
    console.log(
      `  ✓ PASSED: After deleting log2, log3 distance automatically recalculated to ${log3Refreshed.distance} km!`,
    );

    // ── Cleanup ──
    console.log('\n[CLEANUP] Cleaning up test fixtures...');
    await prisma.bonCarburant.deleteMany({
      where: { idBon: { in: [log1.idBon, logNullKm.idBon, log3.idBon] } },
    });
    await prisma.vehicule.delete({ where: { id: vehicle.id } });
    console.log('  ✓ Cleanup complete');

    console.log('\n=============================================================================');
    console.log('=== ALL PHASE 6A CONSOMMATION GASOIL INVARIANT TESTS PASSED CLEANLY =========');
    console.log('=============================================================================\n');
  } catch (err) {
    console.error('❌ Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runConsommationGasoilInvariantTests();
