import { BadRequestException } from '@nestjs/common';
import { ModeFacturation } from '@prisma/client';

export interface CompanySettingsNumberingConfig {
  prefixeFacture?: string | null;
  separateurFacture?: string | null;
  paddingFacture?: number | null;
}

/**
 * Formats invoice numbers according to the fixed commercial contract:
 * - AVEC_FACTURE: F{sequence padded to 3 digits}/{year} (e.g., F001/2026)
 * - SANS_FACTURE: SF{sequence padded to 3 digits}/{year} (e.g., SF001/2026)
 *
 * Examples:
 * 1, 2026, AVEC_FACTURE -> F001/2026
 * 1, 2026, SANS_FACTURE -> SF001/2026
 * 12, 2026, AVEC_FACTURE -> F012/2026
 * 125, 2026, SANS_FACTURE -> SF125/2026
 */
export function formatInvoiceNumber(
  year: number,
  sequenceNumber: number,
  modeFacturation: ModeFacturation,
): string {
  if (!year || year < 2000 || year > 2100) {
    throw new BadRequestException('Année de facturation non valide');
  }

  if (!sequenceNumber || sequenceNumber < 1) {
    throw new BadRequestException('Numéro de séquence de facture non valide');
  }

  const prefix = modeFacturation === ModeFacturation.SANS_FACTURE ? 'SF' : 'F';
  const paddedSeq = sequenceNumber.toString().padStart(3, '0');
  const formatted = `${prefix}${paddedSeq}/${year}`;

  if (formatted.length > 30) {
    throw new BadRequestException(
      `Le numéro de facture généré "${formatted}" dépasse la longueur maximale de 30 caractères`,
    );
  }

  return formatted;
}
