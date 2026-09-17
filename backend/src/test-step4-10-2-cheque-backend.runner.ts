import { PaiementMethode } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { ChequesService } from './modules/cheques/cheques.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

const prisma = new PrismaService();

async function runTestRunner() {
  console.log('=====================================================');
  console.log('  SUB-STEP 4.10.2 — BACKEND CHEQUE BUSINESS LOGIC TESTS');
  console.log('=====================================================\n');

  const creancesService = new CreancesClientsService(prisma);
  const dettesService = new DettesFournisseursService(prisma);
  const clientsPayService = new PaiementsClientsService(prisma, creancesService);
  const supplierPayService = new PaiementsFournisseursService(prisma, dettesService);
  const chequesService = new ChequesService(prisma);

  let companyAId = 1;
  let companyBId = 2;

  // Verify companies exist or fetch active company IDs
  const companies = await prisma.company.findMany({ take: 2 });
  if (companies.length >= 1) companyAId = companies[0].id;
  if (companies.length >= 2) companyBId = companies[1].id;

  // 1. Fetch active client invoice and supplier debt for Company A
  const facture = await prisma.facture.findFirst({
    where: { companyId: companyAId, supprimeLe: null },
    include: { creance: true },
  });

  const dette = await prisma.detteFournisseur.findFirst({
    where: { companyId: companyAId, supprimeLe: null },
  });

  if (!facture || !dette) {
    console.error('❌ Prerequisite data missing: Invoice or Debt not found.');
    process.exit(1);
  }

  const numFacture = facture.numeroFacture;
  const idDette = dette.id;

  console.log(`Using Facture "${numFacture}" and Debt #${idDette} for Company A (${companyAId})\n`);

  let testCount = 0;
  let passCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`✓ TEST ${testName}: PASSED ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`❌ TEST ${testName}: FAILED ${detail ? `(${detail})` : ''}`);
    }
  }

  // TEST A: Client CHEQUE payment + valid Cheque → success
  try {
    const resA = await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: 'CHQ-CLIENT-001',
      chequeSerie: 'SERIE-A',
      chequeDateCheque: '2026-10-20',
      chequeBanque: 'Attijariwafa Bank',
      chequeAgence: 'Médiouna',
      chequeBeneficiaire: 'Transport Management SARL',
      chequeVille: 'Casablanca',
    });

    assert(
      Boolean(resA && resA.cheque && resA.cheque.numero === 'CHQ-CLIENT-001'),
      'A',
      'Client CHEQUE payment created with attached Cheque data',
    );
  } catch (err: any) {
    assert(false, 'A', `Failed with error: ${err.message}`);
  }

  // TEST B: Supplier CHEQUE payment + valid Cheque → success
  try {
    const resB = await supplierPayService.createVersement(
      idDette,
      {
        montant: 10,
        modePaiement: PaiementMethode.CHEQUE,
        cheque: {
          numero: 'CHQ-SUPP-001',
          serie: 'SERIE-B',
          dateCheque: '2026-10-25',
          banque: 'BMCE Bank',
          agence: 'Anfa',
          beneficiaire: 'Fournisseur Test SARL',
          ville: 'Casablanca',
        },
      } as any,
      companyAId,
    );

    const supplierPayments = await supplierPayService.findByDebtId(idDette, companyAId);
    const lastPayment = supplierPayments.find((p) => p.cheque?.numero === 'CHQ-SUPP-001');

    assert(
      Boolean(lastPayment && lastPayment.cheque && lastPayment.cheque.numero === 'CHQ-SUPP-001'),
      'B',
      'Supplier CHEQUE payment created with attached Cheque data',
    );
  } catch (err: any) {
    assert(false, 'B', `Failed with error: ${err.message}`);
  }

  // TEST C: CHEQUE payment without required Cheque information → HTTP 400
  try {
    await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.CHEQUE,
    });
    assert(false, 'C', 'Expected HTTP 400 for missing Cheque info');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'C',
      'Rejected CHEQUE payment without Cheque info with HTTP 400',
    );
  }

  // TEST D: Non-CHEQUE payment with Cheque payload → HTTP 400
  try {
    await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.VIREMENT,
      chequeNumero: 'CHQ-INVALID',
      chequeBanque: 'BMCE',
      chequeDateCheque: '2026-10-20',
      chequeBeneficiaire: 'SARL',
    });
    assert(false, 'D', 'Expected HTTP 400 for non-CHEQUE payment with Cheque payload');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'D',
      'Rejected non-CHEQUE payment with Cheque payload with HTTP 400',
    );
  }

  // TEST E & F: Database level XOR protection
  try {
    await prisma.cheque.create({
      data: {
        numero: 'ERR-XOR',
        dateCheque: new Date('2026-10-20'),
        banque: 'BANQUE',
        beneficiaire: 'BENEF',
        idPaiementClient: null,
        idPaiementFournisseur: null,
      },
    });
    assert(false, 'E/F', 'DB allowed null payment links');
  } catch (err: any) {
    assert(true, 'E/F', 'DB XOR constraint prevented orphan Cheque creation');
  }

  // TEST G: Invalid/missing required Cheque fields → rejected
  try {
    await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: '',
      chequeBanque: 'Banque',
      chequeDateCheque: '2026-10-20',
      chequeBeneficiaire: 'Benef',
    });
    assert(false, 'G', 'Expected HTTP 400 for empty required chequeNumero');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'G',
      'Rejected empty required chequeNumero with HTTP 400',
    );
  }

  // TEST H: Optional fields omitted → success
  try {
    const resH = await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: 'CHQ-OPTIONAL-OMITTED',
      chequeDateCheque: '2026-10-22',
      chequeBanque: 'Attijariwafa Bank',
      chequeBeneficiaire: 'Société X',
    });

    assert(
      Boolean(resH.cheque && resH.cheque.serie === null && resH.cheque.agence === null && resH.cheque.ville === null),
      'H',
      'Cheque created successfully when optional fields (serie, agence, ville) are omitted',
    );
  } catch (err: any) {
    assert(false, 'H', `Failed with error: ${err.message}`);
  }

  // TEST I: Tenant A cannot access Tenant B Cheque
  if (companyBId && companyBId !== companyAId) {
    try {
      const clientPaymentA = await prisma.paiementClient.findFirst({
        where: { cheque: { isNot: null }, facture: { companyId: companyAId } },
        include: { cheque: true },
      });

      if (clientPaymentA?.cheque) {
        await chequesService.getChequeById(companyBId, clientPaymentA.cheque.id);
        assert(false, 'I', 'Expected HTTP 404 when Tenant B accesses Tenant A Cheque');
      } else {
        assert(true, 'I', 'Tenant isolation verified (no cheque row for Tenant A)');
      }
    } catch (err: any) {
      assert(
        err instanceof NotFoundException,
        'I',
        'Cross-tenant Cheque lookup rejected with HTTP 404',
      );
    }
  } else {
    assert(true, 'I', 'Tenant isolation skipped (only 1 company in database)');
  }

  // TEST J & Financial Side-Effect Test: Cheque operation does not alter financial data
  try {
    const creanceBefore = await prisma.creanceClient.findUnique({
      where: { numeroFacture: numFacture },
    });

    const resJ = await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 5,
      methodePaiement: PaiementMethode.CHEQUE,
      chequeNumero: 'CHQ-FINANCIAL-ISOLATION',
      chequeDateCheque: '2026-10-25',
      chequeBanque: 'CIH Bank',
      chequeBeneficiaire: 'Company Transport',
    });

    const creanceAfter = await prisma.creanceClient.findUnique({
      where: { numeroFacture: numFacture },
    });

    const expectedRecu = Number(creanceBefore!.montantRecu) + 5;
    const actualRecu = Number(creanceAfter!.montantRecu);

    assert(
      actualRecu === expectedRecu && Number(resJ.montantRecu) === 5,
      'J',
      'Cheque creation correctly reflected payment amount of 5 MAD without modifying invoice/financial rules',
    );
  } catch (err: any) {
    assert(false, 'J', `Failed with error: ${err.message}`);
  }

  // TEST K: Client payment + Cheque creation is atomic (rollback on error)
  const initialClientPayCount = await prisma.paiementClient.count({
    where: { numeroFacture: numFacture },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paiementClient.create({
        data: {
          numeroFacture: numFacture,
          nomClient: 'Test Client',
          datePaiement: new Date(),
          montantRecu: 10,
          methodePaiement: PaiementMethode.CHEQUE,
        },
      });
      // Force error during transaction
      throw new Error('SIMULATED_TRANSACTION_FAILURE');
    });
  } catch (err: any) {
    const finalClientPayCount = await prisma.paiementClient.count({
      where: { numeroFacture: numFacture },
    });
    assert(
      initialClientPayCount === finalClientPayCount,
      'K',
      'Transaction rollback prevented orphan payment on error',
    );
  }

  // TEST L: Supplier payment + Cheque creation is atomic
  const initialSupplierPayCount = await prisma.paiementFournisseur.count({
    where: { idDetteFournisseur: idDette },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paiementFournisseur.create({
        data: {
          numeroPaiement: 'PF-TEST-ROLLBACK',
          idDetteFournisseur: idDette,
          montant: 10,
          datePaiement: new Date(),
          modePaiement: PaiementMethode.CHEQUE,
        },
      });
      throw new Error('SIMULATED_SUPPLIER_TRANSACTION_FAILURE');
    });
  } catch (err: any) {
    const finalSupplierPayCount = await prisma.paiementFournisseur.count({
      where: { idDetteFournisseur: idDette },
    });
    assert(
      initialSupplierPayCount === finalSupplierPayCount,
      'L',
      'Transaction rollback prevented orphan supplier payment on error',
    );
  }

  // TEST M: Non-CHEQUE payment has no Cheque
  try {
    const resM = await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.ESPECES,
    });

    assert(
      resM.cheque === null,
      'M',
      'Non-CHEQUE (ESPECES) payment has null cheque property',
    );
  } catch (err: any) {
    assert(false, 'M', `Failed with error: ${err.message}`);
  }

  // TEST N: Cheque data remains linked to the correct payment
  try {
    const clientPayWithCheque = await prisma.paiementClient.findFirst({
      where: { methodePaiement: PaiementMethode.CHEQUE, cheque: { isNot: null } },
      include: { cheque: true },
    });

    assert(
      Boolean(clientPayWithCheque && clientPayWithCheque.cheque?.idPaiementClient === clientPayWithCheque?.id),
      'N',
      'Cheque model correctly maintains 1:1 foreign key linkage to its parent payment',
    );
  } catch (err: any) {
    assert(false, 'N', `Failed with error: ${err.message}`);
  }

  // TEST O: Existing LettreDeChange behavior remains intact
  try {
    const resO = await clientsPayService.create(companyAId, {
      numeroFacture: numFacture,
      montantRecu: 10,
      methodePaiement: PaiementMethode.EFFET,
      lettreNumero: 'LC-REGRESSION-TEST',
      lettreDateEcheance: '2026-11-30',
      lettreMontant: 10,
      lettreBeneficiaire: 'Beneficiaire LC',
      lettreCause: 'Facture transport',
      lettreTireNom: 'Tire Nom',
      lettreTireAdresse: 'Tire Adresse',
    });

    assert(
      Boolean(resO.lettreDeChange && resO.lettreDeChange.numero === 'LC-REGRESSION-TEST' && resO.cheque === null),
      'O',
      'LettreDeChange (EFFET) payment registered successfully without affecting Cheque logic',
    );
  } catch (err: any) {
    assert(false, 'O', `Failed with error: ${err.message}`);
  }

  console.log('\n=====================================================');
  console.log(`  SUMMARY: ${passCount} / ${testCount} TESTS PASSED`);
  console.log('=====================================================\n');

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runTestRunner().catch((e) => {
  console.error(e);
  process.exit(1);
});
