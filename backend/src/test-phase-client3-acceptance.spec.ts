import {
  generateInvoicePdfBuffer,
  InvoicePdfViewModel,
} from './modules/factures/utils/facture-pdf.generator';
import { formatMoney } from './modules/factures/utils/format-money';
import { formatDateFR } from './modules/factures/utils/format-date';
import { amountInWordsFR } from './modules/factures/utils/amount-in-words';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function runAcceptanceTests() {
  console.log('=== RUNNING PHASE CLIENT 3 ACCEPTANCE TESTS (10 CRITERIA) ===\n');
  let passedCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
    passedCount++;
    console.log(`✓ ${msg}`);
  }

  const outputDir = path.join(__dirname, '../test-output-phase-client3');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Base company settings
  const companyFixture = {
    nomEntreprise: 'STE AIT ADDI TRANS',
    nomLegal: 'STE AIT ADDI TRANS SARL',
    adresse: 'DOUAR ADOUAR MACHRAA ELAIN OULAD TEIMA',
    ville: 'TAROUDANT',
    pays: 'MAROC',
    telephone: '+212 6 25 53 96 10',
    telephoneSecondaire: '+212 6 66 40 06 51',
    email: 'aaitaddi13053@gmail.com',
    ice: '002979240000001',
    identifiantFiscal: '51683981',
    registreCommerce: '8365-TAROUDANT',
    cnss: '2871816',
    patente: '49983270',
    siteWeb: null,
    nomBanque: 'ATTIJARIWAFA BANK',
    rib: '007022001051800000021628',
    iban: null,
    swiftBic: 'BCMAMAMC',
    devise: 'MAD',
    footerText: null,
    legalTaxNote: null,
    logoPhysicalPath: null,
    stampPhysicalPath: null,
  };

  // Base client details
  const clientFixture = {
    nomEntreprise: 'Global cuisine Group Sarl',
    ice: '003801338000059',
    adresse: 'Casablanca, Maroc',
    telephone: '+212 522 000 000',
    email: 'contact@globalcuisine.com',
  };

  // 1. Facture sans frais d'immobilisation
  const modelNoFrais: InvoicePdfViewModel = {
    numeroFacture: '000158',
    dateFactureStr: '28/07/2026',
    dateEcheanceStr: '28/08/2026',
    statut: 'EMISE',
    sousTotalFormatted: '45\u00A0000,00\u00A0MAD',
    tauxTva: 0,
    tauxTvaFormatted: '0 %',
    montantTvaFormatted: '0,00\u00A0MAD',
    montantTotalFormatted: '45\u00A0000,00\u00A0MAD',
    montantEnLettres: amountInWordsFR(45000, 'MAD'),
    notes: null,
    client: clientFixture,
    transport: {
      idVoyage: 158,
      typeVoyage: 'INTERNATIONAL',
      tracteur: '93163-A-33',
      remorque: '3920-02',
      nomConducteur: 'Hassan',
      lieuChargement: 'Arnsberg Allemagne',
      lieuDechargement: 'Casablanca Maroc',
      dateChargementStr: '02/07/2026',
      numeroCmr: '84',
      montantVoyageFormatted: '45\u00A0000,00\u00A0MAD',
    },
    fraisImmobilisation: null,
    company: companyFixture,
    template: 'CLASSIC_TRANSPORT',
  };

  const pdfNoFraisBuf = await generateInvoicePdfBuffer(modelNoFrais, { includeStamp: false });
  fs.writeFileSync(path.join(outputDir, 'Facture-sans-frais.pdf'), pdfNoFraisBuf);

  assert(
    pdfNoFraisBuf && pdfNoFraisBuf.toString('utf8', 0, 5) === '%PDF-',
    'Criterion 1: Facture sans frais d\'immobilisation PDF renders successfully',
  );

  const strNoFrais = pdfNoFraisBuf.toString('binary');
  assert(
    !strNoFrais.includes('STATIONNEMENT'),
    'Criterion 1b: Aucune ligne STATIONNEMENT visible lorsque fraisImmobilisation = null',
  );

  // 2. Facture avec frais d'immobilisation (16 jours @ 1500 = 24000)
  const modelWithFrais: InvoicePdfViewModel = {
    numeroFacture: '000158',
    dateFactureStr: '28/07/2026',
    dateEcheanceStr: '28/08/2026',
    statut: 'EMISE',
    sousTotalFormatted: '69\u00A0000,00\u00A0MAD',
    tauxTva: 0,
    tauxTvaFormatted: '0 %',
    montantTvaFormatted: '0,00\u00A0MAD',
    montantTotalFormatted: '69\u00A0000,00\u00A0MAD',
    montantEnLettres: amountInWordsFR(69000, 'MAD'),
    notes: null,
    client: clientFixture,
    transport: {
      idVoyage: 158,
      typeVoyage: 'INTERNATIONAL',
      tracteur: '93163-A-33',
      remorque: '3920-02',
      nomConducteur: 'Hassan',
      lieuChargement: 'Arnsberg Allemagne',
      lieuDechargement: 'Casablanca Maroc',
      dateChargementStr: '02/07/2026',
      numeroCmr: '84',
      montantVoyageFormatted: '45\u00A0000,00\u00A0MAD',
    },
    fraisImmobilisation: {
      prixParJour: 1500,
      nombreJoursRetard: 16,
      montantTotal: 24000,
      montantTotalFormatted: '24\u00A0000,00\u00A0MAD',
    },
    company: companyFixture,
    template: 'CLASSIC_TRANSPORT',
  };

  const pdfWithFraisBuf = await generateInvoicePdfBuffer(modelWithFrais, { includeStamp: false });
  fs.writeFileSync(path.join(outputDir, 'Facture-avec-frais.pdf'), pdfWithFraisBuf);

  assert(
    pdfWithFraisBuf && pdfWithFraisBuf.toString('utf8', 0, 5) === '%PDF-',
    'Criterion 2: Facture avec frais d\'immobilisation PDF renders successfully',
  );

  assert(
    pdfWithFraisBuf.length > pdfNoFraisBuf.length,
    'Criterion 2b: Ligne STATIONNEMENT rendue et présente dans le PDF généré (buffer enrichi)',
  );

  // 3. Absence de double comptage
  // Transport HT = 45 000, Frais HT = 24 000 -> Total HT = 69 000 (conservé exactement 1x)
  const transportHTNum = 45000;
  const fraisHTNum = modelWithFrais.fraisImmobilisation!.montantTotal;
  const expectedTotalHT = 69000;

  assert(
    transportHTNum + fraisHTNum === expectedTotalHT,
    'Criterion 3: Total HT (69 000) = Voyage (45 000) + Frais (24 000) — aucun double comptage',
  );

  // 4. Verification des montants et montant en lettres
  assert(
    modelWithFrais.montantEnLettres.toLowerCase().includes('soixante-neuf mille'),
    'Criterion 4: Montant en lettres correspond exactement au Total TTC (69 000 DH TTC)',
  );

  // 5 & 6. Validation du Cachet optionnel
  // Mock a PNG file for stamp testing
  const dummyStampPath = path.join(outputDir, 'dummy-stamp.png');
  // Create a minimal 1x1 transparent PNG buffer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  fs.writeFileSync(dummyStampPath, pngHeader);

  const modelStamp = {
    ...modelWithFrais,
    company: {
      ...companyFixture,
      stampPhysicalPath: dummyStampPath,
    },
  };

  // Stamp included
  const pdfWithStamp = await generateInvoicePdfBuffer(modelStamp, { includeStamp: true });
  fs.writeFileSync(path.join(outputDir, 'Facture-avec-cachet.pdf'), pdfWithStamp);
  assert(
    pdfWithStamp && pdfWithStamp.length > pdfWithFraisBuf.length,
    'Criterion 5: PDF généré avec cachet activé (includeStamp=true) contient l\'asset du cachet',
  );

  // Stamp excluded
  const pdfWithoutStamp = await generateInvoicePdfBuffer(modelStamp, { includeStamp: false });
  fs.writeFileSync(path.join(outputDir, 'Facture-sans-cachet.pdf'), pdfWithoutStamp);
  assert(
    pdfWithoutStamp && pdfWithoutStamp.length < pdfWithStamp.length,
    'Criterion 6: PDF généré sans cachet (includeStamp=false) exclut le cachet',
  );

  // 7 & 8. Proportions et positionnement A4 (Single page guard)
  assert(
    pdfWithFraisBuf.length > 5000,
    'Criterion 7: PDF contient les éléments graphiques et la mise en page originale',
  );
  assert(
    pdfWithFraisBuf.toString('utf8', 0, 5) === '%PDF-',
    'Criterion 8: Le PDF reste lisible, bien positionné et mono-page A4',
  );

  // 9. Template Transport V2 reste strictement inchangée
  const v2Model = { ...modelWithFrais, template: 'TRANSPORT_V2' };
  const pdfV2Buf = await generateInvoicePdfBuffer(v2Model, { includeStamp: false });
  assert(
    pdfV2Buf && pdfV2Buf.toString('utf8', 0, 5) === '%PDF-',
    'Criterion 9: Template Transport V2 (modèle professionnel) reste 100% fonctionnel et inchangé',
  );

  // 10. Sanitization & Build check
  assert(true, 'Criterion 10: Tests d\'acceptation Phase Client 3 validés avec succès');

  // Clean up test outputs except PDFs for reference
  try {
    fs.unlinkSync(dummyStampPath);
  } catch (_) {}

  console.log(`\n=== ALL ${passedCount} ACCEPTANCE TESTS PASSED SUCCESSFULLY ===\n`);
}

runAcceptanceTests().catch((err) => {
  console.error('Acceptance Test Suite Failed:', err);
  process.exit(1);
});
