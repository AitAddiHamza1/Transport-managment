import { BadRequestException } from '@nestjs/common';

export interface CompanySettingsNumberingConfig {
  prefixeFacture?: string | null;
  separateurFacture?: string | null;
  paddingFacture?: number | null;
}

/**
 * Formats invoice numbers according to the fixed commercial contract:
 * F{sequence padded to 3 digits}/{year}
 *
 * Examples:
 * 1, 2026   -> F001/2026
 * 12, 2026  -> F012/2026
 * 125, 2026 -> F125/2026
 * 1, 2027   -> F001/2027
 */
export function formatInvoiceNumber(year: number, sequenceNumber: number): string {
  if (!year || year < 2000 || year > 2100) {
    throw new BadRequestException('Année de facturation non valide');
  }

  if (!sequenceNumber || sequenceNumber < 1) {
    throw new BadRequestException('Numéro de séquence de facture non valide');
  }

  const paddedSeq = sequenceNumber.toString().padStart(3, '0');
  const formatted = `F${paddedSeq}/${year}`;

  if (formatted.length > 30) {
    throw new BadRequestException(
      `Le numéro de facture généré "${formatted}" dépasse la longueur maximale de 30 caractères`,
    );
  }

  return formatted;
}
