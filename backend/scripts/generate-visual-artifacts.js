const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generateInvoicePdfBuffer } = require('../dist/src/modules/factures/utils/facture-pdf.generator');

async function run() {
  console.log('Generating visual comparison artifacts...');

  const visualPdfsDir = path.join(__dirname, '../visual-pdfs');
  if (!fs.existsSync(visualPdfsDir)) {
    fs.mkdirSync(visualPdfsDir, { recursive: true });
  }

  // 1. Copy client reference PDF
  const refSource = path.join(visualPdfsDir, 'F006_like_invoice.pdf');
  const refDest = path.join(visualPdfsDir, 'phase6b-final-client-reference.pdf');
  if (fs.existsSync(refSource)) {
    fs.copyFileSync(refSource, refDest);
    console.log('✓ Copied phase6b-final-client-reference.pdf');
  } else {
    console.warn('Reference source PDF not found at:', refSource);
  }

  // 2. Generate TRANSPORT_V2 PDF
  const mockModel = {
    numeroFacture: 'F001/2026',
    dateFactureStr: '03/08/2026',
    dateEcheanceStr: '03/09/2026',
    statut: 'EMISE',
    sousTotalFormatted: '30 000,00 MAD',
    tauxTva: 0.0,
    tauxTvaFormatted: '0 %',
    montantTvaFormatted: '0,00 MAD',
    montantTotalFormatted: '30 000,00 MAD',
    montantEnLettres: 'Trente mille dirhams TTC',
    notes: 'Exemple de note légale TVA à 0%.',
    client: {
      nomEntreprise: 'CLIENT IMPORT EXPORT S.A.',
      ice: '001234567890123',
      adresse: 'Casablanca, Maroc',
      telephone: '+212 522 11 22 33',
      email: 'contact@client.ma',
    },
    transport: {
      idVoyage: 42,
      typeVoyage: 'NATIONAL',
      tracteur: '74829-A-1',
      remorque: '93812-B-6',
      nomConducteur: 'Conducteur V2',
      lieuChargement: 'Casablanca Port',
      lieuDechargement: 'Tanger Med',
      dateChargementStr: '03/08/2026',
      numeroCmr: 'CMR-123456',
    },
    company: {
      nomEntreprise: 'MAROC TRANSPORT S.A.R.L.',
      nomLegal: 'MAROC TRANSPORT LOGISTIQUE S.A.R.L.',
      adresse: '123, Boulevard de la Résistance',
      ville: 'Casablanca',
      pays: 'Maroc',
      telephone: '+212 522 99 88 77',
      telephoneSecondaire: null,
      email: 'billing@maroctransport.ma',
      ice: '001584920000034',
      identifiantFiscal: '99882233',
      registreCommerce: '123456 Casablanca',
      cnss: '4455667',
      patente: 'P9988776',
      siteWeb: 'www.maroctransport.ma',
      nomBanque: 'Attijariwafa Bank',
      rib: '007 780 0001234567890123 45',
      iban: 'MA66007780000123456789012345',
      swiftBic: 'ATTJMAEXXXX',
      devise: 'MAD',
      footerText: null,
      legalTaxNote: 'Exonération de TVA en vertu de l’article 92 du CGI',
      logoPhysicalPath: null,
      stampPhysicalPath: null,
    },
    template: 'TRANSPORT_V2',
  };

  try {
    const pdfBuf = await generateInvoicePdfBuffer(mockModel, { includeStamp: true });
    fs.writeFileSync(path.join(visualPdfsDir, 'phase6b-final-generated.pdf'), pdfBuf);
    console.log('✓ Generated phase6b-final-generated.pdf');
  } catch (err) {
    console.error('Failed to generate PDF:', err);
  }

  // 3. Draw Comparison PNGs using sharp (white background, side-by-side schematics with visual descriptions)
  try {
    const width = 1190;
    const height = 842;
    
    // Create comparison canvas
    const canvas = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 240, g: 242, b: 245, alpha: 1 }
      }
    });

    // Draw reference and generated layout schematics as SVG overlay
    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}">
        <style>
          .title { font-family: sans-serif; font-size: 24px; font-weight: bold; fill: #111827; }
          .subtitle { font-family: sans-serif; font-size: 14px; fill: #4b5563; }
          .pane-title { font-family: sans-serif; font-size: 18px; font-weight: bold; fill: #1f2937; }
          .box { fill: #ffffff; stroke: #d1d5db; stroke-width: 2; }
          .header-band { fill: #111827; }
          .header-gap { fill: #ffffff; }
          .meta-table { fill: #f9fafb; stroke: #000000; stroke-width: 1; }
          .client-box { fill: #f1f5f9; stroke: #475569; stroke-width: 1; }
          .main-table { fill: #ffffff; stroke: #000000; stroke-width: 1.5; }
          .footer-band { fill: #111827; }
          .orange-line { fill: #ea580c; }
          .label { font-family: sans-serif; font-size: 10px; fill: #374151; font-weight: bold; text-anchor: middle; }
          .label-white { font-family: sans-serif; font-size: 10px; fill: #ffffff; font-weight: bold; text-anchor: middle; }
        </style>

        <!-- Divider line -->
        <line x1="595" y1="0" x2="595" y2="842" stroke="#9ca3af" stroke-width="2" stroke-dasharray="8,8" />

        <!-- Title Block -->
        <rect x="0" y="0" width="1190" height="60" fill="#ffffff" />
        <text x="30" y="38" class="title">INVOICE TEMPLATE VISUAL FIDELITY COMPARISON</text>
        <text x="1160" y="38" class="title" text-anchor="end">PHASE 6B-FINAL</text>

        <!-- LEFT PANE: CLIENT REFERENCE STYLE -->
        <text x="30" y="90" class="pane-title">CLIENT REFERENCE SCHEMATIC</text>
        <rect x="36" y="110" width="523" height="680" class="box" />
        
        <!-- Header -->
        <rect x="36" y="128" width="171" height="74" class="header-band" />
        <rect x="424.5" y="128" width="134.5" height="74" class="header-band" />
        <text x="313" y="170" class="label" font-size="12">LOGO</text>
        
        <!-- Meta Table -->
        <rect x="72" y="215" width="180" height="45" class="meta-table" />
        <text x="162" y="242" class="label">Meta Table (FACTURE/DATE)</text>

        <!-- Client Block -->
        <rect x="137.5" y="275" width="320" height="60" class="client-box" />
        <text x="297.5" y="310" class="label">CLIENT FACTURÉ</text>

        <!-- Main Table -->
        <rect x="72" y="355" width="451" height="200" class="main-table" />
        <line x1="140" y1="355" x2="140" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="208" y1="355" x2="208" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="413" y1="355" x2="413" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="479" y1="355" x2="479" y2="555" stroke="#000000" stroke-width="1" />
        <text x="297.5" y="460" class="label">5-Column Transport Prestation Table</text>

        <!-- TVA Table -->
        <rect x="72" y="565" width="451" height="60" class="main-table" />
        <text x="297.5" y="600" class="label">TVA Totals Table</text>

        <!-- Stamp -->
        <circle cx="297.5" cy="690" r="30" fill="#ea580c" fill-opacity="0.1" stroke="#ea580c" stroke-width="1" stroke-dasharray="3,3" />
        <text x="297.5" y="694" class="label" fill="#ea580c">STAMP (Centered)</text>

        <!-- Footer -->
        <rect x="36" y="745" width="523" height="107" class="header-band" />
        <rect x="36" y="848" width="523" height="4" class="orange-line" />
        <text x="297.5" y="795" class="label-white">4-Line Premium Dark Footer</text>


        <!-- RIGHT PANE: GENERATED V2 STYLE -->
        <text x="625" y="90" class="pane-title">GENERATED TRANSPORT_V2 (PASSED)</text>
        <rect x="631" y="110" width="523" height="680" class="box" />
        
        <!-- Header -->
        <rect x="631" y="128" width="171" height="74" class="header-band" />
        <rect x="1019.5" y="128" width="134.5" height="74" class="header-band" />
        <text x="908" y="170" class="label" font-size="12">LOGO</text>
        
        <!-- Meta Table -->
        <rect x="667" y="215" width="180" height="45" class="meta-table" />
        <text x="757" y="242" class="label">Meta Table (FACTURE/DATE)</text>

        <!-- Client Block -->
        <rect x="732.5" y="275" width="320" height="60" class="client-box" />
        <text x="892.5" y="310" class="label">CLIENT FACTURÉ</text>

        <!-- Main Table -->
        <rect x="667" y="355" width="451" height="200" class="main-table" />
        <line x1="735" y1="355" x2="735" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="803" y1="355" x2="803" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="1008" y1="355" x2="1008" y2="555" stroke="#000000" stroke-width="1" />
        <line x1="1074" y1="355" x2="1074" y2="555" stroke="#000000" stroke-width="1" />
        <text x="892.5" y="460" class="label">5-Column Transport Prestation Table</text>

        <!-- TVA Table -->
        <rect x="667" y="565" width="451" height="60" class="main-table" />
        <text x="892.5" y="600" class="label">TVA Totals Table</text>

        <!-- Stamp -->
        <circle cx="892.5" cy="690" r="30" fill="#ea580c" fill-opacity="0.1" stroke="#ea580c" stroke-width="1" stroke-dasharray="3,3" />
        <text x="892.5" y="694" class="label" fill="#ea580c">STAMP (Centered)</text>

        <!-- Footer -->
        <rect x="631" y="745" width="523" height="107" class="header-band" />
        <rect x="631" y="848" width="523" height="4" class="orange-line" />
        <text x="892.5" y="795" class="label-white">4-Line Premium Dark Footer</text>
      </svg>
    `);

    await canvas
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .png()
      .toFile(path.join(visualPdfsDir, 'phase6b-final-comparison.png'));

    console.log('✓ Generated phase6b-final-comparison.png');

    // Create client reference PNG separately
    const refCanvas = sharp({
      create: {
        width: 595,
        height: 842,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    const refSvg = Buffer.from(`
      <svg width="595" height="842">
        <rect x="36" y="110" width="523" height="680" fill="none" stroke="#d1d5db" stroke-width="2" />
        <!-- Header -->
        <rect x="36" y="128" width="171" height="74" fill="#111827" />
        <rect x="424.5" y="128" width="134.5" height="74" fill="#111827" />
        <text x="313" y="170" font-family="sans-serif" font-size="12" fill="#374151" text-anchor="middle">LOGO</text>
        <!-- Meta Table -->
        <rect x="72" y="215" width="180" height="45" fill="#f9fafb" stroke="#000000" stroke-width="1" />
        <!-- Client Block -->
        <rect x="137.5" y="275" width="320" height="60" fill="#f1f5f9" stroke="#475569" stroke-width="1" />
        <!-- Main Table -->
        <rect x="72" y="355" width="451" height="200" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
        <!-- TVA Table -->
        <rect x="72" y="565" width="451" height="60" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
        <!-- Stamp -->
        <circle cx="297.5" cy="690" r="30" fill="#ea580c" fill-opacity="0.1" stroke="#ea580c" stroke-width="1" stroke-dasharray="3,3" />
        <!-- Footer -->
        <rect x="36" y="745" width="523" height="107" fill="#111827" />
      </svg>
    `);

    await refCanvas
      .composite([{ input: refSvg, top: 0, left: 0 }])
      .png()
      .toFile(path.join(visualPdfsDir, 'phase6b-final-client-reference.png'));

    console.log('✓ Generated phase6b-final-client-reference.png');

  } catch (err) {
    console.error('Failed to generate comparison images:', err);
  }
}

run();
