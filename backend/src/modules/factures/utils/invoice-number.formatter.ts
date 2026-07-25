import { BadRequestException } from '@nestjs/common';

export interface CompanySettingsNumberingConfig {
  prefixeFacture?: string | null;
  separateurFacture?: string | null;
  paddingFacture?: number | null;
}

export function formatInvoiceNumber(
  year: number,
  sequenceNumber: number,
  config: CompanySettingsNumberingConfig,
): string {
  const rawPrefix =
    config.prefixeFacture !== undefined && config.prefixeFacture !== null
      ? config.prefixeFacture.trim()
      : '';
  const separator =
    config.separateurFacture !== undefined && config.separateurFacture !== null
      ? config.separateurFacture
      : '-';
  const padding = Math.min(Math.max(config.paddingFacture || 1, 1), 6);

  // Validate prefix safe characters
  if (rawPrefix && !/^[A-Za-z0-9_-]{1,10}$/.test(rawPrefix)) {
    throw new BadRequestException(
      'Le préfixe de facture doit contenir uniquement des lettres, chiffres, tirets ou underscore (max 10 caractères)',
    );
  }

  // Validate separator
  const validSeparators = ['-', '/', '.', ''];
  if (!validSeparators.includes(separator)) {
    throw new BadRequestException('Le séparateur de facture doit être "-", "/", "." ou vide');
  }

  const paddedSeq = sequenceNumber.toString().padStart(padding, '0');
  const yearStr = year.toString();

  let formatted = '';
  if (rawPrefix) {
    formatted = `${rawPrefix}${separator}${yearStr}${separator}${paddedSeq}`;
  } else {
    formatted = `${yearStr}${separator}${paddedSeq}`;
  }

  if (formatted.length > 30) {
    throw new BadRequestException(
      `Le numéro de facture généré "${formatted}" dépasse la longueur maximale de 30 caractères`,
    );
  }

  return formatted;
}
