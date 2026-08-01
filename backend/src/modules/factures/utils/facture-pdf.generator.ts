import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { UnprocessableEntityException } from '@nestjs/common';

export interface InvoicePdfViewModel {
  numeroFacture: string;
  dateFactureStr: string;
  dateEcheanceStr: string;
  statut: string;
  sousTotalFormatted: string;
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
    email: string;
    ice: string | null;
    identifiantFiscal: string | null;
    registreCommerce: string | null;
    cnss: string | null;
    nomBanque: string | null;
    rib: string | null;
    footerText: string | null;
    legalTaxNote: string | null;
    logoPhysicalPath: string | null;
    stampPhysicalPath: string | null;
  };
  template: string;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

export function generateInvoicePdfBuffer(
  viewModel: InvoicePdfViewModel,
  options: { includeStamp: boolean } = { includeStamp: false },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      if (viewModel.template !== 'CLASSIC_TRANSPORT') {
        throw new UnprocessableEntityException(
          `Template de facture "${viewModel.template}" non supporté. Template valide : CLASSIC_TRANSPORT`,
        );
      }

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

      const primaryColor = '#1e3a8a'; // Deep Navy
      const darkColor = '#0f172a';
      const grayColor = '#64748b';
      const lightBg = '#f8fafc';
      const borderColor = '#cbd5e1';

      // -------------------------------------------------------------
      // 1. Header Accent Bar
      // -------------------------------------------------------------
      doc.rect(40, 40, 515, 6).fill(primaryColor);

      // Company Logo (Top Left, bounded max width 130, max height 50)
      let logoOffset = 0;
      if (viewModel.company.logoPhysicalPath && fs.existsSync(viewModel.company.logoPhysicalPath)) {
        try {
          doc.image(viewModel.company.logoPhysicalPath, 40, 55, { fit: [130, 50] });
          logoOffset = 60;
        } catch (_) {
          logoOffset = 0;
        }
      }

      // Company Info (Left)
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

      // Document Title & Invoice Meta (Top Right)
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

      // Divider
      doc.moveTo(40, 140).lineTo(555, 140).strokeColor(borderColor).lineWidth(1).stroke();

      // -------------------------------------------------------------
      // 2. Client & Transport Cards
      // -------------------------------------------------------------
      // Client Box (Left)
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

      // Transport Box (Right)
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

      // -------------------------------------------------------------
      // 3. Line Items Table Header & Rows
      // -------------------------------------------------------------
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

      // Table Row
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

      // -------------------------------------------------------------
      // 4. Totals Summary Box
      // -------------------------------------------------------------
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
        .text(viewModel.montantTotalFormatted, 430, summaryTop + 52, {
          width: 115,
          align: 'right',
        });

      // -------------------------------------------------------------
      // 5. Amount in Words & Notes
      // -------------------------------------------------------------
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

      // Bank Details block (if RIB configured)
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

      // -------------------------------------------------------------
      // 6. Optional Stamp Image (Bottom Right)
      // -------------------------------------------------------------
      if (
        options.includeStamp &&
        viewModel.company.stampPhysicalPath &&
        fs.existsSync(viewModel.company.stampPhysicalPath)
      ) {
        try {
          doc.image(viewModel.company.stampPhysicalPath, 410, doc.page.height - 150, {
            fit: [120, 65],
          });
        } catch (_) {}
      }

      // -------------------------------------------------------------
      // 7. Fixed Legal Footer (Page Bottom)
      // -------------------------------------------------------------
      const footerTop = doc.page.height - 65;
      doc
        .moveTo(40, footerTop)
        .lineTo(555, footerTop)
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .stroke();

      const footerText =
        viewModel.company.footerText ||
        `${viewModel.company.nomEntreprise}  —  ICE: ${viewModel.company.ice || '—'} | IF: ${viewModel.company.identifiantFiscal || '—'} | RC: ${viewModel.company.registreCommerce || '—'} | CNSS: ${viewModel.company.cnss || '—'}`;

      doc
        .fillColor(grayColor)
        .fontSize(8)
        .font('Helvetica')
        .text(footerText, 40, footerTop + 8, { align: 'center', width: 515, lineBreak: false })
        .text(
          `Merci de votre confiance. Pour toute question, contactez ${viewModel.company.email}`,
          40,
          footerTop + 20,
          { align: 'center', width: 515, lineBreak: false },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
