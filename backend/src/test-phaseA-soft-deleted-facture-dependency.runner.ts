import {
  PrismaClient,
  VoyageStatut,
  VoyageType,
  ClientStatut,
} from '@prisma/client';
import { VoyagesService } from './modules/voyages/voyages.service';
import { VoyagesController } from './modules/voyages/voyages.controller';
import { VoyageResourceSyncService } from './modules/voyages/voyage-resource-sync.service';
import { ClientsService } from './modules/clients/clients.service';
import { ClientsController } from './modules/clients/clients.controller';
import { FacturesService } from './modules/factures/factures.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { ConflictException } from '@nestjs/common';

const prisma = new PrismaClient();
const syncService = new VoyageResourceSyncService();
const creancesService = new CreancesClientsService(prisma as any);
const facturesService = new FacturesService(prisma as any, creancesService);
const voyagesService = new VoyagesService(prisma as any, syncService, facturesService);
const voyagesController = new VoyagesController(voyagesService);

const clientsService = new ClientsService(prisma as any);
const clientsController = new ClientsController(clientsService);

async function runPhaseATests() {
  console.log('=== RUNNING PHASE A: SOFT-DELETED FACTURE DEPENDENCY TEST SUITE ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passCount++;
      console.log(`[PASS] Test ${passCount + failCount}: ${testName}`);
    } else {
      failCount++;
      console.error(
        `[FAIL] Test ${passCount + failCount}: ${testName} ${detail ? `(${detail})` : ''}`,
      );
    }
  }

  const ts = Date.now();

  const company = await prisma.company.create({
    data: { nom: `Phase A Test Co ${ts}` },
  });

  try {
    // =================================================================
    // A. VOYAGE → FACTURE DEPENDENCY TEST
    // =================================================================
    console.log('--- A. VOYAGE → FACTURE DEPENDENCY TEST ---');

    // 1. Create Client & Voyage
    const clientForVoyage = await prisma.client.create({
      data: {
        companyId: company.id,
        nomEntreprise: `Client Voyage ${ts}`,
        statut: ClientStatut.ACTIF,
      },
    });

    const voyage = await voyagesController.create(company.id, {
      idClient: clientForVoyage.id,
      typeVoyage: VoyageType.NATIONAL,
      lieuChargement: 'Casa',
      lieuDechargement: 'Rabat',
      montantVoyage: 10000,
      statut: VoyageStatut.PLANIFIE,
    });

    // 2. Create active Facture linked to Voyage
    const activeFactureVoyage = await prisma.facture.create({
      data: {
        companyId: company.id,
        idVoyage: voyage.idVoyage,
        numeroFacture: `FAC-VOY-${ts}`,
        nomClient: clientForVoyage.nomEntreprise,
        sousTotal: 10000,
        tauxTva: 20,
        dateFacture: new Date(),
        supprimeLe: null,
      },
    });

    // 3 & 4. Attempt delete Voyage -> Must be rejected (ConflictException)
    let voyageDeleteBlocked = false;
    try {
      await voyagesController.remove(company.id, voyage.idVoyage);
    } catch (e) {
      voyageDeleteBlocked = e instanceof ConflictException;
    }
    assert(
      voyageDeleteBlocked,
      'Active Facture blocks Voyage deletion (409 Conflict)',
    );

    // 5. Soft-delete Facture
    await facturesService.remove(activeFactureVoyage.id, company.id);

    // Verify Facture is soft-deleted
    const softDeletedFacture = await prisma.facture.findUnique({
      where: { id: activeFactureVoyage.id },
    });
    assert(
      Boolean(softDeletedFacture?.supprimeLe),
      'Facture is soft-deleted (supprimeLe is not null)',
    );

    // 6 & 7. Attempt delete Voyage again -> Must succeed!
    let voyageDeleted = false;
    try {
      const res = await voyagesController.remove(company.id, voyage.idVoyage);
      voyageDeleted = res.idVoyage === voyage.idVoyage;
    } catch (e: any) {
      console.error('Unexpected deletion error:', e.message);
    }
    assert(
      voyageDeleted,
      'Soft-deleted Facture does NOT block Voyage deletion (Deletion succeeds)',
    );

    // =================================================================
    // B. CLIENT → FACTURE DEPENDENCY TEST
    // =================================================================
    console.log('\n--- B. CLIENT → FACTURE DEPENDENCY TEST ---');

    // 1. Create Client
    const client = await clientsController.create({
      nomEntreprise: `Client Test ${ts}`,
      statut: ClientStatut.ACTIF,
    }, company.id);

    // 2. Create active Facture linked to Client (by nomClient)
    const activeFactureClient = await prisma.facture.create({
      data: {
        companyId: company.id,
        numeroFacture: `FAC-CLI-${ts}`,
        nomClient: client.nomEntreprise,
        sousTotal: 5000,
        tauxTva: 20,
        dateFacture: new Date(),
        supprimeLe: null,
      },
    });

    // 3 & 4. Attempt delete Client -> Must be rejected (ConflictException)
    let clientDeleteBlocked = false;
    try {
      await clientsController.remove(client.id, company.id);
    } catch (e) {
      clientDeleteBlocked = e instanceof ConflictException;
    }
    assert(
      clientDeleteBlocked,
      'Active Facture blocks Client deletion (409 Conflict)',
    );

    // 5. Soft-delete Facture
    await facturesService.remove(activeFactureClient.id, company.id);

    // 6 & 7. Attempt delete Client again -> Must succeed!
    let clientDeleted = false;
    try {
      const res = await clientsController.remove(client.id, company.id);
      clientDeleted = res.id === client.id;
    } catch (e: any) {
      console.error('Unexpected client deletion error:', e.message);
    }
    assert(
      clientDeleted,
      'Soft-deleted Facture does NOT block Client deletion (Deletion succeeds)',
    );

  } catch (error) {
    console.error('UNEXPECTED ERROR IN PHASE A TEST RUNNER:', error);
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.creanceClient.deleteMany({ where: { companyId: company.id } });
    await prisma.facture.deleteMany({ where: { companyId: company.id } });
    await prisma.voyage.deleteMany({ where: { companyId: company.id } });
    await prisma.client.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.$disconnect();
    console.log('--- CLEANUP COMPLETE ---\n');
  }

  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhaseATests();
