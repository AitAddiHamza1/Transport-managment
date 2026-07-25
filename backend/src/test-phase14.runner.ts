import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { FacturesService, toFactureView } from './modules/factures/factures.service';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

async function runPhase14InvariantSuite() {
  console.log('=== PHASE 14 FACTURATION INVARIANT SUITE ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const service = app.get(FacturesService);

  try {
    // -------------------------------------------------------------
    // 1. Response Mapper Unit Tests
    // -------------------------------------------------------------
    console.log('--- 1. Decimal Mapper & Response Contract ---');
    const mockDbRecord = {
      id: 101,
      numeroFacture: '2026-1',
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
        idVoyage: 999999,
        tauxTva: 20,
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
    // 3. Mandatory Voyage Validation
    // -------------------------------------------------------------
    console.log('\n--- 3. Mandatory Voyage Validation ---');
    try {
      await service.create({
        idVoyage: 0,
        tauxTva: 20,
      });
      throw new Error('Should have thrown UnprocessableEntityException for missing idVoyage');
    } catch (err: any) {
      if (err instanceof UnprocessableEntityException) {
        console.log('✅ PASSED: Missing idVoyage rejected with UnprocessableEntityException');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // 4. Database Creation & Generated Columns Verification
    // -------------------------------------------------------------
    console.log('\n--- 4. Database Creation & Generated Columns Verification ---');
    const createdFacture = await service.create({
      idVoyage: 42,
      tauxTva: 20,
      dateFacture: '2026-07-23',
    });

    if (createdFacture.montantTva <= 0 || createdFacture.montantTotal <= 0) {
      throw new Error(
        `Generated columns calculation failed: TVA=${createdFacture.montantTva}, TTC=${createdFacture.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: Facture ${createdFacture.numeroFacture} created with derived Client="${createdFacture.nomClient}", HT=${createdFacture.sousTotal} MAD, TVA=${createdFacture.montantTva} MAD and TTC=${createdFacture.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 5. Update Facture TVA Rate Recalculation
    // -------------------------------------------------------------
    console.log('\n--- 5. Update Facture TVA Rate Recalculation ---');
    const updatedFacture = await service.update(createdFacture.id, {
      tauxTva: 20,
    });
    if (updatedFacture.montantTva <= 0 || updatedFacture.montantTotal <= 0) {
      throw new Error(
        `Updated generated fields failed: TVA=${updatedFacture.montantTva}, TTC=${updatedFacture.montantTotal}`,
      );
    }
    console.log(
      `✅ PASSED: Recalculated TVA=${updatedFacture.montantTva} MAD and TTC=${updatedFacture.montantTotal} MAD`,
    );

    // -------------------------------------------------------------
    // 6. Soft Delete Verification
    // -------------------------------------------------------------
    console.log('\n--- 6. Soft Delete Verification ---');
    await service.remove(createdFacture.id);
    const softDeleted = await service.findOne(createdFacture.id);
    if (!softDeleted.supprimeLe || softDeleted.statut !== 'ANNULEE') {
      throw new Error(
        `Soft delete failed: supprimeLe=${softDeleted.supprimeLe}, statut=${softDeleted.statut}`,
      );
    }
    console.log('✅ PASSED: Soft delete sets supprimeLe timestamp and status to ANNULEE');

    // -------------------------------------------------------------
    // 7. Stats Calculation
    // -------------------------------------------------------------
    console.log('\n--- 7. Stats Aggregation ---');
    const stats = await service.findStats();
    if (stats.annuleesCount < 1) {
      throw new Error('Stats calculation failed for annuleesCount');
    }
    console.log(
      `✅ PASSED: Stats aggregated successfully: active total=${stats.totalFactures}, cancelled=${stats.annuleesCount}`,
    );

    // -------------------------------------------------------------
    // 8. Teardown
    // -------------------------------------------------------------
    console.log('\n--- 8. Cleaning up disposable fixtures ---');
    await prisma.paiementClient.deleteMany({
      where: { numeroFacture: createdFacture.numeroFacture },
    });
    await prisma.creanceClient.deleteMany({
      where: { numeroFacture: createdFacture.numeroFacture },
    });
    await prisma.facture.delete({ where: { id: createdFacture.id } });
    await prisma.voyage.update({ where: { idVoyage: 42 }, data: { statut: 'LIVRE' } });
    console.log('✅ Cleanup completed successfully.');

    console.log('\n🎉 ALL PHASE 14 INVARIANT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: any) {
    console.error('❌ PHASE 14 INVARIANT SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase14InvariantSuite();
