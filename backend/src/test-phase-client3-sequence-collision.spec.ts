import { PrismaClient, ModeFacturation } from '@prisma/client';
import { formatInvoiceNumber } from './modules/factures/utils/invoice-number.formatter';
import { FacturesService } from './modules/factures/factures.service';
import { VoyagesService } from './modules/voyages/voyages.service';
import { CreancesClientsService } from './modules/creances-clients/creances-clients.service';

const prisma = new PrismaClient();
const creancesService = new CreancesClientsService(prisma as any);
const facturesService = new FacturesService(prisma as any, creancesService);

async function runSequenceCollisionTests() {
  console.log('=== RUNNING INVOICE SEQUENCE COLLISION TESTS (6 TEST CRITERIA) ===\n');
  let passedCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
    passedCount++;
    console.log(`✓ ${msg}`);
  }

  // 1. Test formatInvoiceNumber utility
  assert(
    formatInvoiceNumber(2026, 1, ModeFacturation.AVEC_FACTURE) === 'F001/2026',
    'Test 1a: formatInvoiceNumber(2026, 1, AVEC_FACTURE) -> F001/2026',
  );
  assert(
    formatInvoiceNumber(2026, 17, ModeFacturation.AVEC_FACTURE) === 'F017/2026',
    'Test 1b: formatInvoiceNumber(2026, 17, AVEC_FACTURE) -> F017/2026',
  );
  assert(
    formatInvoiceNumber(2026, 1, ModeFacturation.SANS_FACTURE) === 'BL001/2026',
    'Test 1c: formatInvoiceNumber(2026, 1, SANS_FACTURE) -> BL001/2026',
  );
  assert(
    formatInvoiceNumber(2027, 5, ModeFacturation.AVEC_FACTURE) === 'F005/2027',
    'Test 1d: formatInvoiceNumber(2027, 5, AVEC_FACTURE) -> F005/2027 (Year change)',
  );

  // 2. Setup isolated test companies
  const testCo1 = await prisma.company.create({
    data: {
      nom: `Test Sequence Co 1 ${Date.now()}`,
    },
  });
  const testCo2 = await prisma.company.create({
    data: {
      nom: `Test Sequence Co 2 ${Date.now()}`,
    },
  });

  const testCompanyId = testCo1.id;
  const testCompany2Id = testCo2.id;

  // Ensure CompanySettings exist for test companies
  await prisma.companySettings.create({
    data: {
      companyId: testCompanyId,
      nomEntreprise: 'Test Sequence Co 1',
      adresse: '10, Rue Test',
      telephone: '+212600000001',
      email: 'test1@company.ma',
    },
  });
  await prisma.companySettings.create({
    data: {
      companyId: testCompany2Id,
      nomEntreprise: 'Test Sequence Co 2',
      adresse: '20, Rue Test',
      telephone: '+212600000002',
      email: 'test2@company.ma',
    },
  });

  // Clean up function for test runner
  const cleanupTestCompanies = async () => {
    await prisma.$executeRaw`DELETE FROM invoice_sequences WHERE company_id IN (${testCompanyId}, ${testCompany2Id});`;
    await prisma.$executeRaw`DELETE FROM creances_clients WHERE company_id IN (${testCompanyId}, ${testCompany2Id});`;
    await prisma.$executeRaw`DELETE FROM factures WHERE company_id IN (${testCompanyId}, ${testCompany2Id});`;
    await prisma.$executeRaw`DELETE FROM voyages WHERE company_id IN (${testCompanyId}, ${testCompany2Id});`;
    await prisma.$executeRaw`DELETE FROM company_settings WHERE company_id IN (${testCompanyId}, ${testCompany2Id});`;
    await prisma.$executeRaw`DELETE FROM companies WHERE id IN (${testCompanyId}, ${testCompany2Id});`;
  };

  // Create test clients for test companies
  const testClient1 = await prisma.client.create({
    data: {
      companyId: testCompanyId,
      nomEntreprise: 'Client Test Co 1',
    },
  });
  const testClient2 = await prisma.client.create({
    data: {
      companyId: testCompany2Id,
      nomEntreprise: 'Client Test Co 2',
    },
  });

  // Clean up any leftover creances_clients with test invoice numbers
  await prisma.$executeRaw`DELETE FROM creances_clients WHERE numero_facture IN ('F001/2026', 'F002/2026', 'F017/2026', 'F018/2026', 'F019/2026', 'F020/2026', 'F021/2026');`;

  // 3. Test sequence catch-up when pre-existing factures exist in DB
  // Insert pre-existing factures F001/2026, F002/2026, F017/2026 for testCompanyId without invoice_sequences row
  await prisma.facture.createMany({
    data: [
      { companyId: testCompanyId, numeroFacture: 'F001/2026', nomClient: 'Client A', sousTotal: 1000, tauxTva: 20 },
      { companyId: testCompanyId, numeroFacture: 'F002/2026', nomClient: 'Client A', sousTotal: 1000, tauxTva: 20 },
      { companyId: testCompanyId, numeroFacture: 'F017/2026', nomClient: 'Client A', sousTotal: 1000, tauxTva: 20 },
    ],
  });

  // Create dummy voyage for test company
  const testVoyage = await prisma.voyage.create({
    data: {
      companyId: testCompanyId,
      idClient: testClient1.id,
      nomClient: testClient1.nomEntreprise,
      lieuChargement: 'Casablanca',
      lieuDechargement: 'Tanger',
      statut: 'LIVRE',
      montantVoyage: 5000,
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      dateChargement: new Date('2026-09-01'),
    },
  });

  // Create invoice via facturesService (should detect max existing seq = 17 and produce F018/2026)
  const createdFacture1 = await facturesService.create(
    { idVoyage: testVoyage.idVoyage, dateFacture: '2026-09-15' },
    testCompanyId,
  );

  assert(
    createdFacture1.numeroFacture === 'F018/2026',
    `Test 2: Auto-detected MAX existing invoice F017/2026 and generated next sequence F018/2026 without collision (got ${createdFacture1.numeroFacture})`,
  );

  // Create next invoice for same company (should produce F019/2026)
  const testVoyage2 = await prisma.voyage.create({
    data: {
      companyId: testCompanyId,
      idClient: testClient1.id,
      nomClient: testClient1.nomEntreprise,
      lieuChargement: 'Rabat',
      lieuDechargement: 'Agadir',
      statut: 'LIVRE',
      montantVoyage: 6000,
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      dateChargement: new Date('2026-09-02'),
    },
  });

  const createdFacture2 = await facturesService.create(
    { idVoyage: testVoyage2.idVoyage, dateFacture: '2026-09-16' },
    testCompanyId,
  );

  assert(
    createdFacture2.numeroFacture === 'F019/2026',
    `Test 3: Next sequence incremented correctly to F019/2026 without collision (got ${createdFacture2.numeroFacture})`,
  );

  // 4. Separation of sequences between companies
  const testVoyageComp2 = await prisma.voyage.create({
    data: {
      companyId: testCompany2Id,
      idClient: testClient2.id,
      nomClient: testClient2.nomEntreprise,
      lieuChargement: 'Fès',
      lieuDechargement: 'Oujda',
      statut: 'LIVRE',
      montantVoyage: 4000,
      modeFacturation: ModeFacturation.AVEC_FACTURE,
      dateChargement: new Date('2026-09-03'),
    },
  });

  const createdComp2Facture = await facturesService.create(
    { idVoyage: testVoyageComp2.idVoyage, dateFacture: '2026-09-17' },
    testCompany2Id,
  );

  assert(
    createdComp2Facture.numeroFacture === 'F001/2026',
    `Test 4: Sequence for Company 2 starts independently at F001/2026 (got ${createdComp2Facture.numeroFacture})`,
  );

  // 5. Concurrent invoice creation test (Promise.all)
  const testVoyageConc1 = await prisma.voyage.create({
    data: {
      companyId: testCompanyId,
      idClient: testClient1.id,
      nomClient: testClient1.nomEntreprise,
      lieuChargement: 'Marrakech',
      lieuDechargement: 'Safi',
      statut: 'LIVRE',
      montantVoyage: 3000,
      modeFacturation: ModeFacturation.AVEC_FACTURE,
    },
  });
  const testVoyageConc2 = await prisma.voyage.create({
    data: {
      companyId: testCompanyId,
      idClient: testClient1.id,
      nomClient: testClient1.nomEntreprise,
      lieuChargement: 'Kenitra',
      lieuDechargement: 'Salé',
      statut: 'LIVRE',
      montantVoyage: 3500,
      modeFacturation: ModeFacturation.AVEC_FACTURE,
    },
  });

  const [concFac1, concFac2] = await Promise.all([
    facturesService.create({ idVoyage: testVoyageConc1.idVoyage, dateFacture: '2026-09-18' }, testCompanyId),
    facturesService.create({ idVoyage: testVoyageConc2.idVoyage, dateFacture: '2026-09-18' }, testCompanyId),
  ]);

  const concNums = [concFac1.numeroFacture, concFac2.numeroFacture].sort();
  assert(
    concNums[0] === 'F020/2026' && concNums[1] === 'F021/2026',
    `Test 5: Concurrent invoice creations generated unique F020/2026 and F021/2026 without collision (got ${concNums.join(', ')})`,
  );

  // 6. Verification of PDF generation
  const pdfRes = await facturesService.generatePdf(createdFacture1.id, testCompanyId, false);
  assert(
    pdfRes.buffer && pdfRes.buffer.toString('utf8', 0, 5) === '%PDF-' && pdfRes.filename.includes('F018-2026'),
    'Test 6: PDF generation works without regression for created invoice',
  );

  // Clean up test fixture records
  await prisma.creanceClient.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.facture.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.voyage.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.invoiceSequence.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.client.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.companySettings.deleteMany({ where: { companyId: { in: [testCompanyId, testCompany2Id] } } });
  await prisma.company.deleteMany({ where: { id: { in: [testCompanyId, testCompany2Id] } } });

  console.log(`\n=== ALL ${passedCount} INVOICE SEQUENCE COLLISION TESTS PASSED SUCCESSFULLY ===\n`);
}

runSequenceCollisionTests()
  .catch((err) => {
    console.error('Sequence Collision Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
