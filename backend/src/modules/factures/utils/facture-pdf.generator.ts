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
 * Throws if a draw operation would exceed the safe content area.
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
// CLASSIC_TRANSPORT renderer (behaviour preserved exactly)
// ─────────────────────────────────────────────────────────────────────────────

function renderClassicTransport(
  viewModel: InvoicePdfViewModel,
  options: { includeStamp: boolean },
  resolve: (buf: Buffer) => void,
  reject: (err: Error) => void,
): void {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Facture ${viewModel.numeroFacture}`,
        Author: viewModel.company.nomEntreprise || 'Transport Management ERP',
        Subject: `Facture de transport ${viewModel.numeroFacture}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const primaryColor = '#1e3a8a';
    const darkColor = '#0f172a';
    const grayColor = '#64748b';
    const lightBg = '#f8fafc';
    const borderColor = '#cbd5e1';

    doc.rect(40, 40, 515, 6).fill(primaryColor);

    let logoOffset = 0;
    if (viewModel.company.logoPhysicalPath && fs.existsSync(viewModel.company.logoPhysicalPath)) {
      try {
        doc.image(viewModel.company.logoPhysicalPath, 40, 55, { fit: [130, 50] });
        logoOffset = 60;
      } catch (_) {
        logoOffset = 0;
      }
    }

    const companyTextX = 40 + logoOffset;
    const companyTextY = 55;
    doc
      .fillColor(darkColor)
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(viewModel.company.nomEntreprise, companyTextX, companyTextY);

    doc
      .fillColor(grayColor)
      .fontSize(8.5)
      .font('Helvetica')
      .text(
        `${viewModel.company.adresse}${viewModel.company.ville ? ', ' + viewModel.company.ville : ''}`,
        companyTextX,
        companyTextY + 18,
      )
      .text(
        `Tél: ${viewModel.company.telephone}  |  Email: ${viewModel.company.email}`,
        companyTextX,
        companyTextY + 30,
      );

    const legalParts: string[] = [];
    if (viewModel.company.ice) legalParts.push(`ICE: ${viewModel.company.ice}`);
    if (viewModel.company.identifiantFiscal)
      legalParts.push(`IF: ${viewModel.company.identifiantFiscal}`);
    if (viewModel.company.registreCommerce)
      legalParts.push(`RC: ${viewModel.company.registreCommerce}`);
    if (viewModel.company.cnss) legalParts.push(`CNSS: ${viewModel.company.cnss}`);
    if (legalParts.length > 0) {
      doc.text(legalParts.join('  |  '), companyTextX, companyTextY + 42);
    }

    doc
      .fillColor(primaryColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('FACTURE', 380, 55, { align: 'right' });

    if (viewModel.statut === 'ANNULEE') {
      doc
        .fillColor('#dc2626')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('[ ANNULÉE ]', 380, 78, { align: 'right' });
    }

    doc
      .fillColor(darkColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`N° ${viewModel.numeroFacture}`, 380, 93, { align: 'right' });

    doc
      .fillColor(grayColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`Date : ${viewModel.dateFactureStr}`, 380, 108, { align: 'right' })
      .text(`Échéance : ${viewModel.dateEcheanceStr}`, 380, 120, { align: 'right' });

    doc.moveTo(40, 140).lineTo(555, 140).strokeColor(borderColor).lineWidth(1).stroke();

    doc.rect(40, 155, 250, 85).fillAndStroke(lightBg, borderColor);
    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('CLIENT FACTURÉ :', 50, 165);
    doc
      .fillColor(darkColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(viewModel.client.nomEntreprise, 50, 180, { width: 230 });
    doc
      .fillColor(grayColor)
      .fontSize(8.5)
      .font('Helvetica')
      .text(viewModel.client.adresse || 'Adresse non renseignée', 50, 196, { width: 230 })
      .text(
        `Tél: ${viewModel.client.telephone || '—'}  |  ICE: ${viewModel.client.ice || '—'}`,
        50,
        220,
      );

    if (viewModel.transport) {
      doc.rect(305, 155, 250, 85).fillAndStroke(lightBg, borderColor);
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`VOYAGE ASSOCIÉ #${viewModel.transport.idVoyage}`, 315, 165);
      doc
        .fillColor(darkColor)
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(
          `${viewModel.transport.lieuChargement} ➔ ${viewModel.transport.lieuDechargement}`,
          315,
          180,
          { width: 230 },
        );
      doc
        .fillColor(grayColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          `Date charg. : ${viewModel.transport.dateChargementStr}  |  CMR : ${viewModel.transport.numeroCmr || '—'}`,
          315,
          198,
        )
        .text(
          `Tracteur : ${viewModel.transport.tracteur || '—'}  |  Remorque : ${viewModel.transport.remorque || '—'}`,
          315,
          212,
        );
    }

    const tableTop = 255;
    doc.rect(40, tableTop, 515, 22).fill(primaryColor);
    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('PRESTATION / DESCRIPTION', 50, tableTop + 6)
      .text('MONTANT HT', 280, tableTop + 6, { width: 80, align: 'right' })
      .text('TVA', 370, tableTop + 6, { width: 60, align: 'right' })
      .text('TOTAL TTC', 440, tableTop + 6, { width: 105, align: 'right' });

    const rowTop = tableTop + 22;
    doc.rect(40, rowTop, 515, 45).fillAndStroke('#ffffff', borderColor);

    const descriptionText = viewModel.transport
      ? `Prestation de transport routier de marchandises (Voyage #${viewModel.transport.idVoyage})\nTrajet : ${viewModel.transport.lieuChargement} ➔ ${viewModel.transport.lieuDechargement}`
      : `Prestation de transport routier & logistique\nFacture N° ${viewModel.numeroFacture}`;

    doc
      .fillColor(darkColor)
      .fontSize(9)
      .font('Helvetica')
      .text(descriptionText, 50, rowTop + 10, { width: 220 });

    doc
      .text(viewModel.sousTotalFormatted, 280, rowTop + 15, { width: 80, align: 'right' })
      .text(viewModel.tauxTvaFormatted, 370, rowTop + 15, { width: 60, align: 'right' })
      .font('Helvetica-Bold')
      .text(viewModel.montantTotalFormatted, 440, rowTop + 15, { width: 105, align: 'right' });

    const summaryTop = rowTop + 55;
    doc.rect(305, summaryTop, 250, 75).fillAndStroke(lightBg, borderColor);

    doc
      .fillColor(grayColor)
      .fontSize(9)
      .font('Helvetica')
      .text('Sous-total HT :', 315, summaryTop + 10)
      .fillColor(darkColor)
      .font('Helvetica-Bold')
      .text(viewModel.sousTotalFormatted, 430, summaryTop + 10, { width: 115, align: 'right' });

    doc
      .fillColor(grayColor)
      .font('Helvetica')
      .text(`Montant TVA (${viewModel.tauxTvaFormatted}) :`, 315, summaryTop + 28)
      .fillColor(darkColor)
      .font('Helvetica-Bold')
      .text(viewModel.montantTvaFormatted, 430, summaryTop + 28, { width: 115, align: 'right' });

    doc
      .moveTo(315, summaryTop + 45)
      .lineTo(545, summaryTop + 45)
      .strokeColor(borderColor)
      .stroke();

    doc
      .fillColor(primaryColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL TTC :', 315, summaryTop + 52)
      .fontSize(12)
      .text(viewModel.montantTotalFormatted, 430, summaryTop + 52, { width: 115, align: 'right' });

    let notesTop = summaryTop + 85;

    if (viewModel.montantEnLettres) {
      doc
        .fillColor(grayColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Arrêtée la présente facture à la somme de :', 40, notesTop);
      doc
        .fillColor(darkColor)
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(`« ${viewModel.montantEnLettres} »`, 40, notesTop + 14, { width: 515 });
      notesTop += 35;
    }

    if (viewModel.notes) {
      doc
        .fillColor(grayColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Notes / Remarques :', 40, notesTop);
      doc
        .fillColor(darkColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(viewModel.notes, 40, notesTop + 12, { width: 515 });
      notesTop += 30;
    }

    if (viewModel.company.rib) {
      doc
        .fillColor(grayColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Règlement par virement bancaire :', 40, notesTop);
      doc
        .fillColor(darkColor)
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          `Banque : ${viewModel.company.nomBanque || '—'}  |  RIB : ${viewModel.company.rib}`,
          40,
          notesTop + 12,
          { width: 515 },
        );
    }

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
  HEADER_ACCENT_Y: 20,
  HEADER_ACCENT_H: 6,
  META_TBL_Y: 95,
  CLIENT_BOX_Y: 135,
  TABLE_HDR_TOP: 212,
  TABLE_HDR_BOTTOM: 234,
  TABLE_ROW_TOP: 234,
  TABLE_ROW_BOTTOM: 344,
  TOTALS_TBL_HDR_Y: 356,
  TOTALS_TBL_ROW_Y: 378,
  VAR_TOP: 412,
  VAR_CEIL: 545, // Hard ceiling for notes and legal notes
  STAMP_TOP: 550,
  STAMP_BOTTOM: 685,
  FOOTER_BG_Y: 750,
  FOOTER_BG_H: 92,
  SAFE_MAX: 745,
  // Dimensions
  LOGO_X: 36,
  LOGO_Y: 30,
  LOGO_MAX_W: 155, // keep visible logo width approximately 140–165 pt
  LOGO_MAX_H: 50,
  STAMP_MAX_W: 150, // visible width: 140–165 pt
  STAMP_MAX_H: 90,  // visible height: maximum 95 pt
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
    doc.rect(0, V2.HEADER_ACCENT_Y, 595, V2.HEADER_ACCENT_H).fill(V2.PRIMARY);

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
        width: V2.LOGO_MAX_W,
        maxLines: 2,
        fontSize: 12,
        font: 'Helvetica-Bold',
      });
      doc
        .fillColor(V2.PRIMARY)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(fallbackNameFitted, V2.LOGO_X, V2.LOGO_Y + 10, {
          width: V2.LOGO_MAX_W,
        });
    }

    // ── C. Invoice Number / Date Table (Left Side Below Header) ──────────────
    const metaCellW = 90;
    const metaRowH = 15;
    const metaTblX = V2.MARGIN;
    const metaTblY = V2.META_TBL_Y;

    // Draw borders
    doc
      .lineWidth(1)
      .strokeColor(V2.BORDER)
      // Header row
      .rect(metaTblX, metaTblY, metaCellW * 2, metaRowH)
      .stroke()
      // Data row
      .rect(metaTblX, metaTblY + metaRowH, metaCellW * 2, metaRowH)
      .stroke()
      // Middle vertical line
      .moveTo(metaTblX + metaCellW, metaTblY)
      .lineTo(metaTblX + metaCellW, metaTblY + metaRowH * 2)
      .stroke();

    // Text for metadata table
    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('FACTURE', metaTblX, metaTblY + 4, { width: metaCellW, align: 'center' })
      .text('DATE', metaTblX + metaCellW, metaTblY + 4, { width: metaCellW, align: 'center' });

    doc
      .font('Helvetica')
      .text(viewModel.numeroFacture, metaTblX, metaTblY + metaRowH + 4, {
        width: metaCellW,
        align: 'center',
      })
      .text(viewModel.dateFactureStr, metaTblX + metaCellW, metaTblY + metaRowH + 4, {
        width: metaCellW,
        align: 'center',
      });

    // Due Date adjacent
    doc
      .fillColor(V2.GRAY)
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        `Date d'échéance : ${viewModel.dateEcheanceStr}`,
        metaTblX + metaCellW * 2 + 15,
        metaTblY + metaRowH + 4,
        {
          lineBreak: false,
        },
      );

    // ── D. Client Block (Simplified Centered light gray-blue card) ────────────
    const clientW = 320;
    const clientH = 65;
    const clientX = Math.round((595 - clientW) / 2);
    const clientY = V2.CLIENT_BOX_Y;

    doc
      .rect(clientX, clientY, clientW, clientH)
      .fillAndStroke(V2.LIGHT_BG, V2.GRAY);

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('CLIENT FACTURÉ', clientX, clientY + 6, { width: clientW, align: 'center' });

    const clientNameFitted = fitText(doc, viewModel.client.nomEntreprise, {
      width: clientW - 20,
      maxLines: 1,
      fontSize: 10.5,
      font: 'Helvetica-Bold',
    });

    doc
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .text(clientNameFitted, clientX + 10, clientY + 16, {
        width: clientW - 20,
        align: 'center',
      });

    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8.5)
      .font('Helvetica')
      .text(`ICE : ${viewModel.client.ice || '—'}`, clientX + 10, clientY + 30, {
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
        .text(clientAddressAndPhone.join('   |   '), clientX + 10, clientY + 44, {
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

    // Header labels (PU and TTC columns are explicit about currency MAD)
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
      .text('P.U. H.T. (MAD)', colX.pu, V2.TABLE_HDR_TOP + 6, { width: colW.pu, align: 'center' })
      .text('MONTANT TTC (MAD)', colX.ttc, V2.TABLE_HDR_TOP + 6, { width: colW.ttc, align: 'center' });

    // ── F. Main Transport Data Row ───────────────────────────────────────────
    const rowH = V2.TABLE_ROW_BOTTOM - V2.TABLE_ROW_TOP;
    doc
      .rect(V2.MARGIN, V2.TABLE_ROW_TOP, V2.CONTENT_W, rowH)
      .stroke();

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
      .text(tractorStr, colX.camion, V2.TABLE_ROW_TOP + 38, { width: colW.camion, align: 'center' })
      .text(trailerStr, colX.remorque, V2.TABLE_ROW_TOP + 38, {
        width: colW.remorque,
        align: 'center',
      });

    // Libellés details with requested line structure and spacing
    const libY = V2.TABLE_ROW_TOP + 8;
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
        maxLines: 1,
        fontSize: 9,
        font: 'Helvetica-BoldOblique',
      });

      // Route in bold/italic/underlined style
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(9)
        .text(routeFitted, colX.libelles + 8, libY + 16, {
          width: colW.libelles - 16,
          underline: true,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(V2.GRAY)
        .text('DATE DE CHARGEMENT', colX.libelles + 8, libY + 36)
        .font('Helvetica')
        .fillColor(V2.PRIMARY)
        .text(viewModel.transport.dateChargementStr, colX.libelles + 8, libY + 47)
        .font('Helvetica-Bold')
        .fillColor(V2.GRAY)
        .text('N° CMR', colX.libelles + 8, libY + 62)
        .font('Helvetica')
        .fillColor(V2.PRIMARY)
        .text(viewModel.transport.numeroCmr || '—', colX.libelles + 8, libY + 73);
    }

    // Money value formatting (stripped of MAD suffix to prevent wrapping)
    const sousTotalNumeric = viewModel.sousTotalFormatted.replace(/\s*MAD$/i, '').trim();
    const montantTotalNumeric = viewModel.montantTotalFormatted.replace(/\s*MAD$/i, '').trim();

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .text(sousTotalNumeric, colX.pu, V2.TABLE_ROW_TOP + 38, {
        width: colW.pu - 6,
        align: 'right',
        lineBreak: false,
      })
      .font('Helvetica-Bold')
      .text(montantTotalNumeric, colX.ttc, V2.TABLE_ROW_TOP + 38, {
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

    const tvaHdrH = V2.TOTALS_TBL_ROW_Y - V2.TOTALS_TBL_HDR_Y; // 22
    doc
      .lineWidth(1)
      .strokeColor(V2.BORDER)
      .rect(V2.MARGIN, V2.TOTALS_TBL_HDR_Y, V2.CONTENT_W, tvaHdrH)
      .stroke()
      .rect(V2.MARGIN, V2.TOTALS_TBL_ROW_Y, V2.CONTENT_W, tvaHdrH)
      .stroke();

    // Dividers
    doc
      .moveTo(totalsColX.ht, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.ht, V2.TOTALS_TBL_ROW_Y + tvaHdrH)
      .moveTo(totalsColX.tva, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.tva, V2.TOTALS_TBL_ROW_Y + tvaHdrH)
      .moveTo(totalsColX.ttc, V2.TOTALS_TBL_HDR_Y)
      .lineTo(totalsColX.ttc, V2.TOTALS_TBL_ROW_Y + tvaHdrH)
      .stroke();

    // Headers
    doc
      .fillColor(V2.PRIMARY)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('TAUX', totalsColX.taux, V2.TOTALS_TBL_HDR_Y + 6, {
        width: totalsColW.taux,
        align: 'center',
      })
      .text('MONTANT H.T.', totalsColX.ht, V2.TOTALS_TBL_HDR_Y + 6, {
        width: totalsColW.ht,
        align: 'center',
      })
      .text('T.V.A.', totalsColX.tva, V2.TOTALS_TBL_HDR_Y + 6, {
        width: totalsColW.tva,
        align: 'center',
      })
      .text('MONTANT TTC', totalsColX.ttc, V2.TOTALS_TBL_HDR_Y + 6, {
        width: totalsColW.ttc,
        align: 'center',
      });

    // Row Data
    doc
      .font('Helvetica')
      .text(viewModel.tauxTvaFormatted, totalsColX.taux, V2.TOTALS_TBL_ROW_Y + 6, {
        width: totalsColW.taux,
        align: 'center',
      })
      .text(viewModel.sousTotalFormatted, totalsColX.ht, V2.TOTALS_TBL_ROW_Y + 6, {
        width: totalsColW.ht,
        align: 'center',
      })
      .text(viewModel.montantTvaFormatted, totalsColX.tva, V2.TOTALS_TBL_ROW_Y + 6, {
        width: totalsColW.tva,
        align: 'center',
      })
      .font('Helvetica-Bold')
      .text(viewModel.montantTotalFormatted, totalsColX.ttc, V2.TOTALS_TBL_ROW_Y + 6, {
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
      notesTop += 11;

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

    // ── I. Conditional Legal Tax Note (Centered below Amount in Words) ───────
    if (Number(viewModel.tauxTva) === 0 && viewModel.company.legalTaxNote) {
      const taxNoteFitted = fitText(doc, viewModel.company.legalTaxNote, {
        width: V2.CONTENT_W,
        maxLines: 2,
        fontSize: 8,
        font: 'Helvetica-BoldOblique',
      });
      doc
        .fillColor(V2.PRIMARY)
        .fontSize(8)
        .font('Helvetica-BoldOblique')
        .text(taxNoteFitted, V2.MARGIN, notesTop, {
          width: V2.CONTENT_W,
          align: 'center',
          underline: true,
        });
      notesTop += 22;
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
      const stampX = Math.round((595 - V2.STAMP_MAX_W) / 2);
      await drawImageSafelyAsync(
        doc,
        viewModel.company.stampPhysicalPath,
        stampX,
        V2.STAMP_TOP,
        { fit: [V2.STAMP_MAX_W, V2.STAMP_MAX_H] },
      );
    }

    // ── K. Footer Band (Full Width, Dark, Orange Accent Line, Y = 750 to 842) ──
    doc.rect(0, V2.FOOTER_BG_Y, 595, V2.FOOTER_BG_H).fill(V2.PRIMARY);

    // Orange thin line at the bottom
    doc.rect(0, V2.FOOTER_BG_Y + V2.FOOTER_BG_H - 4, 595, 4).fill(V2.ORANGE);

    const fY = V2.FOOTER_BG_Y + 10;

    // Helper for footer mapping to join parts safely
    const buildLine = (parts: { label: string; value: string | null | undefined }[], separator = '   —   '): string => {
      return parts
        .filter(p => p.value && p.value.trim().length > 0)
        .map(p => `${p.label}${p.value!.trim()}`)
        .join(separator);
    };

    // Line 1: SIÈGE SOCIAL
    const addrParts = [
      viewModel.company.adresse,
      viewModel.company.ville,
      viewModel.company.pays
    ].filter(p => p && p.trim().length > 0).map(p => p!.trim());
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
      .filter(p => p && p.trim().length > 0)
      .map(p => p!.trim())
      .join(' / ');
    const line2 = buildLine([
      { label: 'TÉL : ', value: phoneVal },
      { label: 'EMAIL : ', value: viewModel.company.email }
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
      { label: 'CNSS : ', value: viewModel.company.cnss }
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
      { label: 'SWIFT/BIC : ', value: viewModel.company.swiftBic }
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
