import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { BonsCarburantService } from './modules/bons-carburant/bons-carburant.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehiculeStatut } from '@prisma/client';

async function runPhase13InvariantSuite() {
  console.log('=== PHASE 13 CONSOMMATION GASOIL / BONS CARBURANT INVARIANT SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(BonsCarburantService);

  const runId = Date.now();
  const testImmat = `T-P13-${runId.toString().slice(-4)}`;

  try {
    // -------------------------------------------------------------
    // 1. Fixture Setup
    // -------------------------------------------------------------
    console.log('--- 1. Setting up disposable fixtures ---');
    const testVehicule = await prisma.vehicule.create({
      data: {
        immatriculation: testImmat,
        marque: 'Scania',
        modele: 'R500',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
      },
    });
    console.log(`✅ PASSED: Created disposable vehicle ${testVehicule.immatriculation}`);

    // -------------------------------------------------------------
    // 2. Vehicle Existence Validation
    // -------------------------------------------------------------
    console.log('\n--- 2. Vehicle Relation Existence Validation ---');
    try {
      await service.create({
        numeroBon: `P13-${runId}-INV`,
        immatriculation: 'INVALID-IMMAT-9999',
        litres: 100,
        prixParLitre: 12.0,
      });
      throw new Error('Should have thrown NotFoundException for missing vehicle');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Non-existent vehicle returns 404 NotFoundException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 3. Quantity and Unit Price Negative Validation
    // -------------------------------------------------------------
    console.log('\n--- 3. Quantity & Price Invariant Validation ---');
    try {
      await service.create({
        numeroBon: `P13-${runId}-NEG`,
        immatriculation: testImmat,
        litres: -50,
        prixParLitre: 12.0,
      });
      throw new Error('Should have thrown BadRequestException for negative litres');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Negative litres rejected with BadRequestException');
      } else {
        throw err;
      }
    }

    try {
      await service.create({
        numeroBon: `P13-${runId}-ZERO`,
        immatriculation: testImmat,
        litres: 100,
        prixParLitre: 0,
      });
      throw new Error('Should have thrown BadRequestException for zero prixParLitre');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Zero price per litre rejected with BadRequestException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 4. Database CRUD & Generated Field Verification
    // -------------------------------------------------------------
    console.log('\n--- 4. Database Creation & Generated Column Verification ---');
    const createdBon = await service.create({
      numeroBon: `P13-${runId}-01`,
      immatriculation: testImmat,
      nomConducteur: 'Hassan',
      nomStation: 'Afriquia Oasis',
      litres: 200,
      prixParLitre: 13.5,
      dateCarburant: '2026-07-23',
    });

    if (createdBon.montantTotal !== '2700.00') {
      throw new Error(
        `Generated montantTotal mismatch, expected "2700.00", got ${createdBon.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: BonCarburant #${createdBon.idBon} created with generated montantTotal = ${createdBon.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 5. Update Operation
    // -------------------------------------------------------------
    console.log('\n--- 5. Update BonCarburant ---');
    const updatedBon = await service.update(createdBon.idBon, {
      litres: 250,
      prixParLitre: 14.0,
    });
    if (updatedBon.montantTotal !== '3500.00') {
      throw new Error(
        `Updated generated montantTotal mismatch, expected "3500.00", got ${updatedBon.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: Updated litres=250, prix=14.0 recalculates montantTotal = ${updatedBon.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 6. Stats Calculation
    // -------------------------------------------------------------
    console.log('\n--- 6. Stats Aggregation ---');
    const stats = await service.findStats({});
    if (stats.totalRecords < 1 || Number(stats.litresTotal) <= 0 || Number(stats.coutTotal) <= 0) {
      throw new Error('Stats aggregation failed');
    }
    console.log(
      `✅ PASSED: Stats aggregated: ${stats.totalRecords} count, ${stats.litresTotal} L, ${stats.coutTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 7. Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 7. Cleanup disposable fixtures ---');
    await prisma.bonCarburant.delete({ where: { idBon: createdBon.idBon } });
    await prisma.vehicule.delete({ where: { immatriculation: testImmat } });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL PHASE 13 INVARIANT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('❌ PHASE 13 INVARIANT SUITE FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase13InvariantSuite();
