import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';

// ─────────────────────────────────────────────────────────────────────────────
// ViewModel Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoicePdfViewModel {
  numeroFacture: string;
  dateFactureStr: string; // 'dd/MM/yyyy'
  dateEcheanceStr: string; // 'dd/MM/yyyy' or '—'
  statut: string;
  sousTotalFormatted: string;
  tauxTva: number; // numeric rate for conditional rendering
  tauxTvaFormatted: string;
  montantTvaFormatted: string;
  montantTotalFormatted: string;
  montantEnLettres: string;
  notes: string | null;
  client: {
    nomEntreprise: string;
    ice: string | null;
    adresse: string | null;
    telephone: string | null;
    email: string | null; // available, not rendered by default
  };
  transport: {
    idVoyage: number;
    typeVoyage: string;
    tracteur: string | null;
    remorque: string | null;
    nomConducteur: string | null;
    lieuChargement: string;
    lieuDechargement: string;
    dateChargementStr: string;
    numeroCmr: string | null;
    montantVoyageFormatted?: string;
  } | null;
  fraisImmobilisation?: {
    prixParJour: number;
    nombreJoursRetard: number;
    montantTotal: number;
    montantTotalFormatted: string;
  } | null;
  company: {
    nomEntreprise: string;
    nomLegal: string | null;
    adresse: string;
    ville: string | null;
    pays: string | null;
    telephone: string;
    telephoneSecondaire: string | null;
    email: string;
    ice: string | null;
    identifiantFiscal: string | null;
    registreCommerce: string | null;
    cnss: string | null;
    patente: string | null;
    siteWeb: string | null;
    nomBanque: string | null;
    rib: string | null;
    iban: string | null;
    swiftBic: string | null;
    devise: string;
    footerText: string | null;
    legalTaxNote: string | null;
    logoPhysicalPath: string | null;
    stampPhysicalPath: string | null;
  };
  template: string;
  devise?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filename Sanitizer
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\//g, '-') // F003/2026 → F003-2026
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // remaining specials → _
    .replace(/_+/g, '_');
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to draw a double rectangle border matching standard invoice style.
 */
function drawDoubleRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeColor = '#000000',
  innerGap = 1.5,
) {
  doc.lineWidth(0.8).strokeColor(strokeColor).rect(x, y, width, height).stroke();
  doc
    .lineWidth(0.5)
    .strokeColor(strokeColor)
    .rect(x + innerGap, y + innerGap, width - innerGap * 2, height - innerGap * 2)
    .stroke();
}

/**
 * Safely draws an image, trimming transparent margins in memory, skipping WEBP/SVG/GIF.
 * Never exposes the physical file path in logs.
 */
async function drawImageSafelyAsync(
  doc: PDFKit.PDFDocument,
  filePath: string | null | undefined,
  x: number,
  y: number,
  options: { fit: [number, number] },
): Promise<boolean> {
  if (!filePath) return false;

  const ext = path.extname(filePath).toLowerCase();
  const supported = ['.png', '.jpg', '.jpeg'];

  if (!supported.includes(ext)) {
    console.warn(`[PDF WARN] Image extension "${ext}" is not supported by PDFKit — image skipped.`);
    return false;
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[PDF WARN] Image file not found (ext: ${ext}) — image skipped.`);
    return false;
  }

  try {
    // Crop transparent margins in memory using sharp!
    const trimmedBuffer = await sharp(filePath).trim().toBuffer();

    doc.image(trimmedBuffer, x, y, options);
    return true;
  } catch (err: any) {
    console.warn(
      `[PDF WARN] Image trim failed (ext: ${ext}), attempting direct render: ${err?.message}`,
    );
    try {
      doc.image(filePath, x, y, options);
      return true;
    } catch (fallbackErr: any) {
      console.warn(`[PDF WARN] Direct image render failed (ext: ${ext}): ${fallbackErr?.message}`);
      return false;
    }
  }
}

/**
 * Measures text height at given font/size and truncates with ellipsis if it
 * exceeds the allocated number of lines.
 */
function fitText(
  doc: PDFKit.PDFDocument,
  text: string,
  options: { width: number; maxLines: number; fontSize: number; font?: string },
): string {
  if (!text) return '';

  const font = options.font || 'Helvetica';
  doc.font(font).fontSize(options.fontSize);

  const lineHeight = doc.currentLineHeight(true);
  const maxHeight = lineHeight * options.maxLines;

  // Fast path: text fits
  const fullHeight = doc.heightOfString(text, { width: options.width, lineBreak: true });
  if (fullHeight <= maxHeight + 0.5) return text;

  // Truncate word-by-word
  const words = text.split(' ');
  let truncated = '';
  for (let i = 0; i < words.length; i++) {
    const candidate = truncated ? `${truncated} ${words[i]}` : words[i];
    const candidateWithEllipsis = `${candidate}…`;
    const h = doc.heightOfString(candidateWithEllipsis, { width: options.width, lineBreak: true });
    if (h > maxHeight + 0.5) {
      return truncated ? `${truncated}…` : `${words[0]}…`;
    }
    truncated = candidate;
  }
  return `${truncated}…`;
}

/**
 * Y-bound guard for TRANSPORT_V2.
 * Throws if a draw operation would exceed the safe bottom margin.
 */
function assertSafeY(y: number, height: number = 0, label: string = ''): void {
  const SAFE_MAX = 820;
  if (y + height > SAFE_MAX) {
    throw new Error(
      `[PDF LAYOUT ERROR] Drawing operation "${label}" at Y=${y} height=${height} exceeds safe bottom margin Y=${SAFE_MAX}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC_TRANSPORT renderer (faithful reproduction of Facture158(1).pdf model)
// ─────────────────────────────────────────────────────────────────────────────

async function renderClassicTransport(
  viewModel: InvoicePdfViewModel,
  options: { includeStamp: boolean },
  resolve: (buf: Buffer) => void,
  reject: (err: Error) => void,
): Promise<void> {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      compress: false,
      info: {
        Title: `Facture ${viewModel.numeroFacture}`,
        Author: viewModel.company.nomEntreprise || 'Transport Management ERP',
        Subject: `Facture de transport ${viewModel.numeroFacture}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', (err) => reject(err));

    const PRIMARY = '#262626'; // Dark charcoal header & footer background
    const ORANGE = '#ea580c'; // Bottom orange accent bar
    const DARK = '#000000';
    const LIGHT_BG = '#e6eef4'; // Centered client box background (light gray-blue)
    const BORDER_COLOR = '#000000';

    // ── A. En-tête (Top Accent Bar & Logo) ───────────────────────────────────
    // Left dark charcoal rectangle
    doc.rect(0, 18, 207.5, 74).fill(PRIMARY);
    // Right dark charcoal rectangle
    doc.rect(387.5, 18, 207.5, 74).fill(PRIMARY);

    // Center company logo
    const hasLogo = await drawImageSafelyAsync(
      doc,
      viewModel.company.logoPhysicalPath,
      212.5,
      27,
      { fit: [170, 56] },
    );

    if (!hasLogo) {
      const fallbackNameFitted = fitText(doc, viewModel.company.nomEntreprise, {
        width: 170,
        maxLines: 2,
        fontSize: 10,
        font: 'Helvetica-Bold',
      });
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(fallbackNameFitted, 212.5, 36, { width: 170, align: 'center' });
    }

    // ── B. Tableau En-tête : FACTURE / DATE ──────────────────────────────────
    const metaX = 40;
    const metaY = 105;
    const metaW = 180;
    const metaH = 45;
    const metaCellW = 90;
    const metaHdrH = 20;

    // Double rect for FACTURE/DATE
    drawDoubleRect(doc, metaX, metaY, metaW, metaH, BORDER_COLOR, 1.5);
    // Inner divider lines
    doc
      .lineWidth(0.75)
      .strokeColor(BORDER_COLOR)
      .moveTo(metaX + metaCellW, metaY)
      .lineTo(metaX + metaCellW, metaY + metaH)
      .moveTo(metaX, metaY + metaHdrH)
      .lineTo(metaX + metaW, metaY + metaHdrH)
      .stroke();

    // Text in metadata box
    doc
      .fillColor(DARK)
      .fontSize(9.5)
      .font('Helvetica-BoldOblique')
      .text('FACTURE', metaX, metaY + 5, { width: metaCellW, align: 'center' })
      .text('DATE', metaX + metaCellW, metaY + 5, { width: metaCellW, align: 'center' });

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(viewModel.numeroFacture, metaX, metaY + metaHdrH + 6, { width: metaCellW, align: 'center' })
      .text(viewModel.dateFactureStr, metaX + metaCellW, metaY + metaHdrH + 6, { width: metaCellW, align: 'center' });

    // ── C. Bloc Client Centré ────────────────────────────────────────────────
    const clientW = 360;
    const clientH = 60;
    const clientX = Math.round((595 - clientW) / 2);
    const clientY = 165;

    doc.rect(clientX, clientY, clientW, clientH).fillAndStroke(LIGHT_BG, BORDER_COLOR);

    doc
      .fillColor(DARK)
      .fontSize(12)
      .font('Helvetica-BoldOblique')
      .text(viewModel.client.nomEntreprise, clientX + 10, clientY + 14, {
        width: clientW - 20,
        align: 'center',
      });

    doc
      .fontSize(11)
      .font('Helvetica-BoldOblique')
      .text(`ICE : ${viewModel.client.ice || '—'}`, clientX + 10, clientY + 33, {
        width: clientW - 20,
        align: 'center',
      });

    // ── D. Tableau Principal ─────────────────────────────────────────────────
    const tblX = 40;
    const tblY = 250;
    const tblW = 515;
    const col1W = 300; // Désignation
    const col2W = 105; // P,UNITAIRE H.T
    const col3W = 110; // TOTAL HT

    const col1X = tblX;
    const col2X = tblX + col1W;
    const col3X = tblX + col1W + col2W;

    const hasStationnement = Boolean(
      viewModel.fraisImmobilisation &&
        viewModel.fraisImmobilisation.montantTotal > 0,
    );

    const tblBodyH = 175;
    const tblTotalH = 22 + tblBodyH; // Header + Body

    // Draw outer double rect for entire main table
    drawDoubleRect(doc, tblX, tblY, tblW, tblTotalH, BORDER_COLOR, 1.5);

    // Inner divider lines
    // Horizontal header line
    doc
      .lineWidth(0.75)
      .strokeColor(BORDER_COLOR)
      .moveTo(tblX, tblY + 22)
      .lineTo(tblX + tblW, tblY + 22)
      // Vertical column dividers
      .moveTo(col2X, tblY)
      .lineTo(col2X, tblY + tblTotalH)
      .moveTo(col3X, tblY)
      .lineTo(col3X, tblY + tblTotalH)
      .stroke();

    // Table Headers
    doc
      .fillColor(DARK)
      .fontSize(9.5)
      .font('Helvetica-BoldOblique')
      .text('Désignation', col1X, tblY + 6, { width: col1W, align: 'center' })
      .text('P,UNITAIRE H.T', col2X, tblY + 6, { width: col2W, align: 'center' })
      .text('TOTAL HT', col3X, tblY + 6, { width: col3W, align: 'center' });

    // Table Row 1: Transport Prestation
    const row1Y = tblY + 28;

    const stripCurrency = (val: string): string => {
      return val.replace(/\s*[A-Za-z]+$/i, '').trim();
    };

    let transportHTStr = viewModel.sousTotalFormatted;
    if (hasStationnement && viewModel.transport?.montantVoyageFormatted) {
      transportHTStr = viewModel.transport.montantVoyageFormatted;
    }
    const transportHTNumeric = stripCurrency(transportHTStr);

    doc.fillColor(DARK).fontSize(9).font('Helvetica');

    if (viewModel.transport) {
      // Désignation transport details
      const line1 = 'Transprt de m/ses';
      const line2 = `Date De Chargement:${viewModel.transport.dateChargementStr}`;
      const line3 = `${viewModel.transport.lieuChargement} à ${viewModel.transport.lieuDechargement}`;
      const line4 = `CMR N° ${viewModel.transport.numeroCmr || '—'}`;
      const remorqueText = viewModel.transport.remorque ? ` Frigo ${viewModel.transport.remorque}` : '';
      const line5 = `Camion : ${viewModel.transport.tracteur || '—'}${remorqueText}`;

      doc
        .text(line1, col1X + 10, row1Y, { width: col1W - 20, align: 'center' })
        .text(line2, col1X + 10, row1Y + 14, { width: col1W - 20, align: 'center' })
        .text(line3, col1X + 10, row1Y + 28, { width: col1W - 20, align: 'center' })
        .text(line4, col1X + 10, row1Y + 42, { width: col1W - 20, align: 'center' })
        .text(line5, col1X + 10, row1Y + 56, { width: col1W - 20, align: 'center' });
    } else {
      const defaultDesc = `Prestation de transport routier & logistique\nFacture N° ${viewModel.numeroFacture}`;
      doc.text(defaultDesc, col1X + 10, row1Y + 10, { width: col1W - 20, align: 'center' });
    }

    // Transport P,UNITAIRE H.T & TOTAL HT
    doc
      .text(transportHTNumeric, col2X + 5, row1Y + 14, { width: col2W - 10, align: 'center' })
      .text(transportHTNumeric, col3X + 5, row1Y + 14, { width: col3W - 10, align: 'center' });

    // Table Row 2: STATIONNEMENT (if present)
    if (hasStationnement && viewModel.fraisImmobilisation) {
      const row2Y = row1Y + 80;
      const joursStr = viewModel.fraisImmobilisation.nombreJoursRetard > 0
        ? `${viewModel.fraisImmobilisation.nombreJoursRetard} jours `
        : '';
      const stationnementDesc = `STATIONNEMENT ${joursStr}:`;
      const stationnementNumeric = stripCurrency(viewModel.fraisImmobilisation.montantTotalFormatted);

      doc
        .text(stationnementDesc, col1X + 10, row2Y, { width: col1W - 20, align: 'center' })
        .text(stationnementNumeric, col2X + 5, row2Y, { width: col2W - 10, align: 'center' })
        .text(stationnementNumeric, col3X + 5, row2Y, { width: col3W - 10, align: 'center' });
    }

    // ── E. Tableau des Totaux (Sous-tableau aligné à droite) ─────────────────
    const totalsY = tblY + tblTotalH; // Directly below main table (y = 447)
    const totalsW = col2W + col3W; // 215 pt (from col2X = 340 to 555)
    const totalsX = col2X;
    const totalsRowH = 20;
    const totalsH = totalsRowH * 3; // 60 pt

    // Outer double rect for totals
    drawDoubleRect(doc, totalsX, totalsY, totalsW, totalsH, BORDER_COLOR, 1.5);

    // Dividers
    doc
      .lineWidth(0.75)
      .strokeColor(BORDER_COLOR)
      // Vertical divider matching main table col3X
      .moveTo(col3X, totalsY)
      .lineTo(col3X, totalsY + totalsH)
      // Horizontal row dividers
      .moveTo(totalsX, totalsY + totalsRowH)
      .lineTo(totalsX + totalsW, totalsY + totalsRowH)
      .moveTo(totalsX, totalsY + totalsRowH * 2)
      .lineTo(totalsX + totalsW, totalsY + totalsRowH * 2)
      .stroke();

    // Row 1: Total HT
    doc
      .fillColor(DARK)
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text('Total HT', totalsX + 5, totalsY + 5, { width: col2W - 10, align: 'center' })
      .font('Helvetica')
      .text(stripCurrency(viewModel.sousTotalFormatted), col3X + 5, totalsY + 5, { width: col3W - 10, align: 'right' });

    // Row 2: TVA
    doc
      .font('Helvetica-Bold')
      .text(`TVA ${viewModel.tauxTvaFormatted}`, totalsX + 5, totalsY + totalsRowH + 5, { width: col2W - 10, align: 'center' })
      .font('Helvetica')
      .text(stripCurrency(viewModel.montantTvaFormatted), col3X + 5, totalsY + totalsRowH + 5, { width: col3W - 10, align: 'right' });

    // Row 3: Total TTC
    doc
      .font('Helvetica-Bold')
      .text('Total TTC', totalsX + 5, totalsY + totalsRowH * 2 + 5, { width: col2W - 10, align: 'center' })
      .text(stripCurrency(viewModel.montantTotalFormatted), col3X + 5, totalsY + totalsRowH * 2 + 5, { width: col3W - 10, align: 'right' });

    // ── F. Montant en Lettres & Mention Légale TVA ───────────────────────────
    let textY = totalsY + totalsH + 20; // ~527

    if (viewModel.montantEnLettres) {
      doc
        .fillColor(DARK)
        .fontSize(9.5)
        .font('Helvetica-BoldOblique')
        .text('Arrêté la présente facture à la somme de :', 40, textY, { underline: true });
      textY += 16;

      doc
        .font('Helvetica-BoldOblique')
        .text(viewModel.montantEnLettres, 40, textY, { underline: true });
      textY += 30;
    }

    const isTvaZero = (val: any): boolean => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'number') return val === 0;
      if (typeof val === 'string') {
        const cleaned = val.trim();
        return cleaned === '0' || cleaned === '0.00' || parseFloat(cleaned) === 0;
      }
      if (typeof val === 'object') {
        if (typeof val.isZero === 'function') return val.isZero();
        if (typeof val.toNumber === 'function') return val.toNumber() === 0;
      }
      return parseFloat(String(val)) === 0;
    };

    let legalNoteBottomY = textY;
    if (isTvaZero(viewModel.tauxTva)) {
      const defaultNote =
        "Vente exonérée de la TVA conformément à l'article 92-1-35 du code général des Impôts relatif à la TVA liée au Transport International.";
      const noteToRender =
        viewModel.company.legalTaxNote && viewModel.company.legalTaxNote.trim().length > 0
          ? viewModel.company.legalTaxNote.trim()
          : defaultNote;

      const noteHeight = doc.heightOfString(noteToRender, { width: 515 });
      doc
        .fillColor(DARK)
        .fontSize(8.5)
        .font('Helvetica-BoldOblique')
        .text(noteToRender, 40, textY, {
          width: 515,
          align: 'center',
          underline: true,
        });
      legalNoteBottomY = textY + noteHeight;
      textY += noteHeight + 15;
    }

    // ── G. Cachet Optionnel (Stamp) ──────────────────────────────────────────
    if (options.includeStamp) {
      const stampY = Math.max(legalNoteBottomY + 10, 620);
      const maxStampH = Math.min(95, 730 - stampY);
      const stampW = 150;
      const stampX = Math.round((595 - stampW) / 2);

      await drawImageSafelyAsync(doc, viewModel.company.stampPhysicalPath, stampX, stampY, {
        fit: [stampW, maxStampH],
      });
    }

    // ── H. Pied de Page (Footer Dark Band + Orange Bottom Bar) ────────────────
    const footerY = 735;
    const footerH = 103;

    // Dark background bar
    doc.rect(0, footerY, 595, footerH).fill(PRIMARY);

    // Thin Orange accent bar at bottom
    doc.rect(0, footerY + footerH - 4, 595, 4).fill(ORANGE);

    const fY = footerY + 12;

    const buildLine = (
      parts: { label: string; value: string | null | undefined }[],
      separator = '   -   ',
    ): string => {
      return parts
        .filter((p) => p.value && p.value.trim().length > 0)
        .map((p) => `${p.label}${p.value!.trim()}`)
        .join(separator);
    };

    // Line 1: SIEGE SOCIAL
    const addrParts = [viewModel.company.adresse, viewModel.company.ville, viewModel.company.pays]
      .filter((p) => p && p.trim().length > 0)
      .map((p) => p!.trim());
    const siegeSocialStr = addrParts.join(', ');
    const line1 = siegeSocialStr ? `SIEGE SOCIAL : ${siegeSocialStr}` : '';
    if (line1) {
      doc
        .fillColor('#ffffff')
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(line1, 36, fY, { width: 523, align: 'center', lineBreak: false });
    }

    // Line 2: TEL / EMAIL
    const phoneVal = [viewModel.company.telephone, viewModel.company.telephoneSecondaire]
      .filter((p) => p && p.trim().length > 0)
      .map((p) => p!.trim())
      .join(' / ');
    const line2 = buildLine([
      { label: 'TEL: ', value: phoneVal },
      { label: 'EMAIL: ', value: viewModel.company.email },
    ]);
    if (line2) {
      doc
        .fillColor(ORANGE)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(line2, 36, fY + 15, { width: 523, align: 'center', lineBreak: false });
    }

    // Line 3: PATENTE / IF / RC / ICE / CNSS
    const line3 = buildLine([
      { label: 'PATENTE: ', value: viewModel.company.patente },
      { label: 'IF: ', value: viewModel.company.identifiantFiscal },
      { label: 'RC: ', value: viewModel.company.registreCommerce },
      { label: 'ICE: ', value: viewModel.company.ice },
      { label: 'CNSS: ', value: viewModel.company.cnss },
    ]);
    if (line3) {
      doc
        .fillColor(ORANGE)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(line3, 36, fY + 30, { width: 523, align: 'center', lineBreak: false });
    }

    // Line 4: RIB / BANQUE / SWIFT
    const line4 = buildLine([
      { label: 'RIB: ', value: viewModel.company.rib },
      { label: 'BANQUE: ', value: viewModel.company.nomBanque },
      { label: 'IBAN: ', value: viewModel.company.iban },
      { label: 'BIC-CODE SWIFT: ', value: viewModel.company.swiftBic },
    ]);
    if (line4) {
      doc
        .fillColor(ORANGE)
        .fontSize(6.5)
        .font('Helvetica-Bold')
        .text(line4, 36, fY + 45, { width: 523, align: 'center', lineBreak: false });
    }

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.end();
  } catch (err: any) {
    reject(err);
  }
}

// A4 safe zone constants for client reference invoice style
const V2 = {
  MARGIN: 36,
  CONTENT_W: 523, // 595 − 2×36
  RIGHT: 559, // 36 + 523
  // Y zones
  HEADER_Y: 18,
  HEADER_H: 74,
  META_TBL_Y: 105,
  META_TBL_H: 45,
  CLIENT_BOX_Y: 165,
  CLIENT_BOX_H: 60,
  TABLE_HDR_TOP: 245,
  TABLE_HDR_BOTTOM: 267,
  TABLE_ROW_TOP: 267,
  TABLE_ROW_BOTTOM: 445,
  TOTALS_TBL_HDR_Y: 455,
  TOTALS_TBL_ROW_Y: 480,
  TOTALS_TBL_ROW_H: 35,
  VAR_TOP: 525,
  VAR_CEIL: 565,
  LEGAL_Y: 570,
  LEGAL_H: 45,
  STAMP_DEFAULT_Y: 615,
  FOOTER_BG_Y: 735,
  FOOTER_BG_H: 107,
  // Dimensions
  LOGO_X: 212.5, // centered in the 180 pt gap (207.5 to 387.5)
  LOGO_Y: 27, // centered vertically in 74 pt height (18 + (74 - 56)/2 = 27)
  LOGO_MAX_W: 170, // 130–170 pt
  LOGO_MAX_H: 56, // 45–75 pt
  STAMP_MAX_W: 150, // visible width: 140–165 pt
  STAMP_MAX_H: 95, // visible height: maximum 95 pt
  // Colors
  PRIMARY: '#111827', // Dark charcoal/black
  ORANGE: '#ea580c', // Orange accent
  DARK: '#0f172a',
  GRAY: '#475569',
  LIGHT_BG: '#f1f5f9', // Light gray-blue
  BORDER: '#000000', // Traditional black borders
  WHITE: '#ffffff',
} as const;

async function renderTransportV2(
  viewModel: InvoicePdfViewModel,
  options: { includeStamp: boolean },
  resolve: (buf: Buffer) => void,
  reject: (err: Error) => void,
): Promise<void> {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      info: {
        Title: `Facture ${viewModel.numeroFacture}`,
        Author: viewModel.company.nomEntreprise || 'Transport Management ERP',
        Subject: `Facture de transport ${viewModel.numeroFacture}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', (err) => reject(err));

    // ── A. Header Accent Band (Reduced Height Accent Bar) ────────────────────
    // Left dark charcoal rectangle
    doc.rect(0, V2.HEADER_Y, 207.5, V2.HEADER_H).fill(V2.PRIMARY);
    // Right dark charcoal rectangle
    doc.rect(387.5, V2.HEADER_Y, 207.5, V2.HEADER_H).fill(V2.PRIMARY);

    // ── B. Logo on white/light contrasted background ─────────────────────────
    const hasLogo = await drawImageSafelyAsync(
      doc,
      viewModel.company.logoPhysicalPath,
      V2.LOGO_X,
      V2.LOGO_Y,
      { fit: [V2.LOGO_MAX_W, V2.LOGO_MAX_H] },
    );

    // If logo absent, draw bold company name text at logo position
    if (!hasLogo) {
      const fallbackNameFitted = fitText(doc, viewModel.company.nomEntreprise, {
        width: 170,
        maxLines: 2,
        fontSize: 10,
        font: 'Helvetica-Bold',
      });
      doc
        .fillColor(V2.PRIMARY)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(fallbackNameFitted, 212.5, 36, {
          width: 170,
          align: 'center',
        });
    }

    // ── C. Invoice Number / Date Table (Left Side Below Header) ──────────────
    const metaCellW = 90;
    const metaTblX = V2.MARGIN;
    const metaTblY = V2.META_TBL_Y;
    const metaHdrH = 20;
    const metaRowH = 25;

    // Draw borders
    doc
      .lineWidth(1)
      .strokeColor(V2.BORDER)
      // Header row
      .rect(metaTblX, metaTblY, metaCellW * 2, metaHdrH)
      .stroke()
      // Data row
      .rect(metaTblX, metaTblY + metaHdrH, metaCellW * 2, metaRowH)
      .stroke()
      // Middle vertical line
      .moveTo(metaTblX + metaCellW, metaTblY)
      .lineTo(metaTblX + metaCellW, metaTblY + metaHdrH + metaRowH)
      .stroke();

    // Text for metadata table
    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('FACTURE', metaTblX, metaTblY + 6, { width: metaCellW, align: 'center' })
      .text('DATE', metaTblX + metaCellW, metaTblY + 6, { width: metaCellW, align: 'center' });

    doc
      .font('Helvetica')
      .text(viewModel.numeroFacture, metaTblX, metaTblY + metaHdrH + 8, {
        width: metaCellW,
        align: 'center',
      })
      .text(viewModel.dateFactureStr, metaTblX + metaCellW, metaTblY + metaHdrH + 8, {
        width: metaCellW,
        align: 'center',
      });

    // Due Date adjacent
    //doc
    //.fillColor(V2.GRAY)
    //.fontSize(8)
    //.font('Helvetica-Oblique')
    //.text(
    //  `Date d'échéance : ${viewModel.dateEcheanceStr}`,
    //  metaTblX + metaCellW * 2 + 15,
    //  metaTblY + metaHdrH + 8,
    //  {
    //    lineBreak: false,
    //  },
    //);

    // ── D. Client Block (Simplified Centered light gray-blue card) ────────────
    const clientW = 320;
    const clientH = 60;
    const clientX = Math.round((595 - clientW) / 2);
    const clientY = V2.CLIENT_BOX_Y;

    doc.rect(clientX, clientY, clientW, clientH).fillAndStroke(V2.LIGHT_BG, V2.GRAY);

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('CLIENT FACTURÉ', clientX, clientY + 6, { width: clientW, align: 'center' });

    const clientNameFitted = fitText(doc, viewModel.client.nomEntreprise, {
      width: clientW - 20,
      maxLines: 1,
      fontSize: 10,
      font: 'Helvetica-Bold',
    });

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(clientNameFitted, clientX + 10, clientY + 18, {
        width: clientW - 20,
        align: 'center',
      });

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8.5)
      .font('Helvetica')
      .text(`ICE : ${viewModel.client.ice || '—'}`, clientX + 10, clientY + 32, {
        width: clientW - 20,
        align: 'center',
      });

    const clientAddressAndPhone: string[] = [];
    if (viewModel.client.adresse) {
      clientAddressAndPhone.push(
        fitText(doc, viewModel.client.adresse, {
          width: 140,
          maxLines: 1,
          fontSize: 7.5,
        }),
      );
    }
    if (viewModel.client.telephone) {
      clientAddressAndPhone.push(`Tél : ${viewModel.client.telephone}`);
    }

    if (clientAddressAndPhone.length > 0) {
      doc
        .fillColor(V2.GRAY)
        .fontSize(7.5)
        .font('Helvetica')
        .text(clientAddressAndPhone.join('   |   '), clientX + 10, clientY + 45, {
          width: clientW - 20,
          align: 'center',
        });
    }

    // ── E. Main Transport Table ──────────────────────────────────────────────
    // Widths: CAMION (15%), REMORQUE/FRIGO (15%), LIBELLÉS (45%), P.U. H.T. (12.5%), MONTANT TTC (12.5%)
    const colW = {
      camion: Math.round(V2.CONTENT_W * 0.15), // 78
      remorque: Math.round(V2.CONTENT_W * 0.15), // 78
      libelles: Math.round(V2.CONTENT_W * 0.45), // 235
      pu: Math.round(V2.CONTENT_W * 0.125), // 66
      ttc: Math.round(V2.CONTENT_W * 0.125), // 66
    };

    const colX = {
      camion: V2.MARGIN,
      remorque: V2.MARGIN + colW.camion,
      libelles: V2.MARGIN + colW.camion + colW.remorque,
      pu: V2.MARGIN + colW.camion + colW.remorque + colW.libelles,
      ttc: V2.MARGIN + colW.camion + colW.remorque + colW.libelles + colW.pu,
    };

    // Draw header borders
    const hdrH = V2.TABLE_HDR_BOTTOM - V2.TABLE_HDR_TOP;
    doc
      .lineWidth(1)
      .strokeColor(V2.BORDER)
      .rect(V2.MARGIN, V2.TABLE_HDR_TOP, V2.CONTENT_W, hdrH)
      .stroke();

    // Draw vertical cell dividers in header
    doc
      .moveTo(colX.remorque, V2.TABLE_HDR_TOP)
      .lineTo(colX.remorque, V2.TABLE_HDR_BOTTOM)
      .moveTo(colX.libelles, V2.TABLE_HDR_TOP)
      .lineTo(colX.libelles, V2.TABLE_HDR_BOTTOM)
      .moveTo(colX.pu, V2.TABLE_HDR_TOP)
      .lineTo(colX.pu, V2.TABLE_HDR_BOTTOM)
      .moveTo(colX.ttc, V2.TABLE_HDR_TOP)
      .lineTo(colX.ttc, V2.TABLE_HDR_BOTTOM)
      .stroke();

    // Header labels (PU and TTC columns are explicit about currency)
    const currencySuffix = `(${viewModel.devise || viewModel.company.devise || 'MAD'})`;
    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('CAMION', colX.camion, V2.TABLE_HDR_TOP + 6, { width: colW.camion, align: 'center' })
      .text('REMORQUE / FRIGO', colX.remorque, V2.TABLE_HDR_TOP + 6, {
        width: colW.remorque,
        align: 'center',
      })
      .text('LIBELLÉS', colX.libelles, V2.TABLE_HDR_TOP + 6, {
        width: colW.libelles,
        align: 'center',
      })
      .text(`P.U. H.T. ${currencySuffix}`, colX.pu, V2.TABLE_HDR_TOP + 6, {
        width: colW.pu,
        align: 'center',
      })
      .text(`MONTANT TTC ${currencySuffix}`, colX.ttc, V2.TABLE_HDR_TOP + 6, {
        width: colW.ttc,
        align: 'center',
      });

    // ── F. Main Transport Data Row ───────────────────────────────────────────
    const rowH = V2.TABLE_ROW_BOTTOM - V2.TABLE_ROW_TOP;
    doc.rect(V2.MARGIN, V2.TABLE_ROW_TOP, V2.CONTENT_W, rowH).stroke();

    // Data Row vertical dividers
    doc
      .moveTo(colX.remorque, V2.TABLE_ROW_TOP)
      .lineTo(colX.remorque, V2.TABLE_ROW_BOTTOM)
      .moveTo(colX.libelles, V2.TABLE_ROW_TOP)
      .lineTo(colX.libelles, V2.TABLE_ROW_BOTTOM)
      .moveTo(colX.pu, V2.TABLE_ROW_TOP)
      .lineTo(colX.pu, V2.TABLE_ROW_BOTTOM)
      .moveTo(colX.ttc, V2.TABLE_ROW_TOP)
      .lineTo(colX.ttc, V2.TABLE_ROW_BOTTOM)
      .stroke();

    const tractorStr = viewModel.transport?.tracteur || '—';
    const trailerStr = viewModel.transport?.remorque || '—';

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(tractorStr, colX.camion, 345, { width: colW.camion, align: 'center' })
      .text(trailerStr, colX.remorque, 345, {
        width: colW.remorque,
        align: 'center',
      });

    // Libellés details with requested line structure and spacing
    const libY = V2.TABLE_ROW_TOP + 10;
    const descHeader = viewModel.transport
      ? 'Transport effectué pour votre compte'
      : `Prestation de transport et logistique — Réf. ${viewModel.numeroFacture}`;

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8.5)
      .font('Helvetica')
      .text(descHeader, colX.libelles + 8, libY, { width: colW.libelles - 16 });

    if (viewModel.transport) {
      const routeText = `${viewModel.transport.lieuChargement} ➔ ${viewModel.transport.lieuDechargement}`;
      const routeFitted = fitText(doc, routeText, {
        width: colW.libelles - 16,
        maxLines: 2,
        fontSize: 9,
        font: 'Helvetica-BoldOblique',
      });

      // Route in bold/italic/underlined style
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(9)
        .text(routeFitted, colX.libelles + 8, libY + 15, {
          width: colW.libelles - 16,
          underline: true,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(V2.GRAY)
        .text('DATE DE CHARGEMENT', colX.libelles + 8, libY + 48)
        .font('Helvetica')
        .fillColor(V2.PRIMARY)
        .text(viewModel.transport.dateChargementStr, colX.libelles + 8, libY + 60)
        .font('Helvetica-Bold')
        .fillColor(V2.GRAY)
        .text('N° CMR', colX.libelles + 8, libY + 83)
        .font('Helvetica')
        .fillColor(V2.PRIMARY)
        .text(viewModel.transport.numeroCmr || '—', colX.libelles + 8, libY + 95);
    }

    // Money value formatting (stripped of currency letters to prevent wrapping inside body cells)
    const stripCurrency = (val: string): string => {
      return val.replace(/\s*[A-Za-z]+$/i, '').trim();
    };
    const sousTotalNumeric = stripCurrency(viewModel.sousTotalFormatted);
    const montantTotalNumeric = stripCurrency(viewModel.montantTotalFormatted);

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .text(sousTotalNumeric, colX.pu, 345, {
        width: colW.pu - 6,
        align: 'right',
        lineBreak: false,
      })
      .font('Helvetica-Bold')
      .text(montantTotalNumeric, colX.ttc, 345, {
        width: colW.ttc - 6,
        align: 'right',
        lineBreak: false,
      });

    // ── G. TVA / Totals Table (Full Width Bordered Table Below Main) ─────────
    const totalsColW = {
      taux: 90,
      ht: 144,
      tva: 144,
      ttc: 145,
    };
    const totalsColX = {
      taux: V2.MARGIN,
      ht: V2.MARGIN + totalsColW.taux,
      tva: V2.MARGIN + totalsColW.taux + totalsColW.ht,
      ttc: V2.MARGIN + totalsColW.taux + totalsColW.ht + totalsColW.tva,
    };

    const tvaHdrH = 25;
    doc
      .lineWidth(1)
      .strokeColor(V2.BORDER)
      .rect(V2.MARGIN, V2.TOTALS_TBL_HDR_Y, V2.CONTENT_W, tvaHdrH)
      .stroke()
      .rect(V2.MARGIN, V2.TOTALS_TBL_ROW_Y, V2.CONTENT_W, V2.TOTALS_TBL_ROW_H)
      .stroke();

    // Dividers
    doc
      .moveTo(totalsColX.ht, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.ht, V2.TOTALS_TBL_ROW_Y + V2.TOTALS_TBL_ROW_H)
      .moveTo(totalsColX.tva, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.tva, V2.TOTALS_TBL_ROW_Y + V2.TOTALS_TBL_ROW_H)
      .moveTo(totalsColX.ttc, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.ttc, V2.TOTALS_TBL_ROW_Y + V2.TOTALS_TBL_ROW_H)
      .stroke();

    // Headers
    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('TAUX', totalsColX.taux, V2.TOTALS_TBL_HDR_Y + 8, {
        width: totalsColW.taux,
        align: 'center',
      })
      .text('MONTANT H.T.', totalsColX.ht, V2.TOTALS_TBL_HDR_Y + 8, {
        width: totalsColW.ht,
        align: 'center',
      })
      .text('T.V.A.', totalsColX.tva, V2.TOTALS_TBL_HDR_Y + 8, {
        width: totalsColW.tva,
        align: 'center',
      })
      .text('MONTANT TTC', totalsColX.ttc, V2.TOTALS_TBL_HDR_Y + 8, {
        width: totalsColW.ttc,
        align: 'center',
      });

    // Row Data
    doc
      .font('Helvetica')
      .text(viewModel.tauxTvaFormatted, totalsColX.taux, V2.TOTALS_TBL_ROW_Y + 12, {
        width: totalsColW.taux,
        align: 'center',
      })
      .text(viewModel.sousTotalFormatted, totalsColX.ht, V2.TOTALS_TBL_ROW_Y + 12, {
        width: totalsColW.ht,
        align: 'center',
      })
      .text(viewModel.montantTvaFormatted, totalsColX.tva, V2.TOTALS_TBL_ROW_Y + 12, {
        width: totalsColW.tva,
        align: 'center',
      })
      .font('Helvetica-Bold')
      .text(viewModel.montantTotalFormatted, totalsColX.ttc, V2.TOTALS_TBL_ROW_Y + 12, {
        width: totalsColW.ttc,
        align: 'center',
      });

    // ── H. Amount in Words ───────────────────────────────────────────────────
    let notesTop = V2.VAR_TOP;
    if (viewModel.montantEnLettres) {
      assertSafeY(notesTop, 25, 'amount-in-words');
      doc
        .fillColor(V2.GRAY)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Arrêtée la présente facture à la somme de :', V2.MARGIN, notesTop);
      notesTop += 13;

      const wordsText = `« ${viewModel.montantEnLettres} »`;
      const wordsFitted = fitText(doc, wordsText, {
        width: V2.CONTENT_W,
        maxLines: 2,
        fontSize: 8.5,
        font: 'Helvetica-Oblique',
      });
      doc
        .fillColor(V2.PRIMARY)
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .text(wordsFitted, V2.MARGIN, notesTop, { width: V2.CONTENT_W, underline: true });
      notesTop += 22;
    }

    // Helper to evaluate if TVA is zero (number, string, or Decimal)
    const isTvaZero = (val: any): boolean => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'number') return val === 0;
      if (typeof val === 'string') {
        const cleaned = val.trim();
        return cleaned === '0' || cleaned === '0.00' || parseFloat(cleaned) === 0;
      }
      if (typeof val === 'object') {
        if (typeof val.isZero === 'function') return val.isZero();
        if (typeof val.toNumber === 'function') return val.toNumber() === 0;
      }
      return parseFloat(String(val)) === 0;
    };

    // ── I. Conditional Legal Tax Note (Centered below Amount in Words) ───────
    let legalNoteBottomY = notesTop;
    if (isTvaZero(viewModel.tauxTva)) {
      const defaultNote =
        "Vente exonérée de la TVA conformément à l'article 92-1-35 du code général des Impôts relatif à la TVA liée au Transport International.";
      const noteToRender =
        viewModel.company.legalTaxNote && viewModel.company.legalTaxNote.trim().length > 0
          ? viewModel.company.legalTaxNote.trim()
          : defaultNote;

      const noteHeight = doc.heightOfString(noteToRender, {
        width: V2.CONTENT_W,
      });
      doc
        .fillColor(V2.PRIMARY)
        .fontSize(8)
        .font('Helvetica-BoldOblique')
        .text(noteToRender, V2.MARGIN, notesTop, {
          width: V2.CONTENT_W,
          align: 'center',
          underline: true,
        });
      legalNoteBottomY = notesTop + noteHeight;
      notesTop += noteHeight + 10;
    }

    // Optional text/notes (if space allows)
    if (viewModel.notes && notesTop < V2.VAR_CEIL) {
      const remainingHeight = V2.VAR_CEIL - notesTop;
      if (remainingHeight > 15) {
        doc
          .fillColor(V2.GRAY)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text('Notes / Remarques :', V2.MARGIN, notesTop);
        notesTop += 10;

        const notesFitted = fitText(doc, viewModel.notes, {
          width: 200,
          maxLines: 3,
          fontSize: 7.5,
        });
        doc
          .fillColor(V2.PRIMARY)
          .fontSize(7.5)
          .font('Helvetica')
          .text(notesFitted, V2.MARGIN, notesTop, { width: 200 });
      }
    }

    // ── J. Stamp Relocated to Lower-Center (Visible width 140-165, max height 95)
    if (options.includeStamp) {
      const stampY = Math.max(legalNoteBottomY + 8, V2.STAMP_DEFAULT_Y);
      const maxStampH = Math.min(V2.STAMP_MAX_H, V2.FOOTER_BG_Y - 5 - stampY);
      const stampW = 150;
      const stampX = Math.round((595 - stampW) / 2);

      await drawImageSafelyAsync(doc, viewModel.company.stampPhysicalPath, stampX, stampY, {
        fit: [stampW, maxStampH],
      });
    }

    // ── K. Footer Band (Full Width, Dark, Orange Accent Line, Y = 735 to 842) ──
    doc.rect(0, V2.FOOTER_BG_Y, 595, V2.FOOTER_BG_H).fill(V2.PRIMARY);

    // Orange thin line at the bottom
    doc.rect(0, V2.FOOTER_BG_Y + V2.FOOTER_BG_H - 4, 595, 4).fill(V2.ORANGE);

    const fY = V2.FOOTER_BG_Y + 12;

    // Helper for footer mapping to join parts safely
    const buildLine = (
      parts: { label: string; value: string | null | undefined }[],
      separator = '   —   ',
    ): string => {
      return parts
        .filter((p) => p.value && p.value.trim().length > 0)
        .map((p) => `${p.label}${p.value!.trim()}`)
        .join(separator);
    };

    // Line 1: SIÈGE SOCIAL
    const addrParts = [viewModel.company.adresse, viewModel.company.ville, viewModel.company.pays]
      .filter((p) => p && p.trim().length > 0)
      .map((p) => p!.trim());
    const siegeSocialStr = addrParts.join(', ');
    const line1 = siegeSocialStr ? `SIÈGE SOCIAL : ${siegeSocialStr}` : '';
    if (line1) {
      doc
        .fillColor(V2.WHITE)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(line1, 36, fY, { width: V2.CONTENT_W, align: 'center', lineBreak: false });
    }

    // Line 2: TÉL / EMAIL
    const phoneVal = [viewModel.company.telephone, viewModel.company.telephoneSecondaire]
      .filter((p) => p && p.trim().length > 0)
      .map((p) => p!.trim())
      .join(' / ');
    const line2 = buildLine([
      { label: 'TÉL : ', value: phoneVal },
      { label: 'EMAIL : ', value: viewModel.company.email },
    ]);
    if (line2) {
      doc
        .fillColor(V2.WHITE)
        .fontSize(7)
        .font('Helvetica')
        .text(line2, 36, fY + 15, { width: V2.CONTENT_W, align: 'center', lineBreak: false });
    }

    // Line 3: Legal Identifiers (in Orange)
    const line3 = buildLine([
      { label: 'PATENTE : ', value: viewModel.company.patente },
      { label: 'IF : ', value: viewModel.company.identifiantFiscal },
      { label: 'RC : ', value: viewModel.company.registreCommerce },
      { label: 'ICE : ', value: viewModel.company.ice },
      { label: 'CNSS : ', value: viewModel.company.cnss },
    ]);
    if (line3) {
      doc
        .fillColor(V2.ORANGE)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(line3, 36, fY + 30, { width: V2.CONTENT_W, align: 'center', lineBreak: false });
    }

    // Line 4: RIB / Bank info (in Orange)
    const line4 = buildLine([
      { label: 'RIB : ', value: viewModel.company.rib },
      { label: 'BANQUE : ', value: viewModel.company.nomBanque },
      { label: 'IBAN : ', value: viewModel.company.iban },
      { label: 'SWIFT/BIC : ', value: viewModel.company.swiftBic },
    ]);
    if (line4) {
      doc
        .fillColor(V2.ORANGE)
        .fontSize(6.5)
        .font('Helvetica-Bold')
        .text(line4, 36, fY + 45, { width: V2.CONTENT_W, align: 'center', lineBreak: false });
    }

    if (viewModel.company.footerText) {
      const footerTextFitted = fitText(doc, viewModel.company.footerText, {
        width: V2.CONTENT_W,
        maxLines: 2,
        fontSize: 6,
      });
      doc
        .fillColor('#cbd5e1')
        .fontSize(6)
        .font('Helvetica-Oblique')
        .text(footerTextFitted, 36, fY + 58, {
          width: V2.CONTENT_W,
          align: 'center',
          lineBreak: true,
        });
    }

    // ── L. Single-page guard check ───────────────────────────────────────────
    const range = (doc as any).bufferedPageRange();
    if (range && range.count !== 1) {
      console.error(
        `[PDF LAYOUT ERROR] TRANSPORT_V2 generated ${range.count} pages. Expected exactly 1.`,
      );
      doc.end();
      reject(
        new UnprocessableEntityException(
          'Erreur interne de mise en page PDF — contactez le support.',
        ),
      );
      return;
    }

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.end();
  } catch (err: any) {
    reject(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function generateInvoicePdfBuffer(
  viewModel: InvoicePdfViewModel,
  options: { includeStamp: boolean } = { includeStamp: false },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      switch (viewModel.template) {
        case 'CLASSIC_TRANSPORT':
          return renderClassicTransport(viewModel, options, resolve, reject);
        case 'TRANSPORT_V2':
          return renderTransportV2(viewModel, options, resolve, reject);
        default:
          throw new UnprocessableEntityException(
            `Template de facture "${viewModel.template}" non supporté. Templates valides : CLASSIC_TRANSPORT, TRANSPORT_V2`,
          );
      }
    } catch (err: any) {
      reject(err);
    }
  });
}
