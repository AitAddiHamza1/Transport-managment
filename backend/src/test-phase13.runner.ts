import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import {
  BonsCarburantService,
  toBonCarburantView,
} from './modules/bons-carburant/bons-carburant.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, VehiculeStatut } from '@prisma/client';

async function runPhase13InvariantSuite() {
  console.log('=== PHASE 13 CONSOMMATION GASOIL / BONS CARBURANT INVARIANT SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(BonsCarburantService);

  const runId = Date.now();
  const testImmat = `T-P13-${runId.toString().slice(-4)}`;

  try {
    // -------------------------------------------------------------
    // 1. Response Mapper Unit Tests
    // -------------------------------------------------------------
    console.log('--- 1. Decimal Mapper & Response Contract ---');
    const mockDbRecord = {
      idBon: 101,
      immatriculation: testImmat,
      nomConducteur: 'Conducteur Test',
      nomStation: 'Station Afriquia',
      litres: new Prisma.Decimal('150.50'),
      prixParLitre: new Prisma.Decimal('12.500'),
      montantTotal: new Prisma.Decimal('1881.25'),
      dateCarburant: new Date('2026-07-23T00:00:00.000Z'),
      vehicule: {
        immatriculation: testImmat,
        marque: 'Volvo',
        modele: 'FH16',
        typeVehicule: 'TRACTEUR',
        statut: 'DISPONIBLE',
      },
    };

    const view = toBonCarburantView(mockDbRecord);
    if (typeof view.litres !== 'number' || view.litres !== 150.5) {
      throw new Error(`litres Decimal mapping failed, got ${view.litres}`);
    }
    if (typeof view.prixParLitre !== 'number' || view.prixParLitre !== 12.5) {
      throw new Error(`prixParLitre Decimal mapping failed, got ${view.prixParLitre}`);
    }
    if (typeof view.montantTotal !== 'number' || view.montantTotal !== 1881.25) {
      throw new Error(`montantTotal Decimal mapping failed, got ${view.montantTotal}`);
    }
    if (view.dateCarburant !== '2026-07-23') {
      throw new Error(`dateCarburant mapping failed, got ${view.dateCarburant}`);
    }
    console.log('✅ PASSED: Decimal litres, prixParLitre, and montantTotal mapped to JS numbers');
    console.log('✅ PASSED: Date formatted as YYYY-MM-DD');

    // -------------------------------------------------------------
    // 2. Fixture Setup
    // -------------------------------------------------------------
    console.log('\n--- 2. Setting up disposable fixtures ---');
    const testVehicule = await prisma.vehicule.create({
      data: {
        immatriculation: testImmat,
        marque: 'Scania',
        modele: 'R500',
        typeVehicule: 'TRACTEUR',
        statut: VehiculeStatut.DISPONIBLE,
        capaciteCharge: new Prisma.Decimal('25.0'),
      },
    });
    console.log(`✅ PASSED: Created disposable vehicle ${testVehicule.immatriculation}`);

    // -------------------------------------------------------------
    // 3. Vehicle Existence Validation
    // -------------------------------------------------------------
    console.log('\n--- 3. Vehicle Relation Existence Validation ---');
    try {
      await service.create({
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
    // 4. Quantity and Unit Price Negative Validation
    // -------------------------------------------------------------
    console.log('\n--- 4. Quantity & Price Invariant Validation ---');
    try {
      await service.create({
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
    // 5. Database CRUD & Generated Field Verification
    // -------------------------------------------------------------
    console.log('\n--- 5. Database Creation & Generated Column Verification ---');
    const createdBon = await service.create({
      immatriculation: testImmat,
      nomConducteur: 'Hassan',
      nomStation: 'Afriquia Oasis',
      litres: 200,
      prixParLitre: 13.5,
      dateCarburant: '2026-07-23',
    });

    if (createdBon.montantTotal !== 2700) {
      throw new Error(
        `Generated montantTotal mismatch, expected 2700, got ${createdBon.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: BonCarburant #${createdBon.idBon} created with generated montantTotal = ${createdBon.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 6. Update Operation
    // -------------------------------------------------------------
    console.log('\n--- 6. Update BonCarburant ---');
    const updatedBon = await service.update(createdBon.idBon, {
      litres: 250,
      prixParLitre: 14.0,
    });
    if (updatedBon.montantTotal !== 3500) {
      throw new Error(
        `Updated generated montantTotal mismatch, expected 3500, got ${updatedBon.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: Updated litres=250, prix=14.0 recalculates montantTotal = ${updatedBon.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 7. Stats Calculation
    // -------------------------------------------------------------
    console.log('\n--- 7. Stats Aggregation ---');
    const stats = await service.findStats();
    if (stats.totalCount < 1 || stats.totalLitres <= 0 || stats.totalMontant <= 0) {
      throw new Error('Stats aggregation failed');
    }
    console.log(
      `✅ PASSED: Stats aggregated: ${stats.totalCount} count, ${stats.totalLitres} L, ${stats.totalMontant} MAD`,
    );

    // -------------------------------------------------------------
    // 8. Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 8. Cleanup disposable fixtures ---');
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
