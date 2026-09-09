import { PrismaClient, PaiementMethode, Prisma } from '@prisma/client';
import { PaiementsClientsService } from './modules/paiements-clients/paiements-clients.service';
import { PaiementsFournisseursService } from './modules/paiements-fournisseurs/paiements-fournisseurs.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';
import { DettesFournisseursService } from './modules/dettes-fournisseurs/dettes-fournisseurs.service';
import { CreatePaiementClientDto } from './modules/paiements-clients/dto/create-paiement-client.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

async function runTests() {
  console.log('=== RUNNING PHASE 7A LETTRE DE CHANGE HARDENING UNIT TESTS ===');
  let passedCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
    passedCount++;
    console.log(`✓ ${msg}`);
  }

  const prisma = new PrismaClient();
  const creancesService = new CreancesClientsService(prisma as any);
  const clientsService = new PaiementsClientsService(prisma as any, creancesService);
  const dettesService = new DettesFournisseursService(prisma as any);
  const suppliersService = new PaiementsFournisseursService(prisma as any, dettesService);

  // DTO validation helper
  async function validateDto(dtoClass: any, plainObj: any) {
    const instance = plainToInstance(dtoClass, plainObj);
    return await validate(instance);
  }

  // Setup test environment
  let client = await prisma.client.findFirst();
  if (!client) {
    client = await prisma.client.create({
      data: {
        nomEntreprise: 'TEST CLIENT 7A HARDENING',
        ice: '123456789012345',
        deviseFacturation: 'MAD',
      },
    });
  }

  const voyage = await prisma.voyage.create({
    data: {
      idClient: client.id,
      montantVoyage: 5000.0,
      devise: 'MAD',
      statut: 'FACTURE',
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
    },
  });

  const facture = await prisma.facture.create({
    data: {
      numeroFacture: `FAC-7A-H-${Date.now()}`,
      nomClient: client.nomEntreprise,
      idVoyage: voyage.idVoyage,
      sousTotal: 5000.0,
      tauxTva: 20.0,
      devise: 'MAD',
      creance: {
        create: {
          nomClient: client.nomEntreprise,
          montantFacture: 6000.0,
          montantRecu: 0.0,
          statutPaiement: 'NON_PAYE',
          devise: 'MAD',
        },
      },
    },
  });

  let supplier = await prisma.fournisseur.findFirst();
  if (!supplier) {
    supplier = await prisma.fournisseur.create({
      data: {
        nomFournisseur: 'TEST SUPPLIER 7A HARDENING',
        ice: '987654321098765',
      },
    });
  }

  const dette = await prisma.detteFournisseur.create({
    data: {
      numeroDette: `DET-7A-H-${Date.now()}`,
      idFournisseur: supplier.id,
      nomFournisseurSnapshot: supplier.nomFournisseur,
      montantDu: 4000.0,
      dateEcheance: new Date(),
    },
  });

  console.log('Setup completed. Starting checks...');

  // --- DECIMAL TESTS ---
  console.log('\n--- 1. Decimal & Precision checks ---');

  // 1. montant = 10000.50 is accepted
  const validDto = {
    numeroFacture: facture.numeroFacture,
    nomClient: client.nomEntreprise,
    montantRecu: 1000.0,
    methodePaiement: 'EFFET',
    lettreNumero: 'LC-DEC-1',
    lettreDateEcheance: '2026-12-31',
    lettreMontant: 10000.5,
    lettreBeneficiaire: 'X',
    lettreCause: 'Y',
    lettreTireNom: 'A',
    lettreTireAdresse: 'B',
  };
  const errors1 = await validateDto(CreatePaiementClientDto, validDto);
  assert(errors1.length === 0, 'Test 1: montant = 10000.50 is validated successfully');

  // 2. montant = 10000.123 is rejected
  const invalidPrecisionDto = { ...validDto, lettreMontant: 10000.123, lettreNumero: 'LC-DEC-2' };
  const errors2 = await validateDto(CreatePaiementClientDto, invalidPrecisionDto);
  assert(errors2.length > 0, 'Test 2: montant = 10000.123 is rejected by DTO validation');

  // 3. montant = 0 is rejected
  const zeroMontantDto = { ...validDto, lettreMontant: 0, lettreNumero: 'LC-DEC-3' };
  const errors3 = await validateDto(CreatePaiementClientDto, zeroMontantDto);
  assert(errors3.length > 0, 'Test 3: montant = 0 is rejected by DTO validation');

  // 4. negative montant is rejected
  const negativeMontantDto = { ...validDto, lettreMontant: -100.5, lettreNumero: 'LC-DEC-4' };
  const errors4 = await validateDto(CreatePaiementClientDto, negativeMontantDto);
  assert(errors4.length > 0, 'Test 4: negative montant is rejected by DTO validation');

  // 5. Decimal precision is preserved
  const paymentWithLC = await clientsService.create({
    numeroFacture: facture.numeroFacture,
    nomClient: client.nomEntreprise,
    montantRecu: 100.5,
    methodePaiement: PaiementMethode.EFFET,
    lettreNumero: 'LC-PRECISION-999',
    lettreDateEcheance: '2026-10-31',
    lettreMontant: 9999.85,
    lettreBeneficiaire: 'PRECISION CO',
    lettreCause: 'Services',
    lettreTireNom: 'Client A',
    lettreTireAdresse: 'Adresse A',
  });
  const savedLC = await prisma.lettreDeChange.findFirst({
    where: { numero: 'LC-PRECISION-999' },
  });
  assert(savedLC !== null, 'Test 5: LC is saved');
  assert(
    savedLC?.montant instanceof Prisma.Decimal,
    'Test 5b: montant is stored as Prisma.Decimal instance',
  );
  assert(savedLC?.montant.toFixed(2) === '9999.85', 'Test 5c: decimal precision preserved exactly');

  // --- DATE TESTS ---
  console.log('\n--- 2. Date checks ---');

  // 6. valid date is accepted
  const validDateDto = { ...validDto, lettreDateEcheance: '2026-09-30', lettreNumero: 'LC-DATE-1' };
  const errors6 = await validateDto(CreatePaiementClientDto, validDateDto);
  assert(errors6.length === 0, 'Test 6: valid ISO date string is validated successfully');

  // 7. invalid date is rejected
  const invalidDateDto = {
    ...validDto,
    lettreDateEcheance: 'not-a-date',
    lettreNumero: 'LC-DATE-2',
  };
  const errors7 = await validateDto(CreatePaiementClientDto, invalidDateDto);
  assert(errors7.length > 0, 'Test 7: invalid date string is rejected by DTO validation');

  // 8. date is stored as a database DATE
  const fetchedLC = await prisma.lettreDeChange.findFirst({
    where: { numero: 'LC-PRECISION-999' },
  });
  assert(
    fetchedLC?.dateEcheance instanceof Date,
    'Test 8: dateEcheance is mapped to Date object by Prisma',
  );

  // 9. API returns a stable ISO date representation
  assert(
    paymentWithLC.lettreDeChange?.dateEcheance === '2026-10-31',
    'Test 9: service output returns clean YYYY-MM-DD',
  );

  // --- RELATIONSHIP TESTS ---
  console.log('\n--- 3. Relationship checks ---');

  // 10 & 11. LettreDeChange linked to Client and Supplier are valid (done by services naturally)
  // Let's create a client payment and supplier payment
  const cPayment = await prisma.paiementClient.create({
    data: {
      numeroFacture: facture.numeroFacture,
      nomClient: client.nomEntreprise,
      montantRecu: 10.0,
      methodePaiement: PaiementMethode.ESPECES,
      devise: 'MAD',
    },
  });
  const sPayment = await prisma.paiementFournisseur.create({
    data: {
      numeroPaiement: `PF-TEST-${Date.now()}`,
      idDetteFournisseur: dette.id,
      montant: new Prisma.Decimal('10.00'),
      modePaiement: PaiementMethode.CHEQUE,
    },
  });

  // Create valid client linked LC
  const clientLC = await prisma.lettreDeChange.create({
    data: {
      numero: 'LC-REL-CLIENT',
      dateEcheance: new Date('2026-12-01'),
      montant: new Prisma.Decimal('150.00'),
      beneficiaire: 'B',
      cause: 'C',
      tireNom: 'T',
      tireAdresse: 'A',
      idPaiementClient: cPayment.id,
    },
  });
  assert(
    clientLC.idPaiementClient === cPayment.id && clientLC.idPaiementFournisseur === null,
    'Test 10: Client payment link is valid',
  );

  // Create valid supplier linked LC
  const supplierLC = await prisma.lettreDeChange.create({
    data: {
      numero: 'LC-REL-SUPPLIER',
      dateEcheance: new Date('2026-12-01'),
      montant: new Prisma.Decimal('250.00'),
      beneficiaire: 'B',
      cause: 'C',
      tireNom: 'T',
      tireAdresse: 'A',
      idPaiementFournisseur: sPayment.id,
    },
  });
  assert(
    supplierLC.idPaiementFournisseur === sPayment.id && supplierLC.idPaiementClient === null,
    'Test 11: Supplier payment link is valid',
  );

  // 12. LettreDeChange linked to BOTH is rejected by database constraint
  console.log('Testing dual-relation constraint rejection...');
  try {
    await prisma.lettreDeChange.create({
      data: {
        numero: 'LC-REL-BOTH',
        dateEcheance: new Date(),
        montant: new Prisma.Decimal('500.00'),
        beneficiaire: 'B',
        cause: 'C',
        tireNom: 'T',
        tireAdresse: 'A',
        idPaiementClient: cPayment.id,
        idPaiementFournisseur: sPayment.id,
      },
    });
    throw new Error('Should have failed to link BOTH');
  } catch (err: any) {
    assert(
      err.message.includes('chk_lettre_de_change_exactly_one_owner') ||
        err.code === 'P2010' ||
        err.code === 'P2003',
      'Test 12: database constraint successfully blocks link to BOTH payments',
    );
  }

  // 13. LettreDeChange linked to NEITHER is rejected by database constraint
  console.log('Testing no-relation constraint rejection...');
  try {
    await prisma.lettreDeChange.create({
      data: {
        numero: 'LC-REL-NEITHER',
        dateEcheance: new Date(),
        montant: new Prisma.Decimal('500.00'),
        beneficiaire: 'B',
        cause: 'C',
        tireNom: 'T',
        tireAdresse: 'A',
        idPaiementClient: null,
        idPaiementFournisseur: null,
      },
    });
    throw new Error('Should have failed to link NEITHER');
  } catch (err: any) {
    assert(
      err.message.includes('chk_lettre_de_change_exactly_one_owner') || err.code === 'P2010',
      'Test 13: database constraint successfully blocks link to NEITHER payment',
    );
  }

  // 14. One PaiementClient cannot have two LettreDeChange records
  console.log('Testing 1-to-1 client uniqueness check...');
  try {
    await prisma.lettreDeChange.create({
      data: {
        numero: 'LC-REL-CLIENT-DUP',
        dateEcheance: new Date(),
        montant: new Prisma.Decimal('500.00'),
        beneficiaire: 'B',
        cause: 'C',
        tireNom: 'T',
        tireAdresse: 'A',
        idPaiementClient: cPayment.id,
      },
    });
    throw new Error('Should have failed duplicate client 1-to-1');
  } catch (err: any) {
    assert(
      err.code === 'P2002' || err.message.includes('Unique constraint'),
      'Test 14: unique constraint blocks multiple LettreDeChange for same PaiementClient',
    );
  }

  // 15. One PaiementFournisseur cannot have two LettreDeChange records
  console.log('Testing 1-to-1 supplier uniqueness check...');
  try {
    await prisma.lettreDeChange.create({
      data: {
        numero: 'LC-REL-SUP-DUP',
        dateEcheance: new Date(),
        montant: new Prisma.Decimal('500.00'),
        beneficiaire: 'B',
        cause: 'C',
        tireNom: 'T',
        tireAdresse: 'A',
        idPaiementFournisseur: sPayment.id,
      },
    });
    throw new Error('Should have failed duplicate supplier 1-to-1');
  } catch (err: any) {
    assert(
      err.code === 'P2002' || err.message.includes('Unique constraint'),
      'Test 15: unique constraint blocks multiple LettreDeChange for same PaiementFournisseur',
    );
  }

  // --- FINANCIAL REGRESSION TESTS ---
  console.log('\n--- 4. Financial Regression checks ---');

  // 16. Client invoice balance remains unchanged (only updated by payment amount, not LC face value)
  // Let's create a payment with a huge LC amount but a small payment amount
  const creanceBefore = await prisma.creanceClient.findUnique({
    where: { numeroFacture: facture.numeroFacture },
  });
  const paymentDifferentLc = await clientsService.create({
    numeroFacture: facture.numeroFacture,
    nomClient: client.nomEntreprise,
    montantRecu: 150.0,
    methodePaiement: PaiementMethode.EFFET,
    lettreNumero: 'LC-IND-CLIENT',
    lettreDateEcheance: '2026-11-30',
    lettreMontant: 999999.0, // Huge face value
    lettreBeneficiaire: 'B',
    lettreCause: 'C',
    lettreTireNom: 'T',
    lettreTireAdresse: 'A',
  });
  const creanceAfter = await prisma.creanceClient.findUnique({
    where: { numeroFacture: facture.numeroFacture },
  });

  assert(
    new Prisma.Decimal(creanceBefore!.montantRecu)
      .add(new Prisma.Decimal('150.00'))
      .equals(new Prisma.Decimal(creanceAfter!.montantRecu)),
    'Test 16: client payment balance only increments by actual payment amount (150.00)',
  );

  // 17. Supplier debt balance remains unchanged (only updated by payment amount)
  const debtBefore = await dettesService.findOne(dette.id);
  await suppliersService.createVersement(dette.id, {
    montant: 200.0,
    modePaiement: PaiementMethode.EFFET,
    lettreNumero: 'LC-IND-SUPPLIER',
    lettreDateEcheance: '2026-11-30',
    lettreMontant: 88888.0, // Huge face value
    lettreBeneficiaire: 'B',
    lettreCause: 'C',
    lettreTireNom: 'T',
    lettreTireAdresse: 'A',
  });
  const debtAfter = await dettesService.findOne(dette.id);
  assert(
    debtBefore.soldeRestant - debtAfter.soldeRestant === 200.0,
    'Test 17: supplier debt balance only decrements by actual payment amount (200.00)',
  );

  // 18. Payment amount remains independent from LettreDeChange.montant
  const clientFetchedPay = await prisma.paiementClient.findFirst({
    where: { id: paymentDifferentLc.id },
    include: { lettreDeChange: true },
  });
  assert(
    Number(clientFetchedPay?.montantRecu) === 150.0 &&
      Number(clientFetchedPay?.lettreDeChange?.montant) === 999999.0,
    'Test 18: Client payment amount (150.00) is independent of LettreDeChange face value (999999.00)',
  );

  // Clean up
  await prisma.lettreDeChange
    .deleteMany({
      where: {
        numero: {
          in: [
            'LC-PRECISION-999',
            'LC-REL-CLIENT',
            'LC-REL-SUPPLIER',
            'LC-IND-CLIENT',
            'LC-IND-SUPPLIER',
          ],
        },
      },
    })
    .catch(() => {});
  await prisma.paiementClient
    .deleteMany({
      where: { id: { in: [cPayment.id, paymentDifferentLc.id] } },
    })
    .catch(() => {});
  await prisma.paiementFournisseur
    .deleteMany({
      where: { idDetteFournisseur: dette.id },
    })
    .catch(() => {});
  await prisma.facture.delete({ where: { id: facture.id } }).catch(() => {});
  await prisma.detteFournisseur.delete({ where: { id: dette.id } }).catch(() => {});

  console.log(`\n=== ALL ${passedCount} UNIT TESTS COMPLETED SUCCESSFULLY ===\n`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
