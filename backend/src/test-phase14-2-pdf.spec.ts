import {
  generateInvoicePdfBuffer,
  InvoicePdfViewModel,
} from './modules/factures/utils/facture-pdf.generator';
import { UnprocessableEntityException } from '@nestjs/common';

async function testPdfGeneratorUnit() {
  console.log('=== RUNNING DATABASE-INDEPENDENT PDF GENERATOR UNIT TESTS ===');

  const validViewModel: InvoicePdfViewModel = {
    numeroFacture: '2026-1',
    dateFactureStr: '25/07/2026',
    dateEcheanceStr: '24/08/2026',
    statut: 'EMISE',
    sousTotalFormatted: '30 000,00 MAD',
    tauxTva: 20.0,
    tauxTvaFormatted: '20,00 %',
    montantTvaFormatted: '6 000,00 MAD',
    montantTotalFormatted: '36 000,00 MAD',
    montantEnLettres: 'Trente-six mille dirhams TTC',
    notes: 'Transport de conteneurs 40ft',
    client: {
      nomEntreprise: 'Client Test S.A.',
      ice: '001928374000088',
      adresse: 'Zone Industrielle, Mohammedia',
      telephone: '+212 522 99 88 77',
      email: 'client@test.com',
    },
    transport: {
      idVoyage: 42,
      typeVoyage: 'NATIONAL',
      tracteur: '12345-A-1',
      remorque: '67890-B-1',
      nomConducteur: 'Mohammed Alami',
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      dateChargementStr: '25/07/2026',
      numeroCmr: 'CMR-2026-0042',
    },
    company: {
      nomEntreprise: 'LOGISTIQUE & TRANSPORT MA',
      nomLegal: 'LOGISTIQUE & TRANSPORT MA S.A.R.L.',
      adresse: '125, Boulevard Zerktouni',
      ville: 'Casablanca',
      pays: 'Maroc',
      telephone: '+212 522 12 34 56',
      telephoneSecondaire: null,
      email: 'contact@logistique-transport.ma',
      ice: '001584920000034',
      identifiantFiscal: '40293841',
      registreCommerce: '145892 Casablanca',
      cnss: '7849201',
      patente: 'P1234567',
      siteWeb: 'www.logistique-transport.ma',
      nomBanque: 'Attijariwafa Bank',
      rib: '245 780 0001234567890123 45',
      iban: 'MA66245780000123456789012345',
      swiftBic: 'BCMARAMCXXX',
      devise: 'MAD',
      footerText: null,
      legalTaxNote: null,
      logoPhysicalPath: null,
      stampPhysicalPath: null,
    },
    template: 'CLASSIC_TRANSPORT',
  };

  // 1. Valid PDF generation without stamp
  const pdfBufferWithoutStamp = await generateInvoicePdfBuffer(validViewModel, {
    includeStamp: false,
  });
  if (pdfBufferWithoutStamp && pdfBufferWithoutStamp.toString('utf8', 0, 5) === '%PDF-') {
    console.log('✓ Unit Test 1 Passed: Generated PDF magic bytes valid (%PDF-) without stamp');
  } else {
    throw new Error('Unit Test 1 Failed: Generated PDF buffer header is invalid');
  }

  // 2. Valid PDF generation with stamp flag
  const pdfBufferWithStamp = await generateInvoicePdfBuffer(validViewModel, { includeStamp: true });
  if (pdfBufferWithStamp && pdfBufferWithStamp.toString('utf8', 0, 5) === '%PDF-') {
    console.log(
      '✓ Unit Test 2 Passed: Generated PDF magic bytes valid (%PDF-) with includeStamp=true',
    );
  } else {
    throw new Error('Unit Test 2 Failed: Generated PDF buffer header is invalid');
  }

  // 3. Unsupported template rejection
  try {
    const invalidViewModel = { ...validViewModel, template: 'UNSUPPORTED_DESIGNER' };
    await generateInvoicePdfBuffer(invalidViewModel, { includeStamp: false });
    throw new Error('Unit Test 3 Failed: Unsupported template was not rejected');
  } catch (err) {
    if (err instanceof UnprocessableEntityException) {
      console.log(
        '✓ Unit Test 3 Passed: Unsupported template explicitly rejected with UnprocessableEntityException',
      );
    } else {
      throw err;
    }
  }

  console.log('=== ALL PDF GENERATOR UNIT TESTS PASSED ===\n');
}

testPdfGeneratorUnit().catch((err) => {
  console.error('PDF Unit Test Failed:', err);
  process.exit(1);
});
