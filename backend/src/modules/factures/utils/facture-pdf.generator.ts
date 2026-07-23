import PDFDocument from 'pdfkit';
import { FactureView } from '../factures.service';
import { COMPANY_CONFIG } from '../../../common/config/company.config';

function formatMoney(amount: number): string {
  const rounded = Math.round((amount || 0) * 100) / 100;
  return (
    rounded.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

export function generateInvoicePdfBuffer(
  facture: FactureView,
  clientDetails?: any,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Facture ${facture.numeroFacture}`,
          Author: COMPANY_CONFIG.nom,
          Subject: `Facture de transport ${facture.numeroFacture}`,
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
      // 1. Header Banner & Company Details
      // -------------------------------------------------------------
      // Top accent bar
      doc.rect(40, 40, 515, 6).fill(primaryColor);

      // Company Info (Left)
      doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold').text(COMPANY_CONFIG.nom, 40, 60);

      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font('Helvetica')
        .text(COMPANY_CONFIG.adresse, 40, 80)
        .text(`Tél: ${COMPANY_CONFIG.telephone}  |  Email: ${COMPANY_CONFIG.email}`, 40, 93)
        .text(
          `ICE: ${COMPANY_CONFIG.ice}  |  IF: ${COMPANY_CONFIG.if}  |  RC: ${COMPANY_CONFIG.rc}`,
          40,
          106,
        );

      // Document Title & Invoice Info (Right)
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('FACTURE', 380, 60, { align: 'right' });

      if (facture.statut === 'ANNULEE') {
        doc
          .fillColor('#dc2626')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('[ ANNULÉE ]', 380, 83, { align: 'right' });
      }

      doc
        .fillColor(darkColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`N° ${facture.numeroFacture}`, 380, 100, { align: 'right' });

      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date d'émission : ${formatDate(facture.dateFacture)}`, 380, 115, { align: 'right' })
        .text(
          `Échéance : ${formatDate(facture.dateEcheance)} (${facture.joursEcheance} jours)`,
          380,
          128,
          { align: 'right' },
        );

      // Divider
      doc.moveTo(40, 150).lineTo(555, 150).strokeColor(borderColor).lineWidth(1).stroke();

      // -------------------------------------------------------------
      // 2. Client & Voyage Details Cards
      // -------------------------------------------------------------
      // Client Box (Left)
      doc.rect(40, 165, 250, 85).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('FACTURE À :', 50, 175);

      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(facture.nomClient, 50, 192);

      if (clientDetails) {
        doc
          .fillColor(grayColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text(clientDetails.adresse || 'Adresse non renseignée', 50, 208, { width: 230 })
          .text(
            `Tél: ${clientDetails.telephone || '—'}  |  ICE: ${clientDetails.ice || '—'}`,
            50,
            228,
          );
      } else {
        doc
          .fillColor(grayColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text('Client professionnel de transport', 50, 208);
      }

      // Voyage Box (Right) - if linked
      if (facture.voyage) {
        doc.rect(305, 165, 250, 85).fillAndStroke(lightBg, borderColor);
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`VOYAGE ASSOCIÉ #${facture.voyage.idVoyage}`, 315, 175);

        doc
          .fillColor(darkColor)
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(`${facture.voyage.lieuChargement} ➔ ${facture.voyage.lieuDechargement}`, 315, 192, {
            width: 230,
          });

        doc
          .fillColor(grayColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text(`Tracteur : ${facture.voyage.tracteur || 'Non assigné'}`, 315, 212)
          .text(`Statut voyage : ${facture.voyage.statut}`, 315, 226);
      }

      // -------------------------------------------------------------
      // 3. Line Items Table Header
      // -------------------------------------------------------------
      const tableTop = 270;
      doc.rect(40, tableTop, 515, 24).fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DESCRIPTION / PRESTATION', 50, tableTop + 7)
        .text('MONTANT HT', 280, tableTop + 7, { width: 80, align: 'right' })
        .text('TVA (%)', 370, tableTop + 7, { width: 60, align: 'right' })
        .text('TOTAL TTC', 440, tableTop + 7, { width: 105, align: 'right' });

      // Table Row
      const rowTop = tableTop + 24;
      doc.rect(40, rowTop, 515, 45).fillAndStroke('#ffffff', borderColor);

      const descriptionText = facture.voyage
        ? `Prestation de transport routier de marchandises (Voyage #${facture.voyage.idVoyage})\nTrajet : ${facture.voyage.lieuChargement} à ${facture.voyage.lieuDechargement}`
        : `Prestation de transport routier & logistique\nFacture N° ${facture.numeroFacture}`;

      doc
        .fillColor(darkColor)
        .fontSize(9)
        .font('Helvetica')
        .text(descriptionText, 50, rowTop + 10, { width: 220 });

      doc
        .text(formatMoney(facture.sousTotal), 280, rowTop + 15, { width: 80, align: 'right' })
        .text(`${facture.tauxTva} %`, 370, rowTop + 15, { width: 60, align: 'right' })
        .font('Helvetica-Bold')
        .text(formatMoney(facture.montantTotal), 440, rowTop + 15, { width: 105, align: 'right' });

      // -------------------------------------------------------------
      // 4. Totals Summary Box
      // -------------------------------------------------------------
      const summaryTop = rowTop + 60;
      doc.rect(305, summaryTop, 250, 80).fillAndStroke(lightBg, borderColor);

      doc
        .fillColor(grayColor)
        .fontSize(9)
        .font('Helvetica')
        .text('Sous-total HT :', 315, summaryTop + 12)
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .text(formatMoney(facture.sousTotal), 430, summaryTop + 12, { width: 115, align: 'right' });

      doc
        .fillColor(grayColor)
        .font('Helvetica')
        .text(`Montant TVA (${facture.tauxTva}%) :`, 315, summaryTop + 32)
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .text(formatMoney(facture.montantTva), 430, summaryTop + 32, {
          width: 115,
          align: 'right',
        });

      doc
        .moveTo(315, summaryTop + 50)
        .lineTo(545, summaryTop + 50)
        .strokeColor(borderColor)
        .stroke();

      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TOTAL TTC :', 315, summaryTop + 58)
        .fontSize(12)
        .text(formatMoney(facture.montantTotal), 430, summaryTop + 58, {
          width: 115,
          align: 'right',
        });

      // -------------------------------------------------------------
      // 5. Notes & Montant en Lettres
      // -------------------------------------------------------------
      let notesTop = summaryTop + 95;

      if (facture.montantEnLettres) {
        doc
          .fillColor(grayColor)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text('Arrêtée la présente facture à la somme de :', 40, notesTop);

        doc
          .fillColor(darkColor)
          .fontSize(9)
          .font('Helvetica-Oblique')
          .text(`« ${facture.montantEnLettres} »`, 40, notesTop + 14, { width: 515 });

        notesTop += 35;
      }

      if (facture.notes) {
        doc
          .fillColor(grayColor)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text('Notes / Conditions de règlement :', 40, notesTop);

        doc
          .fillColor(darkColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text(facture.notes, 40, notesTop + 12, { width: 515 });
      }

      // -------------------------------------------------------------
      // 6. Legal Footer (Fixed Position at Page Bottom)
      // -------------------------------------------------------------
      const footerTop = doc.page.height - 80; // 761.89 pt (well above page break boundary 801.89 pt)
      doc
        .moveTo(40, footerTop)
        .lineTo(555, footerTop)
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor(grayColor)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `${COMPANY_CONFIG.nom}  —  ICE: ${COMPANY_CONFIG.ice} | IF: ${COMPANY_CONFIG.if} | RC: ${COMPANY_CONFIG.rc} | CNSS: ${COMPANY_CONFIG.cnss}`,
          40,
          footerTop + 8,
          { align: 'center', width: 515, lineBreak: false },
        )
        .text(
          `Merci de votre confiance. Pour toute question, contactez ${COMPANY_CONFIG.email}`,
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
