import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService, toFactureView } from './modules/factures/factures.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

async function runPhase14InvariantSuite() {
  console.log('=== PHASE 14 FACTURATION INVARIANT SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(FacturesService);

  const runId = Date.now();
  const testNum = `FAC-P14-${runId.toString().slice(-4)}`;

  try {
    // -------------------------------------------------------------
    // 1. Response Mapper Unit Tests
    // -------------------------------------------------------------
    console.log('--- 1. Decimal Mapper & Response Contract ---');
    const mockDbRecord = {
      id: 101,
      numeroFacture: testNum,
      nomClient: 'Client Test SARL',
      idVoyage: 42,
      dateFacture: new Date('2026-07-23T00:00:00.000Z'),
      joursEcheance: 30,
      dateEcheance: new Date('2026-08-22T00:00:00.000Z'),
      devise: 'MAD',
      sousTotal: new Prisma.Decimal('10000.00'),
      tauxTva: new Prisma.Decimal('20.00'),
      montantTva: new Prisma.Decimal('2000.00'),
      montantTotal: new Prisma.Decimal('12000.00'),
      montantEnLettres: 'Douze mille dirhams',
      cheminPdf: null,
      notes: 'Notes test',
      fichierJoint: null,
      creePar: 1,
      creeLe: new Date(),
      misAJourLe: new Date(),
      supprimeLe: null,
      voyage: {
        idVoyage: 42,
        lieuChargement: 'Casablanca',
        lieuDechargement: 'Tanger',
        statut: 'EN_COURS',
        tracteur: 'T-100-A',
      },
    };

    const view = toFactureView(mockDbRecord);
    if (typeof view.sousTotal !== 'number' || view.sousTotal !== 10000) {
      throw new Error(`sousTotal Decimal mapping failed, got ${view.sousTotal}`);
    }
    if (typeof view.montantTva !== 'number' || view.montantTva !== 2000) {
      throw new Error(`montantTva Decimal mapping failed, got ${view.montantTva}`);
    }
    if (typeof view.montantTotal !== 'number' || view.montantTotal !== 12000) {
      throw new Error(`montantTotal Decimal mapping failed, got ${view.montantTotal}`);
    }
    if (view.statut !== 'EMISE') {
      throw new Error(`Computed statut failed, got ${view.statut}`);
    }
    console.log('✅ PASSED: Decimal sousTotal, montantTva, and montantTotal mapped to JS numbers');
    console.log('✅ PASSED: Computed statut is EMISE');

    // -------------------------------------------------------------
    // 2. Relation Validation (Non-existent Voyage)
    // -------------------------------------------------------------
    console.log('\n--- 2. Relation Validation (Non-existent Voyage) ---');
    try {
      await service.create({
        nomClient: 'Client Invalide',
        idVoyage: 999999,
        sousTotal: 5000,
      });
      throw new Error('Should have thrown NotFoundException for missing Voyage');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log('✅ PASSED: Non-existent voyage returns 404 NotFoundException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 3. Monetary Input Validation
    // -------------------------------------------------------------
    console.log('\n--- 3. Monetary Input Validation ---');
    try {
      await service.create({
        nomClient: 'Client Test',
        sousTotal: -1000,
      });
      throw new Error('Should have thrown BadRequestException for negative sousTotal');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log('✅ PASSED: Negative sousTotal rejected with BadRequestException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 4. Database Creation & Generated Columns Verification
    // -------------------------------------------------------------
    console.log('\n--- 4. Database Creation & Generated Columns Verification ---');
    const createdFacture = await service.create({
      numeroFacture: testNum,
      nomClient: 'Société Logistique Maroc',
      sousTotal: 15000,
      tauxTva: 20,
      dateFacture: '2026-07-23',
    });

    if (createdFacture.montantTva !== 3000 || createdFacture.montantTotal !== 18000) {
      throw new Error(
        `Generated columns calculation failed: TVA=${createdFacture.montantTva}, TTC=${createdFacture.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: Facture ${createdFacture.numeroFacture} created with generated TVA=3000 MAD and TTC=18000 MAD`,
    );

    // -------------------------------------------------------------
    // 5. Unique Number Constraint
    // -------------------------------------------------------------
    console.log('\n--- 5. Unique Number Constraint ---');
    try {
      await service.create({
        numeroFacture: testNum,
        nomClient: 'Client Doublon',
        sousTotal: 2000,
      });
      throw new Error('Should have thrown ConflictException for duplicate numeroFacture');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log('✅ PASSED: Duplicate numeroFacture returns 409 ConflictException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 6. Update Facture
    // -------------------------------------------------------------
    console.log('\n--- 6. Update Facture ---');
    const updatedFacture = await service.update(createdFacture.id, {
      sousTotal: 20000,
      tauxTva: 20,
    });
    if (updatedFacture.montantTva !== 4000 || updatedFacture.montantTotal !== 24000) {
      throw new Error(
        `Updated generated fields failed: TVA=${updatedFacture.montantTva}, TTC=${updatedFacture.montantTotal}`,
      );
    }
    console.log(`✅ PASSED: Updated sousTotal=20000 recalculates TVA=4000 MAD and TTC=24000 MAD`);

    // -------------------------------------------------------------
    // 7. Soft Delete Verification
    // -------------------------------------------------------------
    console.log('\n--- 7. Soft Delete Verification ---');
    await service.remove(createdFacture.id);
    const softDeleted = await service.findOne(createdFacture.id);
    if (!softDeleted.supprimeLe || softDeleted.statut !== 'ANNULEE') {
      throw new Error(
        `Soft delete failed: supprimeLe=${softDeleted.supprimeLe}, statut=${softDeleted.statut}`,
      );
    }
    console.log('✅ PASSED: Soft delete sets supprimeLe timestamp and status to ANNULEE');

    // -------------------------------------------------------------
    // 8. Stats Calculation
    // -------------------------------------------------------------
    console.log('\n--- 8. Stats Aggregation ---');
    const stats = await service.findStats();
    if (stats.annuleesCount < 1) {
      throw new Error('Stats calculation failed for annuleesCount');
    }
    console.log(
      `✅ PASSED: Stats aggregated successfully: active total=${stats.totalFactures}, cancelled=${stats.annuleesCount}`,
    );

    // -------------------------------------------------------------
    // 9. Teardown
    // -------------------------------------------------------------
    console.log('\n--- 9. Cleaning up disposable fixtures ---');
    await prisma.facture.delete({ where: { id: createdFacture.id } });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL PHASE 14 INVARIANT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('❌ PHASE 14 INVARIANT SUITE FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase14InvariantSuite();
